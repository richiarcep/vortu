"""
España — Plan General Contable + Reglas fiscales AEAT.
RD 1514/2007 (PGC) · Ley 37/1992 (IVA) · Ley 35/2006 (IRPF)
"""

from country.es.chart_of_accounts import CHART_OF_ACCOUNTS, get_entry_accounts
from country.es.tax_rules import TAX_RULES
from country.es.fiscal_models import FISCAL_MODELS

COUNTRY_CODE = "es"
COUNTRY_NAME = "España"

__all__ = ["CHART_OF_ACCOUNTS", "get_entry_accounts", "TAX_RULES", "FISCAL_MODELS", "COUNTRY_CODE", "COUNTRY_NAME"]
