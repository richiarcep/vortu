"""Stripe Connect endpoints — onboard the company's own merchant account and
charge their customers (card / Apple Pay / Google Pay) into THAT account.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user, get_tenant_db
from core.audit import audit_event
from core.config import get_settings
from models.user import User, Company
from modules.billing import connect_service as CS

settings = get_settings()
router = APIRouter(prefix="/api/connect", tags=["Stripe Connect"])


class SaleItemIn(BaseModel):
    product_id: int
    quantity: int = 1


class SalePaymentRequest(BaseModel):
    items: list[SaleItemIn]
    payment_method: Optional[str] = "card"
    notes: Optional[str] = None
    currency: Optional[str] = "eur"


def _company(db: Session, current_user: User) -> Company:
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company


@router.get("/status")
def connect_status(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
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
def connect_onboard(request: Request, db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
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
                         db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    """Charge a cart with card/Apple Pay/Google Pay into the company's connected
    account. The cart is held PENDING; the real sale is recorded only when the
    payment webhook confirms (so the cashier does one step, not two). Returns the
    payment URL + a temp_id to poll for completion."""
    if not CS.enabled():
        raise HTTPException(status_code=400, detail="Pagos no configurados todavía.")
    company = _company(db, current_user)
    if not company.stripe_connect_id or not company.connect_charges_enabled:
        raise HTTPException(status_code=400, detail="Conecta y verifica tu cuenta de cobros antes de cobrar con tarjeta.")

    import json, time, secrets
    from sqlalchemy import text
    from api.sales import quote_cart

    items = [it.model_dump() for it in body.items]
    if not items:
        raise HTTPException(status_code=400, detail="El carrito está vacío.")
    total = quote_cart(db, current_user.company_id, items)  # server-side amount (never trust client)

    temp_id = secrets.token_urlsafe(16)
    payload = {"items": items, "payment_method": body.payment_method or "card", "notes": body.notes}
    now = time.time()
    db.execute(text("""
        INSERT INTO pending_pos_sales (temp_id, company_id, payload, status, created_at, expires_at)
        VALUES (:t, :c, :p, 'pending', :now, :exp)
    """), {"t": temp_id, "c": current_user.company_id, "p": json.dumps(payload),
           "now": str(now), "exp": now + 1800})
    db.commit()

    base = settings.FRONTEND_URL.rstrip("/")
    try:
        result = CS.create_sale_payment(
            company.stripe_connect_id, total, body.currency or "eur",
            f"Venta · {len(items)} artículo(s)",
            success_url=f"{base}/ventas?pago=ok",
            cancel_url=f"{base}/ventas?pago=cancel",
            metadata={"type": "pos_sale", "vela_pos_temp_id": temp_id,
                      "vela_company_id": str(current_user.company_id)},
            expires_at=int(now) + 1800,
        )
    except CS.ConnectError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe: {e}")
    audit_event(db, "connect_sale_payment", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request, detail={"amount": total, "temp_id": temp_id})
    return {"url": result["url"], "temp_id": temp_id, "amount": total}


class RefundRequest(BaseModel):
    amount: Optional[float] = None  # None → full refund


@router.post("/sale/{sale_id}/refund")
def connect_refund_sale(sale_id: int, body: RefundRequest, request: Request,
                        db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    """Refund a card/Apple Pay POS payment to the customer's card (on the company's
    connected account). Only works for sales paid via Connect (have a PaymentIntent)."""
    if not CS.enabled():
        raise HTTPException(status_code=400, detail="Pagos no configurados todavía.")
    from sqlalchemy import text
    cid = current_user.company_id
    row = db.execute(text(
        "SELECT stripe_payment_intent, total, COALESCE(refunded_amount,0) AS refunded "
        "FROM sales WHERE id=:s AND company_id=:c"
    ), {"s": sale_id, "c": cid}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if not row["stripe_payment_intent"]:
        raise HTTPException(status_code=400, detail="Esta venta no se cobró con tarjeta vía Vela; no hay cobro que reembolsar.")
    total = float(row["total"] or 0)
    already = float(row["refunded"] or 0)
    refund_amount = round(float(body.amount) if body.amount is not None else (total - already), 2)
    if refund_amount <= 0:
        raise HTTPException(status_code=400, detail="Importe inválido o la venta ya está reembolsada por completo.")
    # Reservar el importe de forma ATÓMICA antes de llamar a Stripe: el UPDATE
    # condicional solo aplica si cabe en lo reembolsable, así dos reembolsos
    # concurrentes (o un doble-clic) no pueden devolver más que el total ni reembolsar
    # dos veces (antes: sin tope ni registro → doble-refund / over-refund). Si Stripe
    # falla, se revierte la reserva.
    reserved = db.execute(text(
        "UPDATE sales SET refunded_amount = COALESCE(refunded_amount,0) + :amt "
        "WHERE id=:s AND company_id=:c AND COALESCE(refunded_amount,0) + :amt <= total + 0.001 "
        "RETURNING id"
    ), {"amt": refund_amount, "s": sale_id, "c": cid}).fetchone()
    db.commit()
    if not reserved:
        raise HTTPException(status_code=400,
                            detail=f"El reembolso (€{refund_amount:.2f}) supera lo reembolsable: quedan €{round(total-already,2):.2f} de €{total:.2f}.")
    company = _company(db, current_user)
    try:
        result = CS.refund_payment(company.stripe_connect_id, row["stripe_payment_intent"], amount=refund_amount)
    except Exception as e:
        # El reembolso no se realizó → revertir la reserva para no dejar la venta como
        # reembolsada sin haberlo sido.
        db.execute(text("UPDATE sales SET refunded_amount = COALESCE(refunded_amount,0) - :amt "
                        "WHERE id=:s AND company_id=:c"), {"amt": refund_amount, "s": sale_id, "c": cid})
        db.commit()
        if isinstance(e, CS.ConnectError):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=502, detail=f"Stripe: {e}")
    audit_event(db, "connect_refund", actor_user_id=current_user.id, actor_email=current_user.email,
                target=f"sale:{sale_id}", company_id=cid, request=request,
                detail={"amount": result.get("amount"), "status": result.get("status"), "refund_eur": refund_amount})
    return result


@router.get("/sale-status/{temp_id}")
def connect_sale_status(temp_id: str, db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    """Poll whether the card payment completed and the sale was recorded."""
    from sqlalchemy import text
    row = db.execute(text(
        "SELECT status, sale_id FROM pending_pos_sales WHERE temp_id=:t AND company_id=:c"
    ), {"t": temp_id, "c": current_user.company_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="No encontrado")
    return {"status": row["status"], "sale_id": row["sale_id"], "paid": row["status"] == "paid"}


@router.post("/webhook")
async def connect_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """Webhook de Stripe CONNECT (scope connected accounts) — secreto SEPARADO del de
    plataforma. Pre-tenant: lo autentica la firma de Stripe, no un usuario."""
    from modules.billing.stripe_service import handle_connect_webhook
    payload = await request.body()
    result = handle_connect_webhook(db, payload, stripe_signature)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"status": "ok"}
