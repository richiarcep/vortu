"""Extraction routing + the training flywheel.

`run_extraction()` is the single entry the /analyze endpoint calls: Vera API primary
(when enabled + reachable) → Vela's in-app pipeline on ANY failure. `submit_correction()`
feeds human fixes back to Vera /v1/train (best-effort, never raises). `connector_status()`
backs the UI indicator. All OFF unless VERA_EXTRACTION_MODE=vera / VERA_TRAIN_ENABLED=true.
"""
from __future__ import annotations

import logging
from typing import Callable, Optional

from core.config import get_settings
from . import client, mapping

logger = logging.getLogger("vela.vera_connector")


_MODE_KEY = "vera_extraction_mode"
VALID_MODES = ("internal", "vera")


def current_mode(db=None) -> str:
    """Effective extraction provider. A DB override (set via the admin toggle) wins
    over the VERA_EXTRACTION_MODE env default, so the switch takes effect at runtime
    without a restart. Falls back to the env value when no db / no override."""
    if db is not None:
        try:
            from sqlalchemy import text
            row = db.execute(text("SELECT value FROM app_settings WHERE key=:k"),
                             {"k": _MODE_KEY}).fetchone()
            if row and row[0] in VALID_MODES:
                return row[0]
        except Exception:
            pass
    return get_settings().VERA_EXTRACTION_MODE


def set_mode(db, mode: str, user_id=None) -> str:
    """Persist the extraction provider (admin toggle). Returns the stored mode."""
    if mode not in VALID_MODES:
        raise ValueError(f"mode must be one of {VALID_MODES}")
    from sqlalchemy import text
    from datetime import datetime
    db.execute(text(
        "INSERT INTO app_settings (key, value, updated_at, updated_by) "
        "VALUES (:k, :v, :ts, :u) "
        "ON CONFLICT (key) DO UPDATE SET value=excluded.value, "
        "updated_at=excluded.updated_at, updated_by=excluded.updated_by"
    ), {"k": _MODE_KEY, "v": mode, "ts": datetime.utcnow().isoformat(), "u": user_id})
    db.commit()
    return mode


def vera_enabled(db=None) -> bool:
    """True when the connector should be used as the primary extraction engine."""
    return current_mode(db) == "vera" and client.is_configured()


def run_extraction(*, text_content: str, filename: str,
                   internal_extractor: Callable[[], dict],
                   doc_type: Optional[str] = None, db=None) -> dict:
    """Vera API primary → internal fallback.

    `internal_extractor` is a zero-arg callable running Vela's existing pipeline and
    returning an `analysis` dict. If Vera is disabled, unreachable, or errors, we run
    it transparently — the caller never sees a failure from Vera. `db` lets the
    runtime provider override (admin toggle) be honoured.
    """
    if vera_enabled(db):
        try:
            resp = client.extract(text_content, doc_type=doc_type)
            analysis = mapping.vera_to_analysis(resp, filename=filename, fallback_text=text_content)
            logger.info("Extraction via Vera · type=%s · conf=%.2f",
                        analysis.get("document_type"), analysis.get("confidence", 0.0))
            return analysis
        except client.VeraError as e:
            logger.warning("Vera extract failed (%s) → internal pipeline", e)
        except Exception as e:  # noqa: BLE001 — never let Vera break extraction
            logger.warning("Vera extract unexpected error (%s) → internal pipeline", e)
    analysis = internal_extractor()
    if isinstance(analysis, dict):
        analysis.setdefault("_engine", "internal")
    return analysis


def submit_correction(*, text: str, output: dict, doc_type: str,
                      source_ref: Optional[str] = None, notes: Optional[str] = None) -> bool:
    """Fire-and-forget POST of a human correction to Vera /v1/train. Returns True on
    success; never raises (training is best-effort, gated by VERA_TRAIN_ENABLED)."""
    s = get_settings()
    if not (s.VERA_TRAIN_ENABLED and client.is_configured()):
        return False
    if not text or not output or not doc_type:
        logger.info("Skipping Vera /v1/train — missing text/output/doc_type")
        return False
    try:
        res = client.train(text, output, doc_type, source_ref=source_ref, notes=notes)
        logger.info("Vera /v1/train ok · doc_type=%s · labels=%s", doc_type, res.get("labels"))
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Vera /v1/train failed: %s", e)
        return False


def connector_status(db=None) -> dict:
    """For the UI: configured / effective mode / enabled, and is Vera healthy now?"""
    s = get_settings()
    configured = client.is_configured()
    mode = current_mode(db)
    out = {
        "configured": configured,
        "mode": mode,
        "env_mode": s.VERA_EXTRACTION_MODE,
        "enabled": mode == "vera" and configured,
        "train_enabled": bool(s.VERA_TRAIN_ENABLED),
        "url": s.VERA_API_URL or None,
        "healthy": None,
        "health": None,
    }
    if configured:
        try:
            out["health"] = client.health()
            out["healthy"] = True
        except Exception as e:  # noqa: BLE001
            out["healthy"] = False
            out["health"] = {"error": str(e)}
    return out
