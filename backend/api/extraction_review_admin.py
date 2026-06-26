"""Human-review queue for the extraction pipeline (Phase 3).

Docs the pipeline flagged `needs_review` land here. A reviewer corrects fields; the
corrections are stored as extraction_feedback keyed by the provider, which feeds back
into future extraction prompts (vera/extraction/memory.get_provider_corrections).
"""
import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from core.database import get_db
from core.security import get_admin_user, get_tenant_db
from models.user import User

logger = logging.getLogger("vera.extraction.review")
router = APIRouter(prefix="/api/admin/extraction-review", tags=["Extraction Review"])


@router.get("")
def list_pending(db: Session = Depends(get_tenant_db), admin: User = Depends(get_admin_user)):
    """Pending review items for the admin's company, with extracted data for context."""
    rows = db.execute(text("""
        SELECT q.id, q.document_id, q.run_id, q.doc_template_slug, q.reason,
               q.low_conf_fields_json, q.created_at, d.filename, r.overall_confidence, d.ai_result
        FROM extraction_review_queue q
        LEFT JOIN documents d ON d.id = q.document_id
        LEFT JOIN extraction_runs r ON r.id = q.run_id
        WHERE q.company_id = :cid AND q.status = 'pending'
        ORDER BY q.created_at DESC
    """), {"cid": admin.company_id}).fetchall()

    items = []
    for r in rows:
        try:
            ai = json.loads(r[9]) if r[9] else {}
        except Exception:
            ai = {}
        items.append({
            "id": r[0], "document_id": r[1], "run_id": r[2], "template": r[3],
            "reason": r[4],
            "low_confidence_fields": json.loads(r[5]) if r[5] else [],
            "created_at": r[6], "filename": r[7],
            "confidence": r[8],
            "extracted_data": ai.get("extracted_data", {}),
            "provider_cif": (ai.get("extracted_data", {}) or {}).get("proveedor_cif"),
        })
    return {"items": items, "total": len(items)}


@router.post("/{queue_id}/resolve")
def resolve(queue_id: int, data: dict, db: Session = Depends(get_tenant_db),
            admin: User = Depends(get_admin_user)):
    """Resolve a review item. Body: {corrections: {field_key: corrected_value}, provider_cif?}.
    Stores corrections as extraction_feedback (the learning signal) and closes the item."""
    q = db.execute(text(
        "SELECT document_id, run_id, doc_template_slug FROM extraction_review_queue "
        "WHERE id = :id AND company_id = :cid AND status = 'pending'"
    ), {"id": queue_id, "cid": admin.company_id}).fetchone()
    if not q:
        raise HTTPException(404, "Item de revisión no encontrado o ya resuelto")
    document_id, run_id, slug = q

    corrections = (data or {}).get("corrections", {}) or {}
    provider_cif = (data or {}).get("provider_cif")
    # Fall back to the provider stored on the document if not supplied.
    if not provider_cif and document_id:
        doc = db.execute(text("SELECT ai_result FROM documents WHERE id = :d"), {"d": document_id}).fetchone()
        if doc and doc[0]:
            try:
                provider_cif = (json.loads(doc[0]).get("extracted_data", {}) or {}).get("proveedor_cif")
            except Exception:
                pass

    now = datetime.now().isoformat()
    for field_key, corrected_value in corrections.items():
        db.execute(text(
            "INSERT INTO extraction_feedback (company_id, document_id, run_id, field_key, "
            "ai_value, corrected_value, was_correct, provider, created_at) "
            "VALUES (:cid, :doc, :run, :fk, NULL, :cv, 0, :prov, :now)"
        ), {"cid": admin.company_id, "doc": document_id, "run": run_id, "fk": field_key,
            "cv": str(corrected_value), "prov": provider_cif, "now": now})

    db.execute(text(
        "UPDATE extraction_review_queue SET status='resolved', resolved_by=:uid, resolved_at=:now "
        "WHERE id = :id"
    ), {"uid": admin.id, "now": now, "id": queue_id})
    db.commit()

    # Feed the human correction back to the external Vera training flywheel
    # (/v1/train). Best-effort and OFF unless VERA_TRAIN_ENABLED — never blocks resolve.
    try:
        from core.config import get_settings
        _s = get_settings()
        if _s.VERA_TRAIN_ENABLED and _s.VERA_API_URL and corrections:
            from modules.vera_connector import service as _vera, mapping as _vmap
            _text, _raw = "", {}
            if document_id:
                drow = db.execute(text("SELECT file_path, ai_result FROM documents WHERE id=:d"),
                                  {"d": document_id}).fetchone()
                if drow:
                    try:
                        _raw = (json.loads(drow[1]) or {}).get("extracted_data") or {} if drow[1] else {}
                    except Exception:
                        _raw = {}
                    try:  # re-derive the document text from the stored file
                        from pathlib import Path as _P
                        from api.documentos import parse_file as _parse
                        _p = _parse(drow[0], _P(drow[0]).suffix.lstrip("."))
                        _text = _p if isinstance(_p, str) else json.dumps(_p, ensure_ascii=False, default=str)
                    except Exception:
                        _text = ""
            _vera.submit_correction(
                text=_text or json.dumps(_raw, ensure_ascii=False),
                output=_vmap.corrections_to_train_output(corrections, _raw),
                doc_type=(slug or "factura"),
                source_ref=str(document_id) if document_id else None,
                notes=(data or {}).get("notes"),
            )
    except Exception as e:
        logger.warning("Vera /v1/train hook skipped: %s", e)

    return {"ok": True, "resolved": queue_id, "corrections_saved": len(corrections),
            "provider_cif": provider_cif,
            "note": "Las correcciones se aplicarán a futuros documentos de este proveedor."}
