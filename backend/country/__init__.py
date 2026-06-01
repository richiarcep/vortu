"""
country/ — Módulos de localización por país.

Cada país tiene su propio plan contable, reglas fiscales y modelos oficiales.
La empresa (companies.country) determina qué módulo se carga.
"""

from country.registry import (
    SUPPORTED_COUNTRIES,
    get_country_module,
    get_chart_of_accounts,
    get_tax_rules,
    get_country_info,
)

__all__ = [
    "SUPPORTED_COUNTRIES",
    "get_country_module",
    "get_chart_of_accounts",
    "get_tax_rules",
    "get_country_info",
]
