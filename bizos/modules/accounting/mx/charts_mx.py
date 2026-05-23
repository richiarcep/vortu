"""
charts_mx.py — Plan de Cuentas México
======================================
Basado en las Normas de Información Financiera (NIF) emitidas por el CINIF
y alineado con el catálogo de cuentas SAT para CFDI 4.0.

Estructura de grupos:
  1xx  Activo
  2xx  Pasivo
  3xx  Capital Contable
  4xx  Ingresos
  5xx  Costos y Gastos de Operación
  6xx  Resultado Integral de Financiamiento (RIF)
  7xx  Otros Ingresos y Gastos
  8xx  Participación en Resultados de Subsidiarias
  9xx  Cuentas de Orden

IVA: 16%  |  ISR: 30%  |  PTU: 10%
"""

NIF_MX_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # GRUPO 1 — ACTIVO
    # ══════════════════════════════════════════════════════════════

    {"code":"101","name":"Caja",                                                "type":"asset","normal":"debit"},
    {"code":"102","name":"Bancos",                                              "type":"asset","normal":"debit"},
    {"code":"103","name":"Inversiones Temporales",                              "type":"asset","normal":"debit"},
    {"code":"104","name":"Fondo Fijo de Caja Chica",                            "type":"asset","normal":"debit"},
    {"code":"111","name":"Clientes",                                            "type":"asset","normal":"debit"},
    {"code":"112","name":"Documentos por Cobrar",                               "type":"asset","normal":"debit"},
    {"code":"113","name":"Deudores Diversos",                                   "type":"asset","normal":"debit"},
    {"code":"114","name":"Funcionarios y Empleados",                            "type":"asset","normal":"debit"},
    {"code":"115","name":"Estimacion para Cuentas Incobrables",                 "type":"asset","normal":"credit"},
    {"code":"116","name":"IVA Acreditable",                                     "type":"asset","normal":"debit"},
    {"code":"117","name":"Anticipo a Proveedores",                              "type":"asset","normal":"debit"},
    {"code":"118","name":"Anticipo de ISR",                                     "type":"asset","normal":"debit"},
    {"code":"119","name":"ISR Retenido a Favor",                                "type":"asset","normal":"debit"},
    {"code":"121","name":"Inventario de Mercancias",                            "type":"asset","normal":"debit"},
    {"code":"122","name":"Inventario de Materias Primas",                       "type":"asset","normal":"debit"},
    {"code":"123","name":"Inventario de Produccion en Proceso",                 "type":"asset","normal":"debit"},
    {"code":"124","name":"Inventario de Productos Terminados",                  "type":"asset","normal":"debit"},
    {"code":"125","name":"Inventario de Refacciones y Accesorios",              "type":"asset","normal":"debit"},
    {"code":"126","name":"Estimacion por Obsolescencia de Inventarios",         "type":"asset","normal":"credit"},
    {"code":"131","name":"Seguros Pagados por Anticipado",                      "type":"asset","normal":"debit"},
    {"code":"132","name":"Rentas Pagadas por Anticipado",                       "type":"asset","normal":"debit"},
    {"code":"133","name":"Publicidad Pagada por Anticipado",                    "type":"asset","normal":"debit"},
    {"code":"134","name":"Otros Pagos Anticipados",                             "type":"asset","normal":"debit"},
    {"code":"141","name":"Terrenos",                                            "type":"asset","normal":"debit"},
    {"code":"142","name":"Edificios",                                           "type":"asset","normal":"debit"},
    {"code":"143","name":"Depreciacion Acumulada — Edificios",                  "type":"asset","normal":"credit"},
    {"code":"144","name":"Maquinaria y Equipo",                                 "type":"asset","normal":"debit"},
    {"code":"145","name":"Depreciacion Acumulada — Maquinaria y Equipo",        "type":"asset","normal":"credit"},
    {"code":"146","name":"Mobiliario y Equipo de Oficina",                      "type":"asset","normal":"debit"},
    {"code":"147","name":"Depreciacion Acumulada — Mobiliario y Equipo",        "type":"asset","normal":"credit"},
    {"code":"148","name":"Equipo de Transporte",                                "type":"asset","normal":"debit"},
    {"code":"149","name":"Depreciacion Acumulada — Equipo de Transporte",       "type":"asset","normal":"credit"},
    {"code":"150","name":"Equipo de Computo",                                   "type":"asset","normal":"debit"},
    {"code":"151","name":"Depreciacion Acumulada — Equipo de Computo",          "type":"asset","normal":"credit"},
    {"code":"161","name":"Marcas y Patentes",                                   "type":"asset","normal":"debit"},
    {"code":"162","name":"Amortizacion Acumulada — Marcas y Patentes",          "type":"asset","normal":"credit"},
    {"code":"163","name":"Software",                                            "type":"asset","normal":"debit"},
    {"code":"164","name":"Amortizacion Acumulada — Software",                   "type":"asset","normal":"credit"},
    {"code":"165","name":"Credito Mercantil (Goodwill)",                        "type":"asset","normal":"debit"},
    {"code":"171","name":"Depositos en Garantia",                               "type":"asset","normal":"debit"},
    {"code":"172","name":"Inversiones Permanentes en Acciones",                 "type":"asset","normal":"debit"},
    {"code":"173","name":"ISR Diferido Activo",                                 "type":"asset","normal":"debit"},
    {"code":"174","name":"PTU Diferida Activo",                                 "type":"asset","normal":"debit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 2 — PASIVO
    # ══════════════════════════════════════════════════════════════

    {"code":"201","name":"Proveedores",                                         "type":"liability","normal":"credit"},
    {"code":"202","name":"Documentos por Pagar",                                "type":"liability","normal":"credit"},
    {"code":"203","name":"Acreedores Diversos",                                 "type":"liability","normal":"credit"},
    {"code":"204","name":"Anticipo de Clientes",                                "type":"liability","normal":"credit"},
    {"code":"211","name":"IVA Trasladado (IVA por Pagar)",                      "type":"liability","normal":"credit"},
    {"code":"212","name":"ISR por Pagar",                                       "type":"liability","normal":"credit"},
    {"code":"213","name":"PTU por Pagar",                                       "type":"liability","normal":"credit"},
    {"code":"214","name":"IVA Retenido por Enterar",                            "type":"liability","normal":"credit"},
    {"code":"215","name":"ISR Retenido a Trabajadores",                         "type":"liability","normal":"credit"},
    {"code":"216","name":"IMSS por Pagar",                                      "type":"liability","normal":"credit"},
    {"code":"217","name":"INFONAVIT por Pagar",                                 "type":"liability","normal":"credit"},
    {"code":"218","name":"IEPS por Pagar",                                      "type":"liability","normal":"credit"},
    {"code":"221","name":"Sueldos y Salarios por Pagar",                        "type":"liability","normal":"credit"},
    {"code":"222","name":"Aguinaldo por Pagar",                                 "type":"liability","normal":"credit"},
    {"code":"223","name":"Vacaciones por Pagar",                                "type":"liability","normal":"credit"},
    {"code":"224","name":"Prima Vacacional por Pagar",                          "type":"liability","normal":"credit"},
    {"code":"225","name":"Fondo de Ahorro por Pagar",                           "type":"liability","normal":"credit"},
    {"code":"231","name":"Prestamos Bancarios a Largo Plazo",                   "type":"liability","normal":"credit"},
    {"code":"232","name":"Documentos por Pagar a Largo Plazo",                  "type":"liability","normal":"credit"},
    {"code":"233","name":"Arrendamiento Financiero por Pagar",                  "type":"liability","normal":"credit"},
    {"code":"234","name":"ISR Diferido Pasivo",                                 "type":"liability","normal":"credit"},
    {"code":"235","name":"PTU Diferida Pasivo",                                 "type":"liability","normal":"credit"},
    {"code":"236","name":"Provision para Indemnizaciones",                      "type":"liability","normal":"credit"},
    {"code":"241","name":"Prestamos Bancarios a Corto Plazo",                   "type":"liability","normal":"credit"},
    {"code":"242","name":"Porcion Circulante de Deuda a Largo Plazo",           "type":"liability","normal":"credit"},
    {"code":"243","name":"Linea de Credito Revolvente",                         "type":"liability","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 3 — CAPITAL CONTABLE
    # ══════════════════════════════════════════════════════════════

    {"code":"301","name":"Capital Social",                                      "type":"equity","normal":"credit"},
    {"code":"302","name":"Prima en Venta de Acciones",                          "type":"equity","normal":"credit"},
    {"code":"303","name":"Reserva Legal",                                       "type":"equity","normal":"credit"},
    {"code":"304","name":"Otras Reservas de Capital",                           "type":"equity","normal":"credit"},
    {"code":"305","name":"Utilidades Retenidas",                                "type":"equity","normal":"credit"},
    {"code":"306","name":"Perdidas Acumuladas",                                 "type":"equity","normal":"debit"},
    {"code":"307","name":"Utilidad del Ejercicio",                              "type":"equity","normal":"credit"},
    {"code":"308","name":"Perdida del Ejercicio",                               "type":"equity","normal":"debit"},
    {"code":"311","name":"Dividendos Decretados",                               "type":"equity","normal":"debit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 4 — INGRESOS
    # ══════════════════════════════════════════════════════════════

    {"code":"401","name":"Ventas de Mercancias",                                "type":"income","normal":"credit"},
    {"code":"402","name":"Ventas de Productos Terminados",                      "type":"income","normal":"credit"},
    {"code":"403","name":"Ingresos por Servicios",                              "type":"income","normal":"credit"},
    {"code":"404","name":"Ingresos por Comisiones",                             "type":"income","normal":"credit"},
    {"code":"405","name":"Ingresos por Arrendamiento",                          "type":"income","normal":"credit"},
    {"code":"411","name":"Devoluciones sobre Ventas",                           "type":"income","normal":"debit"},
    {"code":"412","name":"Descuentos sobre Ventas",                             "type":"income","normal":"debit"},
    {"code":"413","name":"Rebajas sobre Ventas",                                "type":"income","normal":"debit"},
    {"code":"421","name":"Ingresos por Exportaciones",                          "type":"income","normal":"credit"},
    {"code":"422","name":"Ingresos por Franquicias",                            "type":"income","normal":"credit"},
    {"code":"423","name":"Ingresos por Regalias",                               "type":"income","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 5 — COSTOS Y GASTOS DE OPERACION
    # ══════════════════════════════════════════════════════════════

    {"code":"501","name":"Costo de Ventas — Mercancias",                        "type":"expense","normal":"debit"},
    {"code":"502","name":"Costo de Ventas — Productos Terminados",              "type":"expense","normal":"debit"},
    {"code":"503","name":"Costo de Servicios Prestados",                        "type":"expense","normal":"debit"},
    {"code":"504","name":"Devoluciones sobre Compras",                          "type":"expense","normal":"credit"},
    {"code":"505","name":"Descuentos sobre Compras",                            "type":"expense","normal":"credit"},
    {"code":"506","name":"Fletes sobre Compras",                                "type":"expense","normal":"debit"},
    {"code":"511","name":"Sueldos — Personal de Ventas",                        "type":"expense","normal":"debit"},
    {"code":"512","name":"Comisiones a Vendedores",                             "type":"expense","normal":"debit"},
    {"code":"513","name":"Publicidad y Propaganda",                             "type":"expense","normal":"debit"},
    {"code":"514","name":"Gastos de Envio y Distribucion",                      "type":"expense","normal":"debit"},
    {"code":"515","name":"Gastos de Almacenaje",                                "type":"expense","normal":"debit"},
    {"code":"516","name":"Depreciacion — Activos de Venta",                     "type":"expense","normal":"debit"},
    {"code":"517","name":"Gastos de Viaje — Ventas",                            "type":"expense","normal":"debit"},
    {"code":"521","name":"Sueldos y Salarios — Administracion",                 "type":"expense","normal":"debit"},
    {"code":"522","name":"Aguinaldo",                                           "type":"expense","normal":"debit"},
    {"code":"523","name":"Prima Vacacional",                                    "type":"expense","normal":"debit"},
    {"code":"524","name":"Cuotas al IMSS — Patron",                             "type":"expense","normal":"debit"},
    {"code":"525","name":"Aportaciones al INFONAVIT",                           "type":"expense","normal":"debit"},
    {"code":"526","name":"Aportaciones al SAR / AFORE",                         "type":"expense","normal":"debit"},
    {"code":"527","name":"Renta de Oficinas",                                   "type":"expense","normal":"debit"},
    {"code":"528","name":"Servicios Publicos (Agua, Luz, Gas)",                 "type":"expense","normal":"debit"},
    {"code":"529","name":"Telefono e Internet",                                 "type":"expense","normal":"debit"},
    {"code":"530","name":"Papeleria y Utiles de Oficina",                       "type":"expense","normal":"debit"},
    {"code":"531","name":"Honorarios Profesionales",                            "type":"expense","normal":"debit"},
    {"code":"532","name":"Gastos Notariales y Legales",                         "type":"expense","normal":"debit"},
    {"code":"533","name":"Seguros y Fianzas",                                   "type":"expense","normal":"debit"},
    {"code":"534","name":"Mantenimiento y Reparaciones",                        "type":"expense","normal":"debit"},
    {"code":"535","name":"Depreciacion — Activos Administrativos",              "type":"expense","normal":"debit"},
    {"code":"536","name":"Amortizacion de Intangibles",                         "type":"expense","normal":"debit"},
    {"code":"537","name":"Gastos de Representacion",                            "type":"expense","normal":"debit"},
    {"code":"538","name":"Cuotas y Suscripciones",                              "type":"expense","normal":"debit"},
    {"code":"539","name":"Software y Licencias",                                "type":"expense","normal":"debit"},
    {"code":"540","name":"Gastos de Capacitacion",                              "type":"expense","normal":"debit"},
    {"code":"541","name":"Otros Gastos de Administracion",                      "type":"expense","normal":"debit"},
    {"code":"551","name":"ISR del Ejercicio",                                   "type":"expense","normal":"debit"},
    {"code":"552","name":"PTU",                                                 "type":"expense","normal":"debit"},
    {"code":"553","name":"Impuesto Predial",                                    "type":"expense","normal":"debit"},
    {"code":"554","name":"Tenencia y Derechos Vehiculares",                     "type":"expense","normal":"debit"},
    {"code":"555","name":"Otros Impuestos y Derechos",                          "type":"expense","normal":"debit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 6 — RESULTADO INTEGRAL DE FINANCIAMIENTO
    # ══════════════════════════════════════════════════════════════

    {"code":"601","name":"Intereses Pagados — Deuda Bancaria",                  "type":"expense","normal":"debit"},
    {"code":"602","name":"Intereses Moratorios Pagados",                        "type":"expense","normal":"debit"},
    {"code":"603","name":"Perdida Cambiaria",                                   "type":"expense","normal":"debit"},
    {"code":"604","name":"Comisiones Bancarias",                                "type":"expense","normal":"debit"},
    {"code":"611","name":"Intereses Ganados",                                   "type":"income","normal":"credit"},
    {"code":"612","name":"Utilidad Cambiaria",                                  "type":"income","normal":"credit"},
    {"code":"613","name":"Rendimientos sobre Inversiones",                      "type":"income","normal":"credit"},

    # ══════════════════════════════════════════════════════════════
    # GRUPO 7 — OTROS INGRESOS Y GASTOS
    # ══════════════════════════════════════════════════════════════

    {"code":"701","name":"Utilidad en Venta de Activo Fijo",                    "type":"income","normal":"credit"},
    {"code":"702","name":"Perdida en Venta de Activo Fijo",                     "type":"expense","normal":"debit"},
    {"code":"703","name":"Utilidad en Venta de Inversiones",                    "type":"income","normal":"credit"},
    {"code":"704","name":"Perdida en Venta de Inversiones",                     "type":"expense","normal":"debit"},
    {"code":"705","name":"Donativos Recibidos",                                 "type":"income","normal":"credit"},
    {"code":"706","name":"Donativos Otorgados",                                 "type":"expense","normal":"debit"},
    {"code":"707","name":"Ingresos por Indemnizaciones de Seguros",             "type":"income","normal":"credit"},
    {"code":"708","name":"Gastos Extraordinarios",                              "type":"expense","normal":"debit"},
    {"code":"709","name":"Ingresos Extraordinarios",                            "type":"income","normal":"credit"},
]

# ─────────────────────────────────────────────────────────────────────────────
# MAPEO DE CATEGORIAS A ASIENTOS NIF MEXICO
# ─────────────────────────────────────────────────────────────────────────────

NIF_MX_ENTRY_MAP = {
    ("ingreso", "Ventas"):        ("111", "401"),
    ("ingreso", "Servicios"):     ("111", "403"),
    ("gasto",   "Compras"):       ("501", "201"),
    ("gasto",   "Personal"):      ("521", "221"),
    ("gasto",   "Servicios"):     ("531", "203"),
    ("gasto",   "Renta"):         ("527", "203"),
    ("gasto",   "Marketing"):     ("513", "203"),
    ("gasto",   "Viajes"):        ("517", "102"),
    ("gasto",   "Software"):      ("539", "203"),
    ("gasto",   "Mantenimiento"): ("534", "203"),
    ("gasto",   "Seguros"):       ("533", "203"),
    ("gasto",   "ISR"):           ("551", "212"),
    ("gasto",   "PTU"):           ("552", "213"),
    ("gasto",   "Intereses"):     ("601", "102"),
    ("ingreso", "Intereses"):     ("102", "611"),
    ("ingreso", "Activos"):       ("102", "701"),
}

NIF_MX_DEFAULT_GASTO   = ("541", "201")
NIF_MX_DEFAULT_INGRESO = ("111", "401")


def get_entry_accounts_mx(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in NIF_MX_ENTRY_MAP:
        return NIF_MX_ENTRY_MAP[key]
    return NIF_MX_DEFAULT_GASTO if tipo == "gasto" else NIF_MX_DEFAULT_INGRESO
