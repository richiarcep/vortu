"""
Endpoint /api/vera/route — usa el sistema multi-LLM con routing dinámico.
Separado del router viejo /api/vera/chat para mantener compatibilidad.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import time

from core.database import get_db
from core.security import get_current_user, get_admin_user
from models.user import User
from vera.llm_router import VeraRouter

router = APIRouter(prefix="/api/vera", tags=["Vera Multi-LLM"])


# ──────────────────────────────────────────────────────────────
# MODELS
# ──────────────────────────────────────────────────────────────
class RouteRequest(BaseModel):
    message: str
    module: Optional[str] = None
    system_prompt: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None


class RouteResponse(BaseModel):
    text: str
    winning_model: Optional[str] = None
    rule_used: Optional[str] = None
    rule_id: Optional[int] = None
    strategy: Optional[str] = None
    attempts: Optional[List[Dict]] = None
    all_responses: Optional[List[Dict]] = None
    models_required: Optional[List[str]] = None
    models_available: Optional[List[str]] = None
    tokens_input: Optional[int] = 0
    tokens_output: Optional[int] = 0
    cost: Optional[float] = 0.0
    latency_ms: Optional[int] = 0
    error: Optional[str] = None
    quota: Optional[Dict[str, Any]] = None


# ──────────────────────────────────────────────────────────────
# UTILS
# ──────────────────────────────────────────────────────────────
def _get_active_system_prompt(db: Session, key: str = "vera_core") -> str:
    """Lee el system prompt activo de la BD."""
    row = db.execute(text("""
        SELECT content FROM system_prompts
        WHERE key = :key AND is_active = 1
    """), {"key": key}).fetchone()
    return row[0] if row else "Eres Vera, asistente de Vela."


def _log_routing(db: Session, user: User, req: RouteRequest, result: Dict):
    """Guarda log del routing para análisis posterior."""
    try:
        db.execute(text("""
            INSERT INTO vera_routing_logs
            (rule_id, user_id, company_id, question, module,
             strategy_used, models_called, winning_model, response_preview,
             tokens_input, tokens_output, latency_ms, cost_estimated)
            VALUES (:rule_id, :uid, :cid, :q, :mod, :strat, :models, :winner,
                    :preview, :tin, :tout, :lat, :cost)
        """), {
            "rule_id": result.get('rule_id'),
            "uid": user.id,
            "cid": getattr(user, 'company_id', None),
            "q": req.message[:500],
            "mod": req.module,
            "strat": result.get('strategy'),
            "models": json.dumps(result.get('models_available', [])),
            "winner": result.get('winning_model'),
            "preview": (result.get('text') or '')[:500],
            "tin": result.get('tokens_input', 0),
            "tout": result.get('tokens_output', 0),
            "lat": result.get('latency_ms', 0),
            "cost": result.get('cost', 0.0),
        })
        db.commit()
    except Exception as e:
        print(f"[vera_route] log error: {e}")


# ──────────────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────────────
@router.post("/route", response_model=RouteResponse)
def route_message(
    req: RouteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Endpoint principal del sistema multi-LLM.
    Lee las reglas de routing y decide qué modelo(s) usar.
    """
    system_prompt = req.system_prompt or _get_active_system_prompt(db)

    router_engine = VeraRouter(db)
    result = router_engine.route(
        question=req.message,
        module=req.module,
        system_prompt=system_prompt,
        history=req.history or [],
        company_id=getattr(user, 'company_id', None),
    )

    _log_routing(db, user, req, result)

    return RouteResponse(
        text=result.get('text', ''),
        winning_model=result.get('winning_model'),
        rule_used=result.get('rule_name'),
        rule_id=result.get('rule_id'),
        strategy=result.get('strategy'),
        attempts=result.get('attempts'),
        all_responses=result.get('all_responses'),
        models_required=result.get('models_required'),
        models_available=result.get('models_available'),
        tokens_input=result.get('tokens_input', 0),
        tokens_output=result.get('tokens_output', 0),
        cost=result.get('cost', 0.0),
        latency_ms=result.get('latency_ms', 0),
        error=result.get('error'),
        quota=result.get('quota'),
    )


@router.get("/route/status")
def route_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_admin_user),
):
    """
    Devuelve el estado del sistema multi-LLM (solo superadmin de plataforma):
    - Modelos configurados y disponibles
    - Reglas activas
    - Stats últimas 24h (agregadas cross-tenant)
    """
    from vera.llm_router import LLMFactory
    factory = LLMFactory(db)

    # Modelos
    models = db.execute(text("""
        SELECT provider, display_name, model_id, api_key_env, is_active,
               cost_per_1k_input, cost_per_1k_output
        FROM vera_models_config ORDER BY provider
    """)).fetchall()

    import os
    models_status = []
    for m in models:
        provider, name, model_id, env, active, ci, co = m
        has_key = bool(os.getenv(env))
        models_status.append({
            "provider": provider,
            "display_name": name,
            "model_id": model_id,
            "api_key_env": env,
            "has_api_key": has_key,
            "is_active": bool(active),
            "ready": bool(active and has_key),
            "cost_per_1k_input": ci,
            "cost_per_1k_output": co,
        })

    # Reglas
    rules = db.execute(text("""
        SELECT id, name, module, trigger_keywords, strategy, models, priority, is_active
        FROM vera_routing_rules ORDER BY priority ASC
    """)).fetchall()

    rules_list = [{
        "id": r[0], "name": r[1], "module": r[2],
        "trigger_keywords": r[3], "strategy": r[4],
        "models": json.loads(r[5]) if r[5] else [],
        "priority": r[6], "is_active": bool(r[7]),
    } for r in rules]

    # Stats 24h
    stats = db.execute(text("""
        SELECT
            COUNT(*) as total,
            COUNT(DISTINCT winning_model) as models_used,
            AVG(latency_ms) as avg_latency,
            SUM(cost_estimated) as total_cost,
            SUM(tokens_input + tokens_output) as total_tokens
        FROM vera_routing_logs
        WHERE created_at > datetime('now', '-1 day')
    """)).fetchone()

    return {
        "models": models_status,
        "rules": rules_list,
        "stats_24h": {
            "total_requests": stats[0] or 0,
            "models_used": stats[1] or 0,
            "avg_latency_ms": int(stats[2] or 0),
            "total_cost_usd": round(stats[3] or 0, 4),
            "total_tokens": stats[4] or 0,
        },
    }
