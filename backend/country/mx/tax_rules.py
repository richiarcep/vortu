"""México — Ley del IVA, Ley del ISR. SAT."""
TAX_RULES = {
    "iva": {
        "general": 16.0,
        "frontera": 8.0,
        "exento": 0.0,
        "cuenta_trasladado": "213",
        "cuenta_acreditable": "113",
    },
    "isr": {
        "tasa_personas_morales": 30.0,
        "retencion_honorarios": 10.0,
        "retencion_arrendamiento": 10.0,
        "cuenta_retenciones": "216",
    },
    "imss": {
        "patronal_general": 24.0,
        "obrero": 2.375,
        "cuenta_patronal": "620",
        "cuenta_obrero": "218",
    },
    "infonavit": {"patronal": 5.0, "cuenta": "621"},
    "regimenes": [
        "regimen_general",
        "resico",
        "personas_morales",
        "actividad_empresarial",
        "arrendamiento",
    ],
}
