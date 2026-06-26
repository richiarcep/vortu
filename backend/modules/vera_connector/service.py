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


def vera_enabled() -> bool:
    """True when the connector should be used as the primary extraction engine."""
    s = get_settings()
    return s.VERA_EXTRACTION_MODE == "vera" and client.is_configured()


def run_extraction(*, text_content: str, filename: str,
                   internal_extractor: Callable[[], dict],
                   doc_type: Optional[str] = None) -> dict:
    """Vera API primary → internal fallback.

    `internal_extractor` is a zero-arg callable running Vela's existing pipeline and
    returning an `analysis` dict. If Vera is disabled, unreachable, or errors, we run
    it transparently — the caller never sees a failure from Vera.
    """
    if vera_enabled():
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


def connector_status() -> dict:
    """For the UI: is the connector configured / enabled, and is Vera healthy now?"""
    s = get_settings()
    configured = client.is_configured()
    out = {
        "configured": configured,
        "mode": s.VERA_EXTRACTION_MODE,
        "enabled": vera_enabled(),
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
