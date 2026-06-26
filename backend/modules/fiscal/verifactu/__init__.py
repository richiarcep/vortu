"""Veri*Factu — Spanish invoicing record system (RD 1007/2023, Orden HAC/1177/2024).

Produces the mandatory *registro de facturación* per invoice: a record whose
fields are hashed into a per-company chain (huella = hash(canonical + huella
anterior)), optionally XAdES-signed, immutable (corrections are new linked
records, never edits), carrying the AEAT QR + "VERI*FACTU" legend, and
exportable to the AEAT XML/JSON schema with ≥6-year retention.

Public surface:
    emitir(db, company_id, payload, ...)  -> create an alta record
    anular(db, company_id, registro_id)   -> create a linked anulación record
    export_xml / export_json              -> AEAT serialization
    verify_chain(db, company_id)          -> tamper + gap evidence
"""
from .service import emitir, anular  # noqa: F401
from .hashing import verify_chain     # noqa: F401
from .xml_export import export_xml, export_json  # noqa: F401
