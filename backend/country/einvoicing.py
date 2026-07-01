"""E-invoicing system per country — single source of truth.

Maps each ledger-supported country (see country.registry.SUPPORTED_COUNTRIES) to
its mandatory electronic-invoicing system, the tax authority, and whether Vela
has a working pipeline for it today. Onboarding uses this to FORCE the
country-appropriate choice — there is no free toggle; the country decides the
system.

The qualified certificate (.p12) always belongs to the CLIENT (the obligado
tributario), never to Vela — every system that needs one loads the tenant's own
cert by reference, never Vela's.

status:
  available   → fully wired (emit + records work today)
  coming_soon → country chart/tax rules exist; e-invoicing pipeline pending
"""

EINVOICING = {
    "es": {
        "system": "VERI*FACTU",
        "authority": "AEAT",
        "status": "available",
        "flow": "verifactu",                 # → modules.fiscal.verifactu
        "requires_cert": True,
        "modes": ["VERIFACTU", "NO_VERIFACTU"],   # ES has the dual-mode choice
        "legend": "VERI*FACTU",
        "note": "Genera y firma registros VERI*FACTU encadenados (huella + QR). La remisión automática a la AEAT está en certificación; en NO VERI*FACTU conservas los registros firmados localmente.",
    },
    "sv": {
        "system": "DTE",
        "authority": "Ministerio de Hacienda",
        "status": "coming_soon",             # numeración/registro OK; transmisión real al MH pendiente
        "flow": "dte",                       # → api/fiscal.py /dte/emitir (solo pruebas)
        "requires_cert": True,
        "modes": [],
        "legend": None,
        "note": "DTE en integración: emite en pruebas; la transmisión al Ministerio de Hacienda aún no está disponible.",
    },
    "mx": {
        "system": "CFDI 4.0",
        "authority": "SAT",
        "status": "coming_soon",
        "flow": "cfdi",
        "requires_cert": True,               # CSD (Certificado de Sello Digital)
        "modes": [],
        "legend": None,
        "note": "Comprobante Fiscal Digital por Internet timbrado vía PAC ante el SAT.",
    },
    "co": {
        "system": "Factura Electrónica",
        "authority": "DIAN",
        "status": "coming_soon",
        "flow": "dian",
        "requires_cert": True,
        "modes": [],
        "legend": None,
        "note": "Factura electrónica validada por la DIAN.",
    },
    "ar": {
        "system": "Comprobante Electrónico",
        "authority": "AFIP",
        "status": "coming_soon",
        "flow": "afip",
        "requires_cert": True,
        "modes": [],
        "legend": None,
        "note": "Comprobante electrónico con CAE de la AFIP.",
    },
    "cl": {
        "system": "DTE",
        "authority": "SII",
        "status": "coming_soon",
        "flow": "sii",
        "requires_cert": True,
        "modes": [],
        "legend": None,
        "note": "Documento Tributario Electrónico autorizado por el SII.",
    },
    "pe": {
        "system": "Factura Electrónica",
        "authority": "SUNAT",
        "status": "coming_soon",
        "flow": "sunat",
        "requires_cert": True,
        "modes": [],
        "legend": None,
        "note": "Factura electrónica con OSE/SUNAT.",
    },
}


def get_einvoicing(country: str) -> dict:
    """E-invoicing config for a country code, or a generic 'unsupported' shape."""
    info = EINVOICING.get((country or "").lower())
    if info:
        return {"country": (country or "").upper(), **info}
    return {
        "country": (country or "").upper(), "system": None, "authority": None,
        "status": "unsupported", "flow": None, "requires_cert": False,
        "modes": [], "legend": None,
        "note": "Facturación electrónica no disponible para este país todavía.",
    }
