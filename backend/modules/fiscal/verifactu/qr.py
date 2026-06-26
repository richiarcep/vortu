"""AEAT cotejo QR + mandatory VERI*FACTU legend.

The invoice must carry a QR encoding the AEAT verification URL (so a recipient can
check the invoice against AEAT's records) and the legend "VERI*FACTU". The cotejo
host differs between the pruebas (pre-production) and producción environments.
"""
import io
import base64
from urllib.parse import urlencode

from core.config import get_settings

settings = get_settings()

LEGEND = "VERI*FACTU"
LEGEND_LONG = "Factura verificable en la sede electrónica de la AEAT o en la app de la AEAT"

# AEAT cotejo hosts (public). Overridable via config for future changes.
_QR_BASE_PRUEBAS = getattr(settings, "AEAT_VERIFACTU_QR_BASE_PRUEBAS",
                           "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR")
_QR_BASE_PRODUCCION = getattr(settings, "AEAT_VERIFACTU_QR_BASE_PRODUCCION",
                              "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR")


def cotejo_url(*, nif_emisor: str, serie: str, numero: int, fecha_expedicion: str,
               importe_total, ambiente: str = "pruebas") -> str:
    base = _QR_BASE_PRODUCCION if ambiente == "produccion" else _QR_BASE_PRUEBAS
    params = urlencode({
        "nif": (nif_emisor or "").strip(),
        "numserie": f"{serie or ''}{numero}",
        "fecha": fecha_expedicion,
        "importe": f"{float(importe_total or 0):.2f}",
    })
    return f"{base}?{params}"


def qr_png_base64(url: str) -> str:
    """Render the cotejo URL to a base64 PNG data URI (uses the existing qrcode dep)."""
    import qrcode
    qr = qrcode.QRCode(version=None, box_size=5, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
