"""Perú — Obligaciones SUNAT."""
FISCAL_MODELS = {
    "Factura Electrónica": {"name":"Comprobante electrónico SEE-SOL","frequency":"por_operacion","agency":"SUNAT","mandatory":True},
    "PDT 621": {"name":"IGV-Renta mensual","frequency":"mensual","deadline":"según último dígito RUC","agency":"SUNAT"},
    "PDT 601": {"name":"PLAME planilla electrónica","frequency":"mensual","agency":"SUNAT"},
    "Declaración Anual Renta 3a": {"name":"Renta de tercera categoría","frequency":"anual","deadline":"marzo-abril","agency":"SUNAT"},
    "Libros Electrónicos": {"name":"Libros y registros electrónicos","frequency":"mensual","agency":"SUNAT"},
}
