"""
Schema de Neo4j para Vortu.
Define constraints, índices y estructura del grafo.
"""
from .neo4j_store import graph_store

SCHEMA_QUERIES = [
    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Company) REQUIRE c.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Sale) REQUIRE s.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Contact) REQUIRE c.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (m:Message) REQUIRE m.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (proj:Project) REQUIRE proj.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Task) REQUIRE t.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Employee) REQUIRE e.pg_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (snap:Snapshot) REQUIRE snap.pg_id IS UNIQUE",
    "CREATE INDEX IF NOT EXISTS FOR (c:Company) ON (c.name)",
    "CREATE INDEX IF NOT EXISTS FOR (s:Sale) ON (s.sale_date)",
    "CREATE INDEX IF NOT EXISTS FOR (c:Contact) ON (c.risk_level)",
    "CREATE INDEX IF NOT EXISTS FOR (proj:Project) ON (proj.health_score)",
    "CREATE INDEX IF NOT EXISTS FOR (snap:Snapshot) ON (snap.snapshot_date)",
]


def init_schema():
    for query in SCHEMA_QUERIES:
        try:
            graph_store.run(query)
            print(f"✅ {query[:60]}...")
        except Exception as e:
            print(f"⚠️  {str(e)[:80]}")
    print("✅ Schema Neo4j listo")


if __name__ == "__main__":
    init_schema()
