"""Colombia — Obligaciones DIAN."""
FISCAL_MODELS = {
    "Factura Electrónica": {"name":"Factura electrónica de venta","frequency":"por_operacion","agency":"DIAN","mandatory":True},
    "F-110": {"name":"Declaración de renta","frequency":"anual","deadline":"abril-mayo (calendario DIAN)","agency":"DIAN"},
    "F-300": {"name":"Declaración bimestral de IVA","frequency":"bimestral","agency":"DIAN"},
    "F-350": {"name":"Declaración mensual de retenciones","frequency":"mensual","agency":"DIAN"},
    "F-410": {"name":"Información exógena","frequency":"anual","agency":"DIAN"},
}
