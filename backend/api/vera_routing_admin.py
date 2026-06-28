"""
Backoffice — gestión de reglas de routing y configuración de modelos LLM.
Solo admins.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
import json

from core.database import get_db
from core.security import get_current_user, get_admin_db, _is_platform_admin
from core.pagination import LimitQuery
from models.user import User

router = APIRouter(prefix="/api/backoffice/vera-routing", tags=["Backoffice Vera"])


def require_admin(user: User = Depends(get_current_user)):
    # Platform backoffice (LLM routing rules + global provider API keys):
    # must be a platform superadmin, NOT a per-company admin.
    if not _is_platform_admin(user):
        raise HTTPException(status_code=403, detail="Solo administradores de plataforma")
    return user


# ──────────────────────────────────────────────────────────────
# MODELS
# ──────────────────────────────────────────────────────────────
class RuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    module: Optional[str] = None
    trigger_keywords: Optional[str] = None
    trigger_question_type: Optional[str] = None
    strategy: str = "cascade"
    models: List[str] = ["claude"]
    consensus_mode: Optional[str] = "first"
    priority: int = 100
    flow_data: Optional[str] = None
    is_active: bool = True


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None
    trigger_keywords: Optional[str] = None
    trigger_question_type: Optional[str] = None
    strategy: Optional[str] = None
    models: Optional[List[str]] = None
    consensus_mode: Optional[str] = None
    priority: Optional[int] = None
    flow_data: Optional[str] = None
    is_active: Optional[bool] = None


class ModelUpdate(BaseModel):
    display_name: Optional[str] = None
    model_id: Optional[str] = None
    is_active: Optional[bool] = None
    plan_required: Optional[str] = None
    cost_per_1k_input: Optional[float] = None
    cost_per_1k_output: Optional[float] = None
    max_tokens: Optional[int] = None
    timeout_seconds: Optional[int] = None


class ApiKeyUpdate(BaseModel):
    api_key_value: str


class RuleTest(BaseModel):
    question: str
    module: Optional[str] = None


# ──────────────────────────────────────────────────────────────
# REGLAS
# ──────────────────────────────────────────────────────────────
@router.get("/rules")
def list_rules(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    rows = db.execute(text("""
        SELECT id, name, description, module, trigger_keywords, trigger_question_type,
               strategy, models, consensus_mode, priority, flow_data, is_active,
               created_at, updated_at
        FROM vera_routing_rules ORDER BY priority ASC
    """)).fetchall()
    return [{
        "id": r[0], "name": r[1], "description": r[2],
        "module": r[3], "trigger_keywords": r[4], "trigger_question_type": r[5],
        "strategy": r[6], "models": json.loads(r[7]) if r[7] else [],
        "consensus_mode": r[8], "priority": r[9],
        "flow_data": json.loads(r[10]) if r[10] else None,
        "is_active": bool(r[11]),
        "created_at": str(r[12]) if r[12] else None,
        "updated_at": str(r[13]) if r[13] else None,
    } for r in rows]


@router.post("/rules", status_code=201)
def create_rule(
    rule: RuleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    db.execute(text("""
        INSERT INTO vera_routing_rules
        (name, description, module, trigger_keywords, trigger_question_type,
         strategy, models, consensus_mode, priority, flow_data, is_active)
        VALUES (:name, :desc, :mod, :kw, :qtype, :strat, :models, :consensus,
                :priority, :flow, :active)
    """), {
        "name": rule.name, "desc": rule.description, "mod": rule.module,
        "kw": rule.trigger_keywords, "qtype": rule.trigger_question_type,
        "strat": rule.strategy, "models": json.dumps(rule.models),
        "consensus": rule.consensus_mode, "priority": rule.priority,
        "flow": rule.flow_data, "active": 1 if rule.is_active else 0,
    })
    db.commit()
    row = db.execute(text("SELECT last_insert_rowid()")).fetchone()
    return {"id": row[0], "created": True}


@router.put("/rules/{rule_id}")
def update_rule(
    rule_id: int,
    rule: RuleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    updates = []
    params = {"id": rule_id}
    for field, val in rule.dict(exclude_unset=True).items():
        if field == "models" and val is not None:
            val = json.dumps(val)
        if field == "is_active" and val is not None:
            val = 1 if val else 0
        col = "trigger_keywords" if field == "trigger_keywords" else field
        col = "trigger_question_type" if field == "trigger_question_type" else col
        updates.append(f"{field} = :{field}")
        params[field] = val
    if not updates:
        return {"updated": False}
    updates.append("updated_at = datetime('now')")
    db.execute(text(f"UPDATE vera_routing_rules SET {', '.join(updates)} WHERE id = :id"), params)
    db.commit()
    return {"updated": True, "id": rule_id}


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    db.execute(text("DELETE FROM vera_routing_rules WHERE id = :id"), {"id": rule_id})
    db.commit()
    return {"deleted": True}


# ──────────────────────────────────────────────────────────────
# MODELOS
# ──────────────────────────────────────────────────────────────
@router.get("/models")
def list_models(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    import os
    rows = db.execute(text("""
        SELECT id, provider, display_name, model_id, api_key_env, base_url,
               is_active, plan_required, cost_per_1k_input, cost_per_1k_output,
               max_tokens, timeout_seconds, config_json,
               api_key_value, api_key_status, api_key_last_test_at, api_key_last_error
        FROM vera_models_config ORDER BY provider
    """)).fetchall()
    out = []
    for r in rows:
        # API key: prioridad a la guardada en BD, fallback a .env
        api_key_value = r[13] if len(r) > 13 else None
        has_api_key = bool(api_key_value) or (bool(os.getenv(r[4])) if r[4] else False)
        key_source = "database" if api_key_value else ("env" if (r[4] and os.getenv(r[4])) else None)
        out.append({
            "id": r[0], "provider": r[1], "display_name": r[2], "model_id": r[3],
            "api_key_env": r[4],
            "has_api_key": has_api_key,
            "key_source": key_source,
            "api_key_status": r[14] if len(r) > 14 else "unknown",
            "api_key_last_test_at": r[15] if len(r) > 15 else None,
            "api_key_last_error": r[16] if len(r) > 16 else None,
            "base_url": r[5], "is_active": bool(r[6]),
            "plan_required": r[7], "cost_per_1k_input": r[8], "cost_per_1k_output": r[9],
            "max_tokens": r[10], "timeout_seconds": r[11],
            "config_json": json.loads(r[12]) if r[12] else {},
        })
    return out


@router.put("/models/{provider}")
def update_model(
    provider: str,
    model: ModelUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    updates = []
    params = {"provider": provider}
    for field, val in model.dict(exclude_unset=True).items():
        if field == "is_active" and val is not None:
            val = 1 if val else 0
        updates.append(f"{field} = :{field}")
        params[field] = val
    if not updates:
        return {"updated": False}
    updates.append("updated_at = datetime('now')")
    db.execute(text(f"UPDATE vera_models_config SET {', '.join(updates)} WHERE provider = :provider"), params)
    db.commit()
    return {"updated": True, "provider": provider}


# ──────────────────────────────────────────────────────────────
# LOGS Y STATS
# ──────────────────────────────────────────────────────────────
@router.get("/logs")
def list_logs(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(require_admin),
    limit: int = LimitQuery(50),
):
    rows = db.execute(text("""
        SELECT id, rule_id, user_id, question, module, strategy_used,
               models_called, winning_model, response_preview,
               tokens_input, tokens_output, latency_ms, cost_estimated,
               created_at
        FROM vera_routing_logs
        ORDER BY created_at DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()
    return [{
        "id": r[0], "rule_id": r[1], "user_id": r[2],
        "question": r[3], "module": r[4], "strategy_used": r[5],
        "models_called": json.loads(r[6]) if r[6] else [],
        "winning_model": r[7], "response_preview": r[8],
        "tokens_input": r[9], "tokens_output": r[10],
        "latency_ms": r[11], "cost_estimated": r[12],
        "created_at": str(r[13]) if r[13] else None,
    } for r in rows]


@router.get("/stats")
def stats(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(require_admin),
):
    summary = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(tokens_input + tokens_output) as tokens,
            SUM(cost_estimated) as cost,
            AVG(latency_ms) as latency
        FROM vera_routing_logs
        WHERE created_at > datetime('now', '-7 days')
    """)).fetchone()

    by_model = db.execute(text("""
        SELECT winning_model, COUNT(*) as count, AVG(latency_ms) as avg_lat,
               SUM(cost_estimated) as cost
        FROM vera_routing_logs
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY winning_model
    """)).fetchall()

    by_strategy = db.execute(text("""
        SELECT strategy_used, COUNT(*) as count
        FROM vera_routing_logs
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY strategy_used
    """)).fetchall()

    return {
        "summary_7d": {
            "total_requests": summary[0] or 0,
            "total_tokens": summary[1] or 0,
            "total_cost_usd": round(summary[2] or 0, 4),
            "avg_latency_ms": int(summary[3] or 0),
        },
        "by_model": [{"model": r[0], "count": r[1], "avg_latency_ms": int(r[2] or 0), "cost": round(r[3] or 0, 4)} for r in by_model],
        "by_strategy": [{"strategy": r[0], "count": r[1]} for r in by_strategy],
    }

# ──────────────────────────────────────────────────────────────
# API KEY MANAGEMENT
# ──────────────────────────────────────────────────────────────
@router.put("/models/{provider}/api-key")
def set_model_api_key(
    provider: str,
    payload: ApiKeyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Guarda la API key en BD (sobreescribe .env si está presente)."""
    key = payload.api_key_value.strip()
    if not key:
        raise HTTPException(400, "api_key_value vacía")

    db.execute(text("""
        UPDATE vera_models_config
        SET api_key_value = :key,
            api_key_status = 'unknown',
            api_key_last_test_at = NULL,
            api_key_last_error = NULL,
            updated_at = datetime('now')
        WHERE provider = :provider
    """), {"key": key, "provider": provider})
    db.commit()
    return {"ok": True, "provider": provider, "masked": f"{key[:7]}…{key[-4:]}"}


@router.delete("/models/{provider}/api-key")
def remove_model_api_key(
    provider: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Borra la API key guardada en BD (vuelve a usar .env si está)."""
    db.execute(text("""
        UPDATE vera_models_config
        SET api_key_value = NULL,
            api_key_status = 'unknown',
            api_key_last_test_at = NULL,
            api_key_last_error = NULL
        WHERE provider = :provider
    """), {"provider": provider})
    db.commit()
    return {"ok": True}


@router.post("/models/{provider}/test")
def test_model_connection(
    provider: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Healthcheck real: llamada de 1 token al provider."""
    import time
    row = db.execute(text("""
        SELECT provider, model_id, api_key_env, api_key_value, base_url
        FROM vera_models_config WHERE provider = :p
    """), {"p": provider}).fetchone()
    if not row:
        raise HTTPException(404, "Modelo no encontrado")

    api_key = row[3] or (os.getenv(row[2]) if row[2] else None)
    if not api_key:
        return _save_test_result(db, provider, "missing_key", "No hay API key configurada", 0)

    model_id, base_url = row[1], row[4]
    started = time.time()
    try:
        if provider in ("claude", "claude-haiku"):
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key, timeout=10.0)
            resp = client.messages.create(
                model=model_id, max_tokens=10,
                messages=[{"role": "user", "content": "Di OK"}]
            )
            ok = bool(resp.content)
            latency = int((time.time() - started) * 1000)
            return _save_test_result(db, provider, "ok" if ok else "fail",
                                     None if ok else "Respuesta vacía", latency)
        elif provider == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=api_key, timeout=10.0)
            resp = client.chat.completions.create(
                model=model_id, max_tokens=10,
                messages=[{"role": "user", "content": "Di OK"}]
            )
            ok = bool(resp.choices)
            latency = int((time.time() - started) * 1000)
            return _save_test_result(db, provider, "ok" if ok else "fail",
                                     None if ok else "Respuesta vacía", latency)
        elif provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_id)
            resp = model.generate_content("Di OK", generation_config={"max_output_tokens": 10})
            ok = bool(resp.text)
            latency = int((time.time() - started) * 1000)
            return _save_test_result(db, provider, "ok" if ok else "fail",
                                     None if ok else "Respuesta vacía", latency)
        elif provider == "perplexity":
            import requests
            r = requests.post(
                f"{base_url or 'https://api.perplexity.ai'}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model_id, "max_tokens": 10,
                      "messages": [{"role": "user", "content": "Di OK"}]},
                timeout=10
            )
            latency = int((time.time() - started) * 1000)
            if r.status_code == 200:
                return _save_test_result(db, provider, "ok", None, latency)
            return _save_test_result(db, provider, "fail", f"HTTP {r.status_code}: {r.text[:200]}", latency)
        else:
            return _save_test_result(db, provider, "fail", f"Provider '{provider}' no soportado", 0)
    except Exception as e:
        latency = int((time.time() - started) * 1000)
        return _save_test_result(db, provider, "fail", str(e)[:300], latency)


def _save_test_result(db, provider, status, error, latency_ms):
    db.execute(text("""
        UPDATE vera_models_config
        SET api_key_status = :status,
            api_key_last_test_at = datetime('now'),
            api_key_last_error = :error
        WHERE provider = :provider
    """), {"status": status, "error": error, "provider": provider})
    db.commit()
    return {"ok": status == "ok", "status": status, "error": error, "latency_ms": latency_ms}


# ──────────────────────────────────────────────────────────────
# CLIENTES (uso por empresa)
# ──────────────────────────────────────────────────────────────
@router.get("/clients")
def list_clients_usage(
    days: int = 30,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(require_admin),
):
    """Uso de Vera por empresa: requests, tokens, coste, modelo más usado."""
    rows = db.execute(text(f"""
        SELECT
          c.id, c.name, c.plan,
          COUNT(l.id) as requests,
          COALESCE(SUM(l.tokens_input), 0) as tokens_in,
          COALESCE(SUM(l.tokens_output), 0) as tokens_out,
          COALESCE(AVG(l.latency_ms), 0) as avg_latency,
          MAX(l.created_at) as last_request
        FROM companies c
        LEFT JOIN vera_routing_logs l ON l.company_id = c.id
          AND l.created_at >= datetime('now', '-{int(days)} days')
        GROUP BY c.id
        ORDER BY requests DESC
    """)).fetchall()

    # Calcular coste real por empresa usando precios reales por proveedor
    model_costs = {r[1]: (r[8], r[9]) for r in db.execute(text(
        "SELECT id, provider, display_name, model_id, api_key_env, base_url, is_active, plan_required, cost_per_1k_input, cost_per_1k_output FROM vera_models_config"
    )).fetchall()}

    out = []
    for r in rows:
        cid, name, plan, reqs, tok_in, tok_out, avg_lat, last_req = r
        # Coste estimado: media ponderada usando Sonnet como aproximación
        # (FIX bug coste x10 — antes era cost_per_1k * tokens, ahora dividimos por 1000)
        cin = model_costs.get('claude', (3.0, 15.0))[0]
        cout = model_costs.get('claude', (3.0, 15.0))[1]
        cost_usd = round((tok_in * cin + tok_out * cout) / 1_000_000, 4)

        # Top modelo
        top_model = db.execute(text("""
            SELECT winning_model, COUNT(*) c
            FROM vera_routing_logs
            WHERE company_id = :cid AND created_at >= datetime('now', :since)
            GROUP BY winning_model ORDER BY c DESC LIMIT 1
        """), {"cid": cid, "since": f"-{int(days)} days"}).fetchone()

        out.append({
            "company_id": cid,
            "company_name": name,
            "plan": plan or "base",
            "requests": reqs,
            "tokens_input": tok_in,
            "tokens_output": tok_out,
            "tokens_total": tok_in + tok_out,
            "cost_usd": cost_usd,
            "avg_latency_ms": int(avg_lat or 0),
            "last_request": last_req,
            "top_model": top_model[0] if top_model else None,
        })
    return {"period_days": days, "clients": out}


# ──────────────────────────────────────────────────────────────
# TEST DE REGLA
# ──────────────────────────────────────────────────────────────
@router.post("/rules/{rule_id}/test")
def test_rule(
    rule_id: int,
    payload: RuleTest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Ejecuta una regla con una pregunta de prueba y devuelve qué modelo se eligió."""
    rule = db.execute(text("""
        SELECT id, name, module, trigger_keywords, strategy, models, consensus_mode
        FROM vera_routing_rules WHERE id = :rid
    """), {"rid": rule_id}).fetchone()
    if not rule:
        raise HTTPException(404, "Regla no encontrada")

    # Match simple por keywords
    kws = (rule[3] or "").split(",")
    kws = [k.strip().lower() for k in kws if k.strip()]
    matches = any(k in payload.question.lower() for k in kws) if kws else True

    models_list = json.loads(rule[5]) if rule[5] else []

    return {
        "rule_id": rule_id,
        "rule_name": rule[1],
        "question": payload.question,
        "would_match": matches,
        "strategy": rule[4],
        "models_to_call": models_list,
        "consensus_mode": rule[6],
        "explanation": (
            f"Esta regla SE activaría: keywords {kws} encontradas en la pregunta. "
            f"Estrategia '{rule[4]}' con modelos {models_list}."
            if matches else
            f"Esta regla NO se activaría: ninguno de los keywords {kws} aparece en la pregunta. "
            f"Caería al default."
        ),
    }

# ──────────────────────────────────────────────────────────────
# PLANES DE VERA
# ──────────────────────────────────────────────────────────────
class PlanUpdate(BaseModel):
    display_name: Optional[str] = None
    price_eur_monthly: Optional[float] = None
    description: Optional[str] = None
    tokens_daily_limit: Optional[int] = None
    primary_model: Optional[str] = None
    fallback_model: Optional[str] = None
    memory_days: Optional[int] = None
    features_json: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/plans")
def list_plans(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(require_admin),
):
    """Lista los 2 planes de Vera (Vela + Plus) con sus capacidades."""
    rows = db.execute(text("""
        SELECT id, plan_key, display_name, price_eur_monthly, description,
               tokens_daily_limit, primary_model, fallback_model, memory_days,
               features_json, is_active, display_order
        FROM vera_plans
        WHERE is_active = 1
        ORDER BY display_order
    """)).fetchall()
    out = []
    for r in rows:
        count = db.execute(text(
            "SELECT COUNT(*) FROM companies WHERE plan = :p"
        ), {"p": r[1]}).scalar() or 0
        out.append({
            "id": r[0], "plan_key": r[1], "display_name": r[2],
            "price_eur_monthly": r[3], "description": r[4],
            "tokens_daily_limit": r[5], "primary_model": r[6],
            "fallback_model": r[7], "memory_days": r[8],
            "features": json.loads(r[9]) if r[9] else {},
            "is_active": bool(r[10]), "display_order": r[11],
            "companies_count": count,
        })
    return out


@router.put("/plans/{plan_key}")
def update_plan(
    plan_key: str,
    payload: PlanUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Actualiza un plan (precio, tokens, modelos, features)."""
    updates = []
    params = {"plan_key": plan_key}
    for field, val in payload.dict(exclude_unset=True).items():
        if field == "is_active" and val is not None:
            val = 1 if val else 0
        updates.append(f"{field} = :{field}")
        params[field] = val
    if not updates:
        return {"updated": False}
    updates.append("updated_at = datetime('now')")
    db.execute(text(
        f"UPDATE vera_plans SET {', '.join(updates)} WHERE plan_key = :plan_key"
    ), params)
    db.commit()
    return {"updated": True, "plan_key": plan_key}

