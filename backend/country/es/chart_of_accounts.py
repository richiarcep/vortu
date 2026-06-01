"""
charts_es.py — Plan General Contable español COMPLETO
======================================================
Fuente oficial: Real Decreto 1514/2007, de 16 de noviembre,
por el que se aprueba el Plan General de Contabilidad.
BOE núm. 278, de 20 de noviembre de 2007.
https://www.boe.es/buscar/act.php?id=BOE-A-2007-19884

Incluye todos los grupos 1-9 del cuadro de cuentas oficial.
El cuadro de cuentas no es obligatorio en cuanto a numeración
y denominación, pero constituye guía obligada (RD 1514/2007,
Cuarta parte, párrafo introductorio).

Saldo normal:
  debit  = saldo deudor  (activos, gastos)
  credit = saldo acreedor (pasivos, patrimonio, ingresos)
"""

CHART_OF_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # GRUPO 1 — FINANCIACIÓN BÁSICA
    # ══════════════════════════════════════════════════════════════

    # 10 Capital
    {"code":"100","name":"Capital social",                                          "type":"equity","normal":"credit"},
    {"code":"101","name":"Fondo social",                                            "type":"equity","normal":"credit"},
    {"code":"102","name":"Capital",                                                 "type":"equity","normal":"credit"},
    {"code":"103","name":"Socios por desembolsos no exigidos",                      "type":"equity","normal":"debit"},
    {"code":"104","name":"Socios por aportaciones no dinerarias pendientes",        "type":"equity","normal":"debit"},
    {"code":"108","name":"Acciones o participaciones propias en situaciones especiales","type":"equity","normal":"debit"},
    {"code":"109","name":"Acciones o participaciones propias para reducción de capital","type":"equity","normal":"debit"},

    # 11 Reservas y otros instrumentos de patrimonio
    {"code":"110","name":"Prima de emisión o asunción",                             "type":"equity","normal":"credit"},
    {"code":"112","name":"Reserva legal",                                           "type":"equity","normal":"credit"},
    {"code":"113","name":"Reservas voluntarias",                                    "type":"equity","normal":"credit"},
    {"code":"114","name":"Reservas especiales",                                     "type":"equity","normal":"credit"},
    {"code":"115","name":"Reservas por pérdidas y ganancias actuariales",           "type":"equity","normal":"credit"},
    {"code":"118","name":"Aportaciones de socios o propietarios",                   "type":"equity","normal":"credit"},
    {"code":"119","name":"Diferencias por ajuste del capital a euros",              "type":"equity","normal":"credit"},

    # 12 Resultados pendientes de aplicación
    {"code":"120","name":"Remanente",                                               "type":"equity","normal":"credit"},
    {"code":"121","name":"Resultados negativos de ejercicios anteriores",           "type":"equity","normal":"debit"},
    {"code":"129","name":"Resultado del ejercicio",                                 "type":"equity","normal":"credit"},

    # 13 Subvenciones, donaciones y ajustes por cambios de valor
    {"code":"130","name":"Subvenciones oficiales de capital",                       "type":"equity","normal":"credit"},
    {"code":"131","name":"Donaciones y legados de capital",                         "type":"equity","normal":"credit"},
    {"code":"132","name":"Otras subvenciones, donaciones y legados",                "type":"equity","normal":"credit"},
    {"code":"133","name":"Ajustes por valoración en activos financieros disponibles para la venta","type":"equity","normal":"credit"},
    {"code":"135","name":"Diferencias de conversión",                               "type":"equity","normal":"credit"},

    # 14 Provisiones
    {"code":"140","name":"Provisión por retribuciones a largo plazo al personal",   "type":"liability","normal":"credit"},
    {"code":"141","name":"Provisión para impuestos",                                "type":"liability","normal":"credit"},
    {"code":"142","name":"Provisión para otras responsabilidades",                  "type":"liability","normal":"credit"},
    {"code":"143","name":"Provisión por desmantelamiento, retiro o rehabilitación", "type":"liability","normal":"credit"},
    {"code":"145","name":"Provisión para actuaciones medioambientales",             "type":"liability","normal":"credit"},
    {"code":"146","name":"Provisión para reestructuraciones",                       "type":"liability","normal":"credit"},

    # 15 Deudas a largo plazo con características especiales
    {"code":"150","name":"Acciones o participaciones a largo plazo como pasivos financieros","type":"liability","normal":"credit"},

    # 16 Deudas a largo plazo con partes vinculadas
    {"code":"160","name":"Deudas a largo plazo con entidades de crédito vinculadas","type":"liability","normal":"credit"},
    {"code":"161","name":"Proveedores de inmovilizado a largo plazo, partes vinculadas","type":"liability","normal":"credit"},
    {"code":"162","name":"Acreedores por arrendamiento financiero a largo plazo, partes vinculadas","type":"liability","normal":"credit"},
    {"code":"163","name":"Otras deudas a largo plazo con partes vinculadas",        "type":"liability","normal":"credit"},

    # 17 Deudas a largo plazo por préstamos recibidos y otros
    {"code":"170","name":"Deudas a largo plazo con entidades de crédito",           "type":"liability","normal":"credit"},
    {"code":"171","name":"Deudas a largo plazo",                                    "type":"liability","normal":"credit"},
    {"code":"172","name":"Deudas a largo plazo transformables en subvenciones",     "type":"liability","normal":"credit"},
    {"code":"173","name":"Proveedores de inmovilizado a largo plazo",               "type":"liability","normal":"credit"},
    {"code":"174","name":"Acreedores por arrendamiento financiero a largo plazo",   "type":"liability","normal":"credit"},
    {"code":"175","name":"Efectos a pagar a largo plazo",                           "type":"liability","normal":"credit"},
    {"code":"177","name":"Obligaciones y bonos",                                    "type":"liability","normal":"credit"},
    {"code":"178","name":"Obligaciones y bonos convertibles",                       "type":"liability","normal":"credit"},
    {"code":"179","name":"Deudas representadas en otros valores negociables",       "type":"liability","normal":"credit"},

    # 18 Pasivos por fianzas y garantías a largo plazo
    {"code":"180","name":"Fianzas recibidas a largo plazo",                         "type":"liability","normal":"credit"},
    {"code":"181","name":"Anticipos recibidos por ventas o servicios a largo plazo","type":"liability","normal":"credit"},
    {"code":"185","name":"Depósitos recibidos a largo plazo",                       "type":"liability","normal":"credit"},
    {"code":"189","name":"Garantías financieras a largo plazo",                     "type":"liability","normal":"credit"},

    # 19 Situaciones transitorias de financiación
    {"code":"190","name":"Acciones o participaciones emitidas",                     "type":"equity","normal":"credit"},
    {"code":"194","name":"Capital emitido pendiente de inscripción",                "type":"equity","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 2 — ACTIVO NO CORRIENTE
    # ══════════════════════════════════════════════════════════════

    # 20 Inmovilizaciones intangibles
    {"code":"200","name":"Investigación",                                           "type":"asset","normal":"debit"},
    {"code":"201","name":"Desarrollo",                                              "type":"asset","normal":"debit"},
    {"code":"202","name":"Concesiones administrativas",                             "type":"asset","normal":"debit"},
    {"code":"203","name":"Propiedad industrial",                                    "type":"asset","normal":"debit"},
    {"code":"204","name":"Fondo de comercio",                                       "type":"asset","normal":"debit"},
    {"code":"205","name":"Derechos de traspaso",                                    "type":"asset","normal":"debit"},
    {"code":"206","name":"Aplicaciones informáticas",                               "type":"asset","normal":"debit"},
    {"code":"209","name":"Anticipos para inmovilizaciones intangibles",             "type":"asset","normal":"debit"},

    # 21 Inmovilizaciones materiales
    {"code":"210","name":"Terrenos y bienes naturales",                             "type":"asset","normal":"debit"},
    {"code":"211","name":"Construcciones",                                          "type":"asset","normal":"debit"},
    {"code":"212","name":"Instalaciones técnicas",                                  "type":"asset","normal":"debit"},
    {"code":"213","name":"Maquinaria",                                              "type":"asset","normal":"debit"},
    {"code":"214","name":"Utillaje",                                                "type":"asset","normal":"debit"},
    {"code":"215","name":"Otras instalaciones",                                     "type":"asset","normal":"debit"},
    {"code":"216","name":"Mobiliario",                                              "type":"asset","normal":"debit"},
    {"code":"217","name":"Equipos para proceso de información",                     "type":"asset","normal":"debit"},
    {"code":"218","name":"Elementos de transporte",                                 "type":"asset","normal":"debit"},
    {"code":"219","name":"Otro inmovilizado material",                              "type":"asset","normal":"debit"},

    # 22 Inversiones inmobiliarias
    {"code":"220","name":"Inversiones en terrenos y bienes naturales",              "type":"asset","normal":"debit"},
    {"code":"221","name":"Inversiones en construcciones",                           "type":"asset","normal":"debit"},

    # 23 Inmovilizaciones materiales en curso
    {"code":"230","name":"Adaptación de terrenos y bienes naturales",               "type":"asset","normal":"debit"},
    {"code":"231","name":"Construcciones en curso",                                 "type":"asset","normal":"debit"},
    {"code":"232","name":"Instalaciones técnicas en montaje",                       "type":"asset","normal":"debit"},
    {"code":"233","name":"Maquinaria en montaje",                                   "type":"asset","normal":"debit"},
    {"code":"237","name":"Equipos para procesos de información en montaje",         "type":"asset","normal":"debit"},
    {"code":"239","name":"Anticipos para inmovilizaciones materiales",              "type":"asset","normal":"debit"},

    # 24-25 Inversiones financieras a largo plazo
    {"code":"240","name":"Participaciones a largo plazo en partes vinculadas",      "type":"asset","normal":"debit"},
    {"code":"241","name":"Valores representativos de deuda a largo plazo, partes vinculadas","type":"asset","normal":"debit"},
    {"code":"242","name":"Créditos a largo plazo a partes vinculadas",              "type":"asset","normal":"debit"},
    {"code":"250","name":"Inversiones financieras a largo plazo en instrumentos de patrimonio","type":"asset","normal":"debit"},
    {"code":"251","name":"Valores representativos de deuda a largo plazo",          "type":"asset","normal":"debit"},
    {"code":"252","name":"Créditos a largo plazo",                                  "type":"asset","normal":"debit"},
    {"code":"253","name":"Créditos a largo plazo por enajenación de inmovilizado",  "type":"asset","normal":"debit"},
    {"code":"254","name":"Créditos a largo plazo al personal",                      "type":"asset","normal":"debit"},
    {"code":"258","name":"Imposiciones a largo plazo",                              "type":"asset","normal":"debit"},

    # 26 Fianzas y depósitos constituidos a largo plazo
    {"code":"260","name":"Fianzas constituidas a largo plazo",                      "type":"asset","normal":"debit"},
    {"code":"265","name":"Depósitos constituidos a largo plazo",                    "type":"asset","normal":"debit"},

    # 28 Amortización acumulada
    {"code":"280","name":"Amortización acumulada del inmovilizado intangible",      "type":"asset","normal":"credit"},
    {"code":"281","name":"Amortización acumulada del inmovilizado material",        "type":"asset","normal":"credit"},
    {"code":"282","name":"Amortización acumulada de las inversiones inmobiliarias", "type":"asset","normal":"credit"},

    # 29 Deterioro de valor
    {"code":"290","name":"Deterioro de valor del inmovilizado intangible",          "type":"asset","normal":"credit"},
    {"code":"291","name":"Deterioro de valor del inmovilizado material",            "type":"asset","normal":"credit"},
    {"code":"293","name":"Deterioro de valor de participaciones a largo plazo en partes vinculadas","type":"asset","normal":"credit"},
    {"code":"298","name":"Deterioro de valor de valores representativos de deuda a largo plazo","type":"asset","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 3 — EXISTENCIAS
    # ══════════════════════════════════════════════════════════════

    {"code":"300","name":"Mercaderías",                                             "type":"asset","normal":"debit"},
    {"code":"301","name":"Materias primas",                                         "type":"asset","normal":"debit"},
    {"code":"302","name":"Otros aprovisionamientos",                                "type":"asset","normal":"debit"},
    {"code":"310","name":"Productos en curso",                                      "type":"asset","normal":"debit"},
    {"code":"320","name":"Productos semiterminados",                                "type":"asset","normal":"debit"},
    {"code":"321","name":"Productos en curso de construcción para la venta",        "type":"asset","normal":"debit"},
    {"code":"330","name":"Productos terminados",                                    "type":"asset","normal":"debit"},
    {"code":"331","name":"Productos terminados construcción para la venta",         "type":"asset","normal":"debit"},
    {"code":"340","name":"Subproductos, residuos y materiales recuperados",         "type":"asset","normal":"debit"},
    {"code":"350","name":"Productos agrícolas, forestales y ganaderos",             "type":"asset","normal":"debit"},
    {"code":"360","name":"Materiales de construcción para venta al por menor",      "type":"asset","normal":"debit"},
    {"code":"390","name":"Deterioro de valor de las mercaderías",                   "type":"asset","normal":"credit"},
    {"code":"391","name":"Deterioro de valor de materias primas",                   "type":"asset","normal":"credit"},
    {"code":"393","name":"Deterioro de valor de productos en curso",                "type":"asset","normal":"credit"},
    {"code":"394","name":"Deterioro de valor de productos semiterminados",          "type":"asset","normal":"credit"},
    {"code":"395","name":"Deterioro de valor de productos terminados",              "type":"asset","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 4 — ACREEDORES Y DEUDORES POR OPERACIONES COMERCIALES
    # ══════════════════════════════════════════════════════════════

    # 40 Proveedores
    {"code":"400","name":"Proveedores",                                             "type":"liability","normal":"credit"},
    {"code":"401","name":"Proveedores, efectos comerciales a pagar",                "type":"liability","normal":"credit"},
    {"code":"403","name":"Proveedores, empresas del grupo",                         "type":"liability","normal":"credit"},
    {"code":"404","name":"Proveedores, empresas asociadas",                         "type":"liability","normal":"credit"},
    {"code":"405","name":"Proveedores, otras partes vinculadas",                    "type":"liability","normal":"credit"},
    {"code":"406","name":"Envases y embalajes a devolver a proveedores",            "type":"liability","normal":"credit"},
    {"code":"407","name":"Anticipos a proveedores",                                 "type":"asset","normal":"debit"},

    # 41 Acreedores varios
    {"code":"410","name":"Acreedores por prestaciones de servicios",                "type":"liability","normal":"credit"},
    {"code":"411","name":"Acreedores, efectos comerciales a pagar",                 "type":"liability","normal":"credit"},

    # 43 Clientes
    {"code":"430","name":"Clientes",                                                "type":"asset","normal":"debit"},
    {"code":"431","name":"Clientes, efectos comerciales a cobrar",                  "type":"asset","normal":"debit"},
    {"code":"433","name":"Clientes, empresas del grupo",                            "type":"asset","normal":"debit"},
    {"code":"434","name":"Clientes, empresas asociadas",                            "type":"asset","normal":"debit"},
    {"code":"435","name":"Clientes, otras partes vinculadas",                       "type":"asset","normal":"debit"},
    {"code":"436","name":"Clientes de dudoso cobro",                                "type":"asset","normal":"debit"},
    {"code":"437","name":"Envases y embalajes a devolver por clientes",             "type":"liability","normal":"credit"},
    {"code":"438","name":"Anticipos de clientes",                                   "type":"liability","normal":"credit"},

    # 44 Deudores varios
    {"code":"440","name":"Deudores",                                                "type":"asset","normal":"debit"},
    {"code":"441","name":"Deudores, efectos comerciales a cobrar",                  "type":"asset","normal":"debit"},

    # 46 Personal
    {"code":"460","name":"Anticipos de remuneraciones",                             "type":"asset","normal":"debit"},
    {"code":"465","name":"Remuneraciones pendientes de pago",                       "type":"liability","normal":"credit"},

    # 47 Administraciones Públicas
    {"code":"470","name":"Hacienda Pública, deudora por diversos conceptos",        "type":"asset","normal":"debit"},
    {"code":"471","name":"Organismos de la Seguridad Social, deudores",             "type":"asset","normal":"debit"},
    {"code":"472","name":"Hacienda Pública, IVA soportado",                         "type":"asset","normal":"debit"},
    {"code":"473","name":"Hacienda Pública, retenciones y pagos a cuenta",          "type":"asset","normal":"debit"},
    {"code":"474","name":"Activos por impuesto diferido",                           "type":"asset","normal":"debit"},
    {"code":"475","name":"Hacienda Pública, acreedora por conceptos fiscales",      "type":"liability","normal":"credit"},
    {"code":"476","name":"Organismos de la Seguridad Social, acreedores",           "type":"liability","normal":"credit"},
    {"code":"477","name":"Hacienda Pública, IVA repercutido",                       "type":"liability","normal":"credit"},
    {"code":"479","name":"Pasivos por diferencias temporarias imponibles",          "type":"liability","normal":"credit"},

    # 48 Ajustes por periodificación
    {"code":"480","name":"Gastos anticipados",                                      "type":"asset","normal":"debit"},
    {"code":"485","name":"Ingresos anticipados",                                    "type":"liability","normal":"credit"},

    # 49 Deterioro de valor de créditos
    {"code":"490","name":"Deterioro de valor de créditos por operaciones comerciales","type":"asset","normal":"credit"},
    {"code":"493","name":"Deterioro de valor de créditos, empresas del grupo",      "type":"asset","normal":"credit"},
    {"code":"494","name":"Deterioro de valor de créditos, empresas asociadas",      "type":"asset","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 5 — CUENTAS FINANCIERAS
    # ══════════════════════════════════════════════════════════════

    # 50 Empréstitos, deudas con características especiales y otros a corto plazo
    {"code":"500","name":"Obligaciones y bonos a corto plazo",                      "type":"liability","normal":"credit"},
    {"code":"505","name":"Deudas representadas en otros valores negociables a corto plazo","type":"liability","normal":"credit"},

    # 51 Deudas a corto plazo con partes vinculadas
    {"code":"510","name":"Deudas a corto plazo con entidades de crédito vinculadas","type":"liability","normal":"credit"},
    {"code":"511","name":"Proveedores de inmovilizado a corto plazo, partes vinculadas","type":"liability","normal":"credit"},
    {"code":"512","name":"Acreedores por arrendamiento financiero a corto plazo, partes vinculadas","type":"liability","normal":"credit"},
    {"code":"513","name":"Otras deudas a corto plazo con partes vinculadas",        "type":"liability","normal":"credit"},

    # 52 Deudas a corto plazo por préstamos recibidos y otros
    {"code":"520","name":"Deudas a corto plazo con entidades de crédito",           "type":"liability","normal":"credit"},
    {"code":"521","name":"Deudas a corto plazo",                                    "type":"liability","normal":"credit"},
    {"code":"522","name":"Deudas a corto plazo transformables en subvenciones",     "type":"liability","normal":"credit"},
    {"code":"523","name":"Proveedores de inmovilizado a corto plazo",               "type":"liability","normal":"credit"},
    {"code":"524","name":"Acreedores por arrendamiento financiero a corto plazo",   "type":"liability","normal":"credit"},
    {"code":"525","name":"Efectos a pagar a corto plazo",                           "type":"liability","normal":"credit"},
    {"code":"527","name":"Dividendos activos a pagar",                              "type":"liability","normal":"credit"},

    # 53 Inversiones financieras a corto plazo en partes vinculadas
    {"code":"530","name":"Participaciones a corto plazo en partes vinculadas",      "type":"asset","normal":"debit"},
    {"code":"531","name":"Valores representativos de deuda a corto plazo, partes vinculadas","type":"asset","normal":"debit"},
    {"code":"532","name":"Créditos a corto plazo a partes vinculadas",              "type":"asset","normal":"debit"},

    # 54 Otras inversiones financieras a corto plazo
    {"code":"540","name":"Inversiones financieras a corto plazo en instrumentos de patrimonio","type":"asset","normal":"debit"},
    {"code":"541","name":"Valores representativos de deuda a corto plazo",          "type":"asset","normal":"debit"},
    {"code":"542","name":"Créditos a corto plazo",                                  "type":"asset","normal":"debit"},
    {"code":"543","name":"Créditos a corto plazo por enajenación de inmovilizado",  "type":"asset","normal":"debit"},
    {"code":"544","name":"Créditos a corto plazo al personal",                      "type":"asset","normal":"debit"},
    {"code":"548","name":"Imposiciones a corto plazo",                              "type":"asset","normal":"debit"},

    # 55 Otras cuentas no bancarias
    {"code":"550","name":"Titular de la explotación",                               "type":"equity","normal":"debit"},
    {"code":"551","name":"Cuenta corriente con socios y administradores",           "type":"asset","normal":"debit"},
    {"code":"552","name":"Cuenta corriente con otras partes vinculadas",            "type":"asset","normal":"debit"},
    {"code":"553","name":"Cuenta corriente con otras empresas",                     "type":"asset","normal":"debit"},
    {"code":"555","name":"Partidas pendientes de aplicación",                       "type":"liability","normal":"credit"},
    {"code":"556","name":"Desembolsos exigidos sobre participaciones",              "type":"asset","normal":"debit"},
    {"code":"557","name":"Dividendo activo a cuenta",                               "type":"equity","normal":"debit"},
    {"code":"558","name":"Socios por distribución",                                 "type":"asset","normal":"debit"},

    # 56 Fianzas y depósitos recibidos y constituidos a corto plazo
    {"code":"560","name":"Fianzas recibidas a corto plazo",                         "type":"liability","normal":"credit"},
    {"code":"561","name":"Depósitos recibidos a corto plazo",                       "type":"liability","normal":"credit"},
    {"code":"565","name":"Fianzas constituidas a corto plazo",                      "type":"asset","normal":"debit"},
    {"code":"566","name":"Depósitos constituidos a corto plazo",                    "type":"asset","normal":"debit"},

    # 57 Tesorería
    {"code":"570","name":"Caja, euros",                                             "type":"asset","normal":"debit"},
    {"code":"571","name":"Caja, moneda extranjera",                                 "type":"asset","normal":"debit"},
    {"code":"572","name":"Bancos e instituciones de crédito, c/c vista, euros",     "type":"asset","normal":"debit"},
    {"code":"573","name":"Bancos e instituciones de crédito, c/c vista, moneda extranjera","type":"asset","normal":"debit"},
    {"code":"574","name":"Bancos e instituciones de crédito, cuentas de ahorro",    "type":"asset","normal":"debit"},
    {"code":"575","name":"Bancos e instituciones de crédito, cuentas de ahorro, moneda extranjera","type":"asset","normal":"debit"},

    # 58 Activos no corrientes mantenidos para la venta
    {"code":"580","name":"Inmovilizado",                                            "type":"asset","normal":"debit"},
    {"code":"581","name":"Inversiones inmobiliarias",                               "type":"asset","normal":"debit"},
    {"code":"582","name":"Inversiones financieras",                                 "type":"asset","normal":"debit"},

    # 59 Deterioro del valor de inversiones financieras a corto plazo
    {"code":"593","name":"Deterioro de valor de participaciones a corto plazo en partes vinculadas","type":"asset","normal":"credit"},
    {"code":"598","name":"Deterioro de valor de valores representativos de deuda a corto plazo","type":"asset","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 6 — COMPRAS Y GASTOS
    # ══════════════════════════════════════════════════════════════

    # 60 Compras
    {"code":"600","name":"Compras de mercaderías",                                  "type":"expense","normal":"debit"},
    {"code":"601","name":"Compras de materias primas",                              "type":"expense","normal":"debit"},
    {"code":"602","name":"Compras de otros aprovisionamientos",                     "type":"expense","normal":"debit"},
    {"code":"606","name":"Descuentos sobre compras por pronto pago",                "type":"expense","normal":"credit"},
    {"code":"607","name":"Trabajos realizados por otras empresas",                  "type":"expense","normal":"debit"},
    {"code":"608","name":"Devoluciones de compras y operaciones similares",         "type":"expense","normal":"credit"},
    {"code":"609","name":"Rappels por compras",                                     "type":"expense","normal":"credit"},

    # 61 Variación de existencias
    {"code":"610","name":"Variación de existencias de mercaderías",                 "type":"expense","normal":"debit"},
    {"code":"611","name":"Variación de existencias de materias primas",             "type":"expense","normal":"debit"},
    {"code":"612","name":"Variación de existencias de otros aprovisionamientos",    "type":"expense","normal":"debit"},

    # 62 Servicios exteriores
    {"code":"620","name":"Gastos en investigación y desarrollo del ejercicio",      "type":"expense","normal":"debit"},
    {"code":"621","name":"Arrendamientos y cánones",                               "type":"expense","normal":"debit"},
    {"code":"622","name":"Reparaciones y conservación",                             "type":"expense","normal":"debit"},
    {"code":"623","name":"Servicios de profesionales independientes",               "type":"expense","normal":"debit"},
    {"code":"624","name":"Transportes",                                             "type":"expense","normal":"debit"},
    {"code":"625","name":"Primas de seguros",                                       "type":"expense","normal":"debit"},
    {"code":"626","name":"Servicios bancarios y similares",                         "type":"expense","normal":"debit"},
    {"code":"627","name":"Publicidad, propaganda y relaciones públicas",            "type":"expense","normal":"debit"},
    {"code":"628","name":"Suministros",                                             "type":"expense","normal":"debit"},
    {"code":"629","name":"Otros servicios",                                         "type":"expense","normal":"debit"},

    # 63 Tributos
    {"code":"630","name":"Impuesto sobre beneficios",                               "type":"expense","normal":"debit"},
    {"code":"631","name":"Otros tributos",                                          "type":"expense","normal":"debit"},
    {"code":"633","name":"Ajustes negativos en la imposición sobre beneficios",     "type":"expense","normal":"debit"},
    {"code":"634","name":"Ajustes negativos en la imposición indirecta",            "type":"expense","normal":"debit"},
    {"code":"636","name":"Devolución de impuestos",                                 "type":"expense","normal":"credit"},
    {"code":"638","name":"Ajustes positivos en la imposición sobre beneficios",     "type":"expense","normal":"credit"},
    {"code":"639","name":"Ajustes positivos en la imposición indirecta",            "type":"expense","normal":"credit"},

    # 64 Gastos de personal
    {"code":"640","name":"Sueldos y salarios",                                      "type":"expense","normal":"debit"},
    {"code":"641","name":"Indemnizaciones",                                         "type":"expense","normal":"debit"},
    {"code":"642","name":"Seguridad Social a cargo de la empresa",                  "type":"expense","normal":"debit"},
    {"code":"643","name":"Retribuciones a largo plazo mediante sistemas de aportación definida","type":"expense","normal":"debit"},
    {"code":"644","name":"Retribuciones a largo plazo mediante sistemas de prestación definida","type":"expense","normal":"debit"},
    {"code":"645","name":"Retribuciones al personal mediante instrumentos de patrimonio","type":"expense","normal":"debit"},
    {"code":"649","name":"Otros gastos sociales",                                   "type":"expense","normal":"debit"},

    # 65 Otros gastos de gestión
    {"code":"650","name":"Pérdidas de créditos comerciales incobrables",            "type":"expense","normal":"debit"},
    {"code":"651","name":"Resultados de operaciones en común",                      "type":"expense","normal":"debit"},
    {"code":"659","name":"Otras pérdidas en gestión corriente",                     "type":"expense","normal":"debit"},

    # 66 Gastos financieros
    {"code":"660","name":"Gastos financieros por actualización de provisiones",     "type":"expense","normal":"debit"},
    {"code":"661","name":"Intereses de obligaciones y bonos",                       "type":"expense","normal":"debit"},
    {"code":"662","name":"Intereses de deudas",                                     "type":"expense","normal":"debit"},
    {"code":"663","name":"Pérdidas por valoración de instrumentos financieros por valor razonable","type":"expense","normal":"debit"},
    {"code":"664","name":"Dividendos de acciones o participaciones consideradas como gastos financieros","type":"expense","normal":"debit"},
    {"code":"665","name":"Descuentos sobre ventas por pronto pago",                 "type":"expense","normal":"debit"},
    {"code":"666","name":"Pérdidas en participaciones y valores representativos de deuda","type":"expense","normal":"debit"},
    {"code":"667","name":"Pérdidas de créditos no comerciales",                     "type":"expense","normal":"debit"},
    {"code":"668","name":"Diferencias negativas de cambio",                         "type":"expense","normal":"debit"},
    {"code":"669","name":"Otros gastos financieros",                                "type":"expense","normal":"debit"},

    # 67 Pérdidas procedentes de activos no corrientes y gastos excepcionales
    {"code":"670","name":"Pérdidas procedentes del inmovilizado intangible",        "type":"expense","normal":"debit"},
    {"code":"671","name":"Pérdidas procedentes del inmovilizado material",          "type":"expense","normal":"debit"},
    {"code":"672","name":"Pérdidas procedentes de las inversiones inmobiliarias",   "type":"expense","normal":"debit"},
    {"code":"678","name":"Gastos excepcionales",                                    "type":"expense","normal":"debit"},

    # 68 Dotaciones para amortizaciones
    {"code":"680","name":"Amortización del inmovilizado intangible",                "type":"expense","normal":"debit"},
    {"code":"681","name":"Amortización del inmovilizado material",                  "type":"expense","normal":"debit"},
    {"code":"682","name":"Amortización de las inversiones inmobiliarias",           "type":"expense","normal":"debit"},

    # 69 Pérdidas por deterioro y otras dotaciones
    {"code":"690","name":"Pérdidas por deterioro del inmovilizado intangible",      "type":"expense","normal":"debit"},
    {"code":"691","name":"Pérdidas por deterioro del inmovilizado material",        "type":"expense","normal":"debit"},
    {"code":"692","name":"Pérdidas por deterioro de las inversiones inmobiliarias", "type":"expense","normal":"debit"},
    {"code":"693","name":"Pérdidas por deterioro de existencias",                   "type":"expense","normal":"debit"},
    {"code":"694","name":"Pérdidas por deterioro de créditos por operaciones comerciales","type":"expense","normal":"debit"},
    {"code":"695","name":"Dotaciones a las provisiones",                            "type":"expense","normal":"debit"},
    {"code":"696","name":"Pérdidas por deterioro de participaciones y valores representativos de deuda a largo plazo","type":"expense","normal":"debit"},
    {"code":"697","name":"Pérdidas por deterioro de créditos a largo plazo",        "type":"expense","normal":"debit"},
    {"code":"698","name":"Pérdidas por deterioro de participaciones y valores representativos de deuda a corto plazo","type":"expense","normal":"debit"},
    {"code":"699","name":"Pérdidas por deterioro de créditos a corto plazo",        "type":"expense","normal":"debit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 7 — VENTAS E INGRESOS
    # ══════════════════════════════════════════════════════════════

    # 70 Ventas de mercaderías, de producción propia, de servicios, etc.
    {"code":"700","name":"Ventas de mercaderías",                                   "type":"income","normal":"credit"},
    {"code":"701","name":"Ventas de productos terminados",                          "type":"income","normal":"credit"},
    {"code":"702","name":"Ventas de productos semiterminados",                      "type":"income","normal":"credit"},
    {"code":"703","name":"Ventas de subproductos y residuos",                       "type":"income","normal":"credit"},
    {"code":"704","name":"Ventas de envases y embalajes",                           "type":"income","normal":"credit"},
    {"code":"705","name":"Prestaciones de servicios",                               "type":"income","normal":"credit"},
    {"code":"706","name":"Descuentos sobre ventas por pronto pago",                 "type":"income","normal":"debit"},
    {"code":"708","name":"Devoluciones de ventas y operaciones similares",          "type":"income","normal":"debit"},
    {"code":"709","name":"Rappels sobre ventas",                                    "type":"income","normal":"debit"},

    # 71 Variación de existencias de productos terminados y en curso
    {"code":"710","name":"Variación de existencias de productos en curso",          "type":"income","normal":"credit"},
    {"code":"711","name":"Variación de existencias de productos semiterminados",    "type":"income","normal":"credit"},
    {"code":"712","name":"Variación de existencias de productos terminados",        "type":"income","normal":"credit"},
    {"code":"713","name":"Variación de existencias de subproductos, residuos y materiales recuperados","type":"income","normal":"credit"},

    # 73 Trabajos realizados para la empresa
    {"code":"730","name":"Trabajos realizados para el inmovilizado intangible",     "type":"income","normal":"credit"},
    {"code":"731","name":"Trabajos realizados para el inmovilizado material",       "type":"income","normal":"credit"},
    {"code":"732","name":"Trabajos realizados en inversiones inmobiliarias",        "type":"income","normal":"credit"},
    {"code":"733","name":"Trabajos realizados para el inmovilizado material en curso","type":"income","normal":"credit"},

    # 74 Subvenciones, donaciones y legados
    {"code":"740","name":"Subvenciones, donaciones y legados a la explotación",     "type":"income","normal":"credit"},
    {"code":"741","name":"Subvenciones, donaciones y legados de capital transferidos al resultado","type":"income","normal":"credit"},
    {"code":"747","name":"Otras subvenciones, donaciones y legados transferidos al resultado","type":"income","normal":"credit"},

    # 75 Otros ingresos de gestión
    {"code":"750","name":"Ingresos por arrendamientos",                             "type":"income","normal":"credit"},
    {"code":"751","name":"Ingresos de propiedad industrial cedida en explotación",  "type":"income","normal":"credit"},
    {"code":"752","name":"Ingresos por comisiones",                                 "type":"income","normal":"credit"},
    {"code":"753","name":"Ingresos por servicios al personal",                      "type":"income","normal":"credit"},
    {"code":"754","name":"Ingresos por comisiones de agencia",                      "type":"income","normal":"credit"},
    {"code":"755","name":"Ingresos por servicios a empresas del grupo y asociadas", "type":"income","normal":"credit"},
    {"code":"759","name":"Ingresos por servicios diversos",                         "type":"income","normal":"credit"},

    # 76 Ingresos financieros
    {"code":"760","name":"Ingresos de participaciones en instrumentos de patrimonio","type":"income","normal":"credit"},
    {"code":"761","name":"Ingresos de valores representativos de deuda",            "type":"income","normal":"credit"},
    {"code":"762","name":"Ingresos de créditos a largo plazo",                      "type":"income","normal":"credit"},
    {"code":"763","name":"Ingresos de créditos a corto plazo",                      "type":"income","normal":"credit"},
    {"code":"765","name":"Descuentos sobre compras por pronto pago",                "type":"income","normal":"credit"},
    {"code":"766","name":"Beneficios en participaciones y valores representativos de deuda","type":"income","normal":"credit"},
    {"code":"767","name":"Ingresos de activos afectos y de derechos consolidados",  "type":"income","normal":"credit"},
    {"code":"768","name":"Diferencias positivas de cambio",                         "type":"income","normal":"credit"},
    {"code":"769","name":"Otros ingresos financieros",                              "type":"income","normal":"credit"},

    # 77 Beneficios procedentes de activos no corrientes e ingresos excepcionales
    {"code":"770","name":"Beneficios procedentes del inmovilizado intangible",      "type":"income","normal":"credit"},
    {"code":"771","name":"Beneficios procedentes del inmovilizado material",        "type":"income","normal":"credit"},
    {"code":"772","name":"Beneficios procedentes de las inversiones inmobiliarias", "type":"income","normal":"credit"},
    {"code":"778","name":"Ingresos excepcionales",                                  "type":"income","normal":"credit"},

    # 79 Excesos y aplicaciones de provisiones y de pérdidas por deterioro
    {"code":"790","name":"Reversión del deterioro del inmovilizado intangible",     "type":"income","normal":"credit"},
    {"code":"791","name":"Reversión del deterioro del inmovilizado material",       "type":"income","normal":"credit"},
    {"code":"792","name":"Reversión del deterioro de las inversiones inmobiliarias","type":"income","normal":"credit"},
    {"code":"793","name":"Reversión del deterioro de existencias",                  "type":"income","normal":"credit"},
    {"code":"794","name":"Reversión del deterioro de créditos por operaciones comerciales","type":"income","normal":"credit"},
    {"code":"795","name":"Exceso de provisiones",                                   "type":"income","normal":"credit"},
    {"code":"796","name":"Reversión del deterioro de participaciones y valores representativos de deuda a largo plazo","type":"income","normal":"credit"},
    {"code":"797","name":"Reversión del deterioro de créditos a largo plazo",       "type":"income","normal":"credit"},
    {"code":"798","name":"Reversión del deterioro de participaciones y valores representativos de deuda a corto plazo","type":"income","normal":"credit"},
    {"code":"799","name":"Reversión del deterioro de créditos a corto plazo",       "type":"income","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 8 — GASTOS IMPUTADOS AL PATRIMONIO NETO
    # ══════════════════════════════════════════════════════════════

    {"code":"800","name":"Pérdidas en activos financieros disponibles para la venta","type":"expense","normal":"debit"},
    {"code":"802","name":"Transferencia de beneficios en activos financieros disponibles para la venta","type":"expense","normal":"debit"},
    {"code":"810","name":"Pérdidas por cobertura de flujos de efectivo",            "type":"expense","normal":"debit"},
    {"code":"812","name":"Transferencia de beneficios por coberturas de flujos de efectivo","type":"expense","normal":"debit"},
    {"code":"820","name":"Diferencias de conversión negativas",                     "type":"expense","normal":"debit"},
    {"code":"822","name":"Transferencia de diferencias de conversión positivas",    "type":"expense","normal":"debit"},
    {"code":"830","name":"Impuesto sobre beneficios (imputado a patrimonio neto)",  "type":"expense","normal":"debit"},
    {"code":"833","name":"Ajustes negativos en la imposición sobre beneficios (patrimonio neto)","type":"expense","normal":"debit"},
    {"code":"835","name":"Pérdidas actuariales y ajustes en plan de beneficios",    "type":"expense","normal":"debit"},
    {"code":"836","name":"Transferencia de ingresos actuariales",                   "type":"expense","normal":"debit"},
    {"code":"838","name":"Ajustes positivos en la imposición sobre beneficios (patrimonio neto)","type":"expense","normal":"credit"},
    {"code":"840","name":"Transferencia por subvenciones, donaciones y legados",    "type":"expense","normal":"debit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 9 — INGRESOS IMPUTADOS AL PATRIMONIO NETO
    # ══════════════════════════════════════════════════════════════

    {"code":"900","name":"Beneficios en activos financieros disponibles para la venta","type":"income","normal":"credit"},
    {"code":"902","name":"Transferencia de pérdidas en activos financieros disponibles para la venta","type":"income","normal":"credit"},
    {"code":"910","name":"Beneficios por cobertura de flujos de efectivo",          "type":"income","normal":"credit"},
    {"code":"912","name":"Transferencia de pérdidas por coberturas de flujos de efectivo","type":"income","normal":"credit"},
    {"code":"920","name":"Diferencias de conversión positivas",                     "type":"income","normal":"credit"},
    {"code":"922","name":"Transferencia de diferencias de conversión negativas",    "type":"income","normal":"credit"},
    {"code":"930","name":"Impuesto sobre beneficios (imputado a patrimonio neto, ingreso)","type":"income","normal":"credit"},
    {"code":"933","name":"Ajustes negativos en la imposición (patrimonio neto, ingreso)","type":"income","normal":"credit"},
    {"code":"935","name":"Ingresos actuariales y ajustes en plan de beneficios",    "type":"income","normal":"credit"},
    {"code":"936","name":"Transferencia de pérdidas actuariales",                   "type":"income","normal":"credit"},
    {"code":"938","name":"Ajustes positivos en la imposición (patrimonio neto, ingreso)","type":"income","normal":"debit"},
    {"code":"940","name":"Ingresos de subvenciones oficiales de capital",           "type":"income","normal":"credit"},
    {"code":"941","name":"Ingresos de donaciones y legados de capital",             "type":"income","normal":"credit"},
    {"code":"942","name":"Ingresos de otras subvenciones, donaciones y legados",    "type":"income","normal":"credit"},
]

# ── Mapeo de categorías del registro_diario a asientos PGC ───────────────────
# Clave: (tipo, categoria)
# Valor: (cuenta_debe, cuenta_haber)
# Fuente: RD 1514/2007, Quinta parte — Definiciones y relaciones contables

PGC_ES_ENTRY_MAP = {
    # Venta mercaderías: cliente (430) debe, ventas (700) haber
    ("ingreso", "Ventas"):     ("430", "700"),

    # Compra mercaderías: compras (600) debe, proveedores (400) haber
    ("gasto",   "Compras"):    ("600", "400"),

    # Nóminas: sueldos (640) debe, remuneraciones pendientes (465) haber
    ("gasto",   "Personal"):   ("640", "465"),

    # Servicios externos: gastos servicios (620) debe, acreedores (410) haber
    ("gasto",   "Servicios"):  ("620", "410"),
}

# Asiento por defecto si la categoría no está mapeada
PGC_ES_DEFAULT_GASTO   = ("629", "400")   # otros servicios / proveedores
PGC_ES_DEFAULT_INGRESO = ("430", "700")   # clientes / ventas mercaderías


def get_entry_accounts(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in PGC_ES_ENTRY_MAP:
        return PGC_ES_ENTRY_MAP[key]
    return PGC_ES_DEFAULT_GASTO if tipo == "gasto" else PGC_ES_DEFAULT_INGRESO
