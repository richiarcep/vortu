"""Connector to the EXTERNAL Vera AI routing service (https://…/v1/*).

Not to be confused with Vela's in-app `vera/` package. This package lets Vela's
document-extraction route through the external Vera API (/v1/extract) as the primary
engine, falling back to Vela's own pipeline when Vera is unreachable, and feed human
corrections back via /v1/train. OFF by default (VERA_EXTRACTION_MODE=internal).
"""
from . import client, mapping, service  # noqa: F401

__all__ = ["client", "mapping", "service"]
