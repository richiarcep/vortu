"""
Vera Quota Manager — tracking de tokens y degradación automática.

Reglas:
- Plan Vela (base): 80k tokens/día de Sonnet → al agotar, degrada a Haiku
- Plan Vera Plus: ilimitado
- Reset diario a las 00:00 local
- Notificaciones al 70% / 90% / 100%
"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional


# Modelos premium (no consumen del budget de Sonnet)
PREMIUM_PROVIDERS = {'openai', 'gemini', 'perplexity', 'groq', 'deepseek'}


def get_company_plan(db: Session, company_id: int) -> dict:
    """Devuelve el plan completo de una empresa."""
    try:
        row = db.execute(text("""
            SELECT c.plan, p.tokens_daily_limit, p.primary_model, p.fallback_model,
                   p.memory_days, p.features_json
            FROM companies c
            LEFT JOIN vera_plans p ON p.plan_key = COALESCE(c.plan, 'base')
            WHERE c.id = :cid
        """), {"cid": company_id}).fetchone()
    except Exception:
        db.rollback()
        return {"plan_key": "base", "tokens_daily_limit": 80000, "primary_model": "claude",
                "fallback_model": "claude-haiku", "memory_days": 7, "features": {}}

    if not row:
        return {"plan_key": "base", "tokens_daily_limit": 80000, "primary_model": "claude",
                "fallback_model": "claude-haiku", "memory_days": 7, "features": {}}

    import json
    return {
        "plan_key": row[0] or "base",
        "tokens_daily_limit": row[1] or 80000,
        "primary_model": row[2] or "claude",
        "fallback_model": row[3] or "claude-haiku",
        "memory_days": row[4] or 7,
        "features": json.loads(row[5]) if row[5] else {},
    }


def get_today_usage(db: Session, company_id: int) -> dict:
    """Uso de tokens HOY de una empresa."""
    today = date.today().isoformat()
    try:
        row = db.execute(text("""
            SELECT tokens_sonnet_input, tokens_sonnet_output,
                   tokens_haiku_input, tokens_haiku_output,
                   tokens_premium_input, tokens_premium_output,
                   requests_sonnet, requests_haiku, requests_premium,
                   degraded_at, notif_70_sent, notif_90_sent, notif_100_sent
            FROM vera_token_usage
            WHERE company_id = :cid AND date_local = :d
        """), {"cid": company_id, "d": today}).fetchone()
    except Exception:
        db.rollback()
        return {
            "sonnet_tokens": 0, "haiku_tokens": 0, "premium_tokens": 0,
            "sonnet_requests": 0, "haiku_requests": 0, "premium_requests": 0,
            "degraded": False, "notifs": {"70": False, "90": False, "100": False},
        }

    if not row:
        return {
            "sonnet_tokens": 0, "haiku_tokens": 0, "premium_tokens": 0,
            "sonnet_requests": 0, "haiku_requests": 0, "premium_requests": 0,
            "degraded": False, "notifs": {"70": False, "90": False, "100": False},
        }

    return {
        "sonnet_tokens": (row[0] or 0) + (row[1] or 0),
        "haiku_tokens": (row[2] or 0) + (row[3] or 0),
        "premium_tokens": (row[4] or 0) + (row[5] or 0),
        "sonnet_requests": row[6] or 0,
        "haiku_requests": row[7] or 0,
        "premium_requests": row[8] or 0,
        "degraded": row[9] is not None,
        "notifs": {"70": bool(row[10]), "90": bool(row[11]), "100": bool(row[12])},
    }


def get_quota_status(db: Session, company_id: int) -> dict:
    """
    Devuelve estado completo de la cuota para el frontend.
    El frontend lo usa para mostrar barra de progreso y badge "Modo básico".
    """
    plan = get_company_plan(db, company_id)
    usage = get_today_usage(db, company_id)
    limit = plan["tokens_daily_limit"]

    # Plus = ilimitado
    if limit == -1:
        return {
            "plan_key": plan["plan_key"],
            "unlimited": True,
            "tokens_used": usage["sonnet_tokens"] + usage["haiku_tokens"] + usage["premium_tokens"],
            "tokens_limit": -1,
            "pct_used": 0,
            "degraded": False,
            "next_reset": "00:00 (mañana)",
            "current_model_tier": "premium",  # tier máximo
            "message": None,
        }

    pct = round((usage["sonnet_tokens"] / limit) * 100, 1) if limit > 0 else 0
    is_degraded = usage["degraded"] or usage["sonnet_tokens"] >= limit

    # Mensaje según uso
    message = None
    notif_level = None
    if pct >= 100 or is_degraded:
        message = "Has agotado tu cuota diaria de Sonnet. Vera sigue funcionando con Haiku (modo básico). Reset a las 00:00."
        notif_level = "100"
    elif pct >= 90:
        message = f"Llevas {pct}% de tu cuota diaria de Sonnet. Cuando agotes, Vera funcionará en modo básico."
        notif_level = "90"
    elif pct >= 70:
        message = f"Llevas {pct}% de tu cuota diaria de Sonnet."
        notif_level = "70"

    return {
        "plan_key": plan["plan_key"],
        "unlimited": False,
        "tokens_used": usage["sonnet_tokens"],
        "tokens_limit": limit,
        "pct_used": pct,
        "degraded": is_degraded,
        "next_reset": "00:00 (mañana)",
        "current_model_tier": "basic" if is_degraded else "standard",
        "message": message,
        "notif_level": notif_level,
        "notifs_sent": usage["notifs"],
    }


def select_model_for_request(db: Session, company_id: int, requested_model: Optional[str] = None) -> dict:
    """
    Decide qué modelo usar según el plan y el uso actual.

    Returns:
        {
            "provider": "claude" | "claude-haiku" | etc,
            "tier": "premium" | "standard" | "basic",
            "degraded": bool,
            "reason": str
        }
    """
    plan = get_company_plan(db, company_id)
    usage = get_today_usage(db, company_id)
    limit = plan["tokens_daily_limit"]

    # Plus o ilimitado → modelo solicitado o primary
    if limit == -1:
        chosen = requested_model or plan["primary_model"]
        return {
            "provider": chosen,
            "tier": "premium" if chosen in PREMIUM_PROVIDERS else "standard",
            "degraded": False,
            "reason": "plan_plus_unlimited",
        }

    # Plan base → comprobar cuota
    if usage["sonnet_tokens"] >= limit:
        # Cuota agotada → forzar Haiku
        return {
            "provider": plan["fallback_model"],
            "tier": "basic",
            "degraded": True,
            "reason": "quota_exceeded",
        }

    # Plan base con cuota disponible → Sonnet
    chosen = requested_model or plan["primary_model"]
    if chosen in PREMIUM_PROVIDERS:
        # Plan base NO puede usar premium
        return {
            "provider": plan["primary_model"],
            "tier": "standard",
            "degraded": False,
            "reason": "premium_blocked_base_plan",
        }

    return {
        "provider": chosen,
        "tier": "standard",
        "degraded": False,
        "reason": "within_quota",
    }


def record_usage(
    db: Session,
    company_id: int,
    provider: str,
    tokens_input: int,
    tokens_output: int,
) -> dict:
    """
    Registra uso de tokens y dispara notificaciones si cruzamos umbrales.
    """
    today = date.today().isoformat()

    # Categorizar el provider
    if provider == "claude":
        col_in, col_out, col_req = "tokens_sonnet_input", "tokens_sonnet_output", "requests_sonnet"
    elif provider == "claude-haiku":
        col_in, col_out, col_req = "tokens_haiku_input", "tokens_haiku_output", "requests_haiku"
    elif provider in PREMIUM_PROVIDERS:
        col_in, col_out, col_req = "tokens_premium_input", "tokens_premium_output", "requests_premium"
    else:
        col_in, col_out, col_req = "tokens_sonnet_input", "tokens_sonnet_output", "requests_sonnet"

    # Insert o update con UPSERT
    db.execute(text(f"""
        INSERT INTO vera_token_usage (company_id, date_local, {col_in}, {col_out}, {col_req})
        VALUES (:cid, :d, :tin, :tout, 1)
        ON CONFLICT(company_id, date_local) DO UPDATE SET
            {col_in} = {col_in} + :tin,
            {col_out} = {col_out} + :tout,
            {col_req} = {col_req} + 1,
            updated_at = datetime('now')
    """), {"cid": company_id, "d": today, "tin": tokens_input, "tout": tokens_output})

    # Si es Sonnet y plan base, comprobar si debemos marcar degraded
    plan = get_company_plan(db, company_id)
    limit = plan["tokens_daily_limit"]
    notif_level = None

    if limit != -1 and provider == "claude":
        # Releer uso actualizado
        usage = get_today_usage(db, company_id)
        sonnet_used = usage["sonnet_tokens"]
        pct = (sonnet_used / limit) * 100 if limit > 0 else 0

        # Marcar degraded si cruzamos 100%
        if sonnet_used >= limit and not usage["degraded"]:
            db.execute(text("""
                UPDATE vera_token_usage
                SET degraded_at = datetime('now'), notif_100_sent = 1
                WHERE company_id = :cid AND date_local = :d
            """), {"cid": company_id, "d": today})
            notif_level = "100"
        elif pct >= 90 and not usage["notifs"]["90"]:
            db.execute(text("""
                UPDATE vera_token_usage SET notif_90_sent = 1
                WHERE company_id = :cid AND date_local = :d
            """), {"cid": company_id, "d": today})
            notif_level = "90"
        elif pct >= 70 and not usage["notifs"]["70"]:
            db.execute(text("""
                UPDATE vera_token_usage SET notif_70_sent = 1
                WHERE company_id = :cid AND date_local = :d
            """), {"cid": company_id, "d": today})
            notif_level = "70"

    db.commit()

    return {
        "recorded": True,
        "provider": provider,
        "tokens": tokens_input + tokens_output,
        "notif_level": notif_level,  # 70 / 90 / 100 / None
    }
