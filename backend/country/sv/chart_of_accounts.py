"""
El Salvador — Catálogo de cuentas basado en NIIF para PYMES.
============================================================
Base: NIIF para PYMES — catálogo El Salvador.
Adoptado por el Consejo de Vigilancia de la Profesión de Contaduría Pública
y Auditoría (CVPCPA). Cumplimiento fiscal: Ministerio de Hacienda — DGII.
Moneda: USD (dólar de los Estados Unidos). IVA: 13%.

El esquema numérico es jerárquico (típico de las PYMES salvadoreñas):
  1x   Activo            (11 corriente, 12 no corriente)
  2x   Pasivo            (21 corriente, 22 no corriente)
  3x   Patrimonio        (31 capital)
  4x   Ingresos          (41)
  5x   Costos y gastos   (51 costos, 52 gastos de venta,
                          53 gastos de administración / financieros)

⚠️ VERIFICAR con contador: la estructura sigue la práctica común bajo NIIF
para PYMES en El Salvador, pero los códigos, nombres y clasificaciones deben
confirmarse con un contador / auditor autorizado y ajustarse al catálogo
particular de la empresa antes de usarse para registros fiscales o el Informe
de catálogo de cuentas ante la DGII.

Saldo normal:
  debit  = saldo deudor  (activos, gastos, costos)
  credit = saldo acreedor (pasivos, patrimonio, ingresos)
Cuentas de naturaleza contraria invierten su saldo
(p. ej. Depreciación acumulada = activo con saldo acreedor;
Devoluciones sobre ventas = ingreso con saldo deudor).
"""

CHART_OF_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # 11 — ACTIVO CORRIENTE
    # ══════════════════════════════════════════════════════════════

    # 1101 Efectivo y equivalentes
    {"code": "1101",   "name": "Efectivo y equivalentes de efectivo",      "type": "asset", "normal": "debit"},
    {"code": "110101", "name": "Caja general",                             "type": "asset", "normal": "debit"},
    {"code": "110102", "name": "Caja chica",                               "type": "asset", "normal": "debit"},
    {"code": "110103", "name": "Bancos cuenta corriente",                  "type": "asset", "normal": "debit"},
    {"code": "110104", "name": "Bancos cuenta de ahorro",                  "type": "asset", "normal": "debit"},
    {"code": "110105", "name": "Inversiones temporales",                   "type": "asset", "normal": "debit"},

    # 1102 Cuentas comerciales por cobrar
    {"code": "1102",   "name": "Cuentas por cobrar comerciales",           "type": "asset", "normal": "debit"},
    {"code": "110201", "name": "Clientes locales",                         "type": "asset", "normal": "debit"},
    {"code": "110202", "name": "Clientes del exterior",                    "type": "asset", "normal": "debit"},
    {"code": "110203", "name": "Documentos por cobrar",                    "type": "asset", "normal": "debit"},
    {"code": "110299", "name": "Estimación para cuentas incobrables",      "type": "asset", "normal": "credit"},

    # 1103 Otras cuentas por cobrar
    {"code": "1103",   "name": "Otras cuentas por cobrar",                 "type": "asset", "normal": "debit"},
    {"code": "110301", "name": "Anticipos y préstamos a empleados",        "type": "asset", "normal": "debit"},
    {"code": "110302", "name": "Deudores varios",                          "type": "asset", "normal": "debit"},

    # 1104 IVA crédito fiscal
    {"code": "1104",   "name": "IVA crédito fiscal",                       "type": "asset", "normal": "debit"},
    {"code": "110401", "name": "IVA crédito fiscal por compras",           "type": "asset", "normal": "debit"},
    {"code": "110402", "name": "IVA crédito fiscal por importaciones",     "type": "asset", "normal": "debit"},
    {"code": "110403", "name": "Remanente de crédito fiscal",              "type": "asset", "normal": "debit"},
    {"code": "110404", "name": "IVA retenido y percibido a favor",         "type": "asset", "normal": "debit"},

    # 1105 Inventarios
    {"code": "1105",   "name": "Inventarios",                              "type": "asset", "normal": "debit"},
    {"code": "110501", "name": "Mercaderías",                              "type": "asset", "normal": "debit"},
    {"code": "110502", "name": "Materia prima",                            "type": "asset", "normal": "debit"},
    {"code": "110503", "name": "Productos en proceso",                     "type": "asset", "normal": "debit"},
    {"code": "110504", "name": "Productos terminados",                     "type": "asset", "normal": "debit"},
    {"code": "110505", "name": "Mercaderías en tránsito",                  "type": "asset", "normal": "debit"},
    {"code": "110599", "name": "Estimación por obsolescencia de inventario","type": "asset", "normal": "credit"},

    # 1106 Pagos anticipados e impuestos a favor
    {"code": "1106",   "name": "Pagos anticipados",                        "type": "asset", "normal": "debit"},
    {"code": "110601", "name": "Anticipo a proveedores",                   "type": "asset", "normal": "debit"},
    {"code": "110602", "name": "Seguros y alquileres pagados por anticipado","type": "asset", "normal": "debit"},
    {"code": "110603", "name": "Pago a cuenta de ISR (anticipo)",          "type": "asset", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 12 — ACTIVO NO CORRIENTE
    # ══════════════════════════════════════════════════════════════

    # 1201 Propiedad, planta y equipo
    {"code": "1201",   "name": "Propiedad, planta y equipo",              "type": "asset", "normal": "debit"},
    {"code": "120101", "name": "Terrenos",                                 "type": "asset", "normal": "debit"},
    {"code": "120102", "name": "Edificios e instalaciones",               "type": "asset", "normal": "debit"},
    {"code": "120103", "name": "Maquinaria y equipo",                     "type": "asset", "normal": "debit"},
    {"code": "120104", "name": "Mobiliario y equipo de oficina",          "type": "asset", "normal": "debit"},
    {"code": "120105", "name": "Equipo de cómputo",                       "type": "asset", "normal": "debit"},
    {"code": "120106", "name": "Vehículos",                               "type": "asset", "normal": "debit"},
    {"code": "120107", "name": "Construcciones en proceso",               "type": "asset", "normal": "debit"},

    # 1202 Depreciación acumulada (cuentas contra-activo)
    {"code": "1202",   "name": "Depreciación acumulada",                  "type": "asset", "normal": "credit"},
    {"code": "120201", "name": "Depreciación acumulada de edificios",     "type": "asset", "normal": "credit"},
    {"code": "120202", "name": "Depreciación acumulada de maquinaria y equipo", "type": "asset", "normal": "credit"},
    {"code": "120203", "name": "Depreciación acumulada de mobiliario y equipo", "type": "asset", "normal": "credit"},
    {"code": "120204", "name": "Depreciación acumulada de equipo de cómputo", "type": "asset", "normal": "credit"},
    {"code": "120205", "name": "Depreciación acumulada de vehículos",     "type": "asset", "normal": "credit"},

    # 1203 Activos intangibles
    {"code": "1203",   "name": "Activos intangibles",                     "type": "asset", "normal": "debit"},
    {"code": "120301", "name": "Software y licencias",                    "type": "asset", "normal": "debit"},
    {"code": "120302", "name": "Marcas y patentes",                       "type": "asset", "normal": "debit"},
    {"code": "120399", "name": "Amortización acumulada de intangibles",   "type": "asset", "normal": "credit"},

    # 1204 Otros activos no corrientes
    {"code": "1204",   "name": "Otros activos no corrientes",             "type": "asset", "normal": "debit"},
    {"code": "120401", "name": "Inversiones permanentes",                 "type": "asset", "normal": "debit"},
    {"code": "120402", "name": "Depósitos en garantía",                   "type": "asset", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 21 — PASIVO CORRIENTE
    # ══════════════════════════════════════════════════════════════

    # 2101 Proveedores y cuentas por pagar
    {"code": "2101",   "name": "Proveedores",                             "type": "liability", "normal": "credit"},
    {"code": "210101", "name": "Proveedores locales",                     "type": "liability", "normal": "credit"},
    {"code": "210102", "name": "Proveedores del exterior",                "type": "liability", "normal": "credit"},
    {"code": "210103", "name": "Documentos por pagar comerciales",        "type": "liability", "normal": "credit"},

    # 2102 Cuentas por pagar diversas
    {"code": "2102",   "name": "Cuentas por pagar",                       "type": "liability", "normal": "credit"},
    {"code": "210201", "name": "Acreedores varios",                       "type": "liability", "normal": "credit"},
    {"code": "210202", "name": "Honorarios por pagar",                    "type": "liability", "normal": "credit"},
    {"code": "210203", "name": "Servicios por pagar",                     "type": "liability", "normal": "credit"},
    {"code": "210204", "name": "Cuentas por pagar partes relacionadas",   "type": "liability", "normal": "credit"},
    {"code": "210205", "name": "Anticipos de clientes",                   "type": "liability", "normal": "credit"},

    # 2103 IVA débito fiscal
    {"code": "2103",   "name": "IVA débito fiscal",                       "type": "liability", "normal": "credit"},
    {"code": "210301", "name": "IVA débito fiscal por ventas",            "type": "liability", "normal": "credit"},
    {"code": "210302", "name": "IVA por pagar",                           "type": "liability", "normal": "credit"},

    # 2104 Retenciones y percepciones por pagar
    {"code": "2104",   "name": "Retenciones y percepciones por pagar",    "type": "liability", "normal": "credit"},
    {"code": "210401", "name": "Retención IVA 1%",                        "type": "liability", "normal": "credit"},
    {"code": "210402", "name": "Retención IVA 13%",                       "type": "liability", "normal": "credit"},
    {"code": "210403", "name": "Percepción IVA 1%",                       "type": "liability", "normal": "credit"},
    {"code": "210404", "name": "Retención ISR a empleados",               "type": "liability", "normal": "credit"},
    {"code": "210405", "name": "Retención ISR por servicios",             "type": "liability", "normal": "credit"},

    # 2105 Obligaciones laborales y previsionales
    {"code": "2105",   "name": "Beneficios a empleados por pagar",        "type": "liability", "normal": "credit"},
    {"code": "210501", "name": "Sueldos y salarios por pagar",            "type": "liability", "normal": "credit"},
    {"code": "210502", "name": "ISSS por pagar (cuota patronal y laboral)","type": "liability", "normal": "credit"},
    {"code": "210503", "name": "AFP por pagar (cuota patronal y laboral)", "type": "liability", "normal": "credit"},
    {"code": "210504", "name": "Aguinaldos por pagar",                    "type": "liability", "normal": "credit"},
    {"code": "210505", "name": "Vacaciones e indemnizaciones por pagar",  "type": "liability", "normal": "credit"},

    # 2106 Impuestos por pagar
    {"code": "2106",   "name": "Impuestos por pagar",                     "type": "liability", "normal": "credit"},
    {"code": "210601", "name": "Impuesto sobre la renta (ISR) por pagar", "type": "liability", "normal": "credit"},
    {"code": "210602", "name": "Pago a cuenta por pagar",                 "type": "liability", "normal": "credit"},
    {"code": "210603", "name": "Impuestos municipales por pagar",         "type": "liability", "normal": "credit"},

    # 2107 Deuda financiera corriente
    {"code": "2107",   "name": "Préstamos bancarios a corto plazo",       "type": "liability", "normal": "credit"},
    {"code": "210701", "name": "Sobregiros bancarios",                    "type": "liability", "normal": "credit"},
    {"code": "210702", "name": "Porción corriente de préstamos a largo plazo", "type": "liability", "normal": "credit"},
    {"code": "210703", "name": "Intereses por pagar",                     "type": "liability", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 22 — PASIVO NO CORRIENTE
    # ══════════════════════════════════════════════════════════════
    {"code": "2201",   "name": "Préstamos bancarios a largo plazo",       "type": "liability", "normal": "credit"},
    {"code": "2202",   "name": "Documentos por pagar a largo plazo",      "type": "liability", "normal": "credit"},
    {"code": "2203",   "name": "Cuentas por pagar a largo plazo",         "type": "liability", "normal": "credit"},
    {"code": "2204",   "name": "Provisión para obligaciones laborales",   "type": "liability", "normal": "credit"},
    {"code": "2205",   "name": "Impuesto sobre la renta diferido",        "type": "liability", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 31 — PATRIMONIO
    # ══════════════════════════════════════════════════════════════
    {"code": "3101",   "name": "Capital social",                          "type": "equity", "normal": "credit"},
    {"code": "310101", "name": "Capital social suscrito y pagado",        "type": "equity", "normal": "credit"},
    {"code": "310102", "name": "Capital social suscrito no pagado",       "type": "equity", "normal": "debit"},
    {"code": "3102",   "name": "Reserva legal",                           "type": "equity", "normal": "credit"},
    {"code": "3103",   "name": "Reservas voluntarias",                    "type": "equity", "normal": "credit"},
    {"code": "3104",   "name": "Utilidades acumuladas",                   "type": "equity", "normal": "credit"},
    {"code": "3105",   "name": "Pérdidas acumuladas",                     "type": "equity", "normal": "debit"},
    {"code": "3106",   "name": "Utilidad del ejercicio",                  "type": "equity", "normal": "credit"},
    {"code": "3107",   "name": "Pérdida del ejercicio",                   "type": "equity", "normal": "debit"},
    {"code": "3108",   "name": "Superávit por revaluación",               "type": "equity", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 41 — INGRESOS
    # ══════════════════════════════════════════════════════════════
    {"code": "4101",   "name": "Ventas",                                  "type": "income", "normal": "credit"},
    {"code": "410101", "name": "Ventas gravadas locales",                 "type": "income", "normal": "credit"},
    {"code": "410102", "name": "Ventas exentas",                          "type": "income", "normal": "credit"},
    {"code": "410103", "name": "Ventas de exportación",                   "type": "income", "normal": "credit"},
    {"code": "410104", "name": "Ventas a cuenta de terceros",             "type": "income", "normal": "credit"},
    {"code": "4102",   "name": "Ingresos por servicios",                  "type": "income", "normal": "credit"},
    {"code": "410201", "name": "Servicios gravados",                      "type": "income", "normal": "credit"},
    {"code": "410202", "name": "Servicios exentos",                       "type": "income", "normal": "credit"},
    {"code": "4103",   "name": "Devoluciones y descuentos sobre ventas",  "type": "income", "normal": "debit"},
    {"code": "410301", "name": "Devoluciones sobre ventas",               "type": "income", "normal": "debit"},
    {"code": "410302", "name": "Descuentos y rebajas sobre ventas",       "type": "income", "normal": "debit"},
    {"code": "4104",   "name": "Otros ingresos",                          "type": "income", "normal": "credit"},
    {"code": "410401", "name": "Ingresos financieros (intereses)",        "type": "income", "normal": "credit"},
    {"code": "410402", "name": "Ganancia por diferencial cambiario",      "type": "income", "normal": "credit"},
    {"code": "410403", "name": "Ingresos diversos",                       "type": "income", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 51 — COSTOS
    # ══════════════════════════════════════════════════════════════
    {"code": "5101",   "name": "Costo de ventas",                         "type": "expense", "normal": "debit"},
    {"code": "510101", "name": "Costo de mercaderías vendidas",           "type": "expense", "normal": "debit"},
    {"code": "5102",   "name": "Compras",                                 "type": "expense", "normal": "debit"},
    {"code": "510201", "name": "Compras locales",                         "type": "expense", "normal": "debit"},
    {"code": "510202", "name": "Compras de importación",                  "type": "expense", "normal": "debit"},
    {"code": "510203", "name": "Devoluciones y descuentos sobre compras", "type": "expense", "normal": "credit"},
    {"code": "5103",   "name": "Costo de servicios",                      "type": "expense", "normal": "debit"},
    {"code": "5104",   "name": "Costos de producción",                    "type": "expense", "normal": "debit"},
    {"code": "510401", "name": "Mano de obra directa",                    "type": "expense", "normal": "debit"},
    {"code": "510402", "name": "Costos indirectos de fabricación",        "type": "expense", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 52 — GASTOS DE VENTA
    # ══════════════════════════════════════════════════════════════
    {"code": "5201",   "name": "Gastos de venta",                         "type": "expense", "normal": "debit"},
    {"code": "520101", "name": "Sueldos y salarios (ventas)",             "type": "expense", "normal": "debit"},
    {"code": "520102", "name": "Comisiones sobre ventas",                 "type": "expense", "normal": "debit"},
    {"code": "520103", "name": "Aporte patronal ISSS (ventas)",           "type": "expense", "normal": "debit"},
    {"code": "520104", "name": "Aporte patronal AFP (ventas)",            "type": "expense", "normal": "debit"},
    {"code": "520105", "name": "Aguinaldos y vacaciones (ventas)",        "type": "expense", "normal": "debit"},
    {"code": "520106", "name": "Publicidad y propaganda",                 "type": "expense", "normal": "debit"},
    {"code": "520107", "name": "Transporte y fletes sobre ventas",        "type": "expense", "normal": "debit"},
    {"code": "520108", "name": "Empaques y embalajes",                    "type": "expense", "normal": "debit"},
    {"code": "520109", "name": "Depreciación (ventas)",                   "type": "expense", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 53 — GASTOS DE ADMINISTRACIÓN Y FINANCIEROS
    # ══════════════════════════════════════════════════════════════
    {"code": "5301",   "name": "Gastos de administración",               "type": "expense", "normal": "debit"},
    {"code": "530101", "name": "Sueldos y salarios (administración)",     "type": "expense", "normal": "debit"},
    {"code": "530102", "name": "Aporte patronal ISSS (administración)",   "type": "expense", "normal": "debit"},
    {"code": "530103", "name": "Aporte patronal AFP (administración)",    "type": "expense", "normal": "debit"},
    {"code": "530104", "name": "Aguinaldos y vacaciones (administración)", "type": "expense", "normal": "debit"},
    {"code": "530105", "name": "Indemnizaciones",                         "type": "expense", "normal": "debit"},
    {"code": "530106", "name": "Honorarios profesionales",               "type": "expense", "normal": "debit"},
    {"code": "530107", "name": "Servicios contables y legales",          "type": "expense", "normal": "debit"},
    {"code": "530108", "name": "Energía eléctrica y agua",                "type": "expense", "normal": "debit"},
    {"code": "530109", "name": "Teléfono e internet",                     "type": "expense", "normal": "debit"},
    {"code": "530110", "name": "Alquileres",                              "type": "expense", "normal": "debit"},
    {"code": "530111", "name": "Papelería y útiles de oficina",          "type": "expense", "normal": "debit"},
    {"code": "530112", "name": "Mantenimiento y reparaciones",           "type": "expense", "normal": "debit"},
    {"code": "530113", "name": "Seguros",                                 "type": "expense", "normal": "debit"},
    {"code": "530114", "name": "Combustibles y lubricantes (administración)", "type": "expense", "normal": "debit"},
    {"code": "530115", "name": "Viáticos y gastos de viaje",             "type": "expense", "normal": "debit"},
    {"code": "530116", "name": "Impuestos municipales y contribuciones",  "type": "expense", "normal": "debit"},
    {"code": "530117", "name": "Depreciación (administración)",           "type": "expense", "normal": "debit"},
    {"code": "530118", "name": "Amortización de intangibles",            "type": "expense", "normal": "debit"},
    {"code": "530119", "name": "Cuentas incobrables",                    "type": "expense", "normal": "debit"},
    {"code": "530120", "name": "Gastos diversos",                         "type": "expense", "normal": "debit"},

    # 5302 Gastos financieros
    {"code": "5302",   "name": "Gastos financieros",                     "type": "expense", "normal": "debit"},
    {"code": "530201", "name": "Intereses sobre préstamos",              "type": "expense", "normal": "debit"},
    {"code": "530202", "name": "Comisiones y gastos bancarios",          "type": "expense", "normal": "debit"},
    {"code": "530203", "name": "Pérdida por diferencial cambiario",      "type": "expense", "normal": "debit"},

    # 5303 Gasto por impuesto sobre la renta
    {"code": "5303",   "name": "Gasto por impuesto sobre la renta",      "type": "expense", "normal": "debit"},
]


# ── Mapeo categoría del registro → asiento (cuenta_debe, cuenta_haber) ────────
# Vocabulario de categorías COMPARTIDO con el resto de países (ver country/es,
# country/mx). Permite que los módulos generen asientos sin conocer los códigos
# de cada país.
ENTRY_MAP = {
    # Venta: clientes locales (debe) / ventas gravadas locales (haber)
    ("ingreso", "Ventas"):    ("110201", "410101"),
    # Compra: compras locales (debe) / proveedores locales (haber)
    ("gasto",   "Compras"):   ("510201", "210101"),
    # Personal: sueldos y salarios (debe) / sueldos y salarios por pagar (haber)
    ("gasto",   "Personal"):  ("530101", "210501"),
    # Servicios: honorarios profesionales (debe) / servicios por pagar (haber)
    ("gasto",   "Servicios"): ("530106", "210203"),
}

# Asiento por defecto si la categoría no está mapeada.
DEFAULT_GASTO   = ("530120", "210101")   # gastos diversos / proveedores locales
DEFAULT_INGRESO = ("110201", "410101")   # clientes locales / ventas gravadas


def get_entry_accounts(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in ENTRY_MAP:
        return ENTRY_MAP[key]
    return DEFAULT_GASTO if tipo == "gasto" else DEFAULT_INGRESO
