"""Thin HTTP client for the external Vera service (/health, /v1/extract, /v1/train).

Auth is the ``X-Vera-Key`` header (master VERA_API_KEY or a per-project key). No Vera
code is bundled into Vela — this is pure HTTP. Network / connection / 5xx failures
raise ``VeraUnavailable`` so callers can transparently fall back to the in-app
pipeline; 4xx error responses raise ``VeraError``.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import requests

from core.config import get_settings

logger = logging.getLogger("vela.vera_connector")


class VeraError(Exception):
    """Vera returned a 4xx error (bad request, auth, schema, rate-limit…)."""

    def __init__(self, message: str, *, status: Optional[int] = None, code: Optional[str] = None):
        super().__init__(message)
        self.status = status
        self.code = code


class VeraUnavailable(VeraError):
    """Vera could not be reached (timeout, connection error, 5xx) — fall back."""


def _s():
    return get_settings()


def is_configured() -> bool:
    """True when both a base URL and an API key are set."""
    s = _s()
    return bool(s.VERA_API_URL and s.VERA_API_KEY)


def _base_url() -> str:
    return (_s().VERA_API_URL or "").rstrip("/")


def _headers() -> dict:
    return {"X-Vera-Key": _s().VERA_API_KEY, "Content-Type": "application/json"}


def _timeout() -> float:
    return float(getattr(_s(), "VERA_API_TIMEOUT_S", 30.0) or 30.0)


def health() -> dict:
    """GET /health (no auth required). Quick liveness probe (≤5s). Raises
    VeraUnavailable if the service can't be reached."""
    url = f"{_base_url()}/health"
    try:
        r = requests.get(url, headers=_headers(), timeout=min(_timeout(), 5.0))
    except requests.RequestException as e:
        raise VeraUnavailable(f"Vera /health unreachable: {e}") from e
    if r.status_code >= 500:
        raise VeraUnavailable(f"Vera /health returned {r.status_code}")
    try:
        return r.json()
    except ValueError:
        return {"status_code": r.status_code}


def extract(input_text: str, doc_type: Optional[str] = None, options: Optional[dict] = None) -> dict:
    """POST /v1/extract. Returns Vera's JSON
    ({output:{Document:{…}}, tag, confidence, valid, usage, …})."""
    body: dict[str, Any] = {"input": input_text}
    if doc_type:
        body["doc_type"] = doc_type
    if options:
        body["options"] = options
    return _post("/v1/extract", body)


def train(text: str, output: dict, doc_type: str, source_ref: Optional[str] = None,
          notes: Optional[str] = None) -> dict:
    """POST /v1/train — submit a human-corrected extraction as a labeled example."""
    body: dict[str, Any] = {"text": text, "output": output, "doc_type": doc_type}
    if source_ref:
        body["source_ref"] = source_ref
    if notes:
        body["notes"] = notes
    return _post("/v1/train", body)


def _post(path: str, body: dict) -> dict:
    url = f"{_base_url()}{path}"
    try:
        r = requests.post(url, json=body, headers=_headers(), timeout=_timeout())
    except requests.RequestException as e:
        raise VeraUnavailable(f"Vera {path} unreachable: {e}") from e
    if r.status_code >= 500:
        raise VeraUnavailable(f"Vera {path} returned {r.status_code}")
    try:
        data = r.json()
    except ValueError:
        raise VeraError(f"Vera {path} returned non-JSON ({r.status_code})", status=r.status_code)
    if r.status_code >= 400:
        err = (data.get("error") or {}) if isinstance(data, dict) else {}
        raise VeraError(err.get("message", f"Vera {path} returned {r.status_code}"),
                        status=r.status_code, code=err.get("code"))
    return data
