"""
Reglas fiscales de España.
Fuente: Ley 37/1992 del IVA, Ley 35/2006 del IRPF, RD 439/2007 Reglamento IRPF.
"""

TAX_RULES = {
    "iva": {
        "general": 21.0,
        "reducido": 10.0,
        "superreducido": 4.0,
        "exento": 0.0,
        "cuentas_repercutido": {
            "21": "477000",
            "10": "477001",
            "4":  "477002",
        },
        "cuentas_soportado": {
            "21": "472000",
            "10": "472001",
            "4":  "472002",
        },
    },
    "irpf": {
        "retencion_profesionales": 15.0,
        "retencion_profesionales_nuevos": 7.0,
        "retencion_alquileres": 19.0,
        "retencion_premios": 19.0,
        "retencion_rendimientos_capital": 19.0,
        "cuenta_retenciones_practicadas": "4751",
        "cuenta_retenciones_soportadas": "473",
    },
    "seguridad_social": {
        "contingencias_comunes_empresa": 23.6,
        "contingencias_comunes_trabajador": 4.7,
        "desempleo_empresa": 5.5,
        "desempleo_trabajador": 1.55,
        "formacion_empresa": 0.6,
        "formacion_trabajador": 0.1,
        "fogasa": 0.2,
        "cuenta_ss_acreedora": "476",
    },
    "regimenes_iva": [
        "general",
        "simplificado",
        "recargo_equivalencia",
        "agricultura_ganaderia_pesca",
        "criterio_caja",
    ],
    "umbrales": {
        "modulos": 250_000,
        "recargo_equivalencia_minoristas": True,
        "exencion_iva_pyme": 85_000,
    },
}
