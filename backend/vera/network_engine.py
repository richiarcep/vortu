"""
Vera Network Agent Engine — La super-Vera de Vela.

Solo accesible por superadmins. Acceso total a las 3 BDs cross-cliente.
- SQL SELECT-only sobre cualquier tabla
- Neo4j queries sobre el grafo
- Chroma búsqueda semántica global
- Modelo principal Opus 4.7 con fallback automático a Sonnet 4.6
"""
import json
import time
import re
from datetime import date, datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from anthropic import Anthropic
from core.config import get_settings

settings = get_settings()

from vera.models import OPUS_NETWORK, SONNET, cost_usd
MODEL_PRIMARY = OPUS_NETWORK
MODEL_FALLBACK = SONNET

# ──────────────────────────────────────────────────────────────────────
# SQL SAFETY — solo SELECT permitido
# ──────────────────────────────────────────────────────────────────────
FORBIDDEN_SQL = re.compile(
    r'\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|GRANT|REVOKE|ATTACH|DETACH|PRAGMA|VACUUM)\b',
    re.IGNORECASE
)

def is_safe_select(sql: str) -> bool:
    """True si es SELECT puro (incluye CTEs WITH)."""
    s = sql.strip().rstrip(';').strip()
    if FORBIDDEN_SQL.search(s):
        return False
    first_word = s.split(None, 1)[0].upper() if s else ''
    return first_word in ('SELECT', 'WITH')


# ──────────────────────────────────────────────────────────────────────
# HERRAMIENTAS (tools) que Vera Network Agent puede invocar
# ──────────────────────────────────────────────────────────────────────
NETWORK_TOOLS = [
    {
        "name": "query_sql",
        "description": (
            "Ejecuta una consulta SQL SELECT sobre la base de datos. "
            "PROHIBIDO: INSERT, UPDATE, DELETE, DROP. Solo lectura. "
            "Tablas relevantes: companies, users, sales, sale_items, products, "
            "journal_entries, accounts, cost_entries, cost_categories, "
            "documents, vera_routing_logs, vera_plans, vera_network_audit. "
            "Usa LIMIT generosamente para no saturar."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "Consulta SQL SELECT"},
                "explanation": {"type": "string", "description": "Breve explicación de qué busca"},
            },
            "required": ["sql"],
        },
    },
    {
        "name": "list_tables",
        "description": "Lista todas las tablas disponibles en la base de datos.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "describe_table",
        "description": "Muestra el schema (columnas) de una tabla específica.",
        "input_schema": {
            "type": "object",
            "properties": {"table_name": {"type": "string"}},
            "required": ["table_name"],
        },
    },
    {
        "name": "search_semantic",
        "description": (
            "Búsqueda semántica en Chroma sobre documentos, conversaciones previas con "
            "Veras de clientes, y memoria empresarial. Útil para preguntas conceptuales o "
            "encontrar conversaciones pasadas relacionadas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "top_k": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    },
]


# ──────────────────────────────────────────────────────────────────────
# EJECUTORES DE TOOLS
# ──────────────────────────────────────────────────────────────────────
def execute_tool(db: Session, tool_name: str, tool_input: dict) -> dict:
    """Ejecuta una herramienta y devuelve el resultado serializable."""
    try:
        if tool_name == "query_sql":
            sql = tool_input.get("sql", "").strip()
            if not is_safe_select(sql):
                return {"error": "Solo se permiten consultas SELECT. Detectada operación no permitida."}
            rows = db.execute(text(sql)).fetchall()
            columns = list(rows[0]._mapping.keys()) if rows else []
            data = [dict(r._mapping) for r in rows[:200]]
            # Serializar tipos no-JSON
            for row in data:
                for k, v in row.items():
                    if isinstance(v, (date, datetime)):
                        row[k] = v.isoformat()
            return {
                "columns": columns,
                "rows": data,
                "row_count": len(rows),
                "truncated": len(rows) > 200,
            }

        elif tool_name == "list_tables":
            rows = db.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' "
                "AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )).fetchall()
            return {"tables": [r[0] for r in rows]}

        elif tool_name == "describe_table":
            t = tool_input.get("table_name", "").strip()
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', t):
                return {"error": "Nombre de tabla inválido"}
            rows = db.execute(text(f"PRAGMA table_info({t})")).fetchall()
            return {
                "table": t,
                "columns": [
                    {"name": r[1], "type": r[2], "nullable": not r[3], "default": r[4], "pk": bool(r[5])}
                    for r in rows
                ],
            }

        elif tool_name == "search_semantic":
            try:
                from services.vector.store import vector_store, COLLECTIONS
                query = tool_input.get("query", "")
                top_k = int(tool_input.get("top_k", 5))
                results = []
                for coll_name in COLLECTIONS.values():
                    try:
                        r = vector_store.search(coll_name, query, n_results=top_k)
                        if r and r.get("documents"):
                            for i, doc in enumerate(r["documents"][0][:top_k]):
                                results.append({
                                    "collection": coll_name,
                                    "content": doc[:500],
                                    "distance": r["distances"][0][i] if r.get("distances") else None,
                                })
                    except Exception:
                        continue
                return {"results": results[:top_k * 2]}
            except Exception as e:
                return {"error": f"Búsqueda vectorial no disponible: {str(e)[:100]}"}

        else:
            return {"error": f"Tool '{tool_name}' no reconocida"}

    except Exception as e:
        return {"error": str(e)[:500]}


# ──────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT
# ──────────────────────────────────────────────────────────────────────
NETWORK_SYSTEM = """Eres Vera Network Agent, la versión interna de Vera para el equipo Vela (administradores de la plataforma Vela).

A diferencia de las Veras de clientes (que solo ven datos de su propia empresa), tú tienes acceso CROSS-EMPRESA a toda la red Vela:
- Datos transaccionales de todas las empresas (SQLite)
- Patrones aprendidos en el grafo (Neo4j)
- Memoria semántica colectiva (Chroma)

PRINCIPIOS:
1. Eres analista ejecutivo de negocio, no chatbot. Respuestas concisas, datos antes que opiniones.
2. Cuando te pregunten algo factual, USA las herramientas. No inventes números.
3. Si haces query SQL, explica brevemente qué buscas antes de ejecutarla.
4. Solo SELECT. Si necesitas modificar datos, dile al admin que lo haga manualmente.
5. Cita siempre la fuente del dato (qué tabla, qué columna, qué periodo).
6. Para benchmarks o comparativas cross-empresa, agrega varios clientes y respeta la privacidad (nunca destaques una empresa por información sensible sin pertinencia clara).
7. Si detectas patrones útiles para el negocio Vela (clientes en riesgo, oportunidades de upsell, anomalías), señálalos.

DATOS DEL SISTEMA QUE DEBES SABER:
- companies: empresas clientes de Vela (id, name, country, plan)
- sales + sale_items + products: transacciones POS
- journal_entries + accounts: contabilidad PGC español (account_type: income/expense/asset/liability)
- cost_entries + cost_categories: gastos clasificados
- vera_routing_logs: cada llamada a Vera con tokens y coste
- vera_plans: 2 planes (base=Vela, plus=Vera Plus €19)
- users: usuarios (con is_superadmin para distinguir equipo Vela)

ESTILO DE RESPUESTA:
- Markdown sutil. Negritas para datos clave. Tablas si comparas.
- Máximo 200 palabras salvo que pidan análisis profundo.
- Si una pregunta es ambigua, pide aclaración rápida en vez de asumir."""


# ──────────────────────────────────────────────────────────────────────
# CHAT PRINCIPAL CON TOOL USE LOOP
# ──────────────────────────────────────────────────────────────────────
def network_chat(
    db: Session,
    user_id: int,
    user_email: str,
    mensaje: str,
    historial: Optional[list] = None,
    context_company_id: Optional[int] = None,
) -> dict:
    """
    Punto de entrada principal de Vera Network Agent.
    Soporta tool use loop (Vera invoca herramientas y vuelve).
    """
    if historial is None:
        historial = []

    # Contexto adicional si se especifica una empresa
    extra_context = ""
    if context_company_id:
        try:
            row = db.execute(text(
                "SELECT id, name, country, plan FROM companies WHERE id = :cid"
            ), {"cid": context_company_id}).fetchone()
            if row:
                extra_context = (
                    f"\n\nCONTEXTO ACTIVO: el usuario está analizando la empresa "
                    f"'{row[1]}' (id={row[0]}, país={row[2]}, plan={row[3]}). "
                    f"Filtra tus consultas por company_id={row[0]} cuando sea relevante."
                )
        except Exception:
            pass

    messages = historial.copy()
    messages.append({"role": "user", "content": mensaje})

    started = time.time()
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    tokens_in = 0
    tokens_out = 0
    sql_executed = []
    model_used = MODEL_PRIMARY

    # Tool use loop (máximo 6 iteraciones para evitar bucles)
    for iteration in range(6):
        try:
            response = client.messages.create(
                model=model_used,
                max_tokens=4096,
                system=NETWORK_SYSTEM + extra_context,
                tools=NETWORK_TOOLS,
                messages=messages,
            )
        except Exception as e:
            # Fallback a Sonnet si Opus falla
            if model_used == MODEL_PRIMARY:
                model_used = MODEL_FALLBACK
                response = client.messages.create(
                    model=model_used,
                    max_tokens=4096,
                    system=NETWORK_SYSTEM + extra_context,
                    tools=NETWORK_TOOLS,
                    messages=messages,
                )
            else:
                raise

        tokens_in += response.usage.input_tokens
        tokens_out += response.usage.output_tokens

        if response.stop_reason == "tool_use":
            # Vera quiere usar herramientas
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for tu in tool_uses:
                if tu.name == "query_sql":
                    sql_executed.append(tu.input.get("sql", ""))
                result = execute_tool(db, tu.name, tu.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": json.dumps(result, ensure_ascii=False, default=str)[:5000],
                })
            messages.append({"role": "user", "content": tool_results})
            continue

        # Respuesta final
        respuesta_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                respuesta_text += block.text

        messages.append({"role": "assistant", "content": respuesta_text})
        break
    else:
        respuesta_text = "(Límite de iteraciones alcanzado)"

    latency_ms = int((time.time() - started) * 1000)

    # Coste calculado desde la tabla central de precios (vera/models.py).
    cost = cost_usd(model_used, tokens_in, tokens_out)

    # Audit log
    try:
        db.execute(text("""
            INSERT INTO vera_network_audit (
                user_id, user_email, endpoint, action, question, response_preview,
                sql_executed, model_used, tokens_input, tokens_output,
                cost_usd, latency_ms
            ) VALUES (
                :uid, :email, '/chat', 'chat', :q, :preview,
                :sql, :model, :tin, :tout, :cost, :lat
            )
        """), {
            "uid": user_id, "email": user_email,
            "q": mensaje[:1000], "preview": respuesta_text[:500],
            "sql": "\n---\n".join(sql_executed)[:2000] if sql_executed else None,
            "model": model_used, "tin": tokens_in, "tout": tokens_out,
            "cost": cost, "lat": latency_ms,
        })
        db.commit()
    except Exception as e:
        print(f"⚠ Error al audit log: {e}")
        db.rollback()

    return {
        "respuesta": respuesta_text,
        "historial": messages,
        "metadata": {
            "model": model_used,
            "tokens_input": tokens_in,
            "tokens_output": tokens_out,
            "cost_usd": round(cost, 6),
            "latency_ms": latency_ms,
            "sql_executed": sql_executed,
            "iterations": iteration + 1,
        },
    }


# ──────────────────────────────────────────────────────────────────────
# PULSO — métricas agregadas en tiempo real
# ──────────────────────────────────────────────────────────────────────
def get_pulso(db: Session) -> dict:
    """Métricas agregadas de TODA la red Vela."""
    today = date.today().isoformat()

    total_companies = db.execute(text("SELECT COUNT(*) FROM companies")).scalar() or 0
    by_plan = db.execute(text(
        "SELECT plan, COUNT(*) FROM companies GROUP BY plan"
    )).fetchall()

    sales_today = float(db.execute(text(
        "SELECT COALESCE(SUM(total), 0) FROM sales WHERE DATE(sale_date) = :d"
    ), {"d": today}).scalar() or 0)
    sales_month = float(db.execute(text(
        "SELECT COALESCE(SUM(total), 0) FROM sales WHERE DATE(sale_date) >= date('now', 'start of month')"
    )).scalar() or 0)
    sales_year = float(db.execute(text(
        "SELECT COALESCE(SUM(total), 0) FROM sales WHERE DATE(sale_date) >= date('now', 'start of year')"
    )).scalar() or 0)

    top_companies = db.execute(text("""
        SELECT c.id, c.name, c.plan, c.sector, COALESCE(SUM(s.total), 0) as total
        FROM companies c
        LEFT JOIN sales s ON s.company_id = c.id
          AND DATE(s.sale_date) >= date('now', 'start of year')
        GROUP BY c.id
        ORDER BY total DESC
        LIMIT 5
    """)).fetchall()

    vera_stats = db.execute(text("""
        SELECT
          COUNT(*) as requests,
          COALESCE(SUM(tokens_input + tokens_output), 0) as tokens,
          COALESCE(SUM(cost_estimated), 0) as cost,
          COUNT(DISTINCT company_id) as active_companies
        FROM vera_routing_logs
        WHERE created_at >= datetime('now', '-7 days')
    """)).fetchone()

    active_companies = db.execute(text("""
        SELECT COUNT(DISTINCT company_id) FROM sales
        WHERE DATE(sale_date) >= date('now', '-7 days')
    """)).scalar() or 0

    # NUEVO: Ventas por sector (YTD)
    by_sector = db.execute(text("""
        SELECT c.sector, COUNT(DISTINCT c.id) as companies, COALESCE(SUM(s.total), 0) as sales
        FROM companies c
        LEFT JOIN sales s ON s.company_id = c.id
          AND DATE(s.sale_date) >= date('now', 'start of year')
        GROUP BY c.sector
        ORDER BY sales DESC
    """)).fetchall()

    # NUEVO: Ventas por región (YTD)
    by_region = db.execute(text("""
        SELECT COALESCE(c.region, 'Sin asignar') as region, COUNT(DISTINCT c.id) as companies, COALESCE(SUM(s.total), 0) as sales
        FROM companies c
        LEFT JOIN sales s ON s.company_id = c.id
          AND DATE(s.sale_date) >= date('now', 'start of year')
        GROUP BY c.region
        ORDER BY sales DESC
    """)).fetchall()

    # NUEVO: Top proveedores cross-red (parsear de cost_entries.notes)
    cost_rows = db.execute(text("""
        SELECT notes, amount FROM cost_entries
        WHERE notes IS NOT NULL AND notes != ''
          AND date >= date('now', 'start of year')
    """)).fetchall()
    import re
    providers = {}
    for notes, amount in cost_rows:
        m = re.search(r"Proveedor:\s*([^|]+)", notes or "")
        if m:
            name = m.group(1).strip()
            if not name:
                continue
            providers[name] = providers.get(name, 0) + float(amount or 0)
    top_providers = sorted(providers.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "totals": {
            "companies": total_companies,
            "active_7d": active_companies,
            "by_plan": [{"plan": r[0] or "base", "count": r[1]} for r in by_plan],
        },
        "sales": {
            "today": round(sales_today, 2),
            "month": round(sales_month, 2),
            "year": round(sales_year, 2),
        },
        "vera_usage_7d": {
            "requests": int(vera_stats[0]) if vera_stats else 0,
            "tokens": int(vera_stats[1]) if vera_stats else 0,
            "cost_usd": round(float(vera_stats[2] or 0), 4) if vera_stats else 0,
            "active_companies": int(vera_stats[3]) if vera_stats else 0,
        },
        "top_companies_ytd": [
            {"id": r[0], "name": r[1], "plan": r[2] or "base", "sector": r[3] or "otros", "sales_ytd": round(float(r[4]), 2)}
            for r in top_companies
        ],
        "by_sector": [
            {"sector": r[0] or "otros", "companies": r[1], "sales": round(float(r[2] or 0), 2)}
            for r in by_sector
        ],
        "by_region": [
            {"region": r[0], "companies": r[1], "sales": round(float(r[2] or 0), 2)}
            for r in by_region
        ],
        "top_providers_ytd": [
            {"name": name, "total": round(total, 2)} for name, total in top_providers
        ],
    }



# ──────────────────────────────────────────────────────────────────────
# DRILL-DOWN POR EMPRESA
# ──────────────────────────────────────────────────────────────────────
def get_company_drilldown(db: Session, company_id: int) -> dict:
    """Vista profunda de una empresa específica para superadmins."""
    company = db.execute(text(
        "SELECT id, name, country, plan, sector, region, created_at FROM companies WHERE id = :cid"
    ), {"cid": company_id}).fetchone()
    if not company:
        return None

    # Stats financieros YTD
    fin = db.execute(text("""
        SELECT
          COALESCE(SUM(CASE WHEN a.account_type='income' THEN je.credit-je.debit ELSE 0 END), 0) as ingresos,
          COALESCE(SUM(CASE WHEN a.account_type='expense' THEN je.debit-je.credit ELSE 0 END), 0) as gastos
        FROM journal_entries je JOIN accounts a ON a.id = je.account_id
        WHERE je.company_id = :cid AND je.date >= date('now', 'start of year')
    """), {"cid": company_id}).fetchone()

    ingresos = float(fin[0] or 0)
    gastos = float(fin[1] or 0)
    margen = round((ingresos - gastos) / ingresos * 100, 1) if ingresos > 0 else 0

    # Stats financieros MES ACTUAL
    fin_mes = db.execute(text("""
        SELECT
          COALESCE(SUM(CASE WHEN a.account_type='income' THEN je.credit-je.debit ELSE 0 END), 0) as ingresos,
          COALESCE(SUM(CASE WHEN a.account_type='expense' THEN je.debit-je.credit ELSE 0 END), 0) as gastos
        FROM journal_entries je JOIN accounts a ON a.id = je.account_id
        WHERE je.company_id = :cid AND je.date >= date('now', 'start of month')
    """), {"cid": company_id}).fetchone()
    ing_mes = float(fin_mes[0] or 0)
    gas_mes = float(fin_mes[1] or 0)
    margen_mes = round((ing_mes - gas_mes) / ing_mes * 100, 1) if ing_mes > 0 else 0

    # Uso Vera 30d y 7d
    vera = db.execute(text("""
        SELECT
          COUNT(*) as reqs,
          COALESCE(SUM(tokens_input + tokens_output), 0) as tokens,
          COALESCE(SUM(cost_estimated), 0) as cost,
          MAX(created_at) as last
        FROM vera_routing_logs
        WHERE company_id = :cid AND created_at >= datetime('now', '-30 days')
    """), {"cid": company_id}).fetchone()

    vera_7d = db.execute(text("""
        SELECT COUNT(*) FROM vera_routing_logs
        WHERE company_id = :cid AND created_at >= datetime('now', '-7 days')
    """), {"cid": company_id}).scalar() or 0

    users = db.execute(text("""
        SELECT id, email, full_name, is_admin, is_superadmin
        FROM users WHERE company_id = :cid
    """), {"cid": company_id}).fetchall()

    last_sale = db.execute(text(
        "SELECT MAX(sale_date) FROM sales WHERE company_id = :cid"
    ), {"cid": company_id}).scalar()

    recent_topics = db.execute(text("""
        SELECT module, COUNT(*) as n
        FROM vera_routing_logs
        WHERE company_id = :cid AND created_at >= datetime('now', '-30 days')
        GROUP BY module ORDER BY n DESC LIMIT 5
    """), {"cid": company_id}).fetchall()

    # NUEVO: Conversaciones recientes con su Vera (últimas 5)
    recent_chats = db.execute(text("""
        SELECT id, question, winning_model, response_preview, created_at, tokens_input + tokens_output as tok
        FROM vera_routing_logs
        WHERE company_id = :cid
        ORDER BY created_at DESC LIMIT 5
    """), {"cid": company_id}).fetchall()

    # Health score
    health = 5
    if margen >= 25: health += 2
    elif margen >= 10: health += 1
    elif margen < 0: health -= 2
    if vera and vera[0] > 5: health += 1
    if last_sale and str(last_sale) >= date.today().replace(day=1).isoformat(): health += 1
    health = max(0, min(10, health))

    # NUEVO: Acciones recomendadas heurísticas
    actions = []
    plan = company[3] or "base"

    # 1. Margen
    if margen < 0:
        actions.append({"type": "alert", "priority": "high", "title": "Margen negativo este año", "detail": f"Margen YTD del {margen}%. Revisa estructura de costes con el cliente urgentemente.", "icon": "alert"})
    elif margen < 5 and ingresos > 0:
        actions.append({"type": "warning", "priority": "medium", "title": "Margen muy bajo", "detail": f"Margen YTD del {margen}%. Por debajo del benchmark sectorial. Conviene auditoría de gastos.", "icon": "warning"})

    # 2. Upsell a Plus
    if plan == "base" and vera and vera[1] and int(vera[1]) > 30000:
        actions.append({"type": "upsell", "priority": "high", "title": "Candidata a Vera Plus", "detail": f"Consume {int(vera[1]):,} tokens/30d con plan base. Probable que se beneficie de Plus (€19/mes, sin límite).", "icon": "upsell"})

    # 3. Churn risk
    if last_sale and str(last_sale) < date.today().replace(day=1).isoformat():
        from datetime import datetime
        try:
            last_d = datetime.fromisoformat(str(last_sale).replace(' ', 'T'))
            days_inactive = (datetime.now() - last_d).days
            if days_inactive > 30:
                actions.append({"type": "churn", "priority": "high", "title": "Riesgo de churn", "detail": f"Sin ventas registradas hace {days_inactive} días. Llamar para diagnóstico.", "icon": "churn"})
        except Exception:
            pass

    if vera_7d == 0 and (vera and vera[0] > 0):
        actions.append({"type": "engagement", "priority": "medium", "title": "Vera sin uso reciente", "detail": "El cliente usó Vera pero no la última semana. Notificar features nuevos o seguimiento.", "icon": "engagement"})

    # 4. Salud excelente → caso éxito
    if health >= 9 and margen >= 20:
        actions.append({"type": "success", "priority": "low", "title": "Cliente saludable — caso de éxito", "detail": f"Margen {margen}%, salud {health}/10. Pedirle testimonial o referral.", "icon": "success"})

    return {
        "company": {
            "id": company[0], "name": company[1],
            "country": company[2], "plan": plan,
            "sector": company[4] or "otros",
            "region": company[5],
            "created_at": company[6],
        },
        "financials_ytd": {
            "ingresos": round(ingresos, 2),
            "gastos": round(gastos, 2),
            "resultado": round(ingresos - gastos, 2),
            "margen_pct": margen,
        },
        "financials_month": {
            "ingresos": round(ing_mes, 2),
            "gastos": round(gas_mes, 2),
            "resultado": round(ing_mes - gas_mes, 2),
            "margen_pct": margen_mes,
        },
        "vera_usage_30d": {
            "requests": int(vera[0]) if vera else 0,
            "tokens": int(vera[1]) if vera else 0,
            "cost_usd": round(float(vera[2] or 0), 4) if vera else 0,
            "last_used": vera[3] if vera else None,
            "requests_7d": int(vera_7d),
        },
        "users": [
            {"id": u[0], "email": u[1], "name": u[2], "is_admin": bool(u[3]), "is_superadmin": bool(u[4])}
            for u in users
        ],
        "last_sale": last_sale,
        "vera_topics_30d": [{"module": t[0] or "general", "count": t[1]} for t in recent_topics],
        "recent_chats": [
            {
                "id": ch[0],
                "question": (ch[1] or "")[:120],
                "model": ch[2],
                "preview": (ch[3] or "")[:200],
                "created_at": ch[4],
                "tokens": ch[5] or 0,
            } for ch in recent_chats
        ],
        "health_score": health,
        "actions": actions,
    }



# ──────────────────────────────────────────────────────────────────────
# LAB — Comparar respuestas de varios modelos lado a lado
# ──────────────────────────────────────────────────────────────────────
def lab_compare(db: Session, mensaje: str, models: list, context_company_id: Optional[int] = None) -> dict:
    """Compara respuestas de varios modelos sobre la misma pregunta."""
    results = []
    extra = ""
    if context_company_id:
        row = db.execute(text("SELECT name FROM companies WHERE id = :cid"), {"cid": context_company_id}).fetchone()
        if row:
            extra = f"\nContexto: análisis sobre la empresa '{row[0]}'."

    for provider in models[:4]:
        started = time.time()
        try:
            row = db.execute(text(
                "SELECT model_id, api_key_value, api_key_env, base_url "
                "FROM vera_models_config WHERE provider = :p"
            ), {"p": provider}).fetchone()

            if not row:
                results.append({"provider": provider, "error": "Modelo no configurado", "ms": 0})
                continue

            model_id = row[0]
            import os
            api_key = row[1] or (os.getenv(row[2]) if row[2] else None)
            if not api_key:
                results.append({"provider": provider, "error": "Sin API key", "ms": 0})
                continue

            if provider.startswith("claude"):
                client = Anthropic(api_key=api_key, timeout=30.0)
                resp = client.messages.create(
                    model=model_id, max_tokens=800,
                    system="Responde de forma concisa y útil." + extra,
                    messages=[{"role": "user", "content": mensaje}]
                )
                text_out = resp.content[0].text if resp.content else ""
                tin, tout = resp.usage.input_tokens, resp.usage.output_tokens
            elif provider == "openai":
                from openai import OpenAI
                c = OpenAI(api_key=api_key, timeout=30.0)
                r = c.chat.completions.create(
                    model=model_id, max_tokens=800,
                    messages=[
                        {"role": "system", "content": "Responde de forma concisa y útil." + extra},
                        {"role": "user", "content": mensaje}
                    ]
                )
                text_out = r.choices[0].message.content
                tin, tout = r.usage.prompt_tokens, r.usage.completion_tokens
            elif provider == "gemini":
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                m = genai.GenerativeModel(model_id, system_instruction="Responde de forma concisa." + extra)
                r = m.generate_content(mensaje, generation_config={"max_output_tokens": 800})
                text_out = r.text
                tin = getattr(r.usage_metadata, 'prompt_token_count', 0)
                tout = getattr(r.usage_metadata, 'candidates_token_count', 0)
            elif provider in ("groq", "deepseek", "perplexity"):
                import requests
                r = requests.post(
                    f"{row[3]}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": model_id, "max_tokens": 800,
                        "messages": [
                            {"role": "system", "content": "Responde conciso." + extra},
                            {"role": "user", "content": mensaje},
                        ]
                    }, timeout=30
                )
                d = r.json()
                text_out = d["choices"][0]["message"]["content"]
                tin = d.get("usage", {}).get("prompt_tokens", 0)
                tout = d.get("usage", {}).get("completion_tokens", 0)
            else:
                results.append({"provider": provider, "error": f"Provider {provider} no soportado", "ms": 0})
                continue

            ms = int((time.time() - started) * 1000)
            results.append({
                "provider": provider,
                "model_id": model_id,
                "response": text_out,
                "tokens_input": tin, "tokens_output": tout,
                "latency_ms": ms,
                "error": None,
            })
        except Exception as e:
            ms = int((time.time() - started) * 1000)
            results.append({"provider": provider, "error": str(e)[:300], "ms": ms})

    return {"question": mensaje, "results": results}
