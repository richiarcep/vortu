"""
Perú — PCGE (Plan Contable General Empresarial) COMPLETO
=========================================================
Fuente oficial: PCGE — Plan Contable General Empresarial (SUNAT/CNC).
Aprobado por el Consejo Normativo de Contabilidad (CNC) — versión modificada
2019 (Resolución CNC N° 002-2019-EF/30), vigente desde el 01/01/2020.
Difundido por SUNAT y el MEF.

El PCGE estructura las cuentas en elementos (1 dígito), cuentas (2 dígitos),
subcuentas (3 dígitos) y divisionarias (4-5 dígitos):
  Elemento 1 — Activo disponible y exigible        → asset
  Elemento 2 — Activo realizable (existencias)      → asset
  Elemento 3 — Activo inmovilizado                  → asset
  Elemento 4 — Pasivo                               → liability
  Elemento 5 — Patrimonio neto                      → equity
  Elemento 6 — Gastos por naturaleza                → expense
  Elemento 7 — Ingresos                             → income
  Elemento 8 — Saldos intermediarios de gestión / determinación del resultado
  Elemento 9 — Cuentas analíticas de explotación / costos (opcional)

⚠️ VERIFICAR con contador: los códigos/nombres siguen la estructura oficial del
PCGE, pero deben confirmarse contra la versión vigente (CNC/SUNAT) antes de
usarse para la presentación de libros electrónicos (PLE) o declaraciones.

Saldo normal:
  debit  = saldo deudor  (activos, gastos, costos)
  credit = saldo acreedor (pasivos, patrimonio, ingresos)
"""

CHART_OF_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 1 — ACTIVO DISPONIBLE Y EXIGIBLE
    # ══════════════════════════════════════════════════════════════

    # 10 Efectivo y equivalentes de efectivo
    {"code": "10",   "name": "Efectivo y equivalentes de efectivo",                  "type": "asset", "normal": "debit"},
    {"code": "101",  "name": "Caja",                                                 "type": "asset", "normal": "debit"},
    {"code": "102",  "name": "Fondos fijos",                                         "type": "asset", "normal": "debit"},
    {"code": "103",  "name": "Efectivo en tránsito",                                 "type": "asset", "normal": "debit"},
    {"code": "104",  "name": "Cuentas corrientes en instituciones financieras",      "type": "asset", "normal": "debit"},
    {"code": "1041", "name": "Cuentas corrientes operativas",                        "type": "asset", "normal": "debit"},
    {"code": "1042", "name": "Cuentas corrientes para fines específicos",            "type": "asset", "normal": "debit"},
    {"code": "105",  "name": "Cuentas de ahorro",                                    "type": "asset", "normal": "debit"},
    {"code": "106",  "name": "Depósitos a plazo",                                    "type": "asset", "normal": "debit"},
    {"code": "107",  "name": "Fondos sujetos a restricción",                         "type": "asset", "normal": "debit"},

    # 11 Inversiones financieras
    {"code": "11",   "name": "Inversiones financieras",                              "type": "asset", "normal": "debit"},
    {"code": "111",  "name": "Inversiones mantenidas para negociación",              "type": "asset", "normal": "debit"},
    {"code": "112",  "name": "Otras inversiones financieras",                        "type": "asset", "normal": "debit"},

    # 12 Cuentas por cobrar comerciales - terceros
    {"code": "12",   "name": "Cuentas por cobrar comerciales - terceros",            "type": "asset", "normal": "debit"},
    {"code": "121",  "name": "Facturas, boletas y otros comprobantes por cobrar",    "type": "asset", "normal": "debit"},
    {"code": "1211", "name": "No emitidas",                                          "type": "asset", "normal": "debit"},
    {"code": "1212", "name": "Emitidas en cartera",                                  "type": "asset", "normal": "debit"},
    {"code": "1213", "name": "En cobranza",                                          "type": "asset", "normal": "debit"},
    {"code": "1214", "name": "En descuento",                                         "type": "asset", "normal": "debit"},
    {"code": "122",  "name": "Anticipos de clientes",                                "type": "asset", "normal": "credit"},
    {"code": "123",  "name": "Letras por cobrar",                                    "type": "asset", "normal": "debit"},

    # 13 Cuentas por cobrar comerciales - relacionadas
    {"code": "13",   "name": "Cuentas por cobrar comerciales - relacionadas",        "type": "asset", "normal": "debit"},
    {"code": "131",  "name": "Facturas, boletas y otros comprobantes por cobrar (rel.)", "type": "asset", "normal": "debit"},
    {"code": "133",  "name": "Letras por cobrar (relacionadas)",                     "type": "asset", "normal": "debit"},

    # 14 Cuentas por cobrar al personal, accionistas, directores y gerentes
    {"code": "14",   "name": "Cuentas por cobrar al personal, a los accionistas (socios), directores y gerentes", "type": "asset", "normal": "debit"},
    {"code": "141",  "name": "Personal",                                            "type": "asset", "normal": "debit"},
    {"code": "142",  "name": "Accionistas (o socios)",                              "type": "asset", "normal": "debit"},
    {"code": "143",  "name": "Directores",                                          "type": "asset", "normal": "debit"},
    {"code": "144",  "name": "Gerentes",                                            "type": "asset", "normal": "debit"},

    # 16 Cuentas por cobrar diversas - terceros
    {"code": "16",   "name": "Cuentas por cobrar diversas - terceros",              "type": "asset", "normal": "debit"},
    {"code": "161",  "name": "Préstamos",                                           "type": "asset", "normal": "debit"},
    {"code": "162",  "name": "Reclamaciones a terceros",                            "type": "asset", "normal": "debit"},
    {"code": "163",  "name": "Intereses, regalías y dividendos",                    "type": "asset", "normal": "debit"},
    {"code": "164",  "name": "Depósitos otorgados en garantía",                     "type": "asset", "normal": "debit"},
    {"code": "168",  "name": "Otras cuentas por cobrar diversas",                   "type": "asset", "normal": "debit"},

    # 17 Cuentas por cobrar diversas - relacionadas
    {"code": "17",   "name": "Cuentas por cobrar diversas - relacionadas",          "type": "asset", "normal": "debit"},
    {"code": "171",  "name": "Préstamos (relacionadas)",                            "type": "asset", "normal": "debit"},

    # 18 Servicios y otros contratados por anticipado
    {"code": "18",   "name": "Servicios y otros contratados por anticipado",        "type": "asset", "normal": "debit"},
    {"code": "181",  "name": "Costos financieros",                                  "type": "asset", "normal": "debit"},
    {"code": "182",  "name": "Seguros",                                             "type": "asset", "normal": "debit"},
    {"code": "183",  "name": "Alquileres",                                          "type": "asset", "normal": "debit"},

    # 19 Estimación de cuentas de cobranza dudosa (contra)
    {"code": "19",   "name": "Estimación de cuentas de cobranza dudosa",            "type": "asset", "normal": "credit"},
    {"code": "191",  "name": "Cuentas por cobrar comerciales - terceros (estim.)",  "type": "asset", "normal": "credit"},
    {"code": "192",  "name": "Cuentas por cobrar comerciales - relacionadas (estim.)", "type": "asset", "normal": "credit"},
    {"code": "194",  "name": "Cuentas por cobrar diversas - terceros (estim.)",     "type": "asset", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 2 — ACTIVO REALIZABLE (EXISTENCIAS)
    # ══════════════════════════════════════════════════════════════

    # 20 Mercaderías
    {"code": "20",   "name": "Mercaderías",                                         "type": "asset", "normal": "debit"},
    {"code": "201",  "name": "Mercaderías manufacturadas",                          "type": "asset", "normal": "debit"},
    {"code": "204",  "name": "Mercaderías agropecuarias y piscícolas",              "type": "asset", "normal": "debit"},
    {"code": "208",  "name": "Otras mercaderías",                                   "type": "asset", "normal": "debit"},

    # 21 Productos terminados
    {"code": "21",   "name": "Productos terminados",                                "type": "asset", "normal": "debit"},
    {"code": "211",  "name": "Productos manufacturados",                            "type": "asset", "normal": "debit"},
    {"code": "215",  "name": "Existencias de servicios terminados",                 "type": "asset", "normal": "debit"},

    # 22 Subproductos, desechos y desperdicios
    {"code": "22",   "name": "Subproductos, desechos y desperdicios",               "type": "asset", "normal": "debit"},
    {"code": "221",  "name": "Subproductos",                                        "type": "asset", "normal": "debit"},

    # 23 Productos en proceso
    {"code": "23",   "name": "Productos en proceso",                                "type": "asset", "normal": "debit"},
    {"code": "231",  "name": "Productos en proceso de manufactura",                 "type": "asset", "normal": "debit"},

    # 24 Materias primas
    {"code": "24",   "name": "Materias primas",                                     "type": "asset", "normal": "debit"},
    {"code": "241",  "name": "Materias primas para productos manufacturados",       "type": "asset", "normal": "debit"},

    # 25 Materiales auxiliares, suministros y repuestos
    {"code": "25",   "name": "Materiales auxiliares, suministros y repuestos",      "type": "asset", "normal": "debit"},
    {"code": "251",  "name": "Materiales auxiliares",                               "type": "asset", "normal": "debit"},
    {"code": "252",  "name": "Suministros",                                         "type": "asset", "normal": "debit"},
    {"code": "253",  "name": "Repuestos",                                           "type": "asset", "normal": "debit"},

    # 26 Envases y embalajes
    {"code": "26",   "name": "Envases y embalajes",                                 "type": "asset", "normal": "debit"},
    {"code": "261",  "name": "Envases",                                             "type": "asset", "normal": "debit"},
    {"code": "262",  "name": "Embalajes",                                           "type": "asset", "normal": "debit"},

    # 28 Existencias por recibir
    {"code": "28",   "name": "Existencias por recibir",                             "type": "asset", "normal": "debit"},
    {"code": "281",  "name": "Mercaderías por recibir",                             "type": "asset", "normal": "debit"},

    # 29 Desvalorización de existencias (contra)
    {"code": "29",   "name": "Desvalorización de existencias",                      "type": "asset", "normal": "credit"},
    {"code": "291",  "name": "Mercaderías (desvalorización)",                       "type": "asset", "normal": "credit"},
    {"code": "294",  "name": "Materias primas (desvalorización)",                   "type": "asset", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 3 — ACTIVO INMOVILIZADO
    # ══════════════════════════════════════════════════════════════

    # 31 Inversiones inmobiliarias
    {"code": "31",   "name": "Inversiones inmobiliarias",                           "type": "asset", "normal": "debit"},
    {"code": "311",  "name": "Terrenos (inversión inmobiliaria)",                   "type": "asset", "normal": "debit"},
    {"code": "312",  "name": "Edificaciones (inversión inmobiliaria)",              "type": "asset", "normal": "debit"},

    # 32 Activos adquiridos en arrendamiento financiero
    {"code": "32",   "name": "Activos adquiridos en arrendamiento financiero",      "type": "asset", "normal": "debit"},
    {"code": "322",  "name": "Inmuebles, maquinaria y equipo (arrend. fin.)",       "type": "asset", "normal": "debit"},

    # 33 Inmuebles, maquinaria y equipo
    {"code": "33",   "name": "Inmuebles, maquinaria y equipo",                      "type": "asset", "normal": "debit"},
    {"code": "331",  "name": "Terrenos",                                            "type": "asset", "normal": "debit"},
    {"code": "332",  "name": "Edificaciones",                                       "type": "asset", "normal": "debit"},
    {"code": "333",  "name": "Maquinarias y equipos de explotación",               "type": "asset", "normal": "debit"},
    {"code": "334",  "name": "Unidades de transporte",                             "type": "asset", "normal": "debit"},
    {"code": "335",  "name": "Muebles y enseres",                                   "type": "asset", "normal": "debit"},
    {"code": "336",  "name": "Equipos diversos",                                    "type": "asset", "normal": "debit"},
    {"code": "3361", "name": "Equipo para procesamiento de información",            "type": "asset", "normal": "debit"},
    {"code": "337",  "name": "Herramientas y unidades de reemplazo",               "type": "asset", "normal": "debit"},

    # 34 Intangibles
    {"code": "34",   "name": "Intangibles",                                         "type": "asset", "normal": "debit"},
    {"code": "341",  "name": "Concesiones, licencias y otros derechos",            "type": "asset", "normal": "debit"},
    {"code": "343",  "name": "Programas de computadora (software)",                "type": "asset", "normal": "debit"},
    {"code": "344",  "name": "Costos de exploración y desarrollo",                 "type": "asset", "normal": "debit"},

    # 35 Activos biológicos
    {"code": "35",   "name": "Activos biológicos",                                  "type": "asset", "normal": "debit"},
    {"code": "351",  "name": "Activos biológicos en producción",                    "type": "asset", "normal": "debit"},

    # 37 Activo diferido
    {"code": "37",   "name": "Activo diferido",                                     "type": "asset", "normal": "debit"},
    {"code": "371",  "name": "Impuesto a la renta diferido",                        "type": "asset", "normal": "debit"},
    {"code": "373",  "name": "Intereses diferidos",                                 "type": "asset", "normal": "debit"},

    # 39 Depreciación, amortización y agotamiento acumulados (contra)
    {"code": "39",   "name": "Depreciación, amortización y agotamiento acumulados", "type": "asset", "normal": "credit"},
    {"code": "391",  "name": "Depreciación acumulada",                             "type": "asset", "normal": "credit"},
    {"code": "392",  "name": "Amortización acumulada",                             "type": "asset", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 4 — PASIVO
    # ══════════════════════════════════════════════════════════════

    # 40 Tributos, contraprestaciones y aportes al sistema de pensiones y de salud por pagar
    {"code": "40",   "name": "Tributos, contraprestaciones y aportes al sistema de pensiones y de salud por pagar", "type": "liability", "normal": "credit"},
    {"code": "401",  "name": "Gobierno central",                                    "type": "liability", "normal": "credit"},
    {"code": "4011", "name": "Impuesto general a las ventas (IGV)",                  "type": "liability", "normal": "credit"},
    {"code": "40111","name": "IGV - Cuenta propia",                                 "type": "liability", "normal": "credit"},
    {"code": "4012", "name": "Impuesto selectivo al consumo",                       "type": "liability", "normal": "credit"},
    {"code": "4017", "name": "Impuesto a la renta",                                 "type": "liability", "normal": "credit"},
    {"code": "4018", "name": "Otros impuestos y contraprestaciones",                "type": "liability", "normal": "credit"},
    {"code": "403",  "name": "Instituciones públicas",                             "type": "liability", "normal": "credit"},
    {"code": "4031", "name": "ESSALUD",                                             "type": "liability", "normal": "credit"},
    {"code": "4032", "name": "ONP",                                                 "type": "liability", "normal": "credit"},
    {"code": "405",  "name": "Gobiernos regionales",                               "type": "liability", "normal": "credit"},
    {"code": "406",  "name": "Gobiernos locales",                                  "type": "liability", "normal": "credit"},
    {"code": "407",  "name": "Administradoras de fondos de pensiones (AFP)",        "type": "liability", "normal": "credit"},

    # 41 Remuneraciones y participaciones por pagar
    {"code": "41",   "name": "Remuneraciones y participaciones por pagar",          "type": "liability", "normal": "credit"},
    {"code": "411",  "name": "Remuneraciones por pagar",                            "type": "liability", "normal": "credit"},
    {"code": "4111", "name": "Sueldos y salarios por pagar",                        "type": "liability", "normal": "credit"},
    {"code": "4114", "name": "Gratificaciones por pagar",                           "type": "liability", "normal": "credit"},
    {"code": "413",  "name": "Participaciones de los trabajadores por pagar",       "type": "liability", "normal": "credit"},
    {"code": "415",  "name": "Beneficios sociales de los trabajadores por pagar",   "type": "liability", "normal": "credit"},
    {"code": "4151", "name": "Compensación por tiempo de servicios (CTS)",          "type": "liability", "normal": "credit"},

    # 42 Cuentas por pagar comerciales - terceros
    {"code": "42",   "name": "Cuentas por pagar comerciales - terceros",            "type": "liability", "normal": "credit"},
    {"code": "421",  "name": "Facturas, boletas y otros comprobantes por pagar",    "type": "liability", "normal": "credit"},
    {"code": "4211", "name": "No emitidas",                                          "type": "liability", "normal": "credit"},
    {"code": "4212", "name": "Emitidas",                                            "type": "liability", "normal": "credit"},
    {"code": "422",  "name": "Anticipos a proveedores",                             "type": "liability", "normal": "debit"},
    {"code": "423",  "name": "Letras por pagar",                                    "type": "liability", "normal": "credit"},

    # 43 Cuentas por pagar comerciales - relacionadas
    {"code": "43",   "name": "Cuentas por pagar comerciales - relacionadas",        "type": "liability", "normal": "credit"},
    {"code": "431",  "name": "Facturas, boletas y otros comprobantes por pagar (rel.)", "type": "liability", "normal": "credit"},
    {"code": "433",  "name": "Letras por pagar (relacionadas)",                     "type": "liability", "normal": "credit"},

    # 44 Cuentas por pagar a los accionistas, directores y gerentes
    {"code": "44",   "name": "Cuentas por pagar a los accionistas (socios), directores y gerentes", "type": "liability", "normal": "credit"},
    {"code": "441",  "name": "Accionistas (o socios)",                             "type": "liability", "normal": "credit"},
    {"code": "442",  "name": "Directores",                                          "type": "liability", "normal": "credit"},
    {"code": "443",  "name": "Gerentes",                                            "type": "liability", "normal": "credit"},

    # 45 Obligaciones financieras
    {"code": "45",   "name": "Obligaciones financieras",                            "type": "liability", "normal": "credit"},
    {"code": "451",  "name": "Préstamos de instituciones financieras y otras entidades", "type": "liability", "normal": "credit"},
    {"code": "452",  "name": "Contratos de arrendamiento financiero",               "type": "liability", "normal": "credit"},
    {"code": "455",  "name": "Costos de financiación por pagar",                    "type": "liability", "normal": "credit"},

    # 46 Cuentas por pagar diversas - terceros
    {"code": "46",   "name": "Cuentas por pagar diversas - terceros",               "type": "liability", "normal": "credit"},
    {"code": "461",  "name": "Reclamaciones de terceros",                           "type": "liability", "normal": "credit"},
    {"code": "462",  "name": "Pasivos por compra de activo inmovilizado",           "type": "liability", "normal": "credit"},
    {"code": "464",  "name": "Pasivos por instrumentos financieros",                "type": "liability", "normal": "credit"},
    {"code": "469",  "name": "Otras cuentas por pagar diversas",                    "type": "liability", "normal": "credit"},

    # 47 Cuentas por pagar diversas - relacionadas
    {"code": "47",   "name": "Cuentas por pagar diversas - relacionadas",           "type": "liability", "normal": "credit"},
    {"code": "471",  "name": "Préstamos (relacionadas)",                            "type": "liability", "normal": "credit"},

    # 48 Provisiones
    {"code": "48",   "name": "Provisiones",                                         "type": "liability", "normal": "credit"},
    {"code": "481",  "name": "Provisión para litigios",                             "type": "liability", "normal": "credit"},
    {"code": "486",  "name": "Provisión para gastos de responsabilidad social",     "type": "liability", "normal": "credit"},

    # 49 Pasivo diferido
    {"code": "49",   "name": "Pasivo diferido",                                     "type": "liability", "normal": "credit"},
    {"code": "491",  "name": "Impuesto a la renta diferido (pasivo)",               "type": "liability", "normal": "credit"},
    {"code": "493",  "name": "Intereses diferidos (pasivo)",                        "type": "liability", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 5 — PATRIMONIO NETO
    # ══════════════════════════════════════════════════════════════

    # 50 Capital
    {"code": "50",   "name": "Capital",                                             "type": "equity", "normal": "credit"},
    {"code": "501",  "name": "Capital social",                                      "type": "equity", "normal": "credit"},
    {"code": "5011", "name": "Acciones",                                            "type": "equity", "normal": "credit"},
    {"code": "5012", "name": "Participaciones",                                     "type": "equity", "normal": "credit"},
    {"code": "502",  "name": "Acciones en tesorería",                               "type": "equity", "normal": "debit"},

    # 52 Capital adicional
    {"code": "52",   "name": "Capital adicional",                                   "type": "equity", "normal": "credit"},
    {"code": "521",  "name": "Primas (descuento) de acciones",                      "type": "equity", "normal": "credit"},
    {"code": "522",  "name": "Capitalizaciones en trámite",                         "type": "equity", "normal": "credit"},

    # 56 Resultados no realizados
    {"code": "56",   "name": "Resultados no realizados",                            "type": "equity", "normal": "credit"},
    {"code": "561",  "name": "Diferencia en cambio de inversiones permanentes",     "type": "equity", "normal": "credit"},

    # 57 Excedente de revaluación
    {"code": "57",   "name": "Excedente de revaluación",                            "type": "equity", "normal": "credit"},
    {"code": "571",  "name": "Excedente de revaluación",                            "type": "equity", "normal": "credit"},

    # 58 Reservas
    {"code": "58",   "name": "Reservas",                                            "type": "equity", "normal": "credit"},
    {"code": "581",  "name": "Reinversión",                                         "type": "equity", "normal": "credit"},
    {"code": "582",  "name": "Legal",                                               "type": "equity", "normal": "credit"},
    {"code": "583",  "name": "Contractuales",                                       "type": "equity", "normal": "credit"},
    {"code": "584",  "name": "Estatutarias",                                        "type": "equity", "normal": "credit"},
    {"code": "585",  "name": "Facultativas",                                        "type": "equity", "normal": "credit"},

    # 59 Resultados acumulados
    {"code": "59",   "name": "Resultados acumulados",                               "type": "equity", "normal": "credit"},
    {"code": "591",  "name": "Utilidades no distribuidas",                          "type": "equity", "normal": "credit"},
    {"code": "5911", "name": "Utilidades acumuladas",                               "type": "equity", "normal": "credit"},
    {"code": "592",  "name": "Pérdidas acumuladas",                                 "type": "equity", "normal": "debit"},
    {"code": "5921", "name": "Pérdidas acumuladas",                                 "type": "equity", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 6 — GASTOS POR NATURALEZA
    # ══════════════════════════════════════════════════════════════

    # 60 Compras
    {"code": "60",   "name": "Compras",                                             "type": "expense", "normal": "debit"},
    {"code": "601",  "name": "Mercaderías",                                         "type": "expense", "normal": "debit"},
    {"code": "6011", "name": "Mercaderías manufacturadas",                          "type": "expense", "normal": "debit"},
    {"code": "602",  "name": "Materias primas",                                     "type": "expense", "normal": "debit"},
    {"code": "603",  "name": "Materiales auxiliares, suministros y repuestos",      "type": "expense", "normal": "debit"},
    {"code": "604",  "name": "Envases y embalajes",                                 "type": "expense", "normal": "debit"},
    {"code": "609",  "name": "Costos vinculados con las compras",                   "type": "expense", "normal": "debit"},

    # 61 Variación de existencias
    {"code": "61",   "name": "Variación de existencias",                            "type": "expense", "normal": "debit"},
    {"code": "611",  "name": "Mercaderías (variación)",                             "type": "expense", "normal": "debit"},
    {"code": "612",  "name": "Materias primas (variación)",                         "type": "expense", "normal": "debit"},

    # 62 Gastos de personal, directores y gerentes
    {"code": "62",   "name": "Gastos de personal, directores y gerentes",           "type": "expense", "normal": "debit"},
    {"code": "621",  "name": "Remuneraciones",                                      "type": "expense", "normal": "debit"},
    {"code": "6211", "name": "Sueldos y salarios",                                  "type": "expense", "normal": "debit"},
    {"code": "6214", "name": "Gratificaciones",                                     "type": "expense", "normal": "debit"},
    {"code": "627",  "name": "Seguridad, previsión social y otras contribuciones",  "type": "expense", "normal": "debit"},
    {"code": "6271", "name": "Régimen de prestaciones de salud (ESSALUD)",          "type": "expense", "normal": "debit"},
    {"code": "629",  "name": "Beneficios sociales de los trabajadores",             "type": "expense", "normal": "debit"},
    {"code": "6291", "name": "Compensación por tiempo de servicios",                "type": "expense", "normal": "debit"},

    # 63 Gastos de servicios prestados por terceros
    {"code": "63",   "name": "Gastos de servicios prestados por terceros",          "type": "expense", "normal": "debit"},
    {"code": "631",  "name": "Transporte, correos y gastos de viaje",               "type": "expense", "normal": "debit"},
    {"code": "632",  "name": "Asesoría y consultoría",                              "type": "expense", "normal": "debit"},
    {"code": "633",  "name": "Producción encargada a terceros",                     "type": "expense", "normal": "debit"},
    {"code": "634",  "name": "Mantenimiento y reparaciones",                        "type": "expense", "normal": "debit"},
    {"code": "635",  "name": "Alquileres",                                          "type": "expense", "normal": "debit"},
    {"code": "636",  "name": "Servicios básicos",                                   "type": "expense", "normal": "debit"},
    {"code": "6361", "name": "Energía eléctrica",                                   "type": "expense", "normal": "debit"},
    {"code": "6364", "name": "Agua",                                                "type": "expense", "normal": "debit"},
    {"code": "6365", "name": "Internet, teléfono y comunicaciones",                 "type": "expense", "normal": "debit"},
    {"code": "637",  "name": "Publicidad, publicaciones, relaciones públicas",      "type": "expense", "normal": "debit"},
    {"code": "638",  "name": "Servicios de contratistas",                           "type": "expense", "normal": "debit"},
    {"code": "639",  "name": "Otros servicios prestados por terceros",              "type": "expense", "normal": "debit"},

    # 64 Gastos por tributos
    {"code": "64",   "name": "Gastos por tributos",                                 "type": "expense", "normal": "debit"},
    {"code": "641",  "name": "Gobierno central",                                    "type": "expense", "normal": "debit"},
    {"code": "643",  "name": "Gobierno local",                                      "type": "expense", "normal": "debit"},

    # 65 Otros gastos de gestión
    {"code": "65",   "name": "Otros gastos de gestión",                             "type": "expense", "normal": "debit"},
    {"code": "651",  "name": "Seguros",                                             "type": "expense", "normal": "debit"},
    {"code": "652",  "name": "Regalías",                                            "type": "expense", "normal": "debit"},
    {"code": "653",  "name": "Suscripciones",                                       "type": "expense", "normal": "debit"},
    {"code": "656",  "name": "Suministros",                                         "type": "expense", "normal": "debit"},
    {"code": "659",  "name": "Otros gastos de gestión",                             "type": "expense", "normal": "debit"},

    # 66 Pérdida por medición de activos no financieros al valor razonable
    {"code": "66",   "name": "Pérdida por medición de activos no financieros al valor razonable", "type": "expense", "normal": "debit"},
    {"code": "661",  "name": "Activo realizable (pérdida medición)",                "type": "expense", "normal": "debit"},

    # 67 Gastos financieros
    {"code": "67",   "name": "Gastos financieros",                                  "type": "expense", "normal": "debit"},
    {"code": "671",  "name": "Gastos en operaciones de endeudamiento y otros",      "type": "expense", "normal": "debit"},
    {"code": "676",  "name": "Diferencia de cambio (pérdida)",                      "type": "expense", "normal": "debit"},
    {"code": "679",  "name": "Otros gastos financieros",                            "type": "expense", "normal": "debit"},

    # 68 Valuación y deterioro de activos y provisiones
    {"code": "68",   "name": "Valuación y deterioro de activos y provisiones",      "type": "expense", "normal": "debit"},
    {"code": "681",  "name": "Depreciación",                                        "type": "expense", "normal": "debit"},
    {"code": "682",  "name": "Amortización de intangibles",                         "type": "expense", "normal": "debit"},
    {"code": "684",  "name": "Valuación de activos",                                "type": "expense", "normal": "debit"},
    {"code": "6841", "name": "Estimación de cuentas de cobranza dudosa",            "type": "expense", "normal": "debit"},
    {"code": "685",  "name": "Deterioro del valor de los activos",                  "type": "expense", "normal": "debit"},
    {"code": "686",  "name": "Provisiones",                                         "type": "expense", "normal": "debit"},

    # 69 Costo de ventas
    {"code": "69",   "name": "Costo de ventas",                                     "type": "expense", "normal": "debit"},
    {"code": "691",  "name": "Mercaderías",                                         "type": "expense", "normal": "debit"},
    {"code": "6911", "name": "Mercaderías manufacturadas (costo de ventas)",        "type": "expense", "normal": "debit"},
    {"code": "692",  "name": "Productos terminados (costo de ventas)",              "type": "expense", "normal": "debit"},
    {"code": "694",  "name": "Servicios (costo de ventas)",                         "type": "expense", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 7 — INGRESOS
    # ══════════════════════════════════════════════════════════════

    # 70 Ventas
    {"code": "70",   "name": "Ventas",                                              "type": "income", "normal": "credit"},
    {"code": "701",  "name": "Mercaderías",                                         "type": "income", "normal": "credit"},
    {"code": "7011", "name": "Mercaderías manufacturadas",                          "type": "income", "normal": "credit"},
    {"code": "702",  "name": "Productos terminados",                                "type": "income", "normal": "credit"},
    {"code": "703",  "name": "Subproductos, desechos y desperdicios",              "type": "income", "normal": "credit"},
    {"code": "704",  "name": "Prestación de servicios",                             "type": "income", "normal": "credit"},
    {"code": "709",  "name": "Devoluciones sobre ventas",                           "type": "income", "normal": "debit"},

    # 71 Variación de la producción almacenada
    {"code": "71",   "name": "Variación de la producción almacenada",               "type": "income", "normal": "credit"},
    {"code": "711",  "name": "Variación de productos terminados",                   "type": "income", "normal": "credit"},
    {"code": "713",  "name": "Variación de productos en proceso",                   "type": "income", "normal": "credit"},

    # 72 Producción de activo inmovilizado
    {"code": "72",   "name": "Producción de activo inmovilizado",                   "type": "income", "normal": "credit"},
    {"code": "722",  "name": "Inmuebles, maquinaria y equipo (producción propia)",  "type": "income", "normal": "credit"},

    # 73 Descuentos, rebajas y bonificaciones obtenidos
    {"code": "73",   "name": "Descuentos, rebajas y bonificaciones obtenidos",      "type": "income", "normal": "credit"},
    {"code": "731",  "name": "Descuentos, rebajas y bonificaciones obtenidos",      "type": "income", "normal": "credit"},

    # 74 Descuentos, rebajas y bonificaciones concedidos (contra ingreso)
    {"code": "74",   "name": "Descuentos, rebajas y bonificaciones concedidos",     "type": "income", "normal": "debit"},
    {"code": "741",  "name": "Descuentos, rebajas y bonificaciones concedidos",     "type": "income", "normal": "debit"},

    # 75 Otros ingresos de gestión
    {"code": "75",   "name": "Otros ingresos de gestión",                           "type": "income", "normal": "credit"},
    {"code": "751",  "name": "Servicios en beneficio del personal",                 "type": "income", "normal": "credit"},
    {"code": "752",  "name": "Comisiones y corretajes",                             "type": "income", "normal": "credit"},
    {"code": "754",  "name": "Alquileres",                                          "type": "income", "normal": "credit"},
    {"code": "759",  "name": "Otros ingresos de gestión",                           "type": "income", "normal": "credit"},

    # 76 Ganancia por medición de activos no financieros al valor razonable
    {"code": "76",   "name": "Ganancia por medición de activos no financieros al valor razonable", "type": "income", "normal": "credit"},
    {"code": "761",  "name": "Activo realizable (ganancia medición)",               "type": "income", "normal": "credit"},

    # 77 Ingresos financieros
    {"code": "77",   "name": "Ingresos financieros",                                "type": "income", "normal": "credit"},
    {"code": "772",  "name": "Rendimientos ganados",                                "type": "income", "normal": "credit"},
    {"code": "776",  "name": "Diferencia de cambio (ganancia)",                     "type": "income", "normal": "credit"},
    {"code": "779",  "name": "Otros ingresos financieros",                          "type": "income", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # ELEMENTO 8 — SALDOS INTERMEDIARIOS DE GESTIÓN Y DETERMINACIÓN DEL RESULTADO
    # ══════════════════════════════════════════════════════════════

    {"code": "80",   "name": "Margen comercial",                                    "type": "income", "normal": "credit"},
    {"code": "81",   "name": "Producción del ejercicio",                            "type": "income", "normal": "credit"},
    {"code": "82",   "name": "Valor agregado",                                      "type": "income", "normal": "credit"},
    {"code": "83",   "name": "Excedente bruto (insuficiencia bruta) de explotación", "type": "income", "normal": "credit"},
    {"code": "84",   "name": "Resultado de explotación",                            "type": "income", "normal": "credit"},
    {"code": "85",   "name": "Resultado antes de participaciones e impuestos",      "type": "income", "normal": "credit"},
    {"code": "88",   "name": "Impuesto a la renta",                                 "type": "expense", "normal": "debit"},
    {"code": "881",  "name": "Impuesto a la renta - corriente",                     "type": "expense", "normal": "debit"},
    {"code": "882",  "name": "Impuesto a la renta - diferido",                      "type": "expense", "normal": "debit"},
    {"code": "89",   "name": "Determinación del resultado del ejercicio",           "type": "equity", "normal": "credit"},
    {"code": "891",  "name": "Utilidad",                                            "type": "equity", "normal": "credit"},
    {"code": "892",  "name": "Pérdida",                                             "type": "equity", "normal": "debit"},
]


# ── Mapeo categoría del registro → asiento (cuenta_debe, cuenta_haber) ────────
# Vocabulario de categorías COMPARTIDO con el resto de países (ver country/es).
# Permite que los módulos generen asientos sin conocer los códigos de cada país.
# Fuente: PCGE — Plan Contable General Empresarial (SUNAT/CNC).
ENTRY_MAP = {
    # Venta: facturas por cobrar (debe) / ventas (haber)
    ("ingreso", "Ventas"):    ("121", "70"),
    # Compra: compras (debe) / facturas por pagar a proveedores (haber)
    ("gasto",   "Compras"):   ("60", "421"),
    # Personal: gastos de personal (debe) / remuneraciones por pagar (haber)
    ("gasto",   "Personal"):  ("62", "41"),
    # Servicios: gastos de servicios de terceros (debe) / proveedores (haber)
    ("gasto",   "Servicios"): ("63", "42"),
}

# Asiento por defecto si la categoría no está mapeada.
DEFAULT_GASTO   = ("659", "42")    # otros gastos de gestión / proveedores
DEFAULT_INGRESO = ("121", "70")    # facturas por cobrar / ventas


def get_entry_accounts(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in ENTRY_MAP:
        return ENTRY_MAP[key]
    return DEFAULT_GASTO if tipo == "gasto" else DEFAULT_INGRESO
