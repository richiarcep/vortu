"""Argentina — RT 16 FACPCE + IVA 21% + AFIP"""
from country.ar.chart_of_accounts import CHART_OF_ACCOUNTS, get_entry_accounts
from country.ar.tax_rules import TAX_RULES
from country.ar.fiscal_models import FISCAL_MODELS
COUNTRY_CODE = "ar"
COUNTRY_NAME = "Argentina"
__all__ = ["CHART_OF_ACCOUNTS","get_entry_accounts","TAX_RULES","FISCAL_MODELS","COUNTRY_CODE","COUNTRY_NAME"]
