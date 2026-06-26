"""Map between Vera's generic extraction shape and Vela's `analysis` dict.

Vera's /v1/extract returns ``{output: {Document: {...}}, tag, confidence, valid, …}``
with field names defined by the doc-type schema configured IN Vera. Vela's downstream
(asiento proposal, sql_action, the approval UI) expects an `analysis` dict whose
`extracted_data` uses Vela's canonical Spanish keys (importe/fecha/emisor/…). This
module bridges the two with case-insensitive alias matching, and keeps the raw Vera
Document for reference. Unmapped docs still fall through to the user's review.
"""
from __future__ import annotations

from typing import Any, Optional

# Vera tag (doc type slug) → Vela document_type.
_TAG_TO_DOCTYPE = {
    "invoice": "factura", "factura": "factura",
    "payslip": "nomina", "nomina": "nomina", "payroll": "nomina",
    "contract": "contrato", "contrato": "contrato",
    "receipt": "recibo", "recibo": "recibo", "ticket": "recibo",
    "budget": "presupuesto", "quote": "presupuesto", "presupuesto": "presupuesto",
}

# Vela canonical key → candidate Vera field names (normalised: lowercase, no _/space).
_FIELD_ALIASES = {
    "emisor": ["vendorcompanyname", "vendor", "vendorname", "supplier", "suppliername",
               "proveedor", "proveedornombre", "emisor", "issuer", "seller"],
    "receptor": ["customercompanyname", "customer", "customername", "client", "cliente",
                 "receptor", "buyer", "billto"],
    "importe": ["totalamount", "total", "amount", "importe", "importetotal", "grandtotal",
                "amountdue", "totaldue"],
    "fecha": ["documentdate", "invoicedate", "date", "fecha", "issuedate", "fechaemision"],
    "vencimiento": ["duedate", "vencimiento", "fechavencimiento", "paymentduedate"],
    "numero_documento": ["invoiceid", "invoicenumber", "documentid", "documentnumber",
                         "numero", "numerodocumento", "number", "folio", "invoiceno"],
    "concepto": ["concept", "concepto", "description", "descripcion", "subject", "memo", "detail"],
    "iban": ["iban", "bankaccount", "cuenta", "cuentabancaria"],
    "nif_emisor": ["vendortaxid", "taxid", "nif", "cif", "vatnumber", "proveedorcif",
                   "nifemisor", "rfc", "nit"],
    # Vera invoice gold schema extras (tax-focused): kept in extracted_data so they
    # surface in the review UI even though they aren't part of Vela's core asiento set.
    "moneda": ["currency", "moneda", "divisa"],
    "pais": ["pais", "country"],
    "total_impuestos": ["totaltax", "totalimpuestos", "taxtotal", "totaltaxamount"],
}

# Reverse map (Vela canonical key → Vera invoice field name) for /v1/train, so human
# corrections land 1:1 against Vera's schema. Unknown keys pass through unchanged.
_VELA_TO_VERA = {
    "emisor": "VendorCompanyName",
    "receptor": "CustomerCompanyName",
    "numero_documento": "DocumentNumber",
    "fecha": "DocumentDate",
    "vencimiento": "DueDate",
    "importe": "TotalAmount",
    "nif_emisor": "VendorTaxID",
    "concepto": "Description",
    "iban": "IBAN",
    "moneda": "Currency",
    "pais": "Pais",
    "total_impuestos": "TotalTax",
}


def _norm(key: str) -> str:
    return str(key).lower().replace("_", "").replace(" ", "").replace("-", "")


def _flatten_scalars(obj: Any, out: Optional[dict] = None) -> dict:
    """Collect scalar leaves of a (possibly nested) dict, keyed by normalised name.
    Lists are skipped — the canonical fields we map are header-level scalars."""
    out = {} if out is None else out
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, dict):
                _flatten_scalars(v, out)
            elif not isinstance(v, (list, dict)):
                out.setdefault(_norm(k), v)
    return out


def vera_to_analysis(vera_resp: dict, *, filename: str = "", fallback_text: str = "") -> dict:
    """Map a Vera /v1/extract response into Vela's `analysis` dict."""
    output = vera_resp.get("output") or {}
    document = output.get("Document") if isinstance(output, dict) else None
    if not isinstance(document, dict):
        document = output if isinstance(output, dict) else {}

    flat = _flatten_scalars(document)
    extracted: dict[str, Any] = {}
    for canonical, aliases in _FIELD_ALIASES.items():
        for a in aliases:
            if a in flat and flat[a] not in (None, ""):
                extracted[canonical] = flat[a]
                break

    tag = (vera_resp.get("tag") or "").lower()
    importe = extracted.get("importe")
    doc_type = _TAG_TO_DOCTYPE.get(tag) or ("factura" if importe not in (None, "") else "otro")
    try:
        confidence = float(vera_resp.get("confidence") or 0.0)
    except (TypeError, ValueError):
        confidence = 0.0
    valid = bool(vera_resp.get("valid", True))
    needs_review = (not valid) or confidence < 0.7

    sql_action: dict[str, Any] = {"should_create": False, "table": None, "reason": "",
                                  "confidence": confidence}
    if doc_type == "factura" and importe not in (None, "") and confidence >= 0.7:
        sql_action = {
            "should_create": True,
            "table": "expenses",
            "reason": "Factura de proveedor detectada por Vera",
            "preview_record": {
                "concept": extracted.get("concepto") or extracted.get("emisor") or filename,
                "amount": importe,
                "date": extracted.get("fecha"),
                "supplier": extracted.get("emisor"),
            },
            "confidence": confidence,
        }

    warnings = [] if valid else ["Vera marcó la extracción como no validada — revísala"]

    return {
        "document_type": doc_type,
        "confidence": confidence,
        "summary": f"Documento «{tag or doc_type}» extraído por Vera",
        "extracted_data": extracted,
        "warnings": warnings,
        "suggested_module": "finance" if doc_type in ("factura", "recibo") else "general",
        "semantic_tags": [t for t in (tag, doc_type) if t],
        "sql_action": sql_action,
        "needs_review": needs_review,
        "field_confidence": {},
        "_engine": "vera",
        "_vera": {
            "tag": vera_resp.get("tag"),
            "tier_used": vera_resp.get("tier_used"),
            "tag_resolved_by": vera_resp.get("tag_resolved_by"),
            "usage": vera_resp.get("usage"),
            "raw_document": document,
        },
    }


def corrections_to_train_output(corrections: dict, raw_document: Optional[dict] = None) -> dict:
    """Build the `output` for /v1/train, named with VERA's invoice field names.

    Starts from the prior extraction (if available) and overlays the human
    corrections, so the label is a complete record — not just the diff — then renames
    known Vela keys to Vera's schema (VendorCompanyName, …) so corrections land 1:1.
    Vera accepts a wrapped or unwrapped object and validates against its own
    (all-nullable) schema; unknown keys pass through unchanged.
    """
    out: dict[str, Any] = {}

    def _put(key: str, value: Any) -> None:
        out[_VELA_TO_VERA.get(key, key)] = value

    for k, v in (raw_document or {}).items():
        _put(k, v)
    for k, v in (corrections or {}).items():
        # field keys may be section-prefixed (e.g. "encabezado.proveedor_cif") → leaf
        _put(k.split(".")[-1], v)
    return out
