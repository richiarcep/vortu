"""Colombia — Estatuto Tributario. DIAN."""
TAX_RULES = {
    "iva": {
        "general": 19.0,
        "reducido": 5.0,
        "exento": 0.0,
        "cuenta_generado": "2408",
        "cuenta_descontable": "135517",
    },
    "renta": {
        "tasa_personas_juridicas": 35.0,
        "retencion_servicios": 4.0,
        "retencion_honorarios": 11.0,
        "retencion_compras": 2.5,
        "retencion_arrendamientos": 3.5,
    },
    "ica": {
        "tasa_min": 0.2,
        "tasa_max": 1.4,
        "cuenta": "2412",
    },
    "parafiscales": {
        "ica_min": 0.2,
        "sena": 2.0,
        "icbf": 3.0,
        "caja_compensacion": 4.0,
    },
    "seguridad_social": {
        "salud_empleador": 8.5,
        "salud_empleado": 4.0,
        "pension_empleador": 12.0,
        "pension_empleado": 4.0,
        "arl_minimo": 0.522,
        "arl_maximo": 6.96,
    },
    "regimenes": ["responsable_iva", "no_responsable", "regimen_simple"],
}
