import json
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.billing import PLANS, Subscription, License, TeamMember
from modules.billing.stripe_service import (
    create_trial_subscription, create_license_checkout,
    create_subscription_checkout, create_billing_portal,
    cancel_subscription, upgrade_plan, add_extra_user,
    handle_webhook, get_subscription_status, track_ai_query,
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

@router.post("/trial/start")
async def start_trial(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if sub and sub.trial_used:
        raise HTTPException(status_code=400, detail="Ya has usado tu período de prueba gratuito.")
    result = create_trial_subscription(db=db, user_id=current_user.id, email=current_user.email, name=getattr(current_user, "name", current_user.email), plan_id="business")
    return result

@router.post("/license/checkout")
async def buy_license(body: PlanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.plan_id not in ("starter", "pro", "business"):
        raise HTTPException(status_code=400, detail="Plan no válido")
    return create_license_checkout(db=db, user_id=current_user.id, email=current_user.email, name=getattr(current_user, "name", current_user.email), plan_id=body.plan_id)

@router.post("/subscription/checkout")
async def start_subscription(body: PlanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.plan_id not in ("starter", "pro", "business"):
        raise HTTPException(status_code=400, detail="Plan no válido")
    return create_subscription_checkout(db=db, user_id=current_user.id, email=current_user.email, name=getattr(current_user, "name", current_user.email), plan_id=body.plan_id)

@router.post("/upgrade")
async def upgrade(body: UpgradeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.new_plan_id not in ("starter", "pro", "business"):
        raise HTTPException(status_code=400, detail="Plan no válido")
    result = upgrade_plan(db=db, user_id=current_user.id, new_plan_id=body.new_plan_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Error al actualizar"))
    return result

@router.post("/cancel")
async def cancel(body: CancelRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No hay suscripción activa")
    result = cancel_subscription(sub.stripe_subscription_id, body.at_period_end)
    if body.at_period_end:
        sub.cancel_at_period_end = True
    else:
        sub.status = "canceled"
    db.commit()
    return result

@router.post("/users/add")
async def add_user(body: AddUserRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or sub.status not in ("active", "trialing"):
        raise HTTPException(status_code=400, detail="No hay suscripción activa")
    token = secrets.token_urlsafe(32)
    member = TeamMember(owner_user_id=current_user.id, email=body.email, role=body.role, status="pending", invite_token=token)
    db.add(member)
    db.commit()
    from core.config import get_settings
    settings = get_settings()
    invite_url = f"{settings.FRONTEND_URL}/invite/{token}"
    return {"success": True, "message": f"Invitación enviada a {body.email}", "invite_url": invite_url}

@router.post("/users/remove")
async def remove_user(body: RemoveUserRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    member = db.query(TeamMember).filter(TeamMember.owner_user_id == current_user.id, TeamMember.member_user_id == body.member_user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    member.status = "removed"
    db.commit()
    return {"success": True, "message": "Miembro eliminado del equipo"}

@router.get("/status")
async def get_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_subscription_status(db, current_user.id)

@router.get("/team")
async def get_team(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    members = db.query(TeamMember).filter(TeamMember.owner_user_id == current_user.id, TeamMember.status != "removed").all()
    return {"members": [{"id": m.id, "email": m.email, "role": m.role, "status": m.status, "joined_at": m.joined_at.isoformat() if m.joined_at else None} for m in members]}

@router.post("/portal")
async def billing_portal(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No hay suscripción activa")
    portal_url = create_billing_portal(sub.stripe_customer_id)
    return {"portal_url": portal_url}

@router.post("/usage/ai")
async def check_ai_usage(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = track_ai_query(db, current_user.id)
    if not result["allowed"]:
        raise HTTPException(status_code=429, detail=result["reason"])
    return result

@router.get("/access/{module}")
async def check_module_access(module: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    status = get_subscription_status(db, current_user.id)
    if not status["has_access"]:
        return {"has_access": False, "reason": "Sin suscripción activa"}
    if module in status["modules"]:
        return {"has_access": True, "plan": status["plan"]}
    return {"has_access": False, "reason": f"El módulo '{module}' no está incluido en tu plan {status['plan_name']}"}

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None, alias="stripe-signature"), db: Session = Depends(get_db)):
    payload = await request.body()
    result = handle_webhook(db, payload, stripe_signature)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"status": "ok"}
