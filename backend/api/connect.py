"""Stripe Connect endpoints — onboard the company's own merchant account and
charge their customers (card / Apple Pay / Google Pay) into THAT account.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.audit import audit_event
from core.config import get_settings
from models.user import User, Company
from modules.billing import connect_service as CS

settings = get_settings()
router = APIRouter(prefix="/api/connect", tags=["Stripe Connect"])


class SalePaymentRequest(BaseModel):
    amount: float
    description: Optional[str] = None
    currency: Optional[str] = "eur"


def _company(db: Session, current_user: User) -> Company:
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company


@router.get("/status")
def connect_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Onboarding / charging status of the company's connected account."""
    if not CS.enabled():
        return {"available": False, "connected": False, "charges_enabled": False}
    company = _company(db, current_user)
    try:
        status = CS.refresh_status(db, company)
    except Exception:
        status = {"connected": bool(company.stripe_connect_id),
                  "charges_enabled": bool(company.connect_charges_enabled),
                  "details_submitted": bool(company.connect_details_submitted)}
    return {"available": True, **status}


@router.post("/onboard")
def connect_onboard(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create (if needed) the company's Express account and return a Stripe-hosted
    onboarding URL to complete identity + bank details."""
    if not CS.enabled():
        raise HTTPException(status_code=400, detail="Pagos no configurados todavía.")
    company = _company(db, current_user)
    base = settings.FRONTEND_URL.rstrip("/")
    try:
        account_id = CS.create_or_get_account(db, company, current_user.email)
        url = CS.create_onboarding_link(
            account_id,
            return_url=f"{base}/settings?tab=cobros&connect=done",
            refresh_url=f"{base}/settings?tab=cobros&connect=refresh",
        )
    except CS.ConnectError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe: {e}")
    audit_event(db, "connect_onboard_start", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request)
    return {"onboarding_url": url}


@router.post("/sale-payment")
def connect_sale_payment(body: SalePaymentRequest, request: Request,
                         db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a card/Apple Pay/Google Pay checkout for a sale, charged into the
    company's connected account. Returns the payment URL (open it / show a QR)."""
    if not CS.enabled():
        raise HTTPException(status_code=400, detail="Pagos no configurados todavía.")
    company = _company(db, current_user)
    if not company.stripe_connect_id or not company.connect_charges_enabled:
        raise HTTPException(status_code=400, detail="Conecta y verifica tu cuenta de cobros antes de cobrar con tarjeta.")
    base = settings.FRONTEND_URL.rstrip("/")
    try:
        result = CS.create_sale_payment(
            company.stripe_connect_id, body.amount, body.currency or "eur",
            body.description or "Venta",
            success_url=f"{base}/ventas?pago=ok",
            cancel_url=f"{base}/ventas?pago=cancel",
        )
    except CS.ConnectError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe: {e}")
    audit_event(db, "connect_sale_payment", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request, detail={"amount": body.amount})
    return result
