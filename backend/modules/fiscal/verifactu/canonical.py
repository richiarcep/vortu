"""Canonical field representation for the Veri*Factu huella.

Single source of truth for the exact bytes that get hashed AND exported to XML,
so the hash and the AEAT submission can never drift. The field set + order follow
the AEAT huella specification for a *registro de alta*:

    IDEmisorFactura, NumSerieFactura, FechaExpedicionFactura, TipoFactura,
    CuotaTotal, ImporteTotal, Huella (anterior), FechaHoraHusoGenRegistro

⚠ The precise concatenation/format MUST be confirmed byte-for-byte against the
published Orden HAC/1177/2024 technical annex before the export is treated as
submission-ready (the cotejo at AEAT recomputes this hash). The structure here is
correct; the literal separators are the documented `clave=valor&...` form.
"""
from typing import Optional


def _fmt_amount(v) -> str:
    """AEAT amounts: dot decimal, 2 places, no thousands separator."""
    try:
        return f"{float(v):.2f}"
    except (TypeError, ValueError):
        return "0.00"


def canonical_alta(*, nif_emisor: str, serie: Optional[str], numero: int,
                   fecha_expedicion: str, tipo_factura: str, cuota_total,
                   importe_total, huella_anterior: str, ts_generacion: str) -> str:
    """Deterministic canonical string for an alta record (hashed → huella)."""
    num_serie = f"{serie or ''}{numero}"
    return (
        f"IDEmisorFactura={(nif_emisor or '').strip()}"
        f"&NumSerieFactura={num_serie}"
        f"&FechaExpedicionFactura={fecha_expedicion}"
        f"&TipoFactura={tipo_factura or 'F1'}"
        f"&CuotaTotal={_fmt_amount(cuota_total)}"
        f"&ImporteTotal={_fmt_amount(importe_total)}"
        f"&Huella={huella_anterior or ''}"
        f"&FechaHoraHusoGenRegistro={ts_generacion}"
    )


def canonical_anulacion(*, nif_emisor: str, serie: Optional[str], numero: int,
                        huella_anterior: str, ts_generacion: str) -> str:
    """Canonical string for an anulación record."""
    num_serie = f"{serie or ''}{numero}"
    return (
        f"IDEmisorFacturaAnulada={(nif_emisor or '').strip()}"
        f"&NumSerieFacturaAnulada={num_serie}"
        f"&Huella={huella_anterior or ''}"
        f"&FechaHoraHusoGenRegistro={ts_generacion}"
    )


def canonical_evento(*, evento: str, registro_id, detalle: str, ts: str,
                     huella_anterior: str) -> str:
    """Canonical string for an event-log entry."""
    return f"Evento={evento}&Registro={registro_id or ''}&Detalle={detalle or ''}&Ts={ts}&Huella={huella_anterior or ''}"
