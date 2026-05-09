from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from modules.accounting.ledger import get_account_summary, get_trial_balance
from modules.accounting.journal import get_account_balance
import anthropic
from core.config import get_settings

settings = get_settings()


def generate_pl_statement(db: Session, company_id: int,
                           start_date: date, end_date: date) -> dict:
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
    costos_personal = sum(
        v["balance"] for k, v in expense_accounts.items()
        if k in ["500", "510"]
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

    pl["analisis_ia"] = generate_pl_narrative(pl)
    return pl


def generate_balance_sheet(db: Session, company_id: int,
                            as_of_date: date) -> dict:
    """
    Genera un Balance General a una fecha específica.
    Activos = Pasivos + Patrimonio
    Esta es la ecuación contable fundamental.
    """
    summary = get_account_summary(db, company_id, end_date=as_of_date)
    accounts = summary["accounts"]
    totals = summary["totals"]

    # ── Activos ───────────────────────────────────────────────────────────────
    asset_accounts = accounts.get("assets", {})
    total_activos = totals.get("assets", 0)

    activos_corrientes = {k: v for k, v in asset_accounts.items()
                          if k in ["100", "110", "120", "130"]}
    activos_no_corrientes = {k: v for k, v in asset_accounts.items()
                              if k in ["140", "150"]}

    # ── Pasivos ───────────────────────────────────────────────────────────────
    liability_accounts = accounts.get("liabilities", {})
    total_pasivos = totals.get("liabilities", 0)

    pasivos_corrientes = {k: v for k, v in liability_accounts.items()
                          if k in ["200", "210", "220", "230", "240"]}
    pasivos_no_corrientes = {k: v for k, v in liability_accounts.items()
                              if k in ["250"]}

    # ── Patrimonio ────────────────────────────────────────────────────────────
    equity_accounts = accounts.get("equity", {})
    total_patrimonio = totals.get("equity", 0)
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

    balance["analisis_ia"] = generate_balance_sheet_narrative(balance)
    return balance


def generate_cash_flow_statement(db: Session, company_id: int,
                                  start_date: date, end_date: date) -> dict:
    """
    Genera un Estado de Flujo de Efectivo para un período.
    Muestra cómo se movió el efectivo a través del negocio.
    """
    # ── Actividades operativas ────────────────────────────────────────────────
    efectivo_ventas = float(get_account_balance(
        db, "100", company_id, start_date, end_date
    ))

    cuentas_gastos = ["500", "510", "520", "530", "540",
                      "550", "560", "570", "590", "595"]
    total_gastos_operativos = sum(
        float(get_account_balance(db, code, company_id, start_date, end_date))
        for code in cuentas_gastos
    )

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

    flujo["analisis_ia"] = generate_cash_flow_narrative(flujo)
    return flujo


def generate_full_report(db: Session, company_id: int,
                          start_date: date, end_date: date) -> dict:
    """
    Genera los tres estados financieros completos de una vez.
    Esta es la función principal que llama la API.
    """
    estado_resultados = generate_pl_statement(db, company_id, start_date, end_date)
    balance_general = generate_balance_sheet(db, company_id, end_date)
    flujo_efectivo = generate_cash_flow_statement(db, company_id, start_date, end_date)
    puntaje_salud = calculate_health_score(
        estado_resultados, balance_general, flujo_efectivo
    )

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

def generate_pl_narrative(pl_data: dict) -> str:
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"""Eres un contador profesional escribiendo un análisis del 
Estado de Resultados para el dueño de un negocio. Escribe 3-4 oraciones 
en español claro y directo explicando los resultados. Sé específico con 
los números. Destaca lo positivo y lo que requiere atención.

Datos del Estado de Resultados: {pl_data}

Escribe únicamente el párrafo narrativo, sin encabezados ni viñetas."""
            }]
        )
        return message.content[0].text
    except Exception:
        return "Análisis de IA no disponible."


def generate_balance_sheet_narrative(bs_data: dict) -> str:
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"""Eres un contador profesional escribiendo un análisis del 
Balance General para el dueño de un negocio. Escribe 3-4 oraciones en 
español claro explicando la posición financiera. Comenta sobre el balance 
de la ecuación contable, la razón de liquidez y los niveles de deuda.

Datos del Balance General: {bs_data}

Escribe únicamente el párrafo narrativo, sin encabezados ni viñetas."""
            }]
        )
        return message.content[0].text
    except Exception:
        return "Análisis de IA no disponible."


def generate_cash_flow_narrative(cf_data: dict) -> str:
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"""Eres un contador profesional escribiendo un análisis del 
Estado de Flujo de Efectivo para el dueño de un negocio. Escribe 3-4 
oraciones en español claro explicando cómo se movió el efectivo en el 
negocio. Comenta sobre las actividades operativas, de inversión y de 
financiamiento.

Datos del Flujo de Efectivo: {cf_data}

Escribe únicamente el párrafo narrativo, sin encabezados ni viñetas."""
            }]
        )
        return message.content[0].text
    except Exception:
        return "Análisis de IA no disponible."