"""
Vera Network Agent API — endpoints solo para superadmins de Vela.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
import json

from core.database import get_db
from core.security import get_current_user, get_admin_db, _is_platform_admin, get_admin_user
from core.pagination import LimitQuery
from core.rate_limit import rate_limit
from models.user import User
from vera.network_engine import (
    network_chat, get_pulso, get_company_drilldown, lab_compare, NetworkBudgetExceeded,
)

router = APIRouter(prefix="/api/admin/vera-network", tags=["Vera Network Agent"])


def require_superadmin(admin: User = Depends(get_admin_user)) -> User:
    """Solo superadmins de plataforma. Delega en get_admin_user para tener las
    MISMAS garantías que el resto del back-office: validación de token_version
    (revocación), rechazo de tokens de impersonación y step-up 2FA periódico
    (BACKOFFICE_2FA_DAYS). El agente Vera Network ejecuta text-to-SQL cross-tenant
    sobre un rol BYPASSRLS, así que NO puede tener un gate más débil que /api/admin/*."""
    return admin


# ──────────────────────────────────────────────────────────────────
# SCHEMAS
# ──────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    mensaje: str
    historial: Optional[List[dict]] = None
    context_company_id: Optional[int] = None
    conversation_id: Optional[int] = None


class LabRequest(BaseModel):
    mensaje: str
    models: List[str]
    context_company_id: Optional[int] = None


# ──────────────────────────────────────────────────────────────────
# PULSO — métricas agregadas red Vela
# ──────────────────────────────────────────────────────────────────
@router.get("/pulso")
def pulso(
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    """Métricas agregadas de toda la red Vela en tiempo real."""
    from vera.network_engine import network_read_session
    with network_read_session(db) as rdb:
        return get_pulso(rdb)


# ──────────────────────────────────────────────────────────────────
# CHAT
# ──────────────────────────────────────────────────────────────────
@router.post("/chat", dependencies=[Depends(rate_limit(20, 60, "vera-network-chat"))])
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    """Conversación con Vera Network Agent (Opus + tool use)."""
    try:
        result = network_chat(
            db=db,
            user_id=admin.id,
            user_email=admin.email,
            mensaje=payload.mensaje,
            historial=payload.historial or [],
            context_company_id=payload.context_company_id,
        )
    except NetworkBudgetExceeded as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))

    # Guardar conversación
    if payload.conversation_id:
        db.execute(text("""
            UPDATE vera_network_conversations
            SET messages_json = :msgs,
                total_tokens = total_tokens + :tok,
                total_cost_usd = total_cost_usd + :cost,
                updated_at = datetime('now')
            WHERE id = :cid AND user_id = :uid
        """), {
            "msgs": json.dumps(result["historial"], default=str),
            "tok": result["metadata"]["tokens_input"] + result["metadata"]["tokens_output"],
            "cost": result["metadata"]["cost_usd"],
            "cid": payload.conversation_id, "uid": admin.id,
        })
        db.commit()
    else:
        # Nueva conversación: crear con título auto desde el primer mensaje
        title = (payload.mensaje[:60] + "…") if len(payload.mensaje) > 60 else payload.mensaje
        conv_id = db.execute(text("""
            INSERT INTO vera_network_conversations (
                user_id, title, context_company_id, messages_json,
                model_used, total_tokens, total_cost_usd
            ) VALUES (:uid, :title, :cc, :msgs, :model, :tok, :cost)
            RETURNING id
        """), {
            "uid": admin.id, "title": title,
            "cc": payload.context_company_id,
            "msgs": json.dumps(result["historial"], default=str),
            "model": result["metadata"]["model"],
            "tok": result["metadata"]["tokens_input"] + result["metadata"]["tokens_output"],
            "cost": result["metadata"]["cost_usd"],
        }).scalar()
        db.commit()
        result["conversation_id"] = conv_id

    return result


# ──────────────────────────────────────────────────────────────────
# CONVERSACIONES (listar/cargar)
# ──────────────────────────────────────────────────────────────────
@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    rows = db.execute(text("""
        SELECT id, title, context_company_id, model_used,
               total_tokens, total_cost_usd, created_at, updated_at
        FROM vera_network_conversations
        WHERE user_id = :uid
        ORDER BY updated_at DESC
        LIMIT 50
    """), {"uid": admin.id}).fetchall()
    return [{
        "id": r[0], "title": r[1], "context_company_id": r[2],
        "model_used": r[3], "total_tokens": r[4],
        "total_cost_usd": r[5], "created_at": r[6], "updated_at": r[7],
    } for r in rows]


@router.get("/conversations/{conv_id}")
def get_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    row = db.execute(text("""
        SELECT id, title, context_company_id, messages_json, total_tokens, total_cost_usd
        FROM vera_network_conversations
        WHERE id = :cid AND user_id = :uid
    """), {"cid": conv_id, "uid": admin.id}).fetchone()
    if not row:
        raise HTTPException(404, "Conversación no encontrada")
    return {
        "id": row[0], "title": row[1], "context_company_id": row[2],
        "messages": json.loads(row[3]) if row[3] else [],
        "total_tokens": row[4], "total_cost_usd": row[5],
    }


@router.delete("/conversations/{conv_id}")
def delete_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    db.execute(text(
        "DELETE FROM vera_network_conversations WHERE id = :cid AND user_id = :uid"
    ), {"cid": conv_id, "uid": admin.id})
    db.commit()
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────
# EMPRESAS (lista + drill-down)
# ──────────────────────────────────────────────────────────────────
@router.get("/empresas")
def list_companies(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(require_superadmin),
):
    """Lista todas las empresas con métricas resumen."""
    rows = db.execute(text("""
        SELECT
          c.id, c.name, c.country, c.plan, c.created_at,
          (SELECT COALESCE(SUM(s.total), 0) FROM sales s
           WHERE s.company_id = c.id AND s.sale_date >= date_trunc('year', CURRENT_DATE)::date) as ventas_ytd,
          (SELECT COUNT(*) FROM vera_routing_logs l
           WHERE l.company_id = c.id AND l.created_at >= datetime('now', '-7 days')) as vera_7d,
          (SELECT MAX(sale_date) FROM sales WHERE company_id = c.id) as last_sale,
          (SELECT COUNT(*) FROM users WHERE company_id = c.id) as users_count
        FROM companies c
        ORDER BY ventas_ytd DESC
    """)).fetchall()
    return [{
        "id": r[0], "name": r[1], "country": r[2],
        "plan": r[3] or "base", "created_at": r[4],
        "sales_ytd": round(float(r[5] or 0), 2),
        "vera_requests_7d": r[6] or 0,
        "last_sale": r[7],
        "users_count": r[8] or 0,
    } for r in rows]


@router.get("/empresas/{company_id}")
def empresa_drilldown(
    company_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    from vera.network_engine import network_read_session
    with network_read_session(db) as rdb:
        data = get_company_drilldown(rdb, company_id)
    if not data:
        raise HTTPException(404, "Empresa no encontrada")
    return data


# ──────────────────────────────────────────────────────────────────
# LAB — comparativa modelos
# ──────────────────────────────────────────────────────────────────
@router.post("/lab", dependencies=[Depends(rate_limit(10, 60, "vera-network-lab"))])
def lab(
    payload: LabRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    """Compara respuestas de varios modelos a la misma pregunta."""
    if len(payload.models) < 2:
        raise HTTPException(400, "Selecciona al menos 2 modelos")
    return lab_compare(db, payload.mensaje, payload.models, payload.context_company_id)


# ──────────────────────────────────────────────────────────────────
# AUDIT LOG
# ──────────────────────────────────────────────────────────────────
@router.get("/audit")
def get_audit(
    limit: int = LimitQuery(50),
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    rows = db.execute(text("""
        SELECT id, user_email, endpoint, action, question, response_preview,
               sql_executed, model_used, tokens_input, tokens_output,
               cost_usd, latency_ms, created_at
        FROM vera_network_audit
        ORDER BY created_at DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()
    return [{
        "id": r[0], "user_email": r[1], "endpoint": r[2], "action": r[3],
        "question": r[4], "response_preview": r[5],
        "sql_executed": r[6], "model_used": r[7],
        "tokens_input": r[8], "tokens_output": r[9],
        "cost_usd": r[10], "latency_ms": r[11],
        "created_at": r[12],
    } for r in rows]
