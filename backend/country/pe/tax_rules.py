"""Perú — TUO Código Tributario. SUNAT."""
TAX_RULES = {
    "igv": {
        "general": 18.0,
        "exonerado": 0.0,
        "cuenta": "4011",
    },
    "renta": {
        "tasa_tercera_categoria": 29.5,
        "regimen_mype_hasta_15uit": 10.0,
        "retencion_cuarta_categoria": 8.0,
        "retencion_no_domiciliados": 30.0,
        "cuenta": "4017",
    },
    "essalud": {
        "patronal": 9.0,
        "cuenta": "403",
    },
    "onp": {
        "trabajador": 13.0,
    },
    "afp": {
        "obligatorio": 10.0,
        "seguro": 1.74,
        "comision_promedio": 1.55,
    },
    "regimenes": ["regimen_general", "mype_tributario", "regimen_especial", "nuevo_rus"],
}
