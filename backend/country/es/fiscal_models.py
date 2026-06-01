"""
Modelos fiscales oficiales de España (AEAT).
Generadores y validadores para los modelos más comunes.
"""

FISCAL_MODELS = {
    "303": {
        "name": "Autoliquidación trimestral IVA",
        "frequency": "trimestral",
        "deadline_days_after_period": 20,
        "deadline_q4": "30 enero",
        "agency": "AEAT",
        "fields_required": [
            "iva_repercutido_general",
            "iva_repercutido_reducido",
            "iva_repercutido_superreducido",
            "iva_soportado_general",
            "iva_soportado_reducido",
            "iva_soportado_inversion",
            "resultado",
        ],
    },
    "130": {
        "name": "Pago fraccionado IRPF (estimación directa)",
        "frequency": "trimestral",
        "deadline_days_after_period": 20,
        "agency": "AEAT",
        "applies_to": ["autonomos_estimacion_directa"],
        "percentage": 20.0,
    },
    "131": {
        "name": "Pago fraccionado IRPF (módulos)",
        "frequency": "trimestral",
        "deadline_days_after_period": 20,
        "agency": "AEAT",
        "applies_to": ["autonomos_modulos"],
    },
    "390": {
        "name": "Resumen anual IVA",
        "frequency": "anual",
        "deadline": "30 enero año siguiente",
        "agency": "AEAT",
    },
    "111": {
        "name": "Retenciones IRPF trabajadores y profesionales",
        "frequency": "trimestral",
        "deadline_days_after_period": 20,
        "agency": "AEAT",
    },
    "115": {
        "name": "Retenciones IRPF alquileres",
        "frequency": "trimestral",
        "deadline_days_after_period": 20,
        "agency": "AEAT",
    },
    "180": {
        "name": "Resumen anual retenciones alquileres",
        "frequency": "anual",
        "deadline": "31 enero año siguiente",
        "agency": "AEAT",
    },
    "184": {
        "name": "Declaración informativa entidades en atribución de rentas",
        "frequency": "anual",
        "deadline": "marzo año siguiente",
        "agency": "AEAT",
    },
    "347": {
        "name": "Operaciones con terceros >3.005,06€",
        "frequency": "anual",
        "deadline": "febrero año siguiente",
        "agency": "AEAT",
    },
    "349": {
        "name": "Operaciones intracomunitarias",
        "frequency": "mensual_o_trimestral",
        "agency": "AEAT",
    },
}
