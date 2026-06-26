"""Country dispatcher for invoice registration.

Single place that routes by company country: Spain → Veri*Factu, El Salvador →
the existing DTE pathway (api/fiscal.py /dte/emitir, untouched). Keeps the
selection logic out of the endpoints and makes the addition purely additive.
"""
from sqlalchemy.orm import Session


def registrar_factura(db: Session, company_id: int, country: str, payload: dict,
                      idempotency_key=None) -> dict:
    cc = (country or "").upper()
    if cc == "ES":
        from modules.fiscal.verifactu import emitir
        return emitir(db, company_id, payload, idempotency_key=idempotency_key)
    if cc == "SV":
        # El Salvador keeps its dedicated DTE endpoint (POST /api/fiscal/dte/emitir);
        # it is intentionally not re-implemented here.
        raise NotImplementedError("El Salvador usa el endpoint DTE existente (/api/fiscal/dte/emitir)")
    raise NotImplementedError(f"País sin pipeline de facturación: {cc or '—'}")
