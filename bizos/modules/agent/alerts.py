import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from anthropic import Anthropic
from core.config import get_settings
from modules.accounting.journal import (
    get_account_balance, JournalEntry, Account
)

settings = get_settings()


def detect_anomalies(db: Session, company_id: int) -> list:
    """
    Scans the last 30 days of transactions and detects
    unusual patterns automatically. Returns a list of alerts.
    """
    alerts = []
    today = date.today()
    last_30 = today - timedelta(days=30)
    last_7 = today - timedelta(days=7)
    prev_7 = today - timedelta(days=14)

    # ── Check 1: Revenue drop ─────────────────────────────────────────
    revenue_this_week = float(get_account_balance(
        db, "400", company_id, last_7, today
    )) + float(get_account_balance(
        db, "410", company_id, last_7, today
    ))

    revenue_prev_week = float(get_account_balance(
        db, "400", company_id, prev_7, last_7
    )) + float(get_account_balance(
        db, "410", company_id, prev_7, last_7
    ))

    if revenue_prev_week > 0:
        revenue_change = (
            (revenue_this_week - revenue_prev_week) / revenue_prev_week * 100
        )
        if revenue_change < -20:
            alerts.append({
                "tipo": "caida_ingresos",
                "severidad": "alta",
                "titulo": "Caída significativa en ingresos",
                "descripcion": (
                    f"Los ingresos de esta semana (€{revenue_this_week:,.2f}) "
                    f"son un {abs(revenue_change):.1f}% menores que la semana "
                    f"anterior (€{revenue_prev_week:,.2f})."
                ),
                "accion": "Revisa las ventas de los últimos 7 días y "
                          "verifica si hay algún problema operativo."
            })

    # ── Check 2: High expenses ────────────────────────────────────────
    total_expenses = sum(
        float(get_account_balance(db, code, company_id, last_7, today))
        for code in ["500", "510", "520", "530", "540",
                     "550", "560", "570", "590", "595"]
    )

    if revenue_this_week > 0:
        expense_ratio = total_expenses / revenue_this_week * 100
        if expense_ratio > 80:
            alerts.append({
                "tipo": "gastos_elevados",
                "severidad": "media",
                "titulo": "Gastos muy elevados en relación a ingresos",
                "descripcion": (
                    f"Esta semana los gastos representan el "
                    f"{expense_ratio:.1f}% de los ingresos. "
                    f"Lo saludable es mantenerlos por debajo del 70%."
                ),
                "accion": "Revisa las categorías de gasto más altas "
                          "e identifica dónde se puede reducir."
            })

    # ── Check 3: Cash flow warning ────────────────────────────────────
    cash_balance = float(get_account_balance(
        db, "100", company_id, None, today
    ))

    if cash_balance < 1000:
        alerts.append({
            "tipo": "flujo_efectivo",
            "severidad": "alta",
            "titulo": "Saldo de caja bajo",
            "descripcion": (
                f"El saldo actual de caja es €{cash_balance:,.2f}. "
                f"Un saldo bajo puede afectar la capacidad de pago."
            ),
            "accion": "Revisa las cuentas por cobrar pendientes "
                      "y considera acelerar los cobros."
        })

    # ── Check 4: No activity warning ─────────────────────────────────
    recent_entries = db.query(JournalEntry).filter(
        JournalEntry.company_id == company_id,
        JournalEntry.date >= last_7
    ).count()

    if recent_entries == 0:
        alerts.append({
            "tipo": "sin_actividad",
            "severidad": "baja",
            "titulo": "Sin actividad registrada esta semana",
            "descripcion": (
                "No se han registrado transacciones en los últimos 7 días. "
                "Asegúrate de mantener el registro actualizado."
            ),
            "accion": "Registra los ingresos y gastos de la semana "
                      "o sube el cierre de caja diario."
        })

    # ── Check 5: Unusual single transaction ───────────────────────────
    entries = db.query(JournalEntry).filter(
        JournalEntry.company_id == company_id,
        JournalEntry.date >= last_7
    ).all()

    amounts = [float(e.debit) for e in entries if float(e.debit) > 0]
    if amounts:
        avg = sum(amounts) / len(amounts)
        for entry in entries:
            amount = float(entry.debit)
            if amount > avg * 3 and amount > 1000:
                alerts.append({
                    "tipo": "transaccion_inusual",
                    "severidad": "media",
                    "titulo": "Transacción inusualmente alta detectada",
                    "descripcion": (
                        f"Se detectó una transacción de €{amount:,.2f} "
                        f"el {entry.date}, que es "
                        f"{amount/avg:.1f}x mayor que el promedio "
                        f"(€{avg:,.2f})."
                    ),
                    "accion": "Verifica que esta transacción es correcta "
                              "y no es un error de registro."
                })
                break

    return alerts


def get_ai_alert_analysis(alerts: list, company_id: int) -> str:
    """
    Sends detected alerts to Claude for a combined
    narrative analysis and prioritized action plan.
    """
    if not alerts:
        return (
            "No se detectaron anomalías significativas. "
            "El negocio opera dentro de parámetros normales."
        )

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    alerts_text = json.dumps(alerts, ensure_ascii=False, indent=2)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": f"""Eres el asistente financiero de Nexum. 
Analiza estas alertas detectadas automáticamente en el negocio 
y escribe un párrafo ejecutivo en español que:
1. Resuma la situación general del negocio
2. Priorice las alertas más urgentes
3. Sugiera las 2-3 acciones más importantes a tomar hoy

Sé directo y específico. Usa un tono profesional pero accesible.

Alertas detectadas:
{alerts_text}

Escribe solo el párrafo, sin encabezados."""
        }]
    )

    return message.content[0].text