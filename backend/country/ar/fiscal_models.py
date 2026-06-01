"""Argentina — Obligaciones AFIP."""
FISCAL_MODELS = {
    "Comprobante Electrónico": {"name":"Factura electrónica","frequency":"por_operacion","agency":"AFIP","mandatory":True},
    "F-731": {"name":"IVA mensual","frequency":"mensual","deadline":"según CUIT","agency":"AFIP"},
    "F-572 Web": {"name":"Régimen de información ganancias","frequency":"anual","agency":"AFIP"},
    "F-657": {"name":"Régimen general de retenciones","frequency":"mensual","agency":"AFIP"},
    "F-713": {"name":"Ganancias sociedades","frequency":"anual","agency":"AFIP"},
    "SICORE": {"name":"Sistema de control de retenciones","frequency":"mensual","agency":"AFIP"},
}
