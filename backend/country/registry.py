"""
Registro central de países soportados.

Cada país aporta:
- chart_of_accounts.py  → plan contable oficial
- tax_rules.py          → IVA/IGV, retenciones, regímenes
- fiscal_models.py      → modelos oficiales (303, CFDI, DTE, etc.)
- info.py               → nombre, moneda, IVA general, formato fecha

Para añadir un nuevo país: crear carpeta, los 4 archivos, registrarlo aquí.
"""
import importlib
from typing import Optional


SUPPORTED_COUNTRIES = {
    "es": {
        "name": "España",
        "currency": "EUR",
        "symbol": "€",
        "vat_general": 21.0,
        "vat_reduced": [10.0, 4.0],
        "tax_id_name": "NIF",
        "date_format": "DD/MM/YYYY",
        "decimal_sep": ",",
        "thousand_sep": ".",
        "language": "es-ES",
        "fiscal_models": ["303", "130", "390", "111", "115", "180", "184"],
        "module": "country.es",
    },
    "mx": {
        "name": "México",
        "currency": "MXN",
        "symbol": "$",
        "vat_general": 16.0,
        "vat_reduced": [8.0, 0.0],
        "tax_id_name": "RFC",
        "date_format": "DD/MM/YYYY",
        "decimal_sep": ".",
        "thousand_sep": ",",
        "language": "es-MX",
        "fiscal_models": ["CFDI 4.0", "Declaración anual", "DIOT"],
        "module": "country.mx",
    },
    "sv": {
        "name": "El Salvador",
        "currency": "USD",
        "symbol": "$",
        "vat_general": 13.0,
        "vat_reduced": [],
        "tax_id_name": "NIT",
        "date_format": "DD/MM/YYYY",
        "decimal_sep": ".",
        "thousand_sep": ",",
        "language": "es-SV",
        "fiscal_models": ["DTE", "F-07", "F-11", "F-14"],
        "module": "country.sv",
    },
    "co": {
        "name": "Colombia",
        "currency": "COP",
        "symbol": "$",
        "vat_general": 19.0,
        "vat_reduced": [5.0, 0.0],
        "tax_id_name": "NIT",
        "date_format": "DD/MM/YYYY",
        "decimal_sep": ",",
        "thousand_sep": ".",
        "language": "es-CO",
        "fiscal_models": ["F-110", "F-300", "F-350", "Factura electrónica DIAN"],
        "module": "country.co",
    },
    "ar": {
        "name": "Argentina",
        "currency": "ARS",
        "symbol": "$",
        "vat_general": 21.0,
        "vat_reduced": [10.5, 0.0],
        "tax_id_name": "CUIT",
        "date_format": "DD/MM/YYYY",
        "decimal_sep": ",",
        "thousand_sep": ".",
        "language": "es-AR",
        "fiscal_models": ["F-731 (IVA)", "F-572 web", "Comprobante electrónico AFIP"],
        "module": "country.ar",
    },
    "cl": {
        "name": "Chile",
        "currency": "CLP",
        "symbol": "$",
        "vat_general": 19.0,
        "vat_reduced": [],
        "tax_id_name": "RUT",
        "date_format": "DD-MM-YYYY",
        "decimal_sep": ",",
        "thousand_sep": ".",
        "language": "es-CL",
        "fiscal_models": ["F-29", "F-22", "DTE SII"],
        "module": "country.cl",
    },
    "pe": {
        "name": "Perú",
        "currency": "PEN",
        "symbol": "S/",
        "vat_general": 18.0,
        "vat_reduced": [],
        "tax_id_name": "RUC",
        "date_format": "DD/MM/YYYY",
        "decimal_sep": ".",
        "thousand_sep": ",",
        "language": "es-PE",
        "fiscal_models": ["PDT 621", "PDT 601", "Factura electrónica SUNAT"],
        "module": "country.pe",
    },
}


def get_country_info(code: str) -> Optional[dict]:
    """Devuelve metadatos del país (nombre, moneda, IVA, etc)."""
    return SUPPORTED_COUNTRIES.get(code.lower())


def get_country_module(code: str):
    """
    Importa dinámicamente el módulo del país.
    Uso: mod = get_country_module('es')
    """
    info = get_country_info(code)
    if not info:
        raise ValueError(
            f"País '{code}' no soportado. "
            f"Disponibles: {list(SUPPORTED_COUNTRIES.keys())}"
        )
    return importlib.import_module(info["module"])


def get_chart_of_accounts(code: str) -> list:
    """Devuelve el plan contable oficial del país."""
    mod = get_country_module(code)
    return mod.CHART_OF_ACCOUNTS


def get_tax_rules(code: str) -> dict:
    """Devuelve las reglas fiscales del país (IVA, retenciones)."""
    mod = get_country_module(code)
    return mod.TAX_RULES


def get_entry_accounts(code: str, tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un asiento, según el país.

    Permite que los módulos generen asientos sin conocer los códigos de cada país:
    trabajan con categorías semánticas (Ventas, Compras, Personal, Servicios) y el
    módulo del país las traduce a sus cuentas oficiales.
    """
    mod = get_country_module(code)
    return mod.get_entry_accounts(tipo, categoria)
