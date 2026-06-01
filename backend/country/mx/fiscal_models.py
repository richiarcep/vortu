"""México — Obligaciones fiscales SAT."""
FISCAL_MODELS = {
    "CFDI 4.0": {"name":"Comprobante Fiscal Digital","frequency":"por_operacion","agency":"SAT","mandatory":True},
    "Declaración Mensual ISR": {"name":"Pago provisional ISR","frequency":"mensual","deadline":"día 17","agency":"SAT"},
    "Declaración Mensual IVA": {"name":"Pago definitivo IVA","frequency":"mensual","deadline":"día 17","agency":"SAT"},
    "DIOT": {"name":"Declaración Informativa de Operaciones con Terceros","frequency":"mensual","agency":"SAT"},
    "Declaración Anual": {"name":"Declaración anual personas morales","frequency":"anual","deadline":"31 marzo","agency":"SAT"},
    "Contabilidad Electrónica": {"name":"Envío mensual de balanza y catálogo","frequency":"mensual","agency":"SAT"},
}
