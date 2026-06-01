"""El Salvador — Obligaciones DGII."""
FISCAL_MODELS = {
    "DTE": {"name":"Documento Tributario Electrónico","frequency":"por_operacion","agency":"DGII","mandatory":True},
    "F-07": {"name":"Declaración mensual de IVA","frequency":"mensual","deadline":"10 del mes siguiente","agency":"DGII"},
    "F-11": {"name":"Declaración pago a cuenta","frequency":"mensual","deadline":"10 del mes siguiente","agency":"DGII"},
    "F-14": {"name":"Declaración del impuesto sobre la renta","frequency":"anual","deadline":"30 abril","agency":"DGII"},
    "F-910": {"name":"Informe anual de retenciones","frequency":"anual","agency":"DGII"},
    "F-930": {"name":"Informe de proveedores, clientes y acreedores","frequency":"anual","agency":"DGII"},
}
