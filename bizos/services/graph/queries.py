"""
Queries de razonamiento avanzado usando Neo4j.
"""
from .neo4j_store import graph_store


def get_risk_chain(company_id: int) -> list:
    return graph_store.run("""
        MATCH (comp:Company {pg_id: $company_id})
        MATCH (contact:Contact)-[:CLIENT_OF]->(comp)
        WHERE contact.risk_level IN ['alto', 'critico']
        MATCH (proj:Project)-[:BELONGS_TO]->(comp)
        WHERE proj.health_score < 6
        RETURN contact.name AS cliente,
               contact.sentiment_score AS sentiment,
               contact.risk_level AS riesgo_cliente,
               proj.name AS proyecto,
               proj.health_score AS health_proyecto,
               (10 - contact.sentiment_score) + (10 - proj.health_score) AS riesgo_total
        ORDER BY riesgo_total DESC
        LIMIT 5
    """, company_id=company_id)


def get_product_affinity(company_id: int) -> list:
    return graph_store.run("""
        MATCH (comp:Company {pg_id: $company_id})
        MATCH (s:Sale)-[:BELONGS_TO]->(comp)
        MATCH (s)-[:INCLUDES]->(p1:Product)
        MATCH (s)-[:INCLUDES]->(p2:Product)
        WHERE p1.pg_id < p2.pg_id
        RETURN p1.name AS producto_a,
               p2.name AS producto_b,
               COUNT(*) AS veces_juntos
        ORDER BY veces_juntos DESC
        LIMIT 10
    """, company_id=company_id)


def get_business_overview_graph(company_id: int) -> dict:
    result = graph_store.run("""
        MATCH (comp:Company {pg_id: $company_id})
        OPTIONAL MATCH (s:Sale)-[:BELONGS_TO]->(comp)
        OPTIONAL MATCH (p:Product)-[:BELONGS_TO]->(comp)
        OPTIONAL MATCH (c:Contact)-[:CLIENT_OF]->(comp)
        OPTIONAL MATCH (proj:Project)-[:BELONGS_TO]->(comp)
        OPTIONAL MATCH (e:Employee)-[:WORKS_AT]->(comp)
        RETURN COUNT(DISTINCT s) AS ventas,
               COUNT(DISTINCT p) AS productos,
               COUNT(DISTINCT c) AS contactos,
               COUNT(DISTINCT proj) AS proyectos,
               COUNT(DISTINCT e) AS empleados,
               SUM(s.total) AS ingresos_totales,
               AVG(c.sentiment_score) AS sentiment_medio
    """, company_id=company_id)
    return result[0] if result else {}


def get_employee_project_correlation(company_id: int) -> list:
    return graph_store.run("""
        MATCH (comp:Company {pg_id: $company_id})
        MATCH (e:Employee)-[:WORKS_AT]->(comp)
        MATCH (e)-[:ASSIGNED_TO]->(t:Task)-[:PART_OF]->(proj:Project)-[:BELONGS_TO]->(comp)
        RETURN e.name AS empleado,
               COUNT(DISTINCT proj) AS proyectos,
               AVG(proj.health_score) AS health_score_avg
        ORDER BY health_score_avg ASC
        LIMIT 10
    """, company_id=company_id)
