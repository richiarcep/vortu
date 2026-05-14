"""
Interfaz generica para cualquier vector DB.
Hoy usa Chroma. Mañana puede ser Qdrant, Pinecone o Weaviate
sin tocar el resto del codigo.
"""
from abc import ABC, abstractmethod
from typing import List, Optional


class VectorStore(ABC):
    """Interfaz base — todos los vector DBs implementan esto."""

    @abstractmethod
    def upsert(self, collection: str, doc_id: str, text: str, metadata: dict = None) -> bool:
        """Guarda o actualiza un documento en la coleccion."""
        pass

    @abstractmethod
    def search(self, collection: str, query: str, n_results: int = 5, filters: dict = None) -> List[dict]:
        """Busca documentos semanticamente similares a la query."""
        pass

    @abstractmethod
    def delete(self, collection: str, doc_id: str) -> bool:
        """Elimina un documento de la coleccion."""
        pass

    @abstractmethod
    def delete_collection(self, collection: str) -> bool:
        """Elimina toda una coleccion."""
        pass

    @abstractmethod
    def count(self, collection: str) -> int:
        """Cuenta documentos en una coleccion."""
        pass
