"""El Salvador — NIIF para PYMES + IVA 13% + DTE"""
from country.sv.chart_of_accounts import CHART_OF_ACCOUNTS, get_entry_accounts
from country.sv.tax_rules import TAX_RULES
from country.sv.fiscal_models import FISCAL_MODELS
COUNTRY_CODE = "sv"
COUNTRY_NAME = "El Salvador"
__all__ = ["CHART_OF_ACCOUNTS","get_entry_accounts","TAX_RULES","FISCAL_MODELS","COUNTRY_CODE","COUNTRY_NAME"]
