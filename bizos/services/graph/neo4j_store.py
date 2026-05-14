"""
Integración Neo4j para Vortu.
Maneja nodos y relaciones entre entidades del negocio.
"""
from neo4j import GraphDatabase
from core.config import get_settings

settings = get_settings()


class Neo4jStore:
    def __init__(self):
        self._driver = None

    def connect(self):
        if not self._driver:
            self._driver = GraphDatabase.driver(
                getattr(settings, 'NEO4J_URI', 'bolt://localhost:7687'),
                auth=(
                    getattr(settings, 'NEO4J_USER', 'neo4j'),
                    getattr(settings, 'NEO4J_PASSWORD', 'nexum2026')
                )
            )
        return self._driver

    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None

    def run(self, query: str, **params):
        driver = self.connect()
        with driver.session() as session:
            result = session.run(query, **params)
            return [dict(r) for r in result]

    def run_write(self, query: str, **params):
        driver = self.connect()
        with driver.session() as session:
            result = session.execute_write(lambda tx: tx.run(query, **params))
            return result


graph_store = Neo4jStore()
