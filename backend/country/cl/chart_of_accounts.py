"""
Chile — Plan de cuentas estándar (estilo NIIF / SII).
=====================================================
En Chile NO existe un plan de cuentas único legalmente obligatorio a nivel
nacional. Las empresas estructuran su catálogo siguiendo las Normas
Internacionales de Información Financiera (NIIF / IFRS) adoptadas por la CMF
y las prácticas habituales del Servicio de Impuestos Internos (SII).

Este catálogo recoge un esquema ESTÁNDAR ampliamente usado en Chile, con la
codificación clásica por dígitos (1 Activo, 2 Pasivo, 3 Patrimonio,
4 Ingresos, 5 Costos y gastos) y subniveles 1-1 Activo circulante,
1-2 Activo fijo, 2-1 Pasivo circulante, 2-2 Pasivo largo plazo, etc.

IVA general = 19% (IVA Crédito Fiscal en compras / IVA Débito Fiscal en ventas).

⚠️ VERIFICAR con contador: la codificación y denominación siguen una práctica
estándar consistente con NIIF y el SII, pero deben confirmarse y ajustarse a
la realidad de la empresa y a la normativa vigente antes de su uso contable y
tributario.

Saldo normal:
  debit  = saldo deudor  (activos, gastos, costos)
  credit = saldo acreedor (pasivos, patrimonio, ingresos)
"""

CHART_OF_ACCOUNTS = [

    # ══════════════════════════════════════════════════════════════
    # 1 — ACTIVO
    # ══════════════════════════════════════════════════════════════

    # ── 1-1 Activo circulante ──────────────────────────────────────
    # Disponible
    {"code": "1-1-01", "name": "Caja",                                      "type": "asset", "normal": "debit"},
    {"code": "1-1-01-01", "name": "Caja chica",                             "type": "asset", "normal": "debit"},
    {"code": "1-1-02", "name": "Banco cuenta corriente",                    "type": "asset", "normal": "debit"},
    {"code": "1-1-02-01", "name": "Banco moneda extranjera",                "type": "asset", "normal": "debit"},
    {"code": "1-1-02-02", "name": "Banco cuenta vista",                     "type": "asset", "normal": "debit"},
    {"code": "1-1-02-03", "name": "Valores por depositar",                  "type": "asset", "normal": "debit"},

    # Inversiones temporales
    {"code": "1-1-03", "name": "Depósitos a plazo",                         "type": "asset", "normal": "debit"},
    {"code": "1-1-03-01", "name": "Fondos mutuos",                          "type": "asset", "normal": "debit"},
    {"code": "1-1-03-02", "name": "Valores negociables",                    "type": "asset", "normal": "debit"},

    # Deudores comerciales y otras cuentas por cobrar
    {"code": "1-1-04", "name": "Clientes / Deudores por venta",             "type": "asset", "normal": "debit"},
    {"code": "1-1-04-01", "name": "Clientes extranjeros",                   "type": "asset", "normal": "debit"},
    {"code": "1-1-05", "name": "Documentos por cobrar",                     "type": "asset", "normal": "debit"},
    {"code": "1-1-06", "name": "Deudores varios",                           "type": "asset", "normal": "debit"},
    {"code": "1-1-07", "name": "Cuentas por cobrar a empresas relacionadas","type": "asset", "normal": "debit"},
    {"code": "1-1-08", "name": "Anticipo a proveedores",                    "type": "asset", "normal": "debit"},
    {"code": "1-1-09", "name": "Estimación deudores incobrables",           "type": "asset", "normal": "credit"},

    # Impuestos por recuperar
    {"code": "1-1-10", "name": "IVA Crédito Fiscal",                        "type": "asset", "normal": "debit"},
    {"code": "1-1-11", "name": "Remanente crédito fiscal",                  "type": "asset", "normal": "debit"},
    {"code": "1-1-12", "name": "PPM por recuperar",                         "type": "asset", "normal": "debit"},
    {"code": "1-1-13", "name": "Crédito Sence",                             "type": "asset", "normal": "debit"},
    {"code": "1-1-14", "name": "Impuesto renta por recuperar",             "type": "asset", "normal": "debit"},

    # Existencias
    {"code": "1-1-16", "name": "Existencias / Mercaderías",                 "type": "asset", "normal": "debit"},
    {"code": "1-1-16-01", "name": "Materias primas",                        "type": "asset", "normal": "debit"},
    {"code": "1-1-16-02", "name": "Productos en proceso",                   "type": "asset", "normal": "debit"},
    {"code": "1-1-16-03", "name": "Productos terminados",                   "type": "asset", "normal": "debit"},
    {"code": "1-1-16-04", "name": "Materiales y suministros",               "type": "asset", "normal": "debit"},
    {"code": "1-1-17", "name": "Estimación obsolescencia de existencias",   "type": "asset", "normal": "credit"},

    # Pagos anticipados
    {"code": "1-1-18", "name": "Gastos pagados por anticipado",             "type": "asset", "normal": "debit"},
    {"code": "1-1-18-01", "name": "Seguros pagados por anticipado",         "type": "asset", "normal": "debit"},

    # ── 1-2 Activo fijo (Propiedades, planta y equipo) ─────────────
    {"code": "1-2-01", "name": "Terrenos",                                  "type": "asset", "normal": "debit"},
    {"code": "1-2-02", "name": "Construcciones y edificios",                "type": "asset", "normal": "debit"},
    {"code": "1-2-03", "name": "Maquinarias y equipos",                     "type": "asset", "normal": "debit"},
    {"code": "1-2-04", "name": "Instalaciones",                             "type": "asset", "normal": "debit"},
    {"code": "1-2-05", "name": "Muebles y útiles",                          "type": "asset", "normal": "debit"},
    {"code": "1-2-06", "name": "Equipos computacionales",                   "type": "asset", "normal": "debit"},
    {"code": "1-2-07", "name": "Vehículos",                                 "type": "asset", "normal": "debit"},
    {"code": "1-2-08", "name": "Herramientas",                              "type": "asset", "normal": "debit"},
    {"code": "1-2-09", "name": "Obras en construcción",                     "type": "asset", "normal": "debit"},

    # Depreciación acumulada (contra-activo, saldo acreedor)
    {"code": "1-2-20", "name": "Depreciación acumulada construcciones y edificios", "type": "asset", "normal": "credit"},
    {"code": "1-2-21", "name": "Depreciación acumulada maquinarias y equipos",      "type": "asset", "normal": "credit"},
    {"code": "1-2-22", "name": "Depreciación acumulada instalaciones",      "type": "asset", "normal": "credit"},
    {"code": "1-2-23", "name": "Depreciación acumulada muebles y útiles",   "type": "asset", "normal": "credit"},
    {"code": "1-2-24", "name": "Depreciación acumulada equipos computacionales", "type": "asset", "normal": "credit"},
    {"code": "1-2-25", "name": "Depreciación acumulada vehículos",          "type": "asset", "normal": "credit"},

    # ── 1-3 Otros activos / Activo intangible y largo plazo ────────
    {"code": "1-3-01", "name": "Derechos de marca y patentes",              "type": "asset", "normal": "debit"},
    {"code": "1-3-02", "name": "Software y licencias",                      "type": "asset", "normal": "debit"},
    {"code": "1-3-03", "name": "Derechos de llave (goodwill)",              "type": "asset", "normal": "debit"},
    {"code": "1-3-04", "name": "Gastos de organización y puesta en marcha", "type": "asset", "normal": "debit"},
    {"code": "1-3-05", "name": "Amortización acumulada intangibles",        "type": "asset", "normal": "credit"},
    {"code": "1-3-06", "name": "Inversiones en empresas relacionadas",      "type": "asset", "normal": "debit"},
    {"code": "1-3-07", "name": "Documentos por cobrar largo plazo",         "type": "asset", "normal": "debit"},
    {"code": "1-3-08", "name": "Activo por impuesto diferido",              "type": "asset", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 2 — PASIVO
    # ══════════════════════════════════════════════════════════════

    # ── 2-1 Pasivo circulante ──────────────────────────────────────
    {"code": "2-1-01", "name": "Proveedores",                               "type": "liability", "normal": "credit"},
    {"code": "2-1-01-01", "name": "Proveedores extranjeros",                "type": "liability", "normal": "credit"},
    {"code": "2-1-02", "name": "Documentos por pagar",                      "type": "liability", "normal": "credit"},
    {"code": "2-1-02-01", "name": "Letras por pagar",                       "type": "liability", "normal": "credit"},
    {"code": "2-1-03", "name": "Acreedores varios",                         "type": "liability", "normal": "credit"},
    {"code": "2-1-04", "name": "Cuentas por pagar a empresas relacionadas", "type": "liability", "normal": "credit"},
    {"code": "2-1-05", "name": "Préstamos bancarios corto plazo",           "type": "liability", "normal": "credit"},
    {"code": "2-1-06", "name": "Obligaciones con bancos (líneas de crédito)","type": "liability", "normal": "credit"},
    {"code": "2-1-07", "name": "Anticipos de clientes",                     "type": "liability", "normal": "credit"},
    {"code": "2-1-08", "name": "Provisiones por pagar",                     "type": "liability", "normal": "credit"},
    {"code": "2-1-09", "name": "Dividendos por pagar",                      "type": "liability", "normal": "credit"},

    # Impuestos por pagar
    {"code": "2-1-10", "name": "IVA Débito Fiscal",                         "type": "liability", "normal": "credit"},
    {"code": "2-1-11", "name": "IVA por pagar",                             "type": "liability", "normal": "credit"},
    {"code": "2-1-12", "name": "PPM por pagar",                             "type": "liability", "normal": "credit"},
    {"code": "2-1-13", "name": "Impuesto a la renta por pagar",             "type": "liability", "normal": "credit"},
    {"code": "2-1-14", "name": "Impuesto único trabajadores por pagar",     "type": "liability", "normal": "credit"},
    {"code": "2-1-15", "name": "Retenciones de honorarios (2da categoría)", "type": "liability", "normal": "credit"},
    {"code": "2-1-16", "name": "Otras retenciones por pagar",               "type": "liability", "normal": "credit"},

    # Obligaciones laborales y previsionales
    {"code": "2-1-20", "name": "Remuneraciones por pagar",                  "type": "liability", "normal": "credit"},
    {"code": "2-1-21", "name": "Imposiciones previsionales por pagar",      "type": "liability", "normal": "credit"},
    {"code": "2-1-21-01", "name": "AFP por pagar",                          "type": "liability", "normal": "credit"},
    {"code": "2-1-21-02", "name": "Salud (Isapre / Fonasa) por pagar",      "type": "liability", "normal": "credit"},
    {"code": "2-1-21-03", "name": "Seguro de cesantía por pagar",           "type": "liability", "normal": "credit"},
    {"code": "2-1-22", "name": "Provisión vacaciones",                      "type": "liability", "normal": "credit"},
    {"code": "2-1-23", "name": "Provisión indemnización años de servicio",  "type": "liability", "normal": "credit"},
    {"code": "2-1-24", "name": "Descuentos al personal por pagar",          "type": "liability", "normal": "credit"},

    # Ingresos diferidos
    {"code": "2-1-30", "name": "Ingresos percibidos por adelantado",        "type": "liability", "normal": "credit"},

    # ── 2-2 Pasivo a largo plazo ───────────────────────────────────
    {"code": "2-2-01", "name": "Préstamos bancarios largo plazo",           "type": "liability", "normal": "credit"},
    {"code": "2-2-02", "name": "Obligaciones con el público (bonos)",       "type": "liability", "normal": "credit"},
    {"code": "2-2-03", "name": "Documentos por pagar largo plazo",          "type": "liability", "normal": "credit"},
    {"code": "2-2-04", "name": "Acreedores leasing largo plazo",            "type": "liability", "normal": "credit"},
    {"code": "2-2-05", "name": "Cuentas por pagar a relacionadas largo plazo","type": "liability", "normal": "credit"},
    {"code": "2-2-06", "name": "Provisión indemnización años de servicio LP","type": "liability", "normal": "credit"},
    {"code": "2-2-07", "name": "Pasivo por impuesto diferido",              "type": "liability", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 3 — PATRIMONIO
    # ══════════════════════════════════════════════════════════════
    {"code": "3-1-01", "name": "Capital",                                   "type": "equity", "normal": "credit"},
    {"code": "3-1-02", "name": "Capital pagado",                            "type": "equity", "normal": "credit"},
    {"code": "3-1-03", "name": "Aportes por capitalizar",                   "type": "equity", "normal": "credit"},
    {"code": "3-1-04", "name": "Revalorización capital propio",             "type": "equity", "normal": "credit"},
    {"code": "3-1-05", "name": "Reserva legal",                             "type": "equity", "normal": "credit"},
    {"code": "3-1-06", "name": "Otras reservas",                            "type": "equity", "normal": "credit"},
    {"code": "3-1-07", "name": "Sobreprecio en venta de acciones",          "type": "equity", "normal": "credit"},
    {"code": "3-1-08", "name": "Utilidades acumuladas",                     "type": "equity", "normal": "credit"},
    {"code": "3-1-09", "name": "Pérdidas acumuladas",                       "type": "equity", "normal": "debit"},
    {"code": "3-1-10", "name": "Resultado del ejercicio (utilidad)",        "type": "equity", "normal": "credit"},
    {"code": "3-1-11", "name": "Resultado del ejercicio (pérdida)",         "type": "equity", "normal": "debit"},
    {"code": "3-1-12", "name": "Dividendos provisorios",                    "type": "equity", "normal": "debit"},
    {"code": "3-1-13", "name": "Cuenta particular socios",                  "type": "equity", "normal": "debit"},

    # ══════════════════════════════════════════════════════════════
    # 4 — INGRESOS
    # ══════════════════════════════════════════════════════════════
    {"code": "4-1-01", "name": "Ventas",                                    "type": "income", "normal": "credit"},
    {"code": "4-1-01-01", "name": "Ventas afectas",                         "type": "income", "normal": "credit"},
    {"code": "4-1-01-02", "name": "Ventas exentas",                         "type": "income", "normal": "credit"},
    {"code": "4-1-01-03", "name": "Ventas de exportación",                  "type": "income", "normal": "credit"},
    {"code": "4-1-02", "name": "Ingresos por servicios",                    "type": "income", "normal": "credit"},
    {"code": "4-1-03", "name": "Devoluciones y rebajas sobre ventas",       "type": "income", "normal": "debit"},
    {"code": "4-1-04", "name": "Descuentos concedidos",                     "type": "income", "normal": "debit"},
    {"code": "4-2-01", "name": "Ingresos financieros",                      "type": "income", "normal": "credit"},
    {"code": "4-2-02", "name": "Intereses ganados",                         "type": "income", "normal": "credit"},
    {"code": "4-2-03", "name": "Diferencias de cambio (utilidad)",          "type": "income", "normal": "credit"},
    {"code": "4-2-04", "name": "Reajustes ganados",                         "type": "income", "normal": "credit"},
    {"code": "4-3-01", "name": "Otros ingresos fuera de explotación",       "type": "income", "normal": "credit"},
    {"code": "4-3-02", "name": "Utilidad en venta de activo fijo",          "type": "income", "normal": "credit"},
    {"code": "4-3-03", "name": "Arriendos percibidos",                      "type": "income", "normal": "credit"},

    # ══════════════════════════════════════════════════════════════
    # 5 — COSTOS Y GASTOS
    # ══════════════════════════════════════════════════════════════

    # ── 5-1 Costo de explotación ───────────────────────────────────
    {"code": "5-1-01", "name": "Costo de venta",                            "type": "expense", "normal": "debit"},
    {"code": "5-1-02", "name": "Compras",                                   "type": "expense", "normal": "debit"},
    {"code": "5-1-02-01", "name": "Compras de importación",                 "type": "expense", "normal": "debit"},
    {"code": "5-1-03", "name": "Devoluciones y rebajas sobre compras",      "type": "expense", "normal": "credit"},
    {"code": "5-1-04", "name": "Costo de servicios prestados",              "type": "expense", "normal": "debit"},
    {"code": "5-1-05", "name": "Fletes sobre compras",                      "type": "expense", "normal": "debit"},
    {"code": "5-1-06", "name": "Mano de obra directa",                      "type": "expense", "normal": "debit"},

    # ── 5-2 Gastos de administración y ventas (Personal) ───────────
    {"code": "5-2-01", "name": "Remuneraciones",                            "type": "expense", "normal": "debit"},
    {"code": "5-2-01-01", "name": "Sueldos",                                "type": "expense", "normal": "debit"},
    {"code": "5-2-01-02", "name": "Horas extras",                           "type": "expense", "normal": "debit"},
    {"code": "5-2-01-03", "name": "Gratificaciones",                        "type": "expense", "normal": "debit"},
    {"code": "5-2-02", "name": "Leyes sociales (aporte patronal)",          "type": "expense", "normal": "debit"},
    {"code": "5-2-03", "name": "Honorarios",                                "type": "expense", "normal": "debit"},
    {"code": "5-2-04", "name": "Indemnizaciones por años de servicio",      "type": "expense", "normal": "debit"},
    {"code": "5-2-05", "name": "Capacitación",                              "type": "expense", "normal": "debit"},
    {"code": "5-2-06", "name": "Viáticos y movilización",                   "type": "expense", "normal": "debit"},

    # Gastos generales
    {"code": "5-2-10", "name": "Arriendos",                                 "type": "expense", "normal": "debit"},
    {"code": "5-2-11", "name": "Gastos generales",                          "type": "expense", "normal": "debit"},
    {"code": "5-2-12", "name": "Servicios básicos (luz, agua, gas)",        "type": "expense", "normal": "debit"},
    {"code": "5-2-15", "name": "Teléfono e internet",                       "type": "expense", "normal": "debit"},
    {"code": "5-2-16", "name": "Correo y mensajería",                       "type": "expense", "normal": "debit"},
    {"code": "5-2-17", "name": "Materiales de oficina",                     "type": "expense", "normal": "debit"},
    {"code": "5-2-18", "name": "Aseo y mantención",                         "type": "expense", "normal": "debit"},
    {"code": "5-2-19", "name": "Reparaciones y mantenimiento",              "type": "expense", "normal": "debit"},
    {"code": "5-2-20", "name": "Publicidad y propaganda",                   "type": "expense", "normal": "debit"},
    {"code": "5-2-21", "name": "Fletes y traslados",                        "type": "expense", "normal": "debit"},
    {"code": "5-2-22", "name": "Combustibles y lubricantes",                "type": "expense", "normal": "debit"},
    {"code": "5-2-23", "name": "Seguros",                                   "type": "expense", "normal": "debit"},
    {"code": "5-2-24", "name": "Patentes y permisos municipales",           "type": "expense", "normal": "debit"},
    {"code": "5-2-25", "name": "Contribuciones de bienes raíces",           "type": "expense", "normal": "debit"},
    {"code": "5-2-26", "name": "Asesorías y servicios profesionales",       "type": "expense", "normal": "debit"},
    {"code": "5-2-27", "name": "Gastos legales y notariales",               "type": "expense", "normal": "debit"},
    {"code": "5-2-28", "name": "Gastos computacionales y software",         "type": "expense", "normal": "debit"},
    {"code": "5-2-29", "name": "Gastos de representación",                  "type": "expense", "normal": "debit"},
    {"code": "5-2-30", "name": "Depreciación del ejercicio",                "type": "expense", "normal": "debit"},
    {"code": "5-2-31", "name": "Amortización del ejercicio",                "type": "expense", "normal": "debit"},
    {"code": "5-2-32", "name": "Deudores incobrables (castigo)",            "type": "expense", "normal": "debit"},
    {"code": "5-2-33", "name": "Otros gastos generales",                    "type": "expense", "normal": "debit"},

    # ── 5-3 Gastos financieros y fuera de explotación ──────────────
    {"code": "5-3-01", "name": "Gastos financieros",                        "type": "expense", "normal": "debit"},
    {"code": "5-3-02", "name": "Intereses pagados",                         "type": "expense", "normal": "debit"},
    {"code": "5-3-03", "name": "Comisiones y gastos bancarios",             "type": "expense", "normal": "debit"},
    {"code": "5-3-05", "name": "Diferencias de cambio (pérdida)",           "type": "expense", "normal": "debit"},
    {"code": "5-3-06", "name": "Reajustes pagados",                         "type": "expense", "normal": "debit"},
    {"code": "5-3-07", "name": "Impuesto de timbres y estampillas",         "type": "expense", "normal": "debit"},
    {"code": "5-3-08", "name": "Pérdida en venta de activo fijo",           "type": "expense", "normal": "debit"},
    {"code": "5-3-09", "name": "Otros gastos fuera de explotación",         "type": "expense", "normal": "debit"},
    {"code": "5-4-01", "name": "Impuesto a la renta (gasto)",               "type": "expense", "normal": "debit"},
]


# ── Mapeo categoría del registro → asiento (cuenta_debe, cuenta_haber) ────────
# Vocabulario de categorías COMPARTIDO con el resto de países (ver country/es).
# Permite que los módulos generen asientos sin conocer los códigos de cada país.
ENTRY_MAP = {
    # Venta: clientes/deudores por venta (debe) / ventas (haber)
    ("ingreso", "Ventas"):    ("1-1-04", "4-1-01"),
    # Compra: compras/existencias (debe) / proveedores (haber)
    ("gasto",   "Compras"):   ("5-1-02", "2-1-01"),
    # Remuneraciones: remuneraciones (debe) / remuneraciones por pagar (haber)
    ("gasto",   "Personal"):  ("5-2-01", "2-1-20"),
    # Servicios: gastos generales (debe) / acreedores varios (haber)
    ("gasto",   "Servicios"): ("5-2-11", "2-1-03"),
}

# Asiento por defecto si la categoría no está mapeada.
DEFAULT_GASTO   = ("5-2-33", "2-1-01")   # otros gastos generales / proveedores
DEFAULT_INGRESO = ("1-1-04", "4-1-01")   # clientes / ventas


def get_entry_accounts(tipo: str, categoria: str):
    """Devuelve (cuenta_debe, cuenta_haber) para un registro dado."""
    key = (tipo, categoria)
    if key in ENTRY_MAP:
        return ENTRY_MAP[key]
    return DEFAULT_GASTO if tipo == "gasto" else DEFAULT_INGRESO
