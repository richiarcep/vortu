"""Argentina — Ley de IVA, Ley de Ganancias. AFIP."""
TAX_RULES = {
    "iva": {
        "general": 21.0,
        "reducido": 10.5,
        "incrementado": 27.0,
        "exento": 0.0,
        "cuenta_debito": "2.1.04",
        "cuenta_credito": "1.1.08",
    },
    "ganancias": {
        "tasa_sociedades": 35.0,
        "retencion_servicios": 6.0,
        "retencion_alquileres": 6.0,
        "retencion_honorarios": 28.0,
    },
    "ingresos_brutos": {
        "tasa_promedio": 3.0,
        "varia_por_jurisdiccion": True,
    },
    "cargas_sociales": {
        "jubilacion_empleador": 16.0,
        "jubilacion_empleado": 11.0,
        "obra_social_empleador": 6.0,
        "obra_social_empleado": 3.0,
        "anssal_empleador": 0.0,
        "anssal_empleado": 3.0,
        "ley_riesgos_trabajo": 1.5,
    },
    "regimenes": ["responsable_inscripto", "monotributo", "exento"],
}
