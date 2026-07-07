from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from modules.accounting.ledger import get_account_summary, get_trial_balance
from modules.accounting.journal import get_account_balance
from core.config import get_settings
from vera.ask import ask          # punto único de IA (cuota + config admin)

settings = get_settings()


def generate_pl_statement(db: Session, company_id: int,
                           start_date: date, end_date: date, with_narrative: bool = True) -> dict:
    """
    Genera un Estado de Resultados completo para un período dado.
    Ingresos - Gastos = Utilidad/Pérdida Neta
    """
    summary = get_account_summary(db, company_id, start_date, end_date)
    accounts = summary["accounts"]
    totals = summary["totals"]

    # ── Ingresos ──────────────────────────────────────────────────────────────
    income_accounts = accounts.get("income", {})
    total_income = totals.get("income", 0)

    # ── Gastos ────────────────────────────────────────────────────────────────
    expense_accounts = accounts.get("expenses", {})
    total_expenses = totals.get("expenses", 0)

    # ── Cálculo de utilidad neta ───────────────────────────────────────────────
    utilidad_bruta = round(total_income - total_expenses, 2)
    margen_utilidad = round((utilidad_bruta / total_income * 100), 2) \
        if total_income > 0 else 0

    # ── Costos de personal ────────────────────────────────────────────────────
    # Gastos de personal = grupo 64 del PGC (640 Sueldos y salarios, 642 Seguridad
    # Social a cargo de la empresa, 641/643/644/645/649…). Antes filtraba por
    # ["500","510"], que en el PGC RD 1514/2007 NO son cuentas de gasto sino pasivos
    # (500 "Obligaciones y bonos a corto plazo", 510 "Deudas a corto plazo con
    # entidades de crédito vinculadas"), por lo que nunca aparecían en expense_accounts
    # y costos_personal salía siempre 0 → el EBITDA colapsaba a la utilidad neta.
    costos_personal = sum(
        v["balance"] for k, v in expense_accounts.items()
        if str(k).startswith("64")
    )
    gastos_operativos = total_expenses - costos_personal
    ebitda = round(total_income - gastos_operativos, 2)

    pl = {
        "periodo": {
            "inicio": str(start_date),
            "fin": str(end_date)
        },
        "ingresos": {
            "cuentas": {
                k: {"nombre": v["name"], "saldo": v["balance"]}
                for k, v in income_accounts.items()
            },
            "total_ingresos": total_income
        },
        "gastos": {
            "cuentas": {
                k: {"nombre": v["name"], "saldo": v["balance"]}
                for k, v in expense_accounts.items()
            },
            "total_gastos": total_expenses,
            "costos_personal": round(costos_personal, 2),
            "gastos_operativos": round(gastos_operativos, 2),
        },
        "utilidad_neta": utilidad_bruta,
        "margen_utilidad_porcentaje": margen_utilidad,
        "ebitda": ebitda,
        "es_rentable": utilidad_bruta > 0
    }

    if with_narrative:
        pl["analisis_ia"] = generate_pl_narrative(db, company_id, pl)
    return pl


# Palabras clave (es/multipaís) que marcan activos/pasivos NO corrientes (largo plazo).
_NON_CURRENT_ASSET_KW = (
    "inmovili", "propiedad", "planta", "terreno", "edificio", "construc",
    "maquinaria", "mobiliario", "equipo", "vehícul", "vehicul", "transporte",
    "intangible", "amortización acumulada", "amortizacion acumulada",
    "depreciación acumulada", "depreciacion acumulada", "activo fijo",
    "no corriente", "largo plazo", "inversiones permanentes", "marcas y patentes",
    "software", "fondo de comercio",
)
_NON_CURRENT_LIABILITY_KW = (
    "largo plazo", "no corriente", "hipotec", "long term",
    "deudas a largo", "créditos bancarios lp", "creditos bancarios lp",
)


def _is_non_current_asset(name: str) -> bool:
    n = (name or "").lower()
    return any(kw in n for kw in _NON_CURRENT_ASSET_KW)


def _is_non_current_liability(name: str) -> bool:
    n = (name or "").lower()
    return any(kw in n for kw in _NON_CURRENT_LIABILITY_KW)


def generate_balance_sheet(db: Session, company_id: int,
                            as_of_date: date, with_narrative: bool = True) -> dict:
    """
    Genera un Balance General a una fecha específica.
    Activos = Pasivos + Patrimonio
    Esta es la ecuación contable fundamental.
    """
    summary = get_account_summary(db, company_id, end_date=as_of_date)
    accounts = summary["accounts"]
    totals = summary["totals"]

    # ── Activos ───────────────────────────────────────────────────────────────
    # Clasifica corriente vs no corriente por el NOMBRE de la cuenta (agnóstico al
    # país / esquema de códigos). Antes filtraba por códigos PGC 3-dígitos fijos que
    # no existen en los catálogos oficiales → los desgloses salían vacíos.
    asset_accounts = accounts.get("assets", {})
    total_activos = totals.get("assets", 0)

    activos_no_corrientes = {k: v for k, v in asset_accounts.items()
                             if _is_non_current_asset(v.get("name", ""))}
    activos_corrientes = {k: v for k, v in asset_accounts.items()
                          if k not in activos_no_corrientes}

    # ── Pasivos ───────────────────────────────────────────────────────────────
    liability_accounts = accounts.get("liabilities", {})
    total_pasivos = totals.get("liabilities", 0)

    pasivos_no_corrientes = {k: v for k, v in liability_accounts.items()
                             if _is_non_current_liability(v.get("name", ""))}
    pasivos_corrientes = {k: v for k, v in liability_accounts.items()
                          if k not in pasivos_no_corrientes}

    # ── Patrimonio — calcular directo desde BD sin filtro de fecha ───────────
    from sqlalchemy import text as sql_text
    equity_rows = db.execute(sql_text("""
        SELECT a.code, a.name,
               COALESCE(SUM(je.credit)-SUM(je.debit), 0) as balance
        FROM accounts a
        LEFT JOIN journal_entries je ON je.account_id=a.id AND je.company_id=:cid
        WHERE a.account_type='equity'
        GROUP BY a.code, a.name
        HAVING COALESCE(SUM(je.credit)-SUM(je.debit), 0) != 0
    """), {"cid": company_id}).fetchall()
    equity_accounts = {r[0]: {"name": r[1], "balance": float(r[2])} for r in equity_rows}

    # Resultado acumulado del ejercicio (PGC 129). El beneficio/pérdida acumulado que aún
    # no se ha cerrado contra reservas pertenece al Patrimonio Neto. Sin esto el balance no
    # cuadra, porque los asientos importados no incluyen el asiento de cierre a capital.
    # Por la identidad de partida doble (Activo = Pasivo + Patrimonio + Resultado), añadirlo
    # cuadra la ecuación exactamente cuando el libro está balanceado.
    _res = db.execute(sql_text("""
        SELECT
          COALESCE(SUM(CASE WHEN a.account_type='income'  THEN je.credit - je.debit ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN a.account_type='expense' THEN je.debit  - je.credit ELSE 0 END), 0)
        FROM journal_entries je JOIN accounts a ON a.id = je.account_id
        WHERE je.company_id = :cid AND je.date <= :asof
    """), {"cid": company_id, "asof": str(as_of_date)}).first()
    resultado_ejercicio = round(float(_res[0] or 0) - float(_res[1] or 0), 2)
    if resultado_ejercicio != 0:
        equity_accounts["129"] = {"name": "Resultado del ejercicio", "balance": resultado_ejercicio}

    total_patrimonio = sum(v["balance"] for v in equity_accounts.values())
    total_pasivos_y_patrimonio = round(total_pasivos + total_patrimonio, 2)

    # ── Verificación ecuación contable ────────────────────────────────────────
    esta_balanceado = round(total_activos, 2) == round(total_pasivos_y_patrimonio, 2)
    diferencia = round(abs(total_activos - total_pasivos_y_patrimonio), 2)

    # ── Ratios financieros ────────────────────────────────────────────────────
    total_ac = sum(v["balance"] for v in activos_corrientes.values())
    total_pc = sum(v["balance"] for v in pasivos_corrientes.values())
    razon_corriente = round(total_ac / total_pc, 2) if total_pc > 0 else None
    razon_deuda_patrimonio = round(total_pasivos / total_patrimonio, 2) \
        if total_patrimonio > 0 else None

    balance = {
        "fecha": str(as_of_date),
        "activos": {
            "activos_corrientes": {
                k: {"nombre": v["name"], "saldo": v["balance"]}
                for k, v in activos_corrientes.items()
            },
            "activos_no_corrientes": {
                k: {"nombre": v["name"], "saldo": v["balance"]}
                for k, v in activos_no_corrientes.items()
            },
            "total_activos": round(total_activos, 2)
        },
        "pasivos": {
            "pasivos_corrientes": {
                k: {"nombre": v["name"], "saldo": v["balance"]}
                for k, v in pasivos_corrientes.items()
            },
            "pasivos_no_corrientes": {
                k: {"nombre": v["name"], "saldo": v["balance"]}
                for k, v in pasivos_no_corrientes.items()
            },
            "total_pasivos": round(total_pasivos, 2)
        },
        "patrimonio": {
            "cuentas": {
                k: {"nombre": v["name"], "saldo": v["balance"]}
                for k, v in equity_accounts.items()
            },
            "total_patrimonio": round(total_patrimonio, 2)
        },
        "total_pasivos_y_patrimonio": total_pasivos_y_patrimonio,
        "ecuacion_balanceada": esta_balanceado,
        "diferencia": diferencia,
        "ratios": {
            "razon_corriente": razon_corriente,
            "razon_deuda_patrimonio": razon_deuda_patrimonio,
        }
    }

    if with_narrative:
        balance["analisis_ia"] = generate_balance_sheet_narrative(db, company_id, balance)
    return balance


def generate_cash_flow_statement(db: Session, company_id: int,
                                  start_date: date, end_date: date, with_narrative: bool = True) -> dict:
    """
    Genera un Estado de Flujo de Efectivo para un período.
    Muestra cómo se movió el efectivo a través del negocio.
    """
    # ── Actividades operativas ────────────────────────────────────────────────
    # Derivado del libro mayor real (journal_entries) por account_type — portable
    # a todos los países. Modelo de caja: ventas = créditos netos a cuentas income,
    # gastos = débitos netos a cuentas expense.
    from sqlalchemy import text
    efectivo_ventas = float(db.execute(text("SELECT COALESCE(SUM(je.credit - je.debit),0) FROM journal_entries je JOIN accounts a ON a.id=je.account_id WHERE je.company_id=:cid AND a.account_type='income' AND je.date>=:ini AND je.date<=:fin"), {"cid": company_id, "ini": start_date, "fin": end_date}).scalar() or 0)

    total_gastos_operativos = float(db.execute(text("SELECT COALESCE(SUM(je.debit - je.credit),0) FROM journal_entries je JOIN accounts a ON a.id=je.account_id WHERE je.company_id=:cid AND a.account_type='expense' AND je.date>=:ini AND je.date<=:fin"), {"cid": company_id, "ini": start_date, "fin": end_date}).scalar() or 0)

    flujo_operativo_neto = round(efectivo_ventas - total_gastos_operativos, 2)

    # ── Actividades de inversión ──────────────────────────────────────────────
    activos_fijos = float(get_account_balance(
        db, "140", company_id, start_date, end_date
    ))
    flujo_inversion_neto = round(-activos_fijos, 2)

    # ── Actividades de financiamiento ─────────────────────────────────────────
    prestamos_corto = float(get_account_balance(
        db, "240", company_id, start_date, end_date
    ))
    prestamos_largo = float(get_account_balance(
        db, "250", company_id, start_date, end_date
    ))
    flujo_financiamiento_neto = round(prestamos_corto + prestamos_largo, 2)

    # ── Posición neta de efectivo ─────────────────────────────────────────────
    cambio_neto_efectivo = round(
        flujo_operativo_neto + flujo_inversion_neto + flujo_financiamiento_neto, 2
    )

    flujo = {
        "periodo": {
            "inicio": str(start_date),
            "fin": str(end_date)
        },
        "actividades_operativas": {
            "efectivo_recibido_ventas": efectivo_ventas,
            "pagos_gastos_operativos": total_gastos_operativos,
            "flujo_operativo_neto": flujo_operativo_neto
        },
        "actividades_inversion": {
            "compra_activos_fijos": activos_fijos,
            "flujo_inversion_neto": flujo_inversion_neto
        },
        "actividades_financiamiento": {
            "ingresos_prestamos": prestamos_corto + prestamos_largo,
            "flujo_financiamiento_neto": flujo_financiamiento_neto
        },
        "cambio_neto_efectivo": cambio_neto_efectivo,
        "posicion_efectivo": "positiva" if cambio_neto_efectivo > 0 else "negativa"
    }

    if with_narrative:
        flujo["analisis_ia"] = generate_cash_flow_narrative(db, company_id, flujo)
    return flujo


def _company_currency(db, company_id) -> str:
    try:
        from country.registry import get_country_info
        from models.user import Company
        co = db.query(Company).filter(Company.id == company_id).first()
        return ((get_country_info(co.country) if co and co.country else None) or {}).get("symbol", "€")
    except Exception:
        return "€"


def _attach_combined_narrative(db, company_id, pl, bs, cf) -> None:
    """UN solo llamado a la IA (vía Vera) para los 3 análisis — más rápido y barato que 3."""
    import json
    sym = _company_currency(db, company_id)
    prompt = f"""Analiza estos tres estados financieros de una empresa (moneda: {sym}).
Devuelve SOLO un JSON con tres análisis de 2-3 oraciones cada uno, en español claro:
{{"pl": "...", "balance": "...", "cashflow": "..."}}

ESTADO DE RESULTADOS: {pl}
BALANCE GENERAL: {bs}
FLUJO DE EFECTIVO: {cf}

Usa el símbolo de moneda {sym}. Sin markdown ni texto fuera del JSON."""
    raw = ask(db, company_id, module="contabilidad", system=_SYS_CONTADOR, user=prompt,
              max_tokens=900, quality="cheap", fallback="")
    pl_t = bs_t = cf_t = "Análisis de IA no disponible."
    if raw:
        t = raw.strip()
        if t.startswith("```"):
            t = t.split("\n", 1)[-1].rsplit("```", 1)[0]
        if "{" in t:
            t = t[t.find("{"):t.rfind("}") + 1]
        try:
            j = json.loads(t)
            pl_t = j.get("pl", pl_t); bs_t = j.get("balance", bs_t); cf_t = j.get("cashflow", cf_t)
        except Exception:
            pass
    pl["analisis_ia"] = pl_t
    bs["analisis_ia"] = bs_t
    cf["analisis_ia"] = cf_t


def generate_full_report(db: Session, company_id: int,
                          start_date: date, end_date: date) -> dict:
    """
    Genera los tres estados financieros completos de una vez.
    Esta es la función principal que llama la API.
    """
    # Estados SIN narrativa individual (rápido), luego UN solo llamado a la IA para los 3.
    estado_resultados = generate_pl_statement(db, company_id, start_date, end_date, with_narrative=False)
    balance_general = generate_balance_sheet(db, company_id, end_date, with_narrative=False)
    flujo_efectivo = generate_cash_flow_statement(db, company_id, start_date, end_date, with_narrative=False)
    puntaje_salud = calculate_health_score(
        estado_resultados, balance_general, flujo_efectivo
    )
    _attach_combined_narrative(db, company_id, estado_resultados, balance_general, flujo_efectivo)

    return {
        "periodo": {"inicio": str(start_date), "fin": str(end_date)},
        "estado_de_resultados": estado_resultados,
        "balance_general": balance_general,
        "flujo_de_efectivo": flujo_efectivo,
        "puntaje_salud_financiera": puntaje_salud,
        "generado_el": str(date.today())
    }


def calculate_health_score(pl: dict, balance_sheet: dict,
                            cash_flow: dict) -> dict:
    """
    Calcula un puntaje de salud financiera del 1 al 10.
    """
    score = 0
    factores = []

    # Rentabilidad — hasta 4 puntos
    if pl.get("es_rentable"):
        margen = pl.get("margen_utilidad_porcentaje", 0)
        if margen >= 20:
            score += 4
            factores.append("Excelente margen de utilidad superior al 20%")
        elif margen >= 10:
            score += 3
            factores.append("Buen margen de utilidad superior al 10%")
        elif margen >= 5:
            score += 2
            factores.append("Margen de utilidad moderado superior al 5%")
        else:
            score += 1
            factores.append("Margen de utilidad bajo — inferior al 5%")
    else:
        factores.append("El negocio no es rentable actualmente")

    # Liquidez — hasta 3 puntos
    razon_corriente = balance_sheet.get("ratios", {}).get("razon_corriente")
    if razon_corriente:
        if razon_corriente >= 2:
            score += 3
            factores.append("Excelente liquidez — razón corriente superior a 2")
        elif razon_corriente >= 1.5:
            score += 2
            factores.append("Buena liquidez — razón corriente superior a 1.5")
        elif razon_corriente >= 1:
            score += 1
            factores.append("Liquidez adecuada — razón corriente superior a 1")
        else:
            factores.append("Riesgo de liquidez — razón corriente inferior a 1")

    # Flujo de efectivo — hasta 3 puntos
    flujo_operativo = cash_flow.get("actividades_operativas", {}).get(
        "flujo_operativo_neto", 0
    )
    if flujo_operativo > 0:
        score += 3
        factores.append("Flujo de efectivo operativo positivo")
    elif flujo_operativo > -1000:
        score += 1
        factores.append("Flujo de efectivo operativo levemente negativo")
    else:
        factores.append("Flujo de efectivo operativo negativo — requiere atención")

    calificacion = get_rating(score)

    return {
        "puntaje": score,
        "puntaje_maximo": 10,
        "calificacion": calificacion,
        "factores": factores
    }


def get_rating(score: int) -> str:
    if score >= 9:
        return "Excelente"
    elif score >= 7:
        return "Bueno"
    elif score >= 5:
        return "Regular"
    elif score >= 3:
        return "Deficiente"
    else:
        return "Crítico"


# ── Narrativas con IA ─────────────────────────────────────────────────────────

_SYS_CONTADOR = "Eres un contador profesional que escribe análisis financieros claros y directos en español."


def generate_pl_narrative(db, company_id, pl_data: dict) -> str:
    prompt = f"""Análisis del Estado de Resultados para el dueño de un negocio.
Escribe 3-4 oraciones en español claro y directo explicando los resultados.
Sé específico con los números. Destaca lo positivo y lo que requiere atención.

Datos del Estado de Resultados: {pl_data}

Escribe únicamente el párrafo narrativo, sin encabezados ni viñetas."""
    return ask(db, company_id, module="contabilidad", system=_SYS_CONTADOR, user=prompt,
               max_tokens=512, quality="cheap", fallback="Análisis de IA no disponible.")


def generate_balance_sheet_narrative(db, company_id, bs_data: dict) -> str:
    prompt = f"""Análisis del Balance General para el dueño de un negocio.
Escribe 3-4 oraciones en español claro explicando la posición financiera.
Comenta sobre el balance de la ecuación contable, la razón de liquidez y los niveles de deuda.

Datos del Balance General: {bs_data}

Escribe únicamente el párrafo narrativo, sin encabezados ni viñetas."""
    return ask(db, company_id, module="contabilidad", system=_SYS_CONTADOR, user=prompt,
               max_tokens=512, quality="cheap", fallback="Análisis de IA no disponible.")


def generate_cash_flow_narrative(db, company_id, cf_data: dict) -> str:
    prompt = f"""Análisis del Estado de Flujo de Efectivo para el dueño de un negocio.
Escribe 3-4 oraciones en español claro explicando cómo se movió el efectivo en el negocio.
Comenta sobre las actividades operativas, de inversión y de financiamiento.

Datos del Flujo de Efectivo: {cf_data}

Escribe únicamente el párrafo narrativo, sin encabezados ni viñetas."""
    return ask(db, company_id, module="contabilidad", system=_SYS_CONTADOR, user=prompt,
               max_tokens=512, quality="cheap", fallback="Análisis de IA no disponible.")

def generate_full_report_from_registro(db, company_id, start_date, end_date):
    from sqlalchemy import text
    from datetime import date as date_type
    # Currency symbol from the company's country (was hardcoded "EUR").
    from country.registry import get_country_info
    from models.user import Company
    _co = db.query(Company).filter(Company.id == company_id).first()
    sym = ((get_country_info(_co.country) if _co and _co.country else None) or {}).get("symbol", "€")

    ingresos = float(db.execute(text(
        "SELECT COALESCE(SUM(monto),0) FROM registro_diario WHERE company_id=:cid AND tipo='ingreso' AND fecha BETWEEN :ini AND :fin"
    ), {"cid": company_id, "ini": start_date, "fin": end_date}).scalar() or 0)

    gastos = float(db.execute(text(
        "SELECT COALESCE(SUM(monto),0) FROM registro_diario WHERE company_id=:cid AND tipo='gasto' AND fecha BETWEEN :ini AND :fin"
    ), {"cid": company_id, "ini": start_date, "fin": end_date}).scalar() or 0)

    utilidad = round(ingresos - gastos, 2)
    margen = round(utilidad / ingresos * 100, 1) if ingresos > 0 else 0

    cats = db.execute(text(
        "SELECT categoria, tipo, COALESCE(SUM(monto),0) FROM registro_diario WHERE company_id=:cid AND fecha BETWEEN :ini AND :fin GROUP BY categoria, tipo"
    ), {"cid": company_id, "ini": start_date, "fin": end_date}).fetchall()

    ingresos_detalle = {r[0]: r[2] for r in cats if r[1] == 'ingreso'}
    gastos_detalle = {r[0]: r[2] for r in cats if r[1] == 'gasto'}

    if margen >= 20: score = 8
    elif margen >= 10: score = 6
    elif margen >= 0: score = 4
    else: score = 2

    return {
        "periodo": {"inicio": str(start_date), "fin": str(end_date)},
        "estado_de_resultados": {
            "periodo": {"inicio": str(start_date), "fin": str(end_date)},
            "ingresos": {"cuentas": ingresos_detalle, "total_ingresos": ingresos},
            "gastos": {"cuentas": gastos_detalle, "total_gastos": gastos, "costos_personal": 0, "gastos_operativos": gastos},
            "utilidad_neta": utilidad,
            "margen_utilidad_porcentaje": margen,
            "ebitda": utilidad,
            "es_rentable": utilidad > 0,
            "analisis_ia": f"Durante el periodo analizado, la empresa registró ingresos de {sym}{ingresos:,.2f} y gastos de {sym}{gastos:,.2f}, con un resultado neto de {sym}{utilidad:,.2f} y un margen del {margen}%."
        },
        "balance_general": {
            "fecha": str(end_date),
            "activos": {"activos_corrientes": {"efectivo": utilidad}, "total_activos": max(utilidad, 0)},
            "pasivos": {"total_pasivos": 0},
            "patrimonio": {"total_patrimonio": max(utilidad, 0)},
            "ratios": {"razon_corriente": 2.0 if utilidad > 0 else 0.5},
            "ecuacion_balanceada": True,
            "analisis_ia": "Balance generado desde registro diario."
        },
        "flujo_de_efectivo": {
            "periodo": {"inicio": str(start_date), "fin": str(end_date)},
            "actividades_operativas": {"flujo_operativo_neto": utilidad},
            "flujo_neto_total": utilidad,
            "analisis_ia": f"Flujo operativo neto: {sym}{utilidad:,.2f}"
        },
        "puntaje_salud_financiera": {
            "puntaje": score,
            "puntaje_maximo": 10,
            "calificacion": "Excelente" if score >= 8 else "Bueno" if score >= 6 else "Regular",
            "factores": [f"Margen {margen}%", f"Ingresos {sym}{ingresos:,.0f}", f"Gastos {sym}{gastos:,.0f}"]
        },
        "generado_el": str(date_type.today())
    }
