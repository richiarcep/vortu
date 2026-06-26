"""AEAT Veri*Factu XML/JSON serialization.

Built from the SAME canonical fields that feed the huella, so the exported record
matches the hashed/signed bytes. Uses stdlib xml.sax.saxutils for escaping (no
lxml dependency). The element names mirror the AEAT RegistroAlta / RegistroAnulacion
shape; the official XSD namespaces must be confirmed before live remisión (the
canonical hash is what AEAT cotejo recomputes, and that is locked in canonical.py).
"""
import json
from xml.sax.saxutils import escape


def _el(tag: str, value) -> str:
    return f"<{tag}>{escape(str(value if value is not None else ''))}</{tag}>"


def export_xml(registro: dict) -> str:
    """Serialize one registro row (mapping) to AEAT-shaped XML."""
    is_anulacion = registro.get("tipo") == "anulacion"
    root = "RegistroAnulacion" if is_anulacion else "RegistroAlta"
    num_serie = f"{registro.get('serie') or ''}{registro.get('numero')}"
    parts = [
        f'<?xml version="1.0" encoding="UTF-8"?>',
        f'<{root}>',
        _el("IDEmisorFactura", registro.get("nif_emisor")),
        _el("NumSerieFactura", num_serie),
        _el("FechaExpedicionFactura", registro.get("fecha_expedicion")),
    ]
    if not is_anulacion:
        parts += [
            _el("TipoFactura", registro.get("tipo_factura") or "F1"),
            _el("CuotaTotal", f"{float(registro.get('cuota_total') or 0):.2f}"),
            _el("ImporteTotal", f"{float(registro.get('importe_total') or 0):.2f}"),
        ]
    parts += [
        _el("Huella", registro.get("huella")),
        _el("HuellaAnterior", registro.get("huella_anterior")),
        _el("FechaHoraHusoGenRegistro", registro.get("ts_generacion")),
        _el("Encadenamiento", "S"),
        _el("SistemaInformatico", "Vela"),
        f'</{root}>',
    ]
    return "".join(parts)


def export_json(registro: dict) -> str:
    num_serie = f"{registro.get('serie') or ''}{registro.get('numero')}"
    payload = {
        "tipo": registro.get("tipo"),
        "IDEmisorFactura": registro.get("nif_emisor"),
        "NumSerieFactura": num_serie,
        "FechaExpedicionFactura": registro.get("fecha_expedicion"),
        "TipoFactura": registro.get("tipo_factura"),
        "CuotaTotal": round(float(registro.get("cuota_total") or 0), 2),
        "ImporteTotal": round(float(registro.get("importe_total") or 0), 2),
        "Huella": registro.get("huella"),
        "HuellaAnterior": registro.get("huella_anterior"),
        "FechaHoraHusoGenRegistro": registro.get("ts_generacion"),
        "estado": registro.get("estado"),
        "qr_url": registro.get("qr_url"),
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)
