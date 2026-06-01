"""
Colombia — Plan Único de Cuentas (PUC) para comerciantes.
=========================================================
Fuente oficial: Decreto 2650 de 1993 (y sus modificaciones), por el cual se
expide el Plan Único de Cuentas para los comerciantes.
Diario Oficial No. 41.156 del 29 de diciembre de 1993.
https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=9388

El PUC clasifica las cuentas en clases:
  1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingresos,
  5 Gastos, 6 Costos de ventas, 7 Costos de producción o de operación.

⚠️ VERIFICAR con contador: los códigos/nombres siguen la estructura oficial del
Decreto 2650 de 1993, pero deben confirmarse contra la versión vigente del PUC
y la normatividad DIAN antes de usarse para declaraciones tributarias.

Saldo normal:
  debit  = saldo deudor  (activos, gastos, costos)
  credit = saldo acreedor (pasivos, patrimonio, ingresos)
"""

CHART_OF_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # CLASE 1 — ACTIVO
    # ══════════════════════════════════════════════════════════════

    # 11 Disponible
    {"code": "1105", "name": "Caja",                                          "type": "asset", "normal": "debit"},
    {"code": "110505", "name": "Caja general",                                "type": "asset", "normal": "debit"},
    {"code": "110510", "name": "Cajas menores",                               "type": "asset", "normal": "debit"},
    {"code": "1110", "name": "Bancos",                                        "type": "asset", "normal": "debit"},
    {"code": "111005", "name": "Bancos moneda nacional",                      "type": "asset", "normal": "debit"},
    {"code": "111010", "name": "Bancos moneda extranjera",                    "type": "asset", "normal": "debit"},
    {"code": "1120", "name": "Cuentas de ahorro",                             "type": "asset", "normal": "debit"},
    {"code": "1125", "name": "Remesas en tránsito",                           "type": "asset", "normal": "debit"},

    # 12 Inversiones
    {"code": "1205", "name": "Acciones",                                      "type": "asset", "normal": "debit"},
    {"code": "1210", "name": "Cuotas o partes de interés social",             "type": "asset", "normal": "debit"},
    {"code": "1215", "name": "Bonos",                                         "type": "asset", "normal": "debit"},
    {"code": "1220", "name": "Cédulas",                                       "type": "asset", "normal": "debit"},
    {"code": "1225", "name": "Certificados",                                  "type": "asset", "normal": "debit"},
    {"code": "1299", "name": "Provisiones (inversiones)",                     "type": "asset", "normal": "credit"},

    # 13 Deudores
    {"code": "1305", "name": "Clientes",                                      "type": "asset", "normal": "debit"},
    {"code": "130505", "name": "Clientes nacionales",                         "type": "asset", "normal": "debit"},
    {"code": "130510", "name": "Clientes del exterior",                       "type": "asset", "normal": "debit"},
    {"code": "1310", "name": "Cuentas corrientes comerciales",                "type": "asset", "normal": "debit"},
    {"code": "1330", "name": "Anticipos y avances",                           "type": "asset", "normal": "debit"},
    {"code": "1355", "name": "Anticipo de impuestos y contribuciones",        "type": "asset", "normal": "debit"},
    {"code": "135505", "name": "Anticipo de impuesto de renta",               "type": "asset", "normal": "debit"},
    {"code": "135515", "name": "Retención en la fuente (anticipo)",           "type": "asset", "normal": "debit"},
    {"code": "135517", "name": "Impuesto a las ventas retenido",              "type": "asset", "normal": "debit"},
    {"code": "135518", "name": "Impuesto de industria y comercio retenido",   "type": "asset", "normal": "debit"},
    {"code": "1360", "name": "Reclamaciones",                                 "type": "asset", "normal": "debit"},
    {"code": "1365", "name": "Cuentas por cobrar a trabajadores",             "type": "asset", "normal": "debit"},
    {"code": "1380", "name": "Deudores varios",                               "type": "asset", "normal": "debit"},
    {"code": "1399", "name": "Provisiones (deudores)",                        "type": "asset", "normal": "credit"},

    # 14 Inventarios
    {"code": "1405", "name": "Materias primas",                               "type": "asset", "normal": "debit"},
    {"code": "1410", "name": "Productos en proceso",                          "type": "asset", "normal": "debit"},
    {"code": "1430", "name": "Productos terminados",                          "type": "asset", "normal": "debit"},
    {"code": "1435", "name": "Mercancías no fabricadas por la empresa",       "type": "asset", "normal": "debit"},
    {"code": "1440", "name": "Bienes raíces para la venta",                   "type": "asset", "normal": "debit"},
    {"code": "1455", "name": "Materiales, repuestos y accesorios",            "type": "asset", "normal": "debit"},
    {"code": "1460", "name": "Envases y empaques",                            "type": "asset", "normal": "debit"},
    {"code": "1465", "name": "Inventarios en tránsito",                       "type": "asset", "normal": "debit"},
    {"code": "1499", "name": "Provisiones (inventarios)",                     "type": "asset", "normal": "credit"},

    # 15 Propiedades, planta y equipo
    {"code": "1504", "name": "Terrenos",                                      "type": "asset", "normal": "debit"},
    {"code": "1508", "name": "Construcciones en curso",                       "type": "asset", "normal": "debit"},
    {"code": "1516", "name": "Construcciones y edificaciones",                "type": "asset", "normal": "debit"},
    {"code": "1520", "name": "Maquinaria y equipo",                           "type": "asset", "normal": "debit"},
    {"code": "1524", "name": "Equipo de oficina",                             "type": "asset", "normal": "debit"},
    {"code": "1528", "name": "Equipo de computación y comunicación",          "type": "asset", "normal": "debit"},
    {"code": "1540", "name": "Flota y equipo de transporte",                  "type": "asset", "normal": "debit"},
    {"code": "1592", "name": "Depreciación acumulada",                        "type": "asset", "normal": "credit"},
    {"code": "1596", "name": "Depreciación diferida",                         "type": "asset", "normal": "credit"},
    {"code": "1599", "name": "Provisiones (propiedad, planta y equipo)",      "type": "asset", "normal": "credit"},

    # 16 Intangibles
    {"code": "1605", "name": "Crédito mercantil",                             "type": "asset", "normal": "debit"},
    {"code": "1610", "name": "Marcas",                                        "type": "asset", "normal": "debit"},
    {"code": "1615", "name": "Patentes",                                      "type": "asset", "normal": "debit"},
    {"code": "1625", "name": "Derechos",                                      "type": "asset", "normal": "debit"},
    {"code": "1635", "name": "Licencias",                                     "type": "asset", "normal": "debit"},
    {"code": "1698", "name": "Amortización acumulada (intangibles)",          "type": "asset", "normal": "credit"},

    # 17 Diferidos
    {"code": "1705", "name": "Gastos pagados por anticipado",                 "type": "asset", "normal": "debit"},
    {"code": "1710", "name": "Cargos diferidos",                              "type": "asset", "normal": "debit"},

    # 18 Otros activos / 19 Valorizaciones
    {"code": "1805", "name": "Bienes de arte y cultura",                      "type": "asset", "normal": "debit"},
    {"code": "1905", "name": "De inversiones",                                "type": "asset", "normal": "debit"},
    {"code": "1910", "name": "De propiedades, planta y equipo",               "type": "asset", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # CLASE 2 — PASIVO
    # ══════════════════════════════════════════════════════════════

    # 21 Obligaciones financieras
    {"code": "2105", "name": "Bancos nacionales",                             "type": "liability", "normal": "credit"},
    {"code": "2110", "name": "Bancos del exterior",                           "type": "liability", "normal": "credit"},
    {"code": "2115", "name": "Corporaciones financieras",                     "type": "liability", "normal": "credit"},
    {"code": "2120", "name": "Compañías de financiamiento comercial",         "type": "liability", "normal": "credit"},

    # 22 Proveedores
    {"code": "2205", "name": "Proveedores nacionales",                        "type": "liability", "normal": "credit"},
    {"code": "2210", "name": "Proveedores del exterior",                      "type": "liability", "normal": "credit"},
    {"code": "2215", "name": "Cuentas corrientes comerciales (proveedores)",  "type": "liability", "normal": "credit"},

    # 23 Cuentas por pagar
    {"code": "2305", "name": "Cuentas corrientes comerciales",                "type": "liability", "normal": "credit"},
    {"code": "2335", "name": "Costos y gastos por pagar",                     "type": "liability", "normal": "credit"},
    {"code": "233505", "name": "Gastos financieros por pagar",               "type": "liability", "normal": "credit"},
    {"code": "233525", "name": "Honorarios por pagar",                        "type": "liability", "normal": "credit"},
    {"code": "233530", "name": "Servicios técnicos por pagar",               "type": "liability", "normal": "credit"},
    {"code": "233535", "name": "Servicios de mantenimiento por pagar",        "type": "liability", "normal": "credit"},
    {"code": "2365", "name": "Retención en la fuente",                        "type": "liability", "normal": "credit"},
    {"code": "236505", "name": "Salarios y pagos laborales (retefuente)",     "type": "liability", "normal": "credit"},
    {"code": "236515", "name": "Honorarios (retefuente)",                     "type": "liability", "normal": "credit"},
    {"code": "236520", "name": "Comisiones (retefuente)",                     "type": "liability", "normal": "credit"},
    {"code": "236525", "name": "Servicios (retefuente)",                      "type": "liability", "normal": "credit"},
    {"code": "236540", "name": "Compras (retefuente)",                        "type": "liability", "normal": "credit"},
    {"code": "2367", "name": "Impuesto a las ventas retenido (ReteIVA)",      "type": "liability", "normal": "credit"},
    {"code": "2368", "name": "Impuesto de industria y comercio retenido",     "type": "liability", "normal": "credit"},
    {"code": "2370", "name": "Retenciones y aportes de nómina",               "type": "liability", "normal": "credit"},
    {"code": "2380", "name": "Acreedores varios",                             "type": "liability", "normal": "credit"},

    # 24 Impuestos, gravámenes y tasas
    {"code": "2404", "name": "De renta y complementarios",                    "type": "liability", "normal": "credit"},
    {"code": "2408", "name": "Impuesto sobre las ventas por pagar (IVA)",     "type": "liability", "normal": "credit"},
    {"code": "2412", "name": "De industria y comercio",                       "type": "liability", "normal": "credit"},
    {"code": "2495", "name": "Otros impuestos, gravámenes y tasas",           "type": "liability", "normal": "credit"},

    # 25 Obligaciones laborales
    {"code": "2505", "name": "Salarios por pagar",                            "type": "liability", "normal": "credit"},
    {"code": "2510", "name": "Cesantías consolidadas",                        "type": "liability", "normal": "credit"},
    {"code": "2515", "name": "Intereses sobre cesantías",                     "type": "liability", "normal": "credit"},
    {"code": "2520", "name": "Prima de servicios",                            "type": "liability", "normal": "credit"},
    {"code": "2525", "name": "Vacaciones consolidadas",                       "type": "liability", "normal": "credit"},

    # 26 Pasivos estimados y provisiones / 27 Diferidos / 28 Otros pasivos
    {"code": "2605", "name": "Para costos y gastos",                          "type": "liability", "normal": "credit"},
    {"code": "2705", "name": "Ingresos recibidos por anticipado",             "type": "liability", "normal": "credit"},
    {"code": "2805", "name": "Anticipos y avances recibidos",                 "type": "liability", "normal": "credit"},
    {"code": "2815", "name": "Ingresos recibidos para terceros",              "type": "liability", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # CLASE 3 — PATRIMONIO
    # ══════════════════════════════════════════════════════════════
    {"code": "3105", "name": "Capital suscrito y pagado",                     "type": "equity", "normal": "credit"},
    {"code": "3115", "name": "Aportes sociales",                              "type": "equity", "normal": "credit"},
    {"code": "3120", "name": "Capital asignado",                              "type": "equity", "normal": "credit"},
    {"code": "3205", "name": "Prima en colocación de acciones, cuotas o partes", "type": "equity", "normal": "credit"},
    {"code": "3305", "name": "Reservas obligatorias",                         "type": "equity", "normal": "credit"},
    {"code": "330505", "name": "Reserva legal",                              "type": "equity", "normal": "credit"},
    {"code": "3310", "name": "Reservas estatutarias",                         "type": "equity", "normal": "credit"},
    {"code": "3315", "name": "Reservas ocasionales",                          "type": "equity", "normal": "credit"},
    {"code": "3605", "name": "Utilidad del ejercicio",                        "type": "equity", "normal": "credit"},
    {"code": "3610", "name": "Pérdida del ejercicio",                         "type": "equity", "normal": "debit"},
    {"code": "3705", "name": "Utilidades acumuladas",                         "type": "equity", "normal": "credit"},
    {"code": "3710", "name": "Pérdidas acumuladas",                           "type": "equity", "normal": "debit"},
    {"code": "3805", "name": "De propiedades, planta y equipo (superávit)",   "type": "equity", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # CLASE 4 — INGRESOS
    # ══════════════════════════════════════════════════════════════

    # 41 Operacionales
    {"code": "4135", "name": "Comercio al por mayor y al por menor",          "type": "income", "normal": "credit"},
    {"code": "413505", "name": "Venta de mercancías",                        "type": "income", "normal": "credit"},
    {"code": "4140", "name": "Hoteles y restaurantes",                        "type": "income", "normal": "credit"},
    {"code": "4145", "name": "Transporte, almacenamiento y comunicaciones",   "type": "income", "normal": "credit"},
    {"code": "4150", "name": "Actividad financiera",                          "type": "income", "normal": "credit"},
    {"code": "4155", "name": "Actividad inmobiliaria y de alquiler",          "type": "income", "normal": "credit"},
    {"code": "4160", "name": "Enseñanza",                                     "type": "income", "normal": "credit"},
    {"code": "4165", "name": "Servicios sociales y de salud",                 "type": "income", "normal": "credit"},
    {"code": "4175", "name": "Devoluciones en ventas (DB)",                   "type": "income", "normal": "debit"},

    # 42 No operacionales
    {"code": "4205", "name": "Financieros",                                   "type": "income", "normal": "credit"},
    {"code": "4210", "name": "Dividendos y participaciones",                  "type": "income", "normal": "credit"},
    {"code": "4215", "name": "Ingresos por método de participación",          "type": "income", "normal": "credit"},
    {"code": "4218", "name": "Ingresos de ejercicios anteriores",             "type": "income", "normal": "credit"},
    {"code": "4220", "name": "Arrendamientos",                                "type": "income", "normal": "credit"},
    {"code": "4225", "name": "Comisiones",                                    "type": "income", "normal": "credit"},
    {"code": "4230", "name": "Honorarios",                                    "type": "income", "normal": "credit"},
    {"code": "4235", "name": "Servicios",                                     "type": "income", "normal": "credit"},
    {"code": "4245", "name": "Utilidad en venta de propiedades, planta y equipo", "type": "income", "normal": "credit"},
    {"code": "4250", "name": "Recuperaciones",                                "type": "income", "normal": "credit"},
    {"code": "4295", "name": "Diversos (no operacionales)",                   "type": "income", "normal": "credit"},

    # 47 Ajustes por inflación
    {"code": "4705", "name": "Corrección monetaria",                          "type": "income", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # CLASE 5 — GASTOS
    # ══════════════════════════════════════════════════════════════

    # 51 Operacionales de administración
    {"code": "5105", "name": "Gastos de personal",                           "type": "expense", "normal": "debit"},
    {"code": "510506", "name": "Sueldos",                                    "type": "expense", "normal": "debit"},
    {"code": "510527", "name": "Auxilio de transporte",                      "type": "expense", "normal": "debit"},
    {"code": "510530", "name": "Cesantías",                                  "type": "expense", "normal": "debit"},
    {"code": "510536", "name": "Prima de servicios",                         "type": "expense", "normal": "debit"},
    {"code": "510539", "name": "Vacaciones",                                 "type": "expense", "normal": "debit"},
    {"code": "510568", "name": "Aportes a administradoras de riesgos (ARL)", "type": "expense", "normal": "debit"},
    {"code": "510569", "name": "Aportes a entidades promotoras de salud (EPS)", "type": "expense", "normal": "debit"},
    {"code": "510570", "name": "Aportes a fondos de pensiones y/o cesantías", "type": "expense", "normal": "debit"},
    {"code": "5110", "name": "Honorarios",                                   "type": "expense", "normal": "debit"},
    {"code": "5115", "name": "Impuestos",                                    "type": "expense", "normal": "debit"},
    {"code": "5120", "name": "Arrendamientos",                               "type": "expense", "normal": "debit"},
    {"code": "5125", "name": "Contribuciones y afiliaciones",                "type": "expense", "normal": "debit"},
    {"code": "5130", "name": "Seguros",                                      "type": "expense", "normal": "debit"},
    {"code": "5135", "name": "Servicios",                                    "type": "expense", "normal": "debit"},
    {"code": "513505", "name": "Aseo y vigilancia",                          "type": "expense", "normal": "debit"},
    {"code": "513525", "name": "Acueducto y alcantarillado",                 "type": "expense", "normal": "debit"},
    {"code": "513530", "name": "Energía eléctrica",                          "type": "expense", "normal": "debit"},
    {"code": "513535", "name": "Teléfono",                                   "type": "expense", "normal": "debit"},
    {"code": "513540", "name": "Correo, portes y telegramas",                "type": "expense", "normal": "debit"},
    {"code": "5140", "name": "Gastos legales",                               "type": "expense", "normal": "debit"},
    {"code": "5145", "name": "Mantenimiento y reparaciones",                 "type": "expense", "normal": "debit"},
    {"code": "5150", "name": "Adecuación e instalación",                     "type": "expense", "normal": "debit"},
    {"code": "5155", "name": "Gastos de viaje",                              "type": "expense", "normal": "debit"},
    {"code": "5160", "name": "Depreciaciones",                               "type": "expense", "normal": "debit"},
    {"code": "5165", "name": "Amortizaciones",                               "type": "expense", "normal": "debit"},
    {"code": "5195", "name": "Diversos (administración)",                     "type": "expense", "normal": "debit"},
    {"code": "519530", "name": "Elementos de aseo y cafetería",             "type": "expense", "normal": "debit"},
    {"code": "519535", "name": "Útiles, papelería y fotocopias",            "type": "expense", "normal": "debit"},
    {"code": "519540", "name": "Combustibles y lubricantes",                "type": "expense", "normal": "debit"},

    # 52 Operacionales de ventas
    {"code": "5205", "name": "Gastos de personal (ventas)",                  "type": "expense", "normal": "debit"},
    {"code": "5210", "name": "Honorarios (ventas)",                          "type": "expense", "normal": "debit"},
    {"code": "5220", "name": "Arrendamientos (ventas)",                      "type": "expense", "normal": "debit"},
    {"code": "5235", "name": "Servicios (ventas)",                           "type": "expense", "normal": "debit"},
    {"code": "5245", "name": "Gastos de transporte, fletes y acarreos",      "type": "expense", "normal": "debit"},
    {"code": "5260", "name": "Depreciaciones (ventas)",                      "type": "expense", "normal": "debit"},
    {"code": "5295", "name": "Diversos (ventas)",                            "type": "expense", "normal": "debit"},

    # 53 No operacionales
    {"code": "5305", "name": "Financieros",                                  "type": "expense", "normal": "debit"},
    {"code": "530505", "name": "Gastos bancarios",                           "type": "expense", "normal": "debit"},
    {"code": "530515", "name": "Comisiones",                                 "type": "expense", "normal": "debit"},
    {"code": "530520", "name": "Intereses",                                  "type": "expense", "normal": "debit"},
    {"code": "5310", "name": "Pérdida en venta y retiro de bienes",          "type": "expense", "normal": "debit"},
    {"code": "5315", "name": "Gastos extraordinarios",                       "type": "expense", "normal": "debit"},
    {"code": "5395", "name": "Gastos diversos (no operacionales)",           "type": "expense", "normal": "debit"},

    # 54 Impuesto de renta y complementarios
    {"code": "5405", "name": "Impuesto de renta y complementarios",          "type": "expense", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # CLASE 6 — COSTOS DE VENTAS
    # ══════════════════════════════════════════════════════════════
    {"code": "6135", "name": "Comercio al por mayor y al por menor (costo)",  "type": "expense", "normal": "debit"},
    {"code": "613505", "name": "Costo de venta de mercancías",               "type": "expense", "normal": "debit"},
    {"code": "6140", "name": "Hoteles y restaurantes (costo)",               "type": "expense", "normal": "debit"},
    {"code": "6145", "name": "Transporte, almacenamiento y comunicaciones (costo)", "type": "expense", "normal": "debit"},
    {"code": "6155", "name": "Actividad inmobiliaria y de alquiler (costo)",  "type": "expense", "normal": "debit"},
    {"code": "6160", "name": "Enseñanza (costo)",                            "type": "expense", "normal": "debit"},
    {"code": "6205", "name": "De mercancías (compras)",                       "type": "expense", "normal": "debit"},
    {"code": "620505", "name": "Compras de mercancías no fabricadas por la empresa", "type": "expense", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # CLASE 7 — COSTOS DE PRODUCCIÓN O DE OPERACIÓN
    # ══════════════════════════════════════════════════════════════
    {"code": "7105", "name": "Materia prima",                                 "type": "expense", "normal": "debit"},
    {"code": "7110", "name": "Mano de obra directa",                          "type": "expense", "normal": "debit"},
    {"code": "7115", "name": "Costos indirectos",                             "type": "expense", "normal": "debit"},
    {"code": "7120", "name": "Contratos de servicios",                        "type": "expense", "normal": "debit"},
    {"code": "7205", "name": "Mano de obra directa (operación)",              "type": "expense", "normal": "debit"},
    {"code": "7305", "name": "Costos indirectos (operación)",                 "type": "expense", "normal": "debit"},
]


# ── Mapeo categoría del registro → asiento (cuenta_debe, cuenta_haber) ────────
# Vocabulario de categorías COMPARTIDO con el resto de países (ver country/es).
# Permite que los módulos generen asientos sin conocer los códigos de cada país.
# Fuente: PUC — Decreto 2650 de 1993.
ENTRY_MAP = {
    # Venta: clientes (debe) / comercio al por mayor y menor - ventas (haber)
    ("ingreso", "Ventas"):    ("1305", "4135"),
    # Compra: compras de mercancías (debe) / proveedores nacionales (haber)
    ("gasto",   "Compras"):   ("6205", "2205"),
    # Nómina: gastos de personal (debe) / retenciones y aportes de nómina (haber)
    ("gasto",   "Personal"):  ("5105", "2370"),
    # Servicios: servicios (debe) / costos y gastos por pagar (haber)
    ("gasto",   "Servicios"): ("5135", "2335"),
}

# Asiento por defecto si la categoría no está mapeada.
DEFAULT_GASTO   = ("5195", "2335")   # gastos diversos / costos y gastos por pagar
DEFAULT_INGRESO = ("1305", "4135")   # clientes / ventas


def get_entry_accounts(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in ENTRY_MAP:
        return ENTRY_MAP[key]
    return DEFAULT_GASTO if tipo == "gasto" else DEFAULT_INGRESO
