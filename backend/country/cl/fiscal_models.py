"""Chile — Obligaciones SII."""
FISCAL_MODELS = {
    "DTE": {"name":"Documento Tributario Electrónico","frequency":"por_operacion","agency":"SII","mandatory":True},
    "F-29": {"name":"IVA mensual y PPM","frequency":"mensual","deadline":"día 12","agency":"SII"},
    "F-22": {"name":"Declaración anual de impuesto a la renta","frequency":"anual","deadline":"abril","agency":"SII"},
    "F-50": {"name":"Declaración de impuesto adicional","frequency":"mensual","agency":"SII"},
    "Libro IVA Electrónico": {"name":"Registro de compras y ventas","frequency":"mensual","agency":"SII"},
}
