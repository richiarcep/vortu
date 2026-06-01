"""Chile — NIIF + IVA 19% + SII"""
from country.cl.chart_of_accounts import CHART_OF_ACCOUNTS, get_entry_accounts
from country.cl.tax_rules import TAX_RULES
from country.cl.fiscal_models import FISCAL_MODELS
COUNTRY_CODE = "cl"
COUNTRY_NAME = "Chile"
__all__ = ["CHART_OF_ACCOUNTS","get_entry_accounts","TAX_RULES","FISCAL_MODELS","COUNTRY_CODE","COUNTRY_NAME"]
