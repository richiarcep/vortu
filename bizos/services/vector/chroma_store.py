"""
Implementacion de VectorStore usando ChromaDB.
Para cambiar a Qdrant: crear qdrant_store.py con la misma interfaz.
"""
import chromadb
from chromadb.config import Settings
from typing import List, Optional
from pathlib import Path
from .base import VectorStore


class ChromaStore(VectorStore):
    """
    Vector DB usando ChromaDB local.
    Los datos se persisten en /bizos/data/chroma/
    Preparado para ser reemplazado por cualquier otro vector DB.
    """

    def __init__(self, persist_path: str = None):
        if persist_path is None:
            persist_path = str(Path(__file__).parent.parent.parent / "data" / "chroma")

        Path(persist_path).mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=persist_path,
            settings=Settings(anonymized_telemetry=False)
        )
        self._collections = {}

    def _get_collection(self, name: str):
        """Obtiene o crea una coleccion."""
        if name not in self._collections:
            self._collections[name] = self.client.get_or_create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"}
            )
        return self._collections[name]

    def upsert(self, collection: str, doc_id: str, text: str, metadata: dict = None) -> bool:
        """Guarda o actualiza un documento."""
        try:
            col = self._get_collection(collection)
            col.upsert(
                ids=[doc_id],
                documents=[text],
                metadatas=[metadata or {}]
            )
            return True
        except Exception as e:
            print(f"ChromaStore.upsert error: {e}")
            return False

    def search(self, collection: str, query: str, n_results: int = 5, filters: dict = None) -> List[dict]:
        """
        Busca documentos semanticamente similares.
        Devuelve lista de {id, text, metadata, score}
        """
        try:
            col = self._get_collection(collection)
            count = col.count()
            if count == 0:
                return []

            n_results = min(n_results, count)
            kwargs = {"query_texts": [query], "n_results": n_results}
            if filters:
                kwargs["where"] = filters

            results = col.query(**kwargs)

            output = []
            for i in range(len(results["ids"][0])):
                output.append({
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "score": 1 - results["distances"][0][i],  # cosine similarity
                })
            return output
        except Exception as e:
            print(f"ChromaStore.search error: {e}")
            return []

    def delete(self, collection: str, doc_id: str) -> bool:
        """Elimina un documento."""
        try:
            col = self._get_collection(collection)
            col.delete(ids=[doc_id])
            return True
        except Exception as e:
            print(f"ChromaStore.delete error: {e}")
            return False

    def delete_collection(self, collection: str) -> bool:
        """Elimina toda una coleccion."""
        try:
            self.client.delete_collection(collection)
            self._collections.pop(collection, None)
            return True
        except Exception as e:
            print(f"ChromaStore.delete_collection error: {e}")
            return False

    def count(self, collection: str) -> int:
        """Cuenta documentos."""
        try:
            col = self._get_collection(collection)
            return col.count()
        except:
            return 0
