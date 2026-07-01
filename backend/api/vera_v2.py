"""
Vera v2 — versión con streaming SSE + acceso a datos reales del negocio.
"""
from fastapi import APIRouter, Depends, HTTPException
from core.rate_limit import rate_limit
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date, datetime, timedelta
import json
import time

from core.database import get_db
from core.security import get_current_user, get_tenant_db
from models.user import User
from vera.quota_manager import (
    get_company_plan, select_model_for_request, record_usage as quota_record_usage,
    get_quota_status, get_today_usage as quota_get_today_usage
)


router = APIRouter(prefix="/api/vera/v2", tags=["Vera v2"])

# ──────────────────────────────────────────────────────────────────
# SISTEMA DE CUOTAS — delegado a vera/quota_manager.py
# Fuente de verdad: companies.plan + vera_plans + vera_token_usage
# ──────────────────────────────────────────────────────────────────

def get_user_plan(user: User) -> str:
    """Delega al quota_manager. Plan POR EMPRESA."""
    from core.database import SessionLocal
    from core.security import set_tenant_context
    db = SessionLocal()
    try:
        company_id = getattr(user, "company_id", None)
        if not company_id:
            return "base"
        # Bind the tenant so the companies id-policy passes under RLS; without it
        # get_company_plan's SELECT on companies returns 0 rows → every paying
        # tenant silently degrades to 'base'. No-op on SQLite/non-RLS.
        set_tenant_context(db, company_id)
        plan_info = get_company_plan(db, company_id)
        return plan_info.get("plan_key", "base")
    finally:
        db.close()


def get_today_usage(db: Session, user_id: int) -> dict:
    """
    Compat con código viejo. Internamente usa company_id, no user_id.
    Devuelve formato compatible: sonnet/haiku/blocked counts (estimación por tokens).
    """
    user = db.execute(text("SELECT company_id FROM users WHERE id = :uid"), {"uid": user_id}).fetchone()
    if not user or not user[0]:
        return {"sonnet": 0, "haiku": 0, "blocked": 0}
    usage = quota_get_today_usage(db, user[0])
    return {
        "sonnet": usage.get("sonnet_requests", 0),
        "haiku": usage.get("haiku_requests", 0),
        "blocked": 0,
    }


def decide_model(plan: str, usage: dict) -> str:
    """
    Compat shim. Internamente decide según el nuevo quota_manager.
    Devuelve: 'claude-sonnet' | 'claude-haiku' | 'blocked'
    NOTA: necesita ser llamado con context de company_id. Si no hay, usa plan-only logic.
    """
    # Heurística rápida basada en sonnet_requests (mantiene compat con código viejo)
    if plan == "plus":
        return "claude-sonnet"
    # base: si sonnet_requests >= 30 (~80k tokens estimados), degradar
    if usage.get("sonnet", 0) >= 30:
        return "claude-haiku"
    return "claude-sonnet"


def record_usage(db: Session, user_id: int, company_id: int, plan: str,
                 model_type: str, tokens: int, cost: float):
    """Delega al quota_manager nuevo."""
    # Mapear nomenclatura vieja → nueva
    provider = "claude"
    if model_type in ("claude-haiku", "haiku"):
        provider = "claude-haiku"
    elif model_type in ("claude-sonnet", "sonnet", "claude"):
        provider = "claude"
    elif model_type == "blocked":
        return  # no registrar bloqueos como uso

    # Repartir tokens (no sabemos input/output, asumimos 70/30)
    tin = int(tokens * 0.7)
    tout = tokens - tin

    quota_record_usage(
        db=db,
        company_id=company_id,
        provider=provider,
        tokens_input=tin,
        tokens_output=tout,
    )






# ──────────────────────────────────────────────────────────────────
# SCHEMAS Pydantic (faltaban — frontend espera body JSON)
# ──────────────────────────────────────────────────────────────────
class ConversationCreate(BaseModel):
    title: Optional[str] = "Nuevo chat"
    module: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


class MessageCreate(BaseModel):
    conversation_id: int
    message: str



# ──────────────────────────────────────────────────────────────────
# HELPERS — contexto de negocio + system prompt
# ──────────────────────────────────────────────────────────────────
def build_business_context(db: Session, company_id) -> str:
    """Contexto real del negocio para Vera (datos clave últimos 30 días)."""
    if not company_id:
        return "No hay empresa vinculada a la sesión."

    try:
        company = db.execute(text(
            "SELECT id, name, country, sector, region, plan FROM companies WHERE id = :cid"
        ), {"cid": company_id}).fetchone()
    except Exception:
        company = None

    if not company:
        return "No se encontró información de la empresa."

    from country.registry import get_country_info
    sym = (get_country_info(company[2]) or {}).get("symbol", "€") if company[2] else "€"

    ctx = ["## EMPRESA ACTIVA", f"- Nombre: {company[1]}"]
    if company[2]: ctx.append(f"- País: {company[2].upper()}")
    if company[3]: ctx.append(f"- Sector: {company[3]}")
    if company[4]: ctx.append(f"- Región: {company[4]}")
    if company[5]: ctx.append(f"- Plan: {company[5]}")

    today = date.today()
    last_30 = (today - timedelta(days=30)).isoformat()

    # Ventas últimos 30 días
    try:
        row = db.execute(text("""
            SELECT COALESCE(SUM(total), 0), COUNT(*)
            FROM sales WHERE company_id = :cid AND DATE(sale_date) >= :d
        """), {"cid": company_id, "d": last_30}).fetchone()
        if row and row[0]:
            ctx.append("\n## VENTAS últimos 30 días")
            ctx.append(f"- Volumen: {sym}{row[0]:,.2f}")
            ctx.append(f"- Transacciones: {row[1]}")
            if row[1] > 0:
                ctx.append(f"- Ticket medio: {sym}{row[0]/row[1]:.2f}")
    except Exception:
        pass

    # Resultado YTD
    try:
        from datetime import date as _date
        _yr_start = _date(_date.today().year, 1, 1)
        row = db.execute(text("""
            SELECT
              COALESCE(SUM(CASE WHEN a.account_type='income' THEN je.credit-je.debit ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN a.account_type='expense' THEN je.debit-je.credit ELSE 0 END), 0)
            FROM journal_entries je JOIN accounts a ON a.id = je.account_id
            WHERE je.company_id = :cid AND je.date >= :yr_start
        """), {"cid": company_id, "yr_start": _yr_start}).fetchone()
        if row:
            ing, gas = float(row[0] or 0), float(row[1] or 0)
            margen = round((ing - gas) / ing * 100, 1) if ing > 0 else 0
            ctx.append("\n## RESULTADO YTD")
            ctx.append(f"- Ingresos: {sym}{ing:,.2f}")
            ctx.append(f"- Gastos: {sym}{gas:,.2f}")
            ctx.append(f"- Resultado: {sym}{ing-gas:,.2f}  ({margen}%)")
    except Exception:
        pass

    return "\n".join(ctx)


def get_system_prompt(db: Session, company_id, user_message: str = "") -> str:
    """System prompt completo con datos del negocio."""
    base_row = db.execute(text("""
        SELECT content FROM system_prompts
        WHERE key = 'vera_core' AND is_active = true LIMIT 1
    """)).fetchone()

    base = base_row[0] if base_row else (
        "Eres Vera, la IA central de Vela. Hablas en español neutro. "
        "Eres directa, precisa y útil. Te basas EXCLUSIVAMENTE en los datos del "
        "negocio que se te proporcionan abajo. Si te falta un dato concreto, dilo "
        "claramente. Nunca uses plantillas con {variables} ni placeholders."
    )

    business = build_business_context(db, company_id)
    today_str = date.today().strftime('%d/%m/%Y')

    return f"""{base}

Fecha actual: {today_str}

═══════════════════════════════════════
DATOS REALES DEL NEGOCIO
═══════════════════════════════════════
{business}
"""


@router.get("/status")
def status(user: User = Depends(get_current_user), db: Session = Depends(get_tenant_db)):
    """Estado de Vera. Plan + cuota + modelos activos (todo lee de BD, nada hardcoded)."""
    company_id = getattr(user, "company_id", None)
    try:
        if company_id:
            qs = get_quota_status(db, company_id)
            plan = qs.get("plan_key", "base")
            pct_used = qs.get("pct_used", 0)
            is_blocked = qs.get("degraded", False)
            is_unlimited = qs.get("unlimited", False)
            tokens_used = qs.get("tokens_used", 0)
            tokens_limit = qs.get("tokens_limit", 0)
        else:
            plan = "base"
            pct_used = 0
            is_blocked = False
            is_unlimited = False
            tokens_used = 0
            tokens_limit = 80000

        # Cargar info del plan + nombres bonitos de los modelos desde BD
        plan_row = db.execute(text("""
            SELECT plan_key, display_name, primary_model, fallback_model, tokens_daily_limit, memory_days
            FROM vera_plans WHERE plan_key = :pk
        """), {"pk": plan}).fetchone()

        plan_label = plan_row[1] if plan_row else ("Vera Plus" if plan == "plus" else "Vera")
        primary_provider = plan_row[2] if plan_row else "claude"
        fallback_provider = plan_row[3] if plan_row else "claude-haiku"

        # display_name de cada modelo
        def _model_info(provider_key):
            row = db.execute(text("""
                SELECT provider, display_name FROM vera_models_config
                WHERE provider = :p
            """), {"p": provider_key}).fetchone()
            if row:
                return {"provider": row[0], "display_name": row[1] or row[0]}
            return {"provider": provider_key, "display_name": provider_key}

        model_primary = _model_info(primary_provider)
        model_fallback = _model_info(fallback_provider)

        # Modelo que se usaría AHORA si el usuario manda un mensaje
        # (si está degradado, fallback; si no, primary)
        model_active_now = model_fallback if is_blocked else model_primary

        conv_count = db.execute(text("""
            SELECT COUNT(*) FROM vera_conversations
            WHERE user_id = :uid AND is_archived = 0
        """), {"uid": user.id}).fetchone()[0]
    except Exception:
        # Tabla vera_* ausente o BD no disponible → degradar en vez de 500
        db.rollback()
        return {
            "available": False,
            "plan": "base",
            "plan_label": "Vera",
            "degraded": True,
            "message": "Vera no disponible: configura ANTHROPIC_API_KEY o migra las tablas vera_*",
        }

    conv_limit = 50 if plan == "plus" else 10

    return {
        "plan": plan,
        "plan_label": plan_label,
        "usage_pct": round(pct_used),
        "tokens_used": tokens_used,
        "tokens_limit": tokens_limit,
        "within_limit": not is_blocked,
        "blocked": is_blocked,
        "degraded": is_blocked,
        "unlimited": is_unlimited,
        "conversations_used": conv_count,
        "conversations_limit": conv_limit,
        # ── modelos (todo viene de BD) ─────────────────
        "model_primary": model_primary,
        "model_fallback": model_fallback,
        "model_active_now": model_active_now,
        # ── data sources ──────────────────────────────
        "data_sources": [
            {"name": "Contabilidad", "active": True},
            {"name": "Ventas", "active": True},
            {"name": "Clientes", "active": True},
            {"name": "Memoria ampliada" if plan == "plus" else "Memoria", "active": True},
        ],
    }


@router.get("/conversations")
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_tenant_db)):
    plan = get_user_plan(user)
    limit = 50 if plan == "plus" else 10
    try:
        rows = db.execute(text("""
            SELECT id, title, module, is_pinned, message_count, last_message_at, created_at
            FROM vera_conversations
            WHERE user_id = :uid AND is_archived = 0
            ORDER BY is_pinned DESC, COALESCE(last_message_at, created_at) DESC
            LIMIT :lim
        """), {"uid": user.id, "lim": limit}).fetchall()
    except Exception:
        # Tabla vera_conversations ausente → degradar a lista vacía en vez de 500
        db.rollback()
        return {"conversations": []}
    return {
        "conversations": [{
            "id": r[0], "title": r[1], "module": r[2],
            "is_pinned": bool(r[3]), "message_count": r[4],
            "last_message_at": str(r[5]) if r[5] else None,
            "created_at": str(r[6]),
        } for r in rows],
        "total": len(rows),
        "limit": limit,
    }


@router.post("/conversations", status_code=201)
def create_conversation(payload: ConversationCreate,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_tenant_db)):
    plan = get_user_plan(user)
    limit = 50 if plan == "plus" else 10
    try:
        active = db.execute(text("""
            SELECT COUNT(*) FROM vera_conversations
            WHERE user_id = :uid AND is_archived = 0
        """), {"uid": user.id}).fetchone()[0]

        if active >= limit:
            oldest = db.execute(text("""
                SELECT id FROM vera_conversations
                WHERE user_id = :uid AND is_archived = 0 AND is_pinned = 0
                ORDER BY COALESCE(last_message_at, created_at) ASC LIMIT 1
            """), {"uid": user.id}).fetchone()
            if oldest:
                db.execute(text("UPDATE vera_conversations SET is_archived = 1 WHERE id = :id"),
                           {"id": oldest[0]})

        db.execute(text("""
            INSERT INTO vera_conversations (user_id, company_id, title, module)
            VALUES (:uid, :cid, :title, :module)
        """), {
            "uid": user.id,
            "cid": getattr(user, "company_id", None),
            "title": payload.title or "Nuevo chat",
            "module": payload.module,
        })
        db.commit()
        # last_insert_rowid puede devolver 0 si SQLAlchemy reusa conexión; tomamos el último por user
        new_id_row = db.execute(text("""
            SELECT id FROM vera_conversations
            WHERE user_id = :uid ORDER BY id DESC LIMIT 1
        """), {"uid": user.id}).fetchone()
    except Exception:
        # Tabla vera_conversations ausente → degradar con 503 claro en vez de 500 opaco
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Vera no disponible: migra las tablas vera_* o configura ANTHROPIC_API_KEY",
        )
    new_id = new_id_row[0] if new_id_row else 0
    return {"id": new_id, "title": payload.title or "Nuevo chat"}


@router.patch("/conversations/{conv_id}")
def update_conversation(conv_id: int, payload: ConversationUpdate,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_tenant_db)):
    owner = db.execute(text("SELECT user_id FROM vera_conversations WHERE id = :id"),
                       {"id": conv_id}).fetchone()
    if not owner or owner[0] != user.id:
        raise HTTPException(404, "No encontrado")
    updates, params = [], {"id": conv_id}
    if payload.title is not None:
        updates.append("title = :title"); params["title"] = payload.title
    if payload.is_pinned is not None:
        updates.append("is_pinned = :pinned"); params["pinned"] = 1 if payload.is_pinned else 0
    if payload.is_archived is not None:
        updates.append("is_archived = :archived"); params["archived"] = 1 if payload.is_archived else 0
    if updates:
        updates.append("updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS')")
        db.execute(text(f"UPDATE vera_conversations SET {', '.join(updates)} WHERE id = :id"), params)
        db.commit()
    return {"updated": True}


@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: int,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_tenant_db)):
    owner = db.execute(text("SELECT user_id FROM vera_conversations WHERE id = :id"),
                       {"id": conv_id}).fetchone()
    if not owner or owner[0] != user.id:
        raise HTTPException(404, "No encontrado")
    db.execute(text("DELETE FROM vera_messages WHERE conversation_id = :id"), {"id": conv_id})
    db.execute(text("DELETE FROM vera_conversations WHERE id = :id"), {"id": conv_id})
    db.commit()
    return {"deleted": True}


@router.get("/conversations/{conv_id}/messages")
def get_messages(conv_id: int,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_tenant_db)):
    owner = db.execute(text("SELECT user_id FROM vera_conversations WHERE id = :id"),
                       {"id": conv_id}).fetchone()
    if not owner or owner[0] != user.id:
        raise HTTPException(404, "No encontrado")
    rows = db.execute(text("""
        SELECT id, role, content, model_used, is_plus, is_verified,
               tokens_input, tokens_output, latency_ms, created_at
        FROM vera_messages WHERE conversation_id = :id
        ORDER BY created_at ASC
    """), {"id": conv_id}).fetchall()
    return {
        "messages": [{
            "id": r[0], "role": r[1], "content": r[2],
            "model_used": r[3], "is_plus": bool(r[4]), "is_verified": bool(r[5]),
            "tokens_input": r[6], "tokens_output": r[7],
            "latency_ms": r[8], "created_at": str(r[9]),
        } for r in rows]
    }


@router.post("/chat", dependencies=[Depends(rate_limit(20, 60, "vera_v2_chat"))])
def chat(payload: MessageCreate,
         user: User = Depends(get_current_user),
         db: Session = Depends(get_tenant_db)):
    """Chat sin streaming (compatibilidad)."""
    owner = db.execute(text("SELECT user_id, company_id FROM vera_conversations WHERE id = :id"),
                       {"id": payload.conversation_id}).fetchone()
    if not owner or owner[0] != user.id:
        raise HTTPException(404, "Conversación no encontrada")
    company_id = owner[1] or getattr(user, "company_id", None)

    plan = get_user_plan(user)
    usage = get_today_usage(db, user.id)
    model_choice = decide_model(plan, usage)
    if model_choice == "blocked":
        raise HTTPException(429, detail={"error": "límite_diario", "message": "Límite diario alcanzado"})

    db.execute(text("""
        INSERT INTO vera_messages (conversation_id, role, content)
        VALUES (:cid, 'user', :msg)
    """), {"cid": payload.conversation_id, "msg": payload.message})
    db.commit()

    history_rows = db.execute(text("""
        SELECT role, content FROM vera_messages
        WHERE conversation_id = :cid ORDER BY created_at ASC LIMIT 20
    """), {"cid": payload.conversation_id}).fetchall()
    history = [{"role": r[0], "content": r[1]} for r in history_rows[:-1]]

    system_prompt = get_system_prompt(db, company_id, payload.message)

    start = time.time()
    text_response = ""
    tokens_in, tokens_out = 0, 0

    try:
        from vera.llm_router import LLMFactory
        from vera.llm_base import LLMRequest
        factory = LLMFactory(db)
        claude = factory.get("claude")
        if not claude:
            raise Exception("Claude no disponible")
        if model_choice == "claude-haiku":
            claude.model = "claude-haiku-4-5-20251001"

        req = LLMRequest(system_prompt=system_prompt, user_message=payload.message,
                         history=history, max_tokens=1024, temperature=0.7)
        resp = claude.generate(req)
        text_response = resp.text
        tokens_in = resp.tokens_input
        tokens_out = resp.tokens_output
    except Exception as e:
        text_response = f"Error: {str(e)}"

    latency = int((time.time() - start) * 1000)
    cost = (tokens_in / 1000 * 3.0) + (tokens_out / 1000 * 15.0)

    db.execute(text("""
        INSERT INTO vera_messages
        (conversation_id, role, content, model_used, is_plus,
         tokens_input, tokens_output, latency_ms, cost_estimated)
        VALUES (:cid, 'assistant', :content, :model, :plus, :tin, :tout, :lat, :cost)
    """), {
        "cid": payload.conversation_id, "content": text_response,
        "model": "sonnet" if model_choice == "claude-sonnet" else "haiku",
        "plus": 1 if plan == "plus" else 0,
        "tin": tokens_in, "tout": tokens_out, "lat": latency, "cost": cost,
    })
    db.execute(text("""
        UPDATE vera_conversations
        SET message_count = message_count + 2,
            last_message_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
        WHERE id = :id
    """), {"id": payload.conversation_id})

    record_usage(db, user.id, company_id, plan, model_choice, tokens_in + tokens_out, cost)

    # Guardar en memoria semántica (Chroma)
    try:
        from vera.context import save_to_memory
        save_to_memory(company_id, payload.message, text_response)
    except Exception:
        pass

    conv = db.execute(text("SELECT title, message_count FROM vera_conversations WHERE id = :id"),
                      {"id": payload.conversation_id}).fetchone()
    if conv[1] <= 2 and conv[0] == "Nuevo chat":
        new_title = payload.message[:40].rstrip() + ("…" if len(payload.message) > 40 else "")
        db.execute(text("UPDATE vera_conversations SET title = :t WHERE id = :id"),
                   {"t": new_title, "id": payload.conversation_id})
    db.commit()

    return {"response": text_response, "plan": plan, "is_verified": False, "latency_ms": latency}


@router.post("/chat/stream", dependencies=[Depends(rate_limit(20, 60, "vera_v2_stream"))])
def chat_stream(payload: MessageCreate,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_tenant_db)):
    """Chat con streaming SSE — texto aparece token por token."""
    owner = db.execute(text("SELECT user_id, company_id FROM vera_conversations WHERE id = :id"),
                       {"id": payload.conversation_id}).fetchone()
    if not owner or owner[0] != user.id:
        raise HTTPException(404, "Conversación no encontrada")
    company_id = owner[1] or getattr(user, "company_id", None)

    # ─── Decisión de modelo via quota_manager (fuente única de verdad) ───
    plan_info = get_company_plan(db, company_id) if company_id else {"plan_key": "base"}
    plan = plan_info.get("plan_key", "base")
    quota_decision = select_model_for_request(db, company_id) if company_id else {
        "provider": "claude", "tier": "standard", "degraded": False, "reason": "no_company"
    }
    # provider del quota_manager → nombre interno usado abajo
    model_choice = "claude-haiku" if quota_decision["provider"] == "claude-haiku" else "claude-sonnet"
    is_degraded = quota_decision["degraded"]

    # Guardar user message
    db.execute(text("""
        INSERT INTO vera_messages (conversation_id, role, content)
        VALUES (:cid, 'user', :msg)
    """), {"cid": payload.conversation_id, "msg": payload.message})
    db.commit()

    history_rows = db.execute(text("""
        SELECT role, content FROM vera_messages
        WHERE conversation_id = :cid ORDER BY created_at ASC LIMIT 20
    """), {"cid": payload.conversation_id}).fetchall()
    history = [{"role": r[0], "content": r[1]} for r in history_rows[:-1]]
    system_prompt = get_system_prompt(db, company_id, payload.message)

    msg_text = payload.message
    conv_id = payload.conversation_id
    user_id = user.id

    def event_stream():
        import os
        from anthropic import Anthropic

        # Auto-título primer mensaje
        conv = db.execute(text("SELECT title, message_count FROM vera_conversations WHERE id = :id"),
                          {"id": conv_id}).fetchone()
        if conv and conv[1] <= 1 and conv[0] == "Nuevo chat":
            new_title = msg_text[:40].rstrip() + ("…" if len(msg_text) > 40 else "")
            db.execute(text("UPDATE vera_conversations SET title = :t WHERE id = :id"),
                       {"t": new_title, "id": conv_id})
            db.commit()
            yield f"data: {json.dumps({'type': 'title', 'title': new_title})}\n\n"

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            yield f"data: {json.dumps({'type': 'error', 'message': 'API key faltante'})}\n\n"
            return

        client = Anthropic(api_key=api_key)
        model = "claude-haiku-4-5-20251001" if model_choice == "claude-haiku" else "claude-sonnet-4-6"

        full_text = ""
        tokens_in = 0
        tokens_out = 0
        start = time.time()

        try:
            messages = list(history)
            messages.append({"role": "user", "content": msg_text})

            with client.messages.stream(
                model=model, max_tokens=1024, system=system_prompt,
                messages=messages, temperature=0.7,
            ) as stream:
                for text_chunk in stream.text_stream:
                    full_text += text_chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'text': text_chunk})}\n\n"

                final = stream.get_final_message()
                tokens_in = final.usage.input_tokens
                tokens_out = final.usage.output_tokens
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        latency = int((time.time() - start) * 1000)
        # Coste real según modelo usado (Sonnet o Haiku)
        if model_choice == "claude-haiku":
            cost = (tokens_in / 1_000_000 * 0.25) + (tokens_out / 1_000_000 * 1.25)
        else:
            cost = (tokens_in / 1_000_000 * 3.0) + (tokens_out / 1_000_000 * 15.0)

        try:
            db.execute(text("""
                INSERT INTO vera_messages
                (conversation_id, role, content, model_used, is_plus,
                 tokens_input, tokens_output, latency_ms, cost_estimated)
                VALUES (:cid, 'assistant', :content, :model, :plus, :tin, :tout, :lat, :cost)
            """), {
                "cid": conv_id, "content": full_text,
                "model": "sonnet" if model_choice == "claude-sonnet" else "haiku",
                "plus": 1 if plan == "plus" else 0,
                "tin": tokens_in, "tout": tokens_out, "lat": latency, "cost": cost,
            })
            db.execute(text("""
                UPDATE vera_conversations
                SET message_count = message_count + 2,
                    last_message_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
                WHERE id = :id
            """), {"id": conv_id})
            # Registrar en quota_manager (fuente única de verdad)
            try:
                provider_for_quota = "claude-haiku" if model_choice == "claude-haiku" else "claude"
                quota_record_usage(
                    db=db, company_id=company_id,
                    provider=provider_for_quota,
                    tokens_input=tokens_in, tokens_output=tokens_out,
                )
            except Exception as e:
                print(f"[stream] quota_record_usage error: {e}")
            db.commit()

            try:
                from vera.context import save_to_memory
                save_to_memory(company_id, msg_text, full_text)
            except Exception:
                pass
        except Exception as e:
            print(f"[stream] save error: {e}")

        model_label = "Vera base" if model_choice == "claude-haiku" else ("Vera Plus" if plan == "plus" else "Vera")
        yield f"data: {json.dumps({'type': 'done', 'latency_ms': latency, 'plan': plan, 'model': model_choice, 'model_label': model_label, 'degraded': is_degraded})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })
