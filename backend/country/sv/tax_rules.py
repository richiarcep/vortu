"""El Salvador — Código Tributario, Ley de IVA. Ministerio de Hacienda DGII."""
TAX_RULES = {
    "iva": {
        "general": 13.0,
        "exento": 0.0,
        "exportacion": 0.0,
        "cuenta_debito": "2102",
        "cuenta_credito": "1103",
    },
    "isr": {
        "tasa_personas_juridicas": 30.0,
        "tasa_personas_naturales_max": 30.0,
        "retencion_servicios": 10.0,
        "retencion_iva_grandes": 1.0,
        "retencion_iva_designados": 13.0,
    },
    "isss": {
        "patronal_salud": 7.5,
        "trabajador_salud": 3.0,
        "techo_cotizable": 1000.0,
    },
    "afp": {
        "patronal": 7.75,
        "trabajador": 7.25,
        "comision_afp": 1.1,
    },
    "moneda": "USD",
    "regimenes": ["contribuyente_normal", "pequeno_contribuyente", "gran_contribuyente"],
}
