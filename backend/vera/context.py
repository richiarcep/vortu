"""
vera/context.py — constructor de contexto multi-fuente.

Junta datos de las 3 bases de datos para cada pregunta de Vera:
- SQL (SQLite/Postgres): datos transaccionales (ventas, asientos, clientes)
- Neo4j: relaciones del negocio (cliente-producto, empleado-proyecto)
- Chroma: memoria semántica (conversaciones previas, documentos)
"""
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text


def build_sql_context(db: Session, company_id: int) -> str:
    """Datos transaccionales actuales del negocio desde SQL."""
    if not company_id:
        return ""

    try:
        company = db.execute(text("""
            SELECT id, name, country FROM companies WHERE id = :cid
        """), {"cid": company_id}).fetchone()
    except Exception:
        return ""

    if not company:
        return ""

    parts = [f"## EMPRESA"]
    parts.append(f"- {company[1]} ({company[2].upper() if len(company) > 2 and company[2] else 'ES'})")

    today = date.today()
    last_30 = (today - timedelta(days=30)).isoformat()

    # Ventas últimos 30d
    try:
        sales = db.execute(text("""
            SELECT COALESCE(SUM(total), 0), COUNT(*)
            FROM sales WHERE company_id = :cid AND sale_date >= :d
        """), {"cid": company_id, "d": last_30}).fetchone()
        if sales and sales[0]:
            parts.append(f"\n## VENTAS últimos 30 días")
            parts.append(f"- Volumen: €{sales[0]:,.2f}")
            parts.append(f"- Transacciones: {sales[1]}")
            if sales[1] > 0:
                parts.append(f"- Ticket medio: €{sales[0]/sales[1]:.2f}")
    except Exception:
        pass

    # Top productos
    try:
        top = db.execute(text("""
            SELECT p.name, SUM(si.quantity) qty, SUM(si.line_total) total_p
            FROM sale_items si
            JOIN products p ON p.id = si.product_id
            JOIN sales s ON s.id = si.sale_id
            WHERE s.company_id = :cid AND s.sale_date >= :d
            GROUP BY p.name ORDER BY total_p DESC LIMIT 5
        """), {"cid": company_id, "d": last_30}).fetchall()
        if top:
            parts.append(f"\n## TOP 5 PRODUCTOS últimos 30d")
            for p in top:
                parts.append(f"- {p[0]}: {int(p[1])} uds, €{p[2]:,.2f}")
    except Exception:
        pass

    # P&L desde journal_entries (PGC español)
    try:
        je = db.execute(text("""
            SELECT
              COALESCE(SUM(CASE WHEN a.account_type = 'income' THEN je.credit - je.debit ELSE 0 END), 0) as ingresos,
              COALESCE(SUM(CASE WHEN a.account_type = 'expense' THEN je.debit - je.credit ELSE 0 END), 0) as gastos,
              COALESCE(SUM(CASE WHEN a.account_type = 'asset' AND (LOWER(a.name) LIKE '%caja%' OR LOWER(a.name) LIKE '%banco%' OR LOWER(a.name) LIKE '%efectivo%') THEN je.debit - je.credit ELSE 0 END), 0) as caja
            FROM journal_entries je
            JOIN accounts a ON a.id = je.account_id
            WHERE je.company_id = :cid AND je.date >= :d
        """), {"cid": company_id, "d": last_30}).fetchone()
        if je:
            ingresos, gastos, caja = float(je[0]), float(je[1]), float(je[2])
            margen = ((ingresos - gastos) / ingresos * 100) if ingresos > 0 else 0
            parts.append(f"\n## CONTABILIDAD últimos 30 días")
            parts.append(f"- Ingresos: €{ingresos:,.2f}")
            parts.append(f"- Gastos: €{gastos:,.2f}")
            parts.append(f"- Resultado neto: €{ingresos - gastos:,.2f}")
            parts.append(f"- Margen: {margen:.1f}%")
            parts.append(f"- Caja: €{caja:,.2f}")
    except Exception:
        pass

    # Clientes
    try:
        clients = db.execute(text("""
            SELECT COUNT(*) FROM clients WHERE company_id = :cid
        """), {"cid": company_id}).fetchone()
        if clients and clients[0]:
            parts.append(f"\n## CLIENTES")
            parts.append(f"- Total: {clients[0]}")
    except Exception:
        pass

    # Empleados
    try:
        emp = db.execute(text("""
            SELECT COUNT(*) FROM employees WHERE company_id = :cid
        """), {"cid": company_id}).fetchone()
        if emp and emp[0]:
            parts.append(f"- Empleados: {emp[0]}")
    except Exception:
        pass

    return "\n".join(parts)


def build_neo4j_context(company_id: int, question: str) -> str:
    """Relaciones relevantes desde Neo4j según la pregunta."""
    if not company_id:
        return ""

    try:
        from services.graph.neo4j_store import graph_store
    except Exception:
        return ""

    q_lower = question.lower()
    parts = []

    try:
        # Si pregunta sobre clientes/relaciones, sacar top clientes con productos
        if any(k in q_lower for k in ["cliente", "compra", "top", "mejor", "fidel"]):
            rows = graph_store.run("""
                MATCH (c:Client {company_id: $cid})-[:BOUGHT]->(p:Product)
                RETURN c.name as cliente, count(p) as compras, sum(p.price) as gasto_total
                ORDER BY gasto_total DESC LIMIT 5
            """, cid=str(company_id))
            if rows:
                parts.append("## TOP CLIENTES por relaciones de compra")
                for r in rows:
                    parts.append(f"- {r.get('cliente', '?')}: {r.get('compras', 0)} productos, €{r.get('gasto_total', 0):.2f}")

        # Si pregunta sobre empleados/proyectos
        if any(k in q_lower for k in ["empleado", "equipo", "proyecto", "trabaj"]):
            rows = graph_store.run("""
                MATCH (e:Employee {company_id: $cid})-[:WORKS_ON]->(p:Project)
                RETURN e.name as empleado, collect(p.name) as proyectos LIMIT 5
            """, cid=str(company_id))
            if rows:
                parts.append("\n## EMPLEADOS Y PROYECTOS")
                for r in rows:
                    proyectos = ", ".join(r.get('proyectos', []) or [])
                    parts.append(f"- {r.get('empleado', '?')}: {proyectos}")
    except Exception as e:
        # Si Neo4j no está disponible, simplemente no añadir contexto
        pass

    return "\n".join(parts) if parts else ""


def build_chroma_context(company_id: int, question: str) -> str:
    """Memoria semántica: conversaciones previas relevantes a la pregunta."""
    if not company_id:
        return ""

    try:
        from services.vector.store import vector_store
    except Exception:
        return ""

    try:
        results = vector_store.search(
            "memory", question, n_results=3,
            filters={"company_id": str(company_id)}
        )
        if not results:
            return ""

        parts = ["## MEMORIA RELEVANTE (conversaciones previas)"]
        for r in results[:3]:
            txt = r.get("text", "").strip()[:200]
            if txt:
                parts.append(f"- {txt}")
        return "\n".join(parts)
    except Exception:
        return ""


def build_full_context(db: Session, company_id: int, question: str) -> str:
    """
    Construye el contexto completo combinando las 3 BD.
    Devuelve un único string listo para inyectar en el system prompt.
    """
    sql_ctx = build_sql_context(db, company_id)
    neo4j_ctx = build_neo4j_context(company_id, question)
    chroma_ctx = build_chroma_context(company_id, question)

    parts = []
    if sql_ctx:
        parts.append(sql_ctx)
    if neo4j_ctx:
        parts.append(neo4j_ctx)
    if chroma_ctx:
        parts.append(chroma_ctx)

    if not parts:
        return "No hay datos del negocio disponibles."

    return "\n\n".join(parts)


def save_to_memory(company_id: int, question: str, answer: str, module: str = None):
    """Guarda esta conversación en Chroma para futuras búsquedas semánticas."""
    if not company_id:
        return
    try:
        from services.vector.store import vector_store
        from datetime import datetime
        doc_id = f"vera_chat_{company_id}_{datetime.utcnow().isoformat()}"
        text_to_store = f"P: {question}\nR: {answer}"
        vector_store.upsert("memory", doc_id, text_to_store, {
            "company_id": str(company_id),
            "type": "vera_chat",
            "module": module or "general",
            "date": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass


# ─────────────────────────────────────────────────────────
# Compatibilidad con el engine viejo (vera/engine.py)
# ─────────────────────────────────────────────────────────
def construir_contexto(db, company_id: int, mensaje: str = "", modulo: str = None) -> str:
    """Wrapper compat: redirige al builder nuevo de 3 BD."""
    return build_full_context(db, company_id, mensaje)
