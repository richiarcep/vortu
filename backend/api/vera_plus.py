"""
Vera Plus — info pública y gestión de solicitudes.
Endpoints públicos para cliente + endpoints admin para Nexum.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import json

from core.database import get_db
from core.security import get_current_user
from models.user import User
from modules.billing.stripe_service import create_vera_plus_checkout
from core.config import get_settings

_settings = get_settings()

router = APIRouter(prefix="/api/vera/plus", tags=["Vera Plus"])


# ─────────────────────────────────────────────────────────────
# CLIENTE: info pública de los planes
# ─────────────────────────────────────────────────────────────
@router.get("/info")
def get_plus_info(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve info de los planes base + plus desde vera_plans.
    Incluye el estado actual de la empresa del usuario y si ya hay solicitud pendiente.
    """
    company_id = getattr(user, "company_id", None)

    # Cargar ambos planes desde BD
    rows = db.execute(text("""
        SELECT plan_key, display_name, price_eur_monthly, description,
               tokens_daily_limit, primary_model, fallback_model,
               memory_days, features_json
        FROM vera_plans
        WHERE is_active = 1
        ORDER BY display_order
    """)).fetchall()

    plans = []
    for r in rows:
        features = {}
        if r[8]:
            try:
                features = json.loads(r[8])
            except Exception:
                pass

        plans.append({
            "plan_key": r[0],
            "display_name": r[1],
            "price_eur_monthly": float(r[2] or 0),
            "description": r[3] or "",
            "tokens_daily_limit": r[4],
            "primary_model": r[5],
            "fallback_model": r[6],
            "memory_days": r[7] or 7,
            "features": features,
        })

    # Display names de los modelos (desde vera_models_config)
    model_names = {}
    for plan in plans:
        for key in (plan["primary_model"], plan["fallback_model"]):
            if key and key not in model_names:
                row = db.execute(text(
                    "SELECT display_name FROM vera_models_config WHERE provider = :p"
                ), {"p": key}).fetchone()
                if row:
                    model_names[key] = row[0] or key

    # Estado actual de la empresa
    current_plan = "base"
    if company_id:
        row = db.execute(text(
            "SELECT plan FROM companies WHERE id = :cid"
        ), {"cid": company_id}).fetchone()
        if row and row[0]:
            current_plan = row[0]

    # ¿Hay solicitud pendiente?
    pending_request = None
    if company_id:
        row = db.execute(text("""
            SELECT id, status, requested_at, notes
            FROM vera_plus_requests
            WHERE company_id = :cid AND status = 'pending'
            ORDER BY requested_at DESC LIMIT 1
        """), {"cid": company_id}).fetchone()
        if row:
            pending_request = {
                "id": row[0],
                "status": row[1],
                "requested_at": row[2],
                "notes": row[3],
            }

    return {
        "plans": plans,
        "model_names": model_names,
        "current_plan": current_plan,
        "is_plus_active": current_plan == "plus",
        "pending_request": pending_request,
    }


# ─────────────────────────────────────────────────────────────
# CLIENTE: solicitar activación de Plus
# ─────────────────────────────────────────────────────────────
class PlusRequestCreate(BaseModel):
    notes: Optional[str] = None


@router.post("/request")
def request_plus(
    payload: PlusRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """El cliente solicita activación de Vera Plus. Crea un registro pending."""
    company_id = getattr(user, "company_id", None)
    if not company_id:
        raise HTTPException(400, "Usuario sin empresa vinculada")

    # Verificar que no esté ya en Plus
    row = db.execute(text(
        "SELECT plan FROM companies WHERE id = :cid"
    ), {"cid": company_id}).fetchone()
    if row and row[0] == "plus":
        raise HTTPException(400, "Tu empresa ya tiene Vera Plus activado")

    # Verificar que no haya solicitud pending
    existing = db.execute(text("""
        SELECT id FROM vera_plus_requests
        WHERE company_id = :cid AND status = 'pending'
    """), {"cid": company_id}).fetchone()
    if existing:
        raise HTTPException(400, "Ya hay una solicitud pendiente para tu empresa")

    db.execute(text("""
        INSERT INTO vera_plus_requests (company_id, user_id, status, notes)
        VALUES (:cid, :uid, 'pending', :notes)
    """), {
        "cid": company_id,
        "uid": user.id,
        "notes": payload.notes,
    })
    db.commit()

    new_id = db.execute(text(
        "SELECT id FROM vera_plus_requests WHERE company_id = :cid ORDER BY id DESC LIMIT 1"
    ), {"cid": company_id}).fetchone()[0]

    return {
        "ok": True,
        "request_id": new_id,
        "message": "Solicitud recibida. El equipo de Vortu te contactará en menos de 24h.",
    }


# ─────────────────────────────────────────────────────────────
# ADMIN/NEXUM: listar y resolver solicitudes
# ─────────────────────────────────────────────────────────────
@router.get("/requests")
def list_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista todas las solicitudes Plus (solo admin)."""
    if not getattr(user, "is_admin", False):
        raise HTTPException(403, "Solo admin")

    rows = db.execute(text("""
        SELECT r.id, r.company_id, c.name, r.user_id, u.email,
               r.status, r.notes, r.requested_at, r.resolved_at
        FROM vera_plus_requests r
        JOIN companies c ON c.id = r.company_id
        JOIN users u ON u.id = r.user_id
        ORDER BY r.requested_at DESC
        LIMIT 200
    """)).fetchall()

    return [
        {
            "id": r[0],
            "company_id": r[1],
            "company_name": r[2],
            "user_id": r[3],
            "user_email": r[4],
            "status": r[5],
            "notes": r[6],
            "requested_at": r[7],
            "resolved_at": r[8],
        }
        for r in rows
    ]


class RequestResolve(BaseModel):
    action: str  # 'approve' | 'reject'


@router.put("/requests/{request_id}/resolve")
def resolve_request(
    request_id: int,
    body: RequestResolve,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin aprueba o rechaza una solicitud. Si aprueba, activa companies.plan='plus'."""
    if not getattr(user, "is_admin", False):
        raise HTTPException(403, "Solo admin")

    if body.action not in ("approve", "reject"):
        raise HTTPException(400, "action debe ser 'approve' o 'reject'")

    row = db.execute(text(
        "SELECT company_id, status FROM vera_plus_requests WHERE id = :rid"
    ), {"rid": request_id}).fetchone()
    if not row:
        raise HTTPException(404, "Solicitud no encontrada")

    if row[1] != "pending":
        raise HTTPException(400, f"Ya resuelta (status={row[1]})")

    company_id = row[0]
    new_status = "approved" if body.action == "approve" else "rejected"

    db.execute(text("""
        UPDATE vera_plus_requests
        SET status = :s, resolved_at = datetime('now'), resolved_by = :uid
        WHERE id = :rid
    """), {"s": new_status, "uid": user.id, "rid": request_id})

    # Si aprobado → activar Plus para la empresa
    if body.action == "approve":
        db.execute(text(
            "UPDATE companies SET plan = 'plus' WHERE id = :cid"
        ), {"cid": company_id})
        db.execute(text(
            "UPDATE vera_plus_requests SET status = 'activated' WHERE id = :rid"
        ), {"rid": request_id})

    db.commit()
    return {"ok": True, "request_id": request_id, "new_status": new_status}


# ─────────────────────────────────────────────────────────────
# CLIENTE: crear sesión Stripe Checkout para activar Plus
# ─────────────────────────────────────────────────────────────
@router.post("/checkout")
def create_checkout(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea una sesión de Stripe Checkout para que el cliente pague Vera Plus.
    Devuelve la URL a la que redirigir.
    Cuando Stripe confirme el pago, el webhook activará companies.plan='plus'.
    """
    company_id = getattr(user, "company_id", None)
    if not company_id:
        raise HTTPException(400, "Usuario sin empresa vinculada")

    # Verificar empresa
    company = db.execute(text(
        "SELECT id, name, plan FROM companies WHERE id = :cid"
    ), {"cid": company_id}).fetchone()
    if not company:
        raise HTTPException(404, "Empresa no encontrada")

    if company[2] == "plus":
        raise HTTPException(400, "Tu empresa ya tiene Vera Plus activado")

    # Crear sesión Stripe
    try:
        result = create_vera_plus_checkout(
            db=db,
            user_id=user.id,
            email=user.email,
            name=getattr(user, "full_name", None) or user.email,
            company_id=company_id,
        )
        return {
            "ok": True,
            "checkout_url": result["checkout_url"],
            "session_id": result["session_id"],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error creando checkout: {str(e)}")
