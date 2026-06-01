"""Colombia — PUC Decreto 2650 + IVA 19% + DIAN"""
from country.co.chart_of_accounts import CHART_OF_ACCOUNTS, get_entry_accounts
from country.co.tax_rules import TAX_RULES
from country.co.fiscal_models import FISCAL_MODELS
COUNTRY_CODE = "co"
COUNTRY_NAME = "Colombia"
__all__ = ["CHART_OF_ACCOUNTS","get_entry_accounts","TAX_RULES","FISCAL_MODELS","COUNTRY_CODE","COUNTRY_NAME"]
