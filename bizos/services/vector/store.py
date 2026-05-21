"""
Singleton: instancia unica del vector store para toda la app.
Para cambiar de Chroma a otro sistema: solo cambiar esta linea.
"""
from .chroma_store import ChromaStore

# ── CAMBIAR AQUI PARA USAR OTRO VECTOR DB ─────────────────────────────────────
# from .qdrant_store import QdrantStore
# vector_store = QdrantStore()

vector_store: ChromaStore = ChromaStore()

# Colecciones del sistema
COLLECTIONS = {
    "memory":     "company_memory",      # Hechos aprendidos por IA por empresa
    "documents":  "company_documents",   # Documentos subidos por usuarios
    "knowledge":  "company_knowledge",   # Knowledge base de clientes
    "prompts":    "system_prompts",      # Prompts del sistema (cache semantico)
}
