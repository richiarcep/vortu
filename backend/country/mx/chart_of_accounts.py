"""
México — Catálogo de cuentas basado en el CÓDIGO AGRUPADOR DEL SAT.
====================================================================
Fuente oficial: Resolución Miscelánea Fiscal, Anexo 24 (Contabilidad Electrónica).
SAT — http://omawww.sat.gob.mx/factura/Paginas/codigo_agrupador.htm

El código agrupador del SAT es obligatorio para la contabilidad electrónica:
cada cuenta de la empresa debe mapearse a uno de estos códigos en el XML de catálogo.

⚠️ VERIFICAR con contador: los códigos/nombres siguen la estructura oficial del
Anexo 24, pero deben confirmarse contra la versión vigente del SAT antes de usarse
para timbrado / envío de contabilidad electrónica.

Saldo normal:
  debit  = saldo deudor  (activos, gastos, costos)
  credit = saldo acreedor (pasivos, capital, ingresos)
"""

CHART_OF_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # 100-199 — ACTIVO
    # ══════════════════════════════════════════════════════════════

    # 101-110 Efectivo, bancos e inversiones
    {"code": "101.01", "name": "Caja",                                      "type": "asset", "normal": "debit"},
    {"code": "102.01", "name": "Bancos nacionales",                         "type": "asset", "normal": "debit"},
    {"code": "102.02", "name": "Bancos extranjeros",                        "type": "asset", "normal": "debit"},
    {"code": "103.01", "name": "Inversiones temporales",                    "type": "asset", "normal": "debit"},
    {"code": "104.01", "name": "Inversiones en valores",                    "type": "asset", "normal": "debit"},

    # 105-109 Clientes y cuentas por cobrar
    {"code": "105.01", "name": "Clientes nacionales",                       "type": "asset", "normal": "debit"},
    {"code": "105.02", "name": "Clientes extranjeros",                      "type": "asset", "normal": "debit"},
    {"code": "106.01", "name": "Cuentas por cobrar a partes relacionadas",  "type": "asset", "normal": "debit"},
    {"code": "107.01", "name": "Documentos por cobrar",                     "type": "asset", "normal": "debit"},
    {"code": "108.01", "name": "Deudores diversos",                         "type": "asset", "normal": "debit"},
    {"code": "109.01", "name": "Estimación de cuentas incobrables",         "type": "asset", "normal": "credit"},

    # 110-114 Pagos anticipados e impuestos a favor
    {"code": "110.01", "name": "Pagos provisionales de ISR",                "type": "asset", "normal": "debit"},
    {"code": "111.01", "name": "Subsidio al empleo por aplicar",            "type": "asset", "normal": "debit"},
    {"code": "113.01", "name": "IVA acreditable pagado",                    "type": "asset", "normal": "debit"},
    {"code": "113.02", "name": "IVA acreditable pendiente de pago",         "type": "asset", "normal": "debit"},
    {"code": "114.01", "name": "IVA a favor",                               "type": "asset", "normal": "debit"},

    # 115-119 Inventarios y anticipos
    {"code": "115.01", "name": "Inventario de mercancías",                  "type": "asset", "normal": "debit"},
    {"code": "115.02", "name": "Materias primas",                          "type": "asset", "normal": "debit"},
    {"code": "115.03", "name": "Producción en proceso",                     "type": "asset", "normal": "debit"},
    {"code": "115.04", "name": "Productos terminados",                      "type": "asset", "normal": "debit"},
    {"code": "118.01", "name": "Anticipo a proveedores nacionales",         "type": "asset", "normal": "debit"},
    {"code": "119.01", "name": "Pagos anticipados",                         "type": "asset", "normal": "debit"},

    # 151-159 Inmuebles, planta y equipo
    {"code": "151.01", "name": "Terrenos",                                  "type": "asset", "normal": "debit"},
    {"code": "152.01", "name": "Edificios",                                 "type": "asset", "normal": "debit"},
    {"code": "153.01", "name": "Maquinaria y equipo",                       "type": "asset", "normal": "debit"},
    {"code": "154.01", "name": "Automóviles, autobuses y camiones",         "type": "asset", "normal": "debit"},
    {"code": "155.01", "name": "Mobiliario y equipo de oficina",            "type": "asset", "normal": "debit"},
    {"code": "156.01", "name": "Equipo de cómputo",                         "type": "asset", "normal": "debit"},
    {"code": "157.01", "name": "Equipo de comunicación",                    "type": "asset", "normal": "debit"},

    # 165-179 Depreciación acumulada
    {"code": "165.01", "name": "Depreciación acumulada de edificios",       "type": "asset", "normal": "credit"},
    {"code": "166.01", "name": "Depreciación acumulada de maquinaria y equipo", "type": "asset", "normal": "credit"},
    {"code": "167.01", "name": "Depreciación acumulada de equipo de transporte", "type": "asset", "normal": "credit"},
    {"code": "168.01", "name": "Depreciación acumulada de mobiliario y equipo", "type": "asset", "normal": "credit"},
    {"code": "169.01", "name": "Depreciación acumulada de equipo de cómputo", "type": "asset", "normal": "credit"},

    # 180-189 Activos intangibles y diferidos
    {"code": "184.01", "name": "Gastos de instalación",                     "type": "asset", "normal": "debit"},
    {"code": "186.01", "name": "Software",                                  "type": "asset", "normal": "debit"},
    {"code": "187.01", "name": "Marcas y patentes",                         "type": "asset", "normal": "debit"},
    {"code": "189.01", "name": "Amortización acumulada de intangibles",     "type": "asset", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 200-299 — PASIVO
    # ══════════════════════════════════════════════════════════════

    # 201-209 Proveedores y cuentas por pagar
    {"code": "201.01", "name": "Proveedores nacionales",                    "type": "liability", "normal": "credit"},
    {"code": "201.02", "name": "Proveedores extranjeros",                   "type": "liability", "normal": "credit"},
    {"code": "204.01", "name": "Sueldos y salarios por pagar",              "type": "liability", "normal": "credit"},
    {"code": "205.01", "name": "Documentos por pagar a corto plazo",        "type": "liability", "normal": "credit"},
    {"code": "206.01", "name": "Cuentas por pagar a partes relacionadas",   "type": "liability", "normal": "credit"},
    {"code": "207.01", "name": "Acreedores diversos",                       "type": "liability", "normal": "credit"},
    {"code": "209.01", "name": "Anticipos de clientes",                     "type": "liability", "normal": "credit"},

    # 210-219 Impuestos y contribuciones por pagar
    {"code": "210.01", "name": "ISR por pagar",                             "type": "liability", "normal": "credit"},
    {"code": "213.01", "name": "IVA trasladado cobrado",                    "type": "liability", "normal": "credit"},
    {"code": "213.02", "name": "IVA trasladado no cobrado",                 "type": "liability", "normal": "credit"},
    {"code": "214.01", "name": "IVA por pagar",                             "type": "liability", "normal": "credit"},
    {"code": "216.01", "name": "Retenciones de ISR por salarios",          "type": "liability", "normal": "credit"},
    {"code": "216.02", "name": "Retenciones de ISR por honorarios",        "type": "liability", "normal": "credit"},
    {"code": "216.03", "name": "Retenciones de ISR por arrendamiento",     "type": "liability", "normal": "credit"},
    {"code": "217.01", "name": "Retenciones de IVA",                        "type": "liability", "normal": "credit"},
    {"code": "218.01", "name": "Cuotas IMSS por pagar",                     "type": "liability", "normal": "credit"},
    {"code": "219.01", "name": "Aportaciones INFONAVIT por pagar",          "type": "liability", "normal": "credit"},
    {"code": "219.02", "name": "Impuesto sobre nómina por pagar",           "type": "liability", "normal": "credit"},

    # 250-259 Pasivo a largo plazo
    {"code": "251.01", "name": "Acreedores bancarios a largo plazo",        "type": "liability", "normal": "credit"},
    {"code": "252.01", "name": "Documentos por pagar a largo plazo",        "type": "liability", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 300-399 — CAPITAL CONTABLE
    # ══════════════════════════════════════════════════════════════
    {"code": "301.01", "name": "Capital social",                            "type": "equity", "normal": "credit"},
    {"code": "302.01", "name": "Aportaciones para futuros aumentos de capital", "type": "equity", "normal": "credit"},
    {"code": "303.01", "name": "Reserva legal",                             "type": "equity", "normal": "credit"},
    {"code": "304.01", "name": "Resultado de ejercicios anteriores (utilidad)", "type": "equity", "normal": "credit"},
    {"code": "305.01", "name": "Resultado de ejercicios anteriores (pérdida)", "type": "equity", "normal": "debit"},
    {"code": "306.01", "name": "Resultado del ejercicio (utilidad)",        "type": "equity", "normal": "credit"},
    {"code": "307.01", "name": "Resultado del ejercicio (pérdida)",         "type": "equity", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 400-499 — INGRESOS
    # ══════════════════════════════════════════════════════════════
    {"code": "401.01", "name": "Ventas y/o servicios gravados a la tasa general", "type": "income", "normal": "credit"},
    {"code": "401.02", "name": "Ventas y/o servicios gravados a la tasa del 0%", "type": "income", "normal": "credit"},
    {"code": "401.03", "name": "Ventas y/o servicios exentos",              "type": "income", "normal": "credit"},
    {"code": "402.01", "name": "Ventas de exportación",                     "type": "income", "normal": "credit"},
    {"code": "403.01", "name": "Ingresos por servicios",                    "type": "income", "normal": "credit"},
    {"code": "404.01", "name": "Devoluciones, descuentos y bonificaciones sobre ventas", "type": "income", "normal": "debit"},
    {"code": "405.01", "name": "Otros ingresos",                            "type": "income", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 500-599 — COSTOS
    # ══════════════════════════════════════════════════════════════
    {"code": "501.01", "name": "Costo de venta",                            "type": "expense", "normal": "debit"},
    {"code": "502.01", "name": "Compras nacionales",                        "type": "expense", "normal": "debit"},
    {"code": "502.02", "name": "Compras de importación",                    "type": "expense", "normal": "debit"},
    {"code": "503.01", "name": "Devoluciones, descuentos sobre compras",    "type": "expense", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 600-699 — GASTOS
    # ══════════════════════════════════════════════════════════════
    # Gastos de personal
    {"code": "601.01", "name": "Sueldos y salarios",                        "type": "expense", "normal": "debit"},
    {"code": "601.02", "name": "Tiempo extra",                             "type": "expense", "normal": "debit"},
    {"code": "601.03", "name": "Aguinaldo",                                "type": "expense", "normal": "debit"},
    {"code": "601.04", "name": "Prima vacacional",                          "type": "expense", "normal": "debit"},
    {"code": "601.05", "name": "Cuotas IMSS a cargo del patrón",            "type": "expense", "normal": "debit"},
    {"code": "601.06", "name": "Aportaciones INFONAVIT",                    "type": "expense", "normal": "debit"},
    {"code": "601.07", "name": "Impuesto sobre nómina",                     "type": "expense", "normal": "debit"},
    # Servicios y gastos generales
    {"code": "602.01", "name": "Honorarios",                               "type": "expense", "normal": "debit"},
    {"code": "602.02", "name": "Servicios profesionales",                   "type": "expense", "normal": "debit"},
    {"code": "603.01", "name": "Arrendamiento de inmuebles",                "type": "expense", "normal": "debit"},
    {"code": "604.01", "name": "Publicidad y propaganda",                   "type": "expense", "normal": "debit"},
    {"code": "605.01", "name": "Fletes y acarreos",                         "type": "expense", "normal": "debit"},
    {"code": "606.01", "name": "Mantenimiento y conservación",              "type": "expense", "normal": "debit"},
    {"code": "607.01", "name": "Combustibles y lubricantes",                "type": "expense", "normal": "debit"},
    {"code": "608.01", "name": "Energía eléctrica",                         "type": "expense", "normal": "debit"},
    {"code": "609.01", "name": "Teléfono e internet",                       "type": "expense", "normal": "debit"},
    {"code": "610.01", "name": "Papelería y artículos de oficina",          "type": "expense", "normal": "debit"},
    {"code": "611.01", "name": "Seguros y fianzas",                         "type": "expense", "normal": "debit"},
    {"code": "612.01", "name": "Viáticos y gastos de viaje",                "type": "expense", "normal": "debit"},
    {"code": "613.01", "name": "Comisiones bancarias",                      "type": "expense", "normal": "debit"},
    {"code": "614.01", "name": "Depreciación del ejercicio",                "type": "expense", "normal": "debit"},
    {"code": "615.01", "name": "Amortización del ejercicio",                "type": "expense", "normal": "debit"},
    {"code": "616.01", "name": "Otros gastos generales",                    "type": "expense", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 700-799 — RESULTADO INTEGRAL DE FINANCIAMIENTO (ingresos)
    # ══════════════════════════════════════════════════════════════
    {"code": "701.01", "name": "Intereses a favor",                         "type": "income", "normal": "credit"},
    {"code": "702.01", "name": "Utilidad cambiaria",                        "type": "income", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 800-899 — RESULTADO INTEGRAL DE FINANCIAMIENTO (gastos)
    # ══════════════════════════════════════════════════════════════
    {"code": "801.01", "name": "Intereses a cargo",                         "type": "expense", "normal": "debit"},
    {"code": "802.01", "name": "Pérdida cambiaria",                         "type": "expense", "normal": "debit"},
    {"code": "803.01", "name": "Otros gastos financieros",                  "type": "expense", "normal": "debit"},
]


# ── Mapeo categoría del registro → asiento (cuenta_debe, cuenta_haber) ────────
# Vocabulario de categorías COMPARTIDO con el resto de países (ver country/es).
# Permite que los módulos generen asientos sin conocer los códigos de cada país.
ENTRY_MAP = {
    # Venta: clientes nacionales (debe) / ventas tasa general (haber)
    ("ingreso", "Ventas"):    ("105.01", "401.01"),
    # Compra: compras nacionales (debe) / proveedores nacionales (haber)
    ("gasto",   "Compras"):   ("502.01", "201.01"),
    # Nómina: sueldos y salarios (debe) / sueldos por pagar (haber)
    ("gasto",   "Personal"):  ("601.01", "204.01"),
    # Servicios: servicios profesionales (debe) / acreedores diversos (haber)
    ("gasto",   "Servicios"): ("602.02", "207.01"),
}

# Asiento por defecto si la categoría no está mapeada.
DEFAULT_GASTO   = ("616.01", "201.01")   # otros gastos generales / proveedores
DEFAULT_INGRESO = ("105.01", "401.01")   # clientes / ventas


def get_entry_accounts(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in ENTRY_MAP:
        return ENTRY_MAP[key]
    return DEFAULT_GASTO if tipo == "gasto" else DEFAULT_INGRESO
