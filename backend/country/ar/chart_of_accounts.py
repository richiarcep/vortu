"""
Argentina — Plan de cuentas estándar estilo FACPCE (Resoluciones Técnicas).
============================================================================
Argentina NO tiene un único plan de cuentas legalmente obligatorio a nivel
nacional. Este catálogo sigue la práctica contable habitual conforme a las
Resoluciones Técnicas (RT) de la FACPCE (Federación Argentina de Consejos
Profesionales de Ciencias Económicas) y a las necesidades de la AFIP
(IVA, retenciones, cargas sociales, Ingresos Brutos, Impuesto a las Ganancias).

Se utiliza el esquema jerárquico de códigos punteados de uso común en
Argentina (p. ej. 1.1.01.001 Caja, 1.1.02 Bancos, 1.1.04 Créditos por ventas,
1.1.05 IVA Crédito Fiscal, 1.2 Bienes de uso; 2.1 Proveedores / Deudas
comerciales; 3 Patrimonio neto; 4 Ingresos; 5 Costos y gastos).

IVA general: 21%.

⚠️ VERIFICAR con contador / contadora matriculado/a: los códigos y nombres
siguen una estructura estándar FACPCE, pero deben confirmarse y adaptarse a
la realidad de cada ente antes de usarse para registración, balances o
presentaciones ante la AFIP.

Saldo normal:
  debit  = saldo deudor  (activos, gastos, costos)
  credit = saldo acreedor (pasivos, patrimonio neto, ingresos)
"""

CHART_OF_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # 1 — ACTIVO
    # ══════════════════════════════════════════════════════════════

    # ── 1.1 Activo corriente ──────────────────────────────────────

    # 1.1.01 Caja y bancos — Disponibilidades
    {"code": "1.1.01.001", "name": "Caja",                                      "type": "asset", "normal": "debit"},
    {"code": "1.1.01.002", "name": "Caja moneda extranjera",                    "type": "asset", "normal": "debit"},
    {"code": "1.1.01.003", "name": "Fondo fijo",                                "type": "asset", "normal": "debit"},
    {"code": "1.1.02.001", "name": "Banco cuenta corriente en pesos",           "type": "asset", "normal": "debit"},
    {"code": "1.1.02.002", "name": "Banco caja de ahorro en pesos",             "type": "asset", "normal": "debit"},
    {"code": "1.1.02.003", "name": "Banco cuenta corriente en moneda extranjera","type": "asset", "normal": "debit"},

    # 1.1.03 Inversiones temporarias
    {"code": "1.1.03.001", "name": "Plazos fijos",                              "type": "asset", "normal": "debit"},
    {"code": "1.1.03.002", "name": "Títulos públicos",                          "type": "asset", "normal": "debit"},
    {"code": "1.1.03.003", "name": "Acciones con cotización",                    "type": "asset", "normal": "debit"},
    {"code": "1.1.03.004", "name": "Fondos comunes de inversión",               "type": "asset", "normal": "debit"},

    # 1.1.04 Créditos por ventas — Deudores por ventas
    {"code": "1.1.04.001", "name": "Deudores por ventas",                       "type": "asset", "normal": "debit"},
    {"code": "1.1.04.002", "name": "Deudores por ventas con tarjeta",           "type": "asset", "normal": "debit"},
    {"code": "1.1.04.003", "name": "Documentos a cobrar",                       "type": "asset", "normal": "debit"},
    {"code": "1.1.04.004", "name": "Deudores morosos",                          "type": "asset", "normal": "debit"},
    {"code": "1.1.04.005", "name": "Cheques de pago diferido a cobrar",         "type": "asset", "normal": "debit"},
    {"code": "1.1.04.099", "name": "Previsión para deudores incobrables",       "type": "asset", "normal": "credit"},

    # 1.1.05 Créditos fiscales — IVA y retenciones a favor
    {"code": "1.1.05.001", "name": "IVA crédito fiscal",                        "type": "asset", "normal": "debit"},
    {"code": "1.1.05.002", "name": "IVA saldo a favor",                         "type": "asset", "normal": "debit"},
    {"code": "1.1.05.003", "name": "Retenciones de IVA sufridas",               "type": "asset", "normal": "debit"},
    {"code": "1.1.05.004", "name": "Percepciones de IVA sufridas",              "type": "asset", "normal": "debit"},
    {"code": "1.1.05.005", "name": "Retenciones de Ganancias sufridas",         "type": "asset", "normal": "debit"},
    {"code": "1.1.05.006", "name": "Retenciones de Ingresos Brutos sufridas",   "type": "asset", "normal": "debit"},
    {"code": "1.1.05.007", "name": "Anticipos de Impuesto a las Ganancias",     "type": "asset", "normal": "debit"},
    {"code": "1.1.05.008", "name": "Impuesto sobre los débitos y créditos a favor","type": "asset", "normal": "debit"},

    # 1.1.06 Otros créditos
    {"code": "1.1.06.001", "name": "Anticipos a proveedores",                   "type": "asset", "normal": "debit"},
    {"code": "1.1.06.002", "name": "Anticipos al personal",                     "type": "asset", "normal": "debit"},
    {"code": "1.1.06.003", "name": "Gastos pagados por adelantado",             "type": "asset", "normal": "debit"},
    {"code": "1.1.06.004", "name": "Seguros pagados por adelantado",            "type": "asset", "normal": "debit"},
    {"code": "1.1.06.005", "name": "Accionistas cuenta aportes",               "type": "asset", "normal": "debit"},
    {"code": "1.1.06.006", "name": "Deudores varios",                           "type": "asset", "normal": "debit"},

    # 1.1.07 Bienes de cambio — Mercaderías e inventarios
    {"code": "1.1.07.001", "name": "Mercaderías de reventa",                    "type": "asset", "normal": "debit"},
    {"code": "1.1.07.002", "name": "Materias primas",                           "type": "asset", "normal": "debit"},
    {"code": "1.1.07.003", "name": "Materiales y suministros",                  "type": "asset", "normal": "debit"},
    {"code": "1.1.07.004", "name": "Productos en proceso",                      "type": "asset", "normal": "debit"},
    {"code": "1.1.07.005", "name": "Productos terminados",                      "type": "asset", "normal": "debit"},
    {"code": "1.1.07.099", "name": "Previsión por desvalorización de bienes de cambio","type": "asset", "normal": "credit"},

    # ── 1.2 Activo no corriente ───────────────────────────────────

    # 1.2.01 Créditos e inversiones no corrientes
    {"code": "1.2.01.001", "name": "Créditos por ventas a largo plazo",         "type": "asset", "normal": "debit"},
    {"code": "1.2.01.002", "name": "Inversiones permanentes",                   "type": "asset", "normal": "debit"},
    {"code": "1.2.01.003", "name": "Participaciones en otras sociedades",       "type": "asset", "normal": "debit"},

    # 1.2.02 Bienes de uso
    {"code": "1.2.02.001", "name": "Terrenos",                                  "type": "asset", "normal": "debit"},
    {"code": "1.2.02.002", "name": "Inmuebles",                                 "type": "asset", "normal": "debit"},
    {"code": "1.2.02.003", "name": "Maquinarias",                               "type": "asset", "normal": "debit"},
    {"code": "1.2.02.004", "name": "Instalaciones",                             "type": "asset", "normal": "debit"},
    {"code": "1.2.02.005", "name": "Rodados",                                   "type": "asset", "normal": "debit"},
    {"code": "1.2.02.006", "name": "Muebles y útiles",                          "type": "asset", "normal": "debit"},
    {"code": "1.2.02.007", "name": "Equipos de computación",                    "type": "asset", "normal": "debit"},
    {"code": "1.2.02.008", "name": "Obras en curso",                            "type": "asset", "normal": "debit"},
    {"code": "1.2.02.091", "name": "Amortización acumulada inmuebles",          "type": "asset", "normal": "credit"},
    {"code": "1.2.02.092", "name": "Amortización acumulada maquinarias",        "type": "asset", "normal": "credit"},
    {"code": "1.2.02.094", "name": "Amortización acumulada rodados",            "type": "asset", "normal": "credit"},
    {"code": "1.2.02.095", "name": "Amortización acumulada muebles y útiles",   "type": "asset", "normal": "credit"},
    {"code": "1.2.02.096", "name": "Amortización acumulada equipos de computación","type": "asset", "normal": "credit"},

    # 1.2.03 Activos intangibles
    {"code": "1.2.03.001", "name": "Marcas y patentes",                         "type": "asset", "normal": "debit"},
    {"code": "1.2.03.002", "name": "Llave de negocio",                          "type": "asset", "normal": "debit"},
    {"code": "1.2.03.003", "name": "Software y licencias",                      "type": "asset", "normal": "debit"},
    {"code": "1.2.03.004", "name": "Gastos de organización y preoperativos",    "type": "asset", "normal": "debit"},
    {"code": "1.2.03.091", "name": "Amortización acumulada de intangibles",     "type": "asset", "normal": "credit"},

    # 1.2.04 Otros activos
    {"code": "1.2.04.001", "name": "Créditos fiscales no corrientes",           "type": "asset", "normal": "debit"},
    {"code": "1.2.04.002", "name": "Bienes de uso desafectados",                "type": "asset", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 2 — PASIVO
    # ══════════════════════════════════════════════════════════════

    # ── 2.1 Pasivo corriente ──────────────────────────────────────

    # 2.1.01 Deudas comerciales
    {"code": "2.1.01.001", "name": "Proveedores",                               "type": "liability", "normal": "credit"},
    {"code": "2.1.01.002", "name": "Proveedores moneda extranjera",             "type": "liability", "normal": "credit"},
    {"code": "2.1.01.003", "name": "Documentos a pagar",                        "type": "liability", "normal": "credit"},
    {"code": "2.1.01.004", "name": "Cheques de pago diferido emitidos",         "type": "liability", "normal": "credit"},
    {"code": "2.1.01.005", "name": "Acreedores varios",                         "type": "liability", "normal": "credit"},
    {"code": "2.1.01.006", "name": "Anticipos de clientes",                     "type": "liability", "normal": "credit"},

    # 2.1.02 Deudas fiscales — IVA
    {"code": "2.1.02.001", "name": "IVA débito fiscal",                         "type": "liability", "normal": "credit"},
    {"code": "2.1.02.002", "name": "IVA a pagar",                               "type": "liability", "normal": "credit"},
    {"code": "2.1.02.003", "name": "Impuesto a las Ganancias a pagar",          "type": "liability", "normal": "credit"},
    {"code": "2.1.02.004", "name": "Impuesto sobre los Ingresos Brutos a pagar","type": "liability", "normal": "credit"},
    {"code": "2.1.02.005", "name": "Impuesto a la Ganancia Mínima Presunta a pagar","type": "liability", "normal": "credit"},
    {"code": "2.1.02.006", "name": "Tasas y contribuciones municipales a pagar","type": "liability", "normal": "credit"},

    # 2.1.03 Retenciones y percepciones a depositar
    {"code": "2.1.03.001", "name": "Retenciones de IVA a depositar",            "type": "liability", "normal": "credit"},
    {"code": "2.1.03.002", "name": "Retenciones de Ganancias a depositar",      "type": "liability", "normal": "credit"},
    {"code": "2.1.03.003", "name": "Retenciones de Ingresos Brutos a depositar","type": "liability", "normal": "credit"},
    {"code": "2.1.03.004", "name": "Percepciones de IVA a depositar",           "type": "liability", "normal": "credit"},

    # 2.1.04 Deudas sociales y previsionales
    {"code": "2.1.04.001", "name": "Sueldos a pagar",                           "type": "liability", "normal": "credit"},
    {"code": "2.1.04.002", "name": "Sueldo anual complementario a pagar",       "type": "liability", "normal": "credit"},
    {"code": "2.1.04.003", "name": "Cargas sociales a pagar",                   "type": "liability", "normal": "credit"},
    {"code": "2.1.04.004", "name": "Contribuciones patronales a pagar",         "type": "liability", "normal": "credit"},
    {"code": "2.1.04.005", "name": "Aportes retenidos al personal a pagar",     "type": "liability", "normal": "credit"},
    {"code": "2.1.04.006", "name": "Sindicato a pagar",                         "type": "liability", "normal": "credit"},
    {"code": "2.1.04.007", "name": "ART a pagar",                               "type": "liability", "normal": "credit"},
    {"code": "2.1.04.008", "name": "Provisión para vacaciones",                 "type": "liability", "normal": "credit"},

    # 2.1.05 Deudas financieras corrientes
    {"code": "2.1.05.001", "name": "Préstamos bancarios a corto plazo",         "type": "liability", "normal": "credit"},
    {"code": "2.1.05.002", "name": "Adelantos en cuenta corriente",             "type": "liability", "normal": "credit"},
    {"code": "2.1.05.003", "name": "Intereses a pagar",                         "type": "liability", "normal": "credit"},
    {"code": "2.1.05.004", "name": "Tarjetas de crédito a pagar",               "type": "liability", "normal": "credit"},

    # 2.1.06 Otras deudas y previsiones corrientes
    {"code": "2.1.06.001", "name": "Acreedores varios corrientes",              "type": "liability", "normal": "credit"},
    {"code": "2.1.06.002", "name": "Dividendos a pagar",                        "type": "liability", "normal": "credit"},
    {"code": "2.1.06.003", "name": "Honorarios a pagar",                        "type": "liability", "normal": "credit"},
    {"code": "2.1.06.004", "name": "Previsión para juicios",                    "type": "liability", "normal": "credit"},

    # ── 2.2 Pasivo no corriente ───────────────────────────────────
    {"code": "2.2.01.001", "name": "Préstamos bancarios a largo plazo",         "type": "liability", "normal": "credit"},
    {"code": "2.2.01.002", "name": "Documentos a pagar a largo plazo",          "type": "liability", "normal": "credit"},
    {"code": "2.2.01.003", "name": "Obligaciones negociables",                  "type": "liability", "normal": "credit"},
    {"code": "2.2.01.004", "name": "Deudas comerciales a largo plazo",          "type": "liability", "normal": "credit"},
    {"code": "2.2.02.001", "name": "Deudas fiscales a largo plazo",             "type": "liability", "normal": "credit"},
    {"code": "2.2.03.001", "name": "Previsión para indemnizaciones",            "type": "liability", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 3 — PATRIMONIO NETO
    # ══════════════════════════════════════════════════════════════
    {"code": "3.1.01", "name": "Capital social",                                "type": "equity", "normal": "credit"},
    {"code": "3.1.02", "name": "Ajuste de capital",                             "type": "equity", "normal": "credit"},
    {"code": "3.1.03", "name": "Aportes irrevocables",                          "type": "equity", "normal": "credit"},
    {"code": "3.1.04", "name": "Acciones en circulación a integrar",            "type": "equity", "normal": "debit"},
    {"code": "3.2.01", "name": "Prima de emisión",                              "type": "equity", "normal": "credit"},
    {"code": "3.3.01", "name": "Reserva legal",                                 "type": "equity", "normal": "credit"},
    {"code": "3.3.02", "name": "Reserva facultativa",                           "type": "equity", "normal": "credit"},
    {"code": "3.3.03", "name": "Reserva estatutaria",                           "type": "equity", "normal": "credit"},
    {"code": "3.4.01", "name": "Resultados no asignados",                       "type": "equity", "normal": "credit"},
    {"code": "3.4.02", "name": "Resultados no asignados (pérdida acumulada)",   "type": "equity", "normal": "debit"},
    {"code": "3.4.03", "name": "Resultado del ejercicio",                       "type": "equity", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 4 — INGRESOS
    # ══════════════════════════════════════════════════════════════

    # 4.1 Ingresos por ventas
    {"code": "4.1.01", "name": "Ventas",                                        "type": "income", "normal": "credit"},
    {"code": "4.1.02", "name": "Ventas de servicios",                           "type": "income", "normal": "credit"},
    {"code": "4.1.03", "name": "Ventas al exterior (exportaciones)",            "type": "income", "normal": "credit"},
    {"code": "4.1.04", "name": "Devoluciones sobre ventas",                     "type": "income", "normal": "debit"},
    {"code": "4.1.05", "name": "Bonificaciones y descuentos sobre ventas",      "type": "income", "normal": "debit"},

    # 4.2 Otros ingresos
    {"code": "4.2.01", "name": "Intereses ganados",                             "type": "income", "normal": "credit"},
    {"code": "4.2.02", "name": "Diferencias de cambio positivas",               "type": "income", "normal": "credit"},
    {"code": "4.2.03", "name": "Bonificaciones obtenidas de proveedores",       "type": "income", "normal": "credit"},
    {"code": "4.2.04", "name": "Resultado por tenencia de bienes de cambio",    "type": "income", "normal": "credit"},
    {"code": "4.2.05", "name": "Recupero de deudores incobrables",              "type": "income", "normal": "credit"},
    {"code": "4.2.06", "name": "Resultado venta de bienes de uso",              "type": "income", "normal": "credit"},
    {"code": "4.2.99", "name": "Otros ingresos",                                "type": "income", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 5 — COSTOS Y GASTOS
    # ══════════════════════════════════════════════════════════════

    # 5.1 Costos
    {"code": "5.1.01", "name": "Costo de mercaderías vendidas",                 "type": "expense", "normal": "debit"},
    {"code": "5.1.02", "name": "Costo de productos vendidos",                   "type": "expense", "normal": "debit"},
    {"code": "5.1.03", "name": "Compras de mercaderías",                        "type": "expense", "normal": "debit"},
    {"code": "5.1.04", "name": "Compras de materias primas",                    "type": "expense", "normal": "debit"},
    {"code": "5.1.05", "name": "Fletes sobre compras",                          "type": "expense", "normal": "debit"},
    {"code": "5.1.06", "name": "Devoluciones sobre compras",                    "type": "expense", "normal": "credit"},
    {"code": "5.1.07", "name": "Bonificaciones sobre compras",                  "type": "expense", "normal": "credit"},

    # 5.2 Gastos de comercialización
    {"code": "5.2.01", "name": "Sueldos y jornales — comercialización",         "type": "expense", "normal": "debit"},
    {"code": "5.2.02", "name": "Cargas sociales — comercialización",            "type": "expense", "normal": "debit"},
    {"code": "5.2.03", "name": "Comisiones a vendedores",                       "type": "expense", "normal": "debit"},
    {"code": "5.2.04", "name": "Publicidad y propaganda",                       "type": "expense", "normal": "debit"},
    {"code": "5.2.05", "name": "Fletes y acarreos sobre ventas",                "type": "expense", "normal": "debit"},
    {"code": "5.2.06", "name": "Impuesto sobre los Ingresos Brutos",            "type": "expense", "normal": "debit"},
    {"code": "5.2.07", "name": "Impuesto a los débitos y créditos bancarios",   "type": "expense", "normal": "debit"},
    {"code": "5.2.08", "name": "Deudores incobrables",                          "type": "expense", "normal": "debit"},
    {"code": "5.2.09", "name": "Gastos de embalaje",                            "type": "expense", "normal": "debit"},

    # 5.3 Gastos de administración
    {"code": "5.3.01", "name": "Sueldos y jornales",                            "type": "expense", "normal": "debit"},
    {"code": "5.3.02", "name": "Cargas sociales",                               "type": "expense", "normal": "debit"},
    {"code": "5.3.03", "name": "Sueldo anual complementario",                   "type": "expense", "normal": "debit"},
    {"code": "5.3.04", "name": "Honorarios profesionales",                      "type": "expense", "normal": "debit"},
    {"code": "5.3.05", "name": "Honorarios directores y síndicos",              "type": "expense", "normal": "debit"},
    {"code": "5.3.06", "name": "Alquileres",                                    "type": "expense", "normal": "debit"},
    {"code": "5.3.07", "name": "Servicios públicos",                            "type": "expense", "normal": "debit"},
    {"code": "5.3.08", "name": "Teléfono e internet",                           "type": "expense", "normal": "debit"},
    {"code": "5.3.09", "name": "Papelería y útiles de oficina",                 "type": "expense", "normal": "debit"},
    {"code": "5.3.10", "name": "Seguros",                                       "type": "expense", "normal": "debit"},
    {"code": "5.3.11", "name": "Mantenimiento y reparaciones",                  "type": "expense", "normal": "debit"},
    {"code": "5.3.12", "name": "Limpieza y vigilancia",                         "type": "expense", "normal": "debit"},
    {"code": "5.3.13", "name": "Combustibles y lubricantes",                    "type": "expense", "normal": "debit"},
    {"code": "5.3.14", "name": "Movilidad y viáticos",                          "type": "expense", "normal": "debit"},
    {"code": "5.3.15", "name": "Gastos de representación",                      "type": "expense", "normal": "debit"},
    {"code": "5.3.16", "name": "Amortizaciones de bienes de uso",               "type": "expense", "normal": "debit"},
    {"code": "5.3.17", "name": "Amortizaciones de intangibles",                 "type": "expense", "normal": "debit"},
    {"code": "5.3.18", "name": "Tasas y contribuciones municipales",            "type": "expense", "normal": "debit"},
    {"code": "5.3.19", "name": "Impuestos diversos",                            "type": "expense", "normal": "debit"},
    {"code": "5.3.20", "name": "Servicios contratados a terceros",              "type": "expense", "normal": "debit"},
    {"code": "5.3.99", "name": "Gastos varios de administración",               "type": "expense", "normal": "debit"},

    # 5.4 Resultados financieros y por tenencia (egresos)
    {"code": "5.4.01", "name": "Intereses pagados",                             "type": "expense", "normal": "debit"},
    {"code": "5.4.02", "name": "Intereses por deudas comerciales",              "type": "expense", "normal": "debit"},
    {"code": "5.4.03", "name": "Gastos bancarios",                              "type": "expense", "normal": "debit"},
    {"code": "5.4.04", "name": "Comisiones financieras",                        "type": "expense", "normal": "debit"},
    {"code": "5.4.05", "name": "Diferencias de cambio negativas",               "type": "expense", "normal": "debit"},
    {"code": "5.4.06", "name": "Resultado por exposición a la inflación (RECPAM)","type": "expense", "normal": "debit"},

    # 5.5 Impuesto a las ganancias
    {"code": "5.5.01", "name": "Impuesto a las Ganancias",                      "type": "expense", "normal": "debit"},
]


# ── Mapeo categoría del registro → asiento (cuenta_debe, cuenta_haber) ────────
# Vocabulario de categorías COMPARTIDO con el resto de países (ver country/es).
# Permite que los módulos generen asientos sin conocer los códigos de cada país.
ENTRY_MAP = {
    # Venta: Deudores por ventas (debe) / Ventas (haber)
    ("ingreso", "Ventas"):    ("1.1.04.001", "4.1.01"),
    # Compra: Compras de mercaderías (debe) / Proveedores (haber)
    ("gasto",   "Compras"):   ("5.1.03", "2.1.01.001"),
    # Personal: Sueldos y jornales (debe) / Sueldos a pagar (haber)
    ("gasto",   "Personal"):  ("5.3.01", "2.1.04.001"),
    # Servicios: Honorarios profesionales (debe) / Acreedores varios (haber)
    ("gasto",   "Servicios"): ("5.3.04", "2.1.01.005"),
}

# Asiento por defecto si la categoría no está mapeada.
DEFAULT_GASTO   = ("5.3.99", "2.1.01.001")   # gastos varios de administración / proveedores
DEFAULT_INGRESO = ("1.1.04.001", "4.1.01")   # deudores por ventas / ventas


def get_entry_accounts(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in ENTRY_MAP:
        return ENTRY_MAP[key]
    return DEFAULT_GASTO if tipo == "gasto" else DEFAULT_INGRESO
