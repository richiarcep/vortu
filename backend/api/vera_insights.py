"""
Vera Insights - observaciones automaticas por modulo.
Cache 24h. Plan plus puede forzar regeneracion.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import json

from core.database import get_db
from core.security import get_current_user, get_tenant_db
from models.user import User
from vera.llm_router import VeraRouter

router = APIRouter(prefix="/api/vera/insights", tags=["Vera Insights"])

CACHE_TTL_HOURS = 24


def _ctx_for_module(db, company_id, modulo):
    ctx = {}

    if modulo in ("finanzas", "dashboard", "contabilidad"):
        r = db.execute(text("""
            SELECT
              COALESCE(SUM(CASE WHEN a.account_type='income' THEN je.credit-je.debit ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN a.account_type='expense' THEN je.debit-je.credit ELSE 0 END), 0)
            FROM journal_entries je JOIN accounts a ON a.id = je.account_id
            WHERE je.company_id = :cid AND je.date >= date('now', 'start of year')
        """), {"cid": company_id}).fetchone()
        if r:
            ing = float(r[0] or 0)
            gas = float(r[1] or 0)
            ctx["ingresos_ytd"] = round(ing, 2)
            ctx["gastos_ytd"] = round(gas, 2)
            ctx["resultado"] = round(ing - gas, 2)
            ctx["margen_pct"] = round(((ing - gas) / ing * 100) if ing else 0, 1)

    if modulo in ("ventas", "dashboard"):
        last_30 = (datetime.now().date() - timedelta(days=30)).isoformat()
        r = db.execute(text("""
            SELECT COALESCE(SUM(total), 0), COUNT(*)
            FROM sales WHERE company_id = :cid AND DATE(sale_date) >= :d
        """), {"cid": company_id, "d": last_30}).fetchone()
        if r:
            ctx["ventas_30d"] = round(float(r[0] or 0), 2)
            ctx["transacciones_30d"] = r[1]
            ctx["ticket_medio"] = round(float(r[0] or 0) / r[1], 2) if r[1] else 0

    if modulo == "costes":
        r = db.execute(text("""
            SELECT category, COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE company_id = :cid AND date >= date('now', 'start of year')
            GROUP BY category ORDER BY total DESC LIMIT 5
        """), {"cid": company_id}).fetchall()
        if r:
            ctx["top_categorias"] = [{"cat": row[0], "total": round(float(row[1]), 2)} for row in r]

    if modulo == "clientes":
        r = db.execute(text("SELECT COUNT(*) FROM contacts WHERE company_id = :cid"),
                       {"cid": company_id}).fetchone()
        if r:
            ctx["total_clientes"] = r[0]

    if modulo == "hr":
        r = db.execute(text("""
            SELECT COUNT(*), COALESCE(SUM(gross_salary), 0)
            FROM employees WHERE company_id = :cid AND is_active = 1
        """), {"cid": company_id}).fetchone()
        if r:
            ctx["empleados"] = r[0]
            ctx["masa_salarial_anual"] = round(float(r[1] or 0), 2)

    if modulo == "marketing":
        r = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) FROM expenses
            WHERE company_id = :cid AND category LIKE '%marketing%'
              AND date >= date('now', 'start of year')
        """), {"cid": company_id}).fetchone()
        if r:
            ctx["gasto_marketing_ytd"] = round(float(r[0] or 0), 2)

    if modulo == "proyectos":
        r = db.execute(text("SELECT COUNT(*) FROM projects WHERE company_id = :cid AND status = 'active'"),
                       {"cid": company_id}).fetchone()
        if r:
            ctx["proyectos_activos"] = r[0]

    if modulo == "contabilidad":
        r = db.execute(text("SELECT COUNT(*) FROM journal_entries WHERE company_id = :cid"),
                       {"cid": company_id}).fetchone()
        if r:
            ctx["asientos_totales"] = r[0]

    return ctx


INSIGHT_PROMPTS = {
    "finanzas": "Analiza la situacion financiera. Dame 2-3 insights breves sobre rentabilidad, riesgo, o tendencias.",
    "ventas": "Analiza el rendimiento de ventas. Dame 2-3 insights sobre tendencia, concentracion, u oportunidades.",
    "costes": "Analiza la estructura de costes. Dame 2-3 insights sobre concentracion, eficiencia, o riesgos.",
    "clientes": "Analiza la base de clientes. Dame 2-3 insights sobre concentracion, fidelizacion, o crecimiento.",
    "hr": "Analiza la plantilla. Dame 2-3 insights sobre masa salarial, productividad, o estructura.",
    "marketing": "Analiza la inversion en marketing. Dame 2-3 insights sobre ROI, canales, o eficiencia.",
    "proyectos": "Analiza los proyectos activos. Dame 2-3 insights sobre rentabilidad, plazos, o riesgos.",
    "contabilidad": "Analiza la actividad contable. Dame 2-3 insights sobre regularidad, calidad de datos, o anomalias.",
    "dashboard": "Resumen general del negocio. Dame 3 insights criticos: salud financiera, mejor oportunidad, mayor riesgo.",
}


def _generate_insights(db, company_id, modulo):
    ctx = _ctx_for_module(db, company_id, modulo)
    prompt_base = INSIGHT_PROMPTS.get(modulo, INSIGHT_PROMPTS["dashboard"])

    if not ctx:
        return {
            "insights": [
                {"label": "Datos insuficientes", "text": "Sin datos disponibles para este modulo todavia.", "tone": "neutral"}
            ],
            "tokens_used": 0,
        }

    system = (
        "Eres Vera, IA central de Vela. Genera observaciones SECAS y UTILES, sin saludos. "
        "Cada insight: 1 frase de 1-2 lineas maximo. Formato OBLIGATORIO JSON valido: "
        '{"insights": [{"label": "Concentracion", "text": "...", "tone": "amber"}, ...]} '
        "Tone permitido: good (verde), amber (atencion), red (alerta), neutral (azul). "
        "Habla en espanol neutro, directo. NO inventes datos. Responde SOLO el JSON, nada mas."
    )

    ctx_json = json.dumps(ctx, ensure_ascii=False, indent=2)
    user_msg = "Modulo: " + modulo + chr(10) + chr(10) + "Datos reales:" + chr(10) + ctx_json + chr(10) + chr(10) + prompt_base

    vera_router = VeraRouter(db)
    result = vera_router.route(
        question=user_msg,
        module=modulo,
        system_prompt=system,
        company_id=company_id,
    )

    response_text = (result.get("text") or "").strip()
    if response_text.startswith("```"):
        parts = response_text.split("```")
        response_text = parts[1] if len(parts) > 1 else response_text
        if response_text.startswith("json"):
            response_text = response_text[4:]
    response_text = response_text.strip()

    try:
        parsed = json.loads(response_text)
        insights = parsed.get("insights", [])
    except Exception:
        insights = [{"label": "Analisis", "text": response_text[:200] or "Sin observaciones.", "tone": "neutral"}]

    tokens_used = (result.get("tokens_input", 0) or 0) + (result.get("tokens_output", 0) or 0)

    return {
        "insights": insights,
        "tokens_used": tokens_used,
        "model": result.get("winning_model"),
    }


@router.get("/{modulo}")
def get_insights(
    modulo: str,
    force: bool = Query(False, description="Solo plan plus: regenerar ignorando cache"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    company_id = getattr(user, "company_id", None)
    if not company_id:
        raise HTTPException(400, "Usuario sin empresa")

    plan_row = db.execute(text("SELECT plan FROM companies WHERE id = :cid"),
                          {"cid": company_id}).fetchone()
    is_plus = (plan_row and plan_row[0] == "plus")

    if force and not is_plus:
        force = False

    if not force:
        cache_row = db.execute(text("""
            SELECT content_json, generated_at, tokens_used
            FROM vera_insights_cache
            WHERE company_id = :cid AND modulo = :m
        """), {"cid": company_id, "m": modulo}).fetchone()

        if cache_row:
            try:
                generated_at = datetime.fromisoformat(cache_row[1])
            except Exception:
                generated_at = datetime.now() - timedelta(hours=99)

            age_hours = (datetime.now() - generated_at).total_seconds() / 3600
            if age_hours < CACHE_TTL_HOURS:
                try:
                    cached = json.loads(cache_row[0])
                    cached["from_cache"] = True
                    cached["generated_at"] = cache_row[1]
                    cached["age_hours"] = round(age_hours, 1)
                    cached["can_refresh"] = is_plus
                    return cached
                except Exception:
                    pass

    try:
        result = _generate_insights(db, company_id, modulo)
    except Exception as e:
        import traceback
        traceback.print_exc()
        result = {
            "insights": [{
                "label": "IA no disponible",
                "text": "Configura ANTHROPIC_API_KEY",
                "tone": "neutral",
            }],
        }

    payload = {
        "insights": result["insights"],
        "model": result.get("model"),
        "tokens_used": result.get("tokens_used", 0),
        "modulo": modulo,
        "from_cache": False,
        "can_refresh": is_plus,
    }

    try:
        content_json_str = json.dumps(payload, ensure_ascii=False)
        db.execute(text("""
            DELETE FROM vera_insights_cache
            WHERE company_id = :cid AND modulo = :m
        """), {"cid": company_id, "m": modulo})
        db.execute(text("""
            INSERT INTO vera_insights_cache
                (company_id, modulo, content_json, generated_at, tokens_used)
            VALUES (:cid, :m, :c, datetime('now'), :t)
        """), {
            "cid": company_id,
            "m": modulo,
            "c": content_json_str,
            "t": result.get("tokens_used", 0),
        })
        db.commit()
    except Exception as e:
        print("[insights cache] error guardando:", e)

    payload["generated_at"] = datetime.now().isoformat()
    payload["age_hours"] = 0
    return payload
