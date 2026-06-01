"""TemporalMemory (Phase 1, basic).

- Fingerprint lookup/upsert in doc_fingerprints (dedupe + provider memory key).
- Similar past documents via the existing Chroma "documents" collection.
Negative memory + correction-feedback loops are Phase 3.
"""
import logging
from datetime import datetime
from sqlalchemy import text

logger = logging.getLogger("vera.extraction.memory")


def lookup_fingerprint(db, company_id: int, fingerprint: str) -> dict | None:
    row = db.execute(text(
        "SELECT id, times_seen, provider_cif, doc_template_slug, layout_signature_json "
        "FROM doc_fingerprints WHERE company_id = :cid AND fingerprint = :fp"
    ), {"cid": company_id, "fp": fingerprint}).fetchone()
    if not row:
        return None
    return {"id": row[0], "times_seen": row[1], "provider_cif": row[2],
            "doc_template_slug": row[3], "layout_signature_json": row[4]}


def record_fingerprint(db, company_id: int, fingerprint: str,
                       provider_cif: str = None, slug: str = None) -> None:
    """Insert or bump times_seen for a fingerprint."""
    existing = lookup_fingerprint(db, company_id, fingerprint)
    now = datetime.now().isoformat()
    try:
        if existing:
            db.execute(text(
                "UPDATE doc_fingerprints SET times_seen = times_seen + 1, last_seen_at = :now, "
                "provider_cif = COALESCE(:cif, provider_cif), doc_template_slug = COALESCE(:slug, doc_template_slug) "
                "WHERE id = :id"
            ), {"now": now, "cif": provider_cif, "slug": slug, "id": existing["id"]})
        else:
            db.execute(text(
                "INSERT INTO doc_fingerprints (company_id, fingerprint, provider_cif, doc_template_slug, times_seen, last_seen_at) "
                "VALUES (:cid, :fp, :cif, :slug, 1, :now)"
            ), {"cid": company_id, "fp": fingerprint, "cif": provider_cif, "slug": slug, "now": now})
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("record_fingerprint failed: %s", e)


def get_provider_corrections(db, company_id: int, provider_cif: str) -> dict | None:
    """Aggregate past human corrections for a provider into prompt memory.
    Returns {"corrections_json": '{field: hint}', "times_seen": n} or None.
    Consumed by doc_template_service.build_extraction_prompt → closes the learning loop."""
    if not provider_cif:
        return None
    rows = db.execute(text(
        "SELECT field_key, corrected_value, COUNT(*) c FROM extraction_feedback "
        "WHERE company_id = :cid AND provider = :cif AND corrected_value IS NOT NULL "
        "AND corrected_value != '' GROUP BY field_key, corrected_value ORDER BY c DESC"
    ), {"cid": company_id, "cif": provider_cif}).fetchall()
    if not rows:
        return None
    # Most-corrected value per field becomes the hint.
    hints, seen = {}, set()
    total = 0
    for field_key, corrected, cnt in rows:
        total += cnt
        if field_key in seen:
            continue
        seen.add(field_key)
        hints[field_key] = f"en documentos de este proveedor suele ser '{corrected}' (corregido {cnt}x)"
    import json as _json
    return {"corrections_json": _json.dumps(hints, ensure_ascii=False), "times_seen": total}


def similar_documents(company_id: int, text_sample: str, n: int = 3) -> list:
    """Retrieve semantically similar past documents from Chroma (best-effort)."""
    if not text_sample:
        return []
    try:
        from services.vector.store import vector_store
        results = vector_store.search(
            "documents", text_sample[:1500], n_results=n,
            filters={"company_id": str(company_id)},
        )
        return results or []
    except Exception as e:
        logger.info("similar_documents lookup skipped: %s", e)
        return []
