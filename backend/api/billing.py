import json
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.billing import PLANS, Subscription, License, TeamMember
from modules.billing.stripe_service import (
    create_subscription_checkout, create_upgrade_checkout,
    create_billing_portal, cancel_subscription,
    add_extra_user, handle_webhook, get_subscription_status, track_ai_query,
)

router = APIRouter(prefix="/api/billing", tags=["billing"])

class PlanRequest(BaseModel):
    plan_id: str

class UpgradeRequest(BaseModel):
    new_plan_id: str

class CancelRequest(BaseModel):
    at_period_end: bool = True

class AddUserRequest(BaseModel):
    email: str
    role: str = "member"

class RemoveUserRequest(BaseModel):
    member_user_id: int

class PhaseRequest(BaseModel):
    fase: str  # beta | early_adopter | paid
    early_adopter_months: Optional[int] = 3

# ── Planes ────────────────────────────────────────────────────────────────────

@router.get("/plans")
def get_plans():
    return {
        "plans": [
            {
                "id": plan_id,
                "name": data["name"],
                "price_monthly": data["price_monthly"],
                "license_price": data["license_price"],
                "max_users": data["max_users"],
                "extra_user_price": data.get("extra_user_price", 8),
                "ai_queries_monthly": data["ai_queries_monthly"],
                "max_documents_monthly": data["max_documents_monthly"],
                "modules": data["modules"],
            }
            for plan_id, data in PLANS.items()
            if plan_id not in ("trial", "enterprise")
        ]
    }

# ── Checkout ──────────────────────────────────────────────────────────────────

@router.post("/subscription/checkout")
async def start_subscription(body: PlanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.plan_id not in ("starter", "pro", "business"):
        raise HTTPException(status_code=400, detail="Plan no valido")
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    # Si ya tiene plan activo y quiere cambiar — usar upgrade
    if sub and sub.status == "active" and sub.plan_id != body.plan_id:
        return await upgrade(UpgradeRequest(new_plan_id=body.plan_id), db=db, current_user=current_user)
    return create_subscription_checkout(
        db=db, user_id=current_user.id,
        email=current_user.email,
        name=getattr(current_user, "name", current_user.email),
        plan_id=body.plan_id
    )

@router.post("/upgrade")
async def upgrade(body: UpgradeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.new_plan_id not in ("starter", "pro", "business"):
        raise HTTPException(status_code=400, detail="Plan no valido")
    result = create_upgrade_checkout(
        db=db, user_id=current_user.id,
        email=current_user.email,
        name=getattr(current_user, "name", current_user.email),
        new_plan_id=body.new_plan_id
    )
    return result

@router.post("/toggle-autorenew")
async def toggle_autorenew(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No hay suscripcion")
    auto_renew = body.get("auto_renew", True)
    sub.cancel_at_period_end = not auto_renew
    # Si tiene sub en Stripe, sincronizar
    if sub.stripe_subscription_id:
        try:
            import stripe
            stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=not auto_renew)
        except Exception as e:
            print(f"Stripe toggle error: {e}")
    db.commit()
    return {"success": True, "auto_renew": auto_renew}

@router.post("/cancel-downgrade")
async def cancel_downgrade(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No hay suscripcion")
    sub.pending_downgrade_plan = None
    db.commit()
    return {"success": True}

@router.post("/cancel")
async def cancel(body: CancelRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No hay suscripcion")
    if sub.stripe_subscription_id:
        result = cancel_subscription(sub.stripe_subscription_id, body.at_period_end)
    else:
        result = {"canceled": True}
    if body.at_period_end:
        sub.cancel_at_period_end = True
    else:
        sub.status = "canceled"
    db.commit()
    return result

# ── Fases ─────────────────────────────────────────────────────────────────────

@router.post("/admin/phase")
async def set_phase(body: PhaseRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Switch de fase global — solo admins. Actualiza todos los usuarios."""
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Solo admins")
    if body.fase not in ("beta", "early_adopter", "paid"):
        raise HTTPException(status_code=400, detail="Fase no valida")

    subs = db.query(Subscription).all()
    now = datetime.utcnow()
    updated = 0
    for sub in subs:
        sub.fase = body.fase
        if body.fase == "early_adopter":
            sub.fase_expiry = now + timedelta(days=30 * body.early_adopter_months)
        elif body.fase == "paid":
            sub.fase_expiry = None
        updated += 1
    db.commit()
    return {"success": True, "fase": body.fase, "updated_users": updated}

@router.get("/admin/phase")
async def get_phase(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Ver fase actual de la plataforma."""
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Solo admins")
    sub = db.query(Subscription).first()
    return {"fase": sub.fase if sub else "beta"}

# ── Status y acceso ───────────────────────────────────────────────────────────

@router.get("/status")
async def get_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_subscription_status(db, current_user.id)

@router.get("/access/{module}")
async def check_module_access(module: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    status = get_subscription_status(db, current_user.id)
    if not status["has_access"]:
        return {
            "has_access": False,
            "reason": "subscription_expired",
            "expiry_warning": status.get("expiry_warning"),
            "days_until_expiry": status.get("days_until_expiry"),
            "plan": status.get("plan"),
            "plan_name": status.get("plan_name"),
        }
    if module == "dashboard":
        return {"has_access": True, "plan": status["plan"]}
    if module not in status["modules"]:
        return {"has_access": False, "reason": f"Modulo '{module}' no incluido en plan {status['plan_name']}"}
    return {"has_access": True, "plan": status["plan"]}

# ── Notificaciones de vencimiento ─────────────────────────────────────────────

@router.get("/notifications")
async def get_billing_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Notificaciones de vencimiento para mostrar en el frontend."""
    status = get_subscription_status(db, current_user.id)
    notifications = []
    warning = status.get("expiry_warning")
    days = status.get("days_until_expiry")
    plan_name = status.get("plan_name", "")

    if warning == "expired":
        notifications.append({
            "type": "error",
            "title": "Tu negocio te esta esperando",
            "message": f"Tu acceso a Vortu {plan_name} esta pausado. Reactiva tu plan para continuar.",
            "cta": "Retomar acceso",
            "cta_url": "/settings?tab=subscription",
            "dismissible": False,
        })
    elif warning == "1_day":
        notifications.append({
            "type": "warning",
            "title": "Manana se pausa tu acceso",
            "message": "Renueva hoy para no interrumpir tu flujo de trabajo.",
            "cta": "Renovar ahora",
            "cta_url": "/settings?tab=subscription",
            "dismissible": False,
        })
    elif warning == "3_days":
        notifications.append({
            "type": "warning",
            "title": f"Tu acceso vence en {days} dias",
            "message": f"Llevas meses construyendo tu negocio en Vortu. No pierdas el acceso a tus datos.",
            "cta": "Renovar plan",
            "cta_url": "/settings?tab=subscription",
            "dismissible": True,
        })
    elif warning == "7_days":
        notifications.append({
            "type": "info",
            "title": f"Tu plan renueva en {days} dias",
            "message": f"Tu plan Vortu {plan_name} se renueva automaticamente el {status.get('current_period_end', '')[:10]}.",
            "cta": "Ver facturacion",
            "cta_url": "/settings?tab=subscription",
            "dismissible": True,
        })

    return {"notifications": notifications, "has_access": status["has_access"]}

# ── Team ──────────────────────────────────────────────────────────────────────

@router.post("/users/add")
async def add_user(body: AddUserRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or sub.status not in ("active", "trialing"):
        raise HTTPException(status_code=400, detail="No hay suscripcion activa")
    token = secrets.token_urlsafe(32)
    member = TeamMember(owner_user_id=current_user.id, email=body.email, role=body.role, status="pending", invite_token=token)
    db.add(member)
    db.commit()
    from core.config import get_settings
    settings = get_settings()
    invite_url = f"{settings.FRONTEND_URL}/invite/{token}"
    return {"success": True, "message": f"Invitacion enviada a {body.email}", "invite_url": invite_url}

@router.post("/users/remove")
async def remove_user(body: RemoveUserRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    member = db.query(TeamMember).filter(TeamMember.owner_user_id == current_user.id, TeamMember.member_user_id == body.member_user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    member.status = "removed"
    db.commit()
    return {"success": True}

@router.get("/team")
async def get_team(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    members = db.query(TeamMember).filter(TeamMember.owner_user_id == current_user.id, TeamMember.status != "removed").all()
    return {"members": [{"id": m.id, "email": m.email, "role": m.role, "status": m.status, "joined_at": m.joined_at.isoformat() if m.joined_at else None} for m in members]}

@router.post("/portal")
async def billing_portal(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No hay suscripcion activa")
    portal_url = create_billing_portal(sub.stripe_customer_id)
    return {"portal_url": portal_url}

@router.post("/usage/ai")
async def check_ai_usage(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = track_ai_query(db, current_user.id)
    if not result["allowed"]:
        raise HTTPException(status_code=429, detail=result["reason"])
    return result

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None, alias="stripe-signature"), db: Session = Depends(get_db)):
    payload = await request.body()
    result = handle_webhook(db, payload, stripe_signature)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"status": "ok"}
