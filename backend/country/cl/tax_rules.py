"""Chile — Código Tributario. SII."""
TAX_RULES = {
    "iva": {
        "general": 19.0,
        "exento": 0.0,
        "cuenta_debito": "2104",
        "cuenta_credito": "1110",
    },
    "renta": {
        "tasa_primera_categoria": 25.0,
        "tasa_pyme": 12.5,
        "retencion_honorarios": 13.75,
        "retencion_arrendamiento": 10.0,
    },
    "previsional": {
        "afp_trabajador": 10.0,
        "comision_afp_promedio": 1.16,
        "salud_trabajador": 7.0,
        "seguro_cesantia_trabajador": 0.6,
        "seguro_cesantia_empleador": 2.4,
        "mutual_seguridad_min": 0.95,
    },
    "ppm": {
        "primera_categoria_pyme": 0.25,
        "primera_categoria_general": 1.0,
    },
    "regimenes": ["pro_pyme_general", "pro_pyme_transparente", "regimen_general_14a"],
}
