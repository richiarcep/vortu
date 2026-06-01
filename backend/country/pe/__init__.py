"""Perú — PCGE + IGV 18% + SUNAT"""
from country.pe.chart_of_accounts import CHART_OF_ACCOUNTS, get_entry_accounts
from country.pe.tax_rules import TAX_RULES
from country.pe.fiscal_models import FISCAL_MODELS
COUNTRY_CODE = "pe"
COUNTRY_NAME = "Perú"
__all__ = ["CHART_OF_ACCOUNTS","get_entry_accounts","TAX_RULES","FISCAL_MODELS","COUNTRY_CODE","COUNTRY_NAME"]
