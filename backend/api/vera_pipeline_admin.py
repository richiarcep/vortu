"""
Vera Pipeline — endpoints CRUD para el editor visual de routing.
Lee/escribe configuraciones de pipeline desde tabla vera_pipeline_config.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime
import json

from core.database import get_db
from core.security import get_current_user, _is_platform_admin
from models.user import User

router = APIRouter(prefix="/api/admin/vera-pipeline", tags=["Vera Pipeline Admin"])


def _check_admin(user: User):
    """Solo super-admins pueden tocar pipelines."""
    # Real column is `is_superadmin`; the old `is_super_admin` OR-ed with `is_admin`
    # left this open to any per-company admin (i.e. every customer).
    if not _is_platform_admin(user):
        raise HTTPException(403, "Solo administradores de plataforma")


# ─────────────────────────────────────────────────────────────
# GET — devolver pipeline de un plan+modulo
# ─────────────────────────────────────────────────────────────
@router.get("/{plan}/{module}")
def get_pipeline(plan: str, module: str,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    _check_admin(user)
    
    if plan not in ("base", "plus"):
        raise HTTPException(400, "Plan invalido")
    
    row = db.execute(text("""
        SELECT config_json, updated_at FROM vera_pipeline_config
        WHERE plan = :plan AND module = :module
    """), {"plan": plan, "module": module}).fetchone()
    
    if not row:
        raise HTTPException(404, f"No hay pipeline para {plan}/{module}")
    
    return {
        "plan": plan,
        "module": module,
        "config": json.loads(row[0]),
        "updated_at": row[1],
    }


# ─────────────────────────────────────────────────────────────
# PUT — actualizar pipeline completo
# ─────────────────────────────────────────────────────────────
@router.put("/{plan}/{module}")
def update_pipeline(plan: str, module: str,
                    config: dict = Body(...),
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    _check_admin(user)
    
    if plan not in ("base", "plus"):
        raise HTTPException(400, "Plan invalido")
    
    # Validar estructura mínima
    if "steps" not in config:
        raise HTTPException(400, "Falta clave steps")
    
    config_json = json.dumps(config, ensure_ascii=False)
    
    db.execute(text("""
        UPDATE vera_pipeline_config
        SET config_json = :c, updated_at = datetime('now')
        WHERE plan = :plan AND module = :module
    """), {"c": config_json, "plan": plan, "module": module})
    db.commit()
    
    # Audit
    try:
        db.execute(text("""
            INSERT INTO vera_network_audit (user_id, user_email, endpoint, action, question, response_preview)
            VALUES (:uid, :email, :ep, :a, :q, :preview)
        """), {
            "uid": user.id, "email": getattr(user, "email", None),
            "ep": "/admin/pipeline", "a": "pipeline_updated",
            "q": f"{plan}/{module}",
            "preview": json.dumps({"plan": plan, "module": module}),
        })
        db.commit()
    except Exception:
        pass  # tabla audit puede no existir aun
    
    return {"ok": True, "plan": plan, "module": module}


# ─────────────────────────────────────────────────────────────
# GET ALL — listar todos los pipelines (resumen)
# ─────────────────────────────────────────────────────────────
@router.get("")
def list_pipelines(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    _check_admin(user)
    
    rows = db.execute(text("""
        SELECT plan, module, updated_at FROM vera_pipeline_config
        ORDER BY plan, module
    """)).fetchall()
    
    return {
        "pipelines": [
            {"plan": r[0], "module": r[1], "updated_at": r[2]}
            for r in rows
        ]
    }


# ─────────────────────────────────────────────────────────────
# POST /apply-to-all — aplicar 1 paso a todos los modulos del mismo plan
# ─────────────────────────────────────────────────────────────
@router.post("/{plan}/apply-step-to-all")
def apply_step_to_all_modules(plan: str,
                              payload: dict = Body(...),
                              user: User = Depends(get_current_user),
                              db: Session = Depends(get_db)):
    """
    payload: {"step_name": "orchestrator", "step_config": {...}, "source_module": "finanzas"}
    Copia el step de source_module a TODOS los modulos del mismo plan.
    """
    _check_admin(user)
    
    if plan not in ("base", "plus"):
        raise HTTPException(400, "Plan invalido")
    
    step_name = payload.get("step_name")
    step_config = payload.get("step_config")
    source_module = payload.get("source_module")
    
    if not step_name or step_config is None:
        raise HTTPException(400, "Faltan step_name o step_config")
    
    # Cargar todos los pipelines del plan
    rows = db.execute(text("""
        SELECT module, config_json FROM vera_pipeline_config
        WHERE plan = :plan
    """), {"plan": plan}).fetchall()
    
    updated = 0
    for module, config_json in rows:
        if module == source_module:
            continue  # no rehacer el origen
        try:
            config = json.loads(config_json)
            if "steps" not in config:
                continue
            config["steps"][step_name] = step_config
            new_json = json.dumps(config, ensure_ascii=False)
            db.execute(text("""
                UPDATE vera_pipeline_config
                SET config_json = :c, updated_at = datetime('now')
                WHERE plan = :plan AND module = :module
            """), {"c": new_json, "plan": plan, "module": module})
            updated += 1
        except Exception as e:
            print(f"[apply-step-to-all] error en {module}: {e}")
    
    db.commit()
    
    return {"ok": True, "plan": plan, "step": step_name, "modules_updated": updated}


# ─────────────────────────────────────────────────────────────
# POST /test — probar pipeline con una pregunta (no guarda nada)
# ─────────────────────────────────────────────────────────────
@router.post("/{plan}/{module}/test")
def test_pipeline(plan: str, module: str,
                  payload: dict = Body(...),
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """
    Devuelve qué pasos se ejecutarían y qué modelo se usaría.
    NO ejecuta el modelo realmente (eso costaría tokens).
    """
    _check_admin(user)
    
    question = payload.get("question", "")
    if not question:
        raise HTTPException(400, "Falta question")
    
    row = db.execute(text("""
        SELECT config_json FROM vera_pipeline_config
        WHERE plan = :plan AND module = :module
    """), {"plan": plan, "module": module}).fetchone()
    
    if not row:
        raise HTTPException(404, "Pipeline no encontrado")
    
    config = json.loads(row[0])
    steps = config.get("steps", {})
    
    # Clasificacion mock (heuristica simple por palabras clave)
    q = question.lower()
    if any(w in q for w in ["hola", "qué es", "que es", "define", "explica"]):
        detected_type = "simple"
    elif any(w in q for w in ["precio", "competencia", "noticias", "hoy", "actual"]):
        detected_type = "busqueda"
    elif any(w in q for w in ["legal", "fiscal", "iva", "impuestos"]):
        detected_type = "critico"
    elif any(w in q for w in ["debería", "compraría", "predice", "estrategia", "futuro"]):
        detected_type = "analisis"
    else:
        detected_type = "calculo"
    
    # Buscar modelo para ese tipo
    orchestrator = steps.get("orchestrator", {})
    types = orchestrator.get("question_types", [])
    type_config = next((t for t in types if t.get("id") == detected_type), None)
    
    return {
        "question": question,
        "detected_type": detected_type,
        "type_config": type_config,
        "steps_executed": list(steps.keys()),
        "estimated_latency_ms": _estimate_latency(steps, detected_type),
        "estimated_cost_usd": _estimate_cost(type_config),
    }


def _estimate_latency(steps, q_type):
    base = 0
    if steps.get("context", {}).get("enabled"): base += 50
    if steps.get("database", {}).get("enabled"): base += 200
    if steps.get("orchestrator", {}).get("enabled"): base += 800  # Haiku clasifica
    if steps.get("apis", {}).get("enabled") and q_type == "busqueda": base += 1500
    if steps.get("validator", {}).get("enabled"): base += 100
    # Modelo principal segun tipo
    main_latency = {"simple": 800, "calculo": 2500, "analisis": 4000, "busqueda": 3000, "critico": 5000}
    base += main_latency.get(q_type, 2500)
    return base


def _estimate_cost(type_config):
    if not type_config:
        return 0.0
    cost_per_type = {
        "simple": 0.001,
        "calculo": 0.008,
        "analisis": 0.015,
        "busqueda": 0.020,
        "critico": 0.030,
    }
    return cost_per_type.get(type_config.get("id"), 0.005)
