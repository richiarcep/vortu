"""México — Catálogo SAT + IVA 16% + CFDI 4.0"""
from country.mx.chart_of_accounts import CHART_OF_ACCOUNTS, get_entry_accounts
from country.mx.tax_rules import TAX_RULES
from country.mx.fiscal_models import FISCAL_MODELS
COUNTRY_CODE = "mx"
COUNTRY_NAME = "México"
__all__ = ["CHART_OF_ACCOUNTS","get_entry_accounts","TAX_RULES","FISCAL_MODELS","COUNTRY_CODE","COUNTRY_NAME"]
