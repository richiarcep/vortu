"""
Sincroniza la memoria IA entre PostgreSQL y ChromaDB.
PostgreSQL = fuente de verdad (trazabilidad, historial)
ChromaDB   = busqueda semantica (el agente IA busca por significado)
"""
from sqlalchemy.orm import Session
from models.analytics import MemoryEntry, BusinessAIMemory
from services.vector.store import vector_store, COLLECTIONS


COLLECTION = COLLECTIONS["memory"]


def sync_entry_to_vector(entry: MemoryEntry) -> bool:
    """
    Sincroniza una entrada de memoria a ChromaDB.
    Se llama automaticamente cuando se crea una nueva entrada.
    """
    doc_id = f"company_{entry.company_id}_entry_{entry.id}"
    text = entry.contenido
    metadata = {
        "company_id": str(entry.company_id),
        "tipo": entry.tipo or "auto",
        "categoria": entry.categoria or "general",
        "confianza": str(entry.confianza or 0.8),
        "fecha": entry.created_at.isoformat() if entry.created_at else "",
        "autor": entry.autor or "claude-auto",
    }
    return vector_store.upsert(COLLECTION, doc_id, text, metadata)


def sync_manual_context(company_id: int, memory: BusinessAIMemory) -> bool:
    """
    Sincroniza el contexto manual (personality, goals, training) a ChromaDB.
    """
    results = []

    if memory.manual_training:
        ok = vector_store.upsert(
            COLLECTION,
            f"company_{company_id}_manual_training",
            memory.manual_training,
            {"company_id": str(company_id), "tipo": "manual", "categoria": "training"}
        )
        results.append(ok)

    if memory.business_personality:
        ok = vector_store.upsert(
            COLLECTION,
            f"company_{company_id}_personality",
            memory.business_personality,
            {"company_id": str(company_id), "tipo": "manual", "categoria": "personality"}
        )
        results.append(ok)

    if memory.business_goals:
        ok = vector_store.upsert(
            COLLECTION,
            f"company_{company_id}_goals",
            memory.business_goals,
            {"company_id": str(company_id), "tipo": "manual", "categoria": "goals"}
        )
        results.append(ok)

    return all(results) if results else True


def search_memory(company_id: int, query: str, n_results: int = 5) -> list:
    """
    Busca semanticamente en la memoria de una empresa.
    Usado por el Agente IA para encontrar contexto relevante.
    """
    results = vector_store.search(
        COLLECTION,
        query,
        n_results=n_results,
        filters={"company_id": str(company_id)}
    )
    return results


def get_semantic_context(company_id: int, query: str, n_results: int = 5) -> str:
    """
    Devuelve el contexto semantico relevante para una query.
    Usado directamente en los prompts de Claude.
    """
    results = search_memory(company_id, query, n_results)
    if not results:
        return ""

    lines = []
    for r in results:
        categoria = r["metadata"].get("categoria", "general")
        lines.append(f"- [{categoria}] {r['text']}")

    return "\n".join(lines)


def migrate_existing_memory(db: Session) -> dict:
    """
    Migra toda la memoria existente en PostgreSQL a ChromaDB.
    Ejecutar una sola vez.
    """
    entries = db.query(MemoryEntry).all()
    memories = db.query(BusinessAIMemory).all()

    synced_entries = 0
    synced_manual = 0
    errors = 0

    for entry in entries:
        ok = sync_entry_to_vector(entry)
        if ok:
            synced_entries += 1
        else:
            errors += 1

    for memory in memories:
        ok = sync_manual_context(memory.company_id, memory)
        if ok:
            synced_manual += 1
        else:
            errors += 1

    return {
        "entries_synced": synced_entries,
        "manual_synced": synced_manual,
        "errors": errors,
        "total": synced_entries + synced_manual,
    }
