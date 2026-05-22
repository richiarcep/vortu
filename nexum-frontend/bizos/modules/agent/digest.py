import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from anthropic import Anthropic
from core.config import get_settings
from modules.accounting.journal import get_account_balance
from modules.accounting.statements import generate_pl_statement
from modules.agent.alerts import detect_anomalies

settings = get_settings()


def generate_weekly_digest(db: Session, company_id: int) -> dict:
    """
    Generates a complete weekly business digest.
    Called automatically every Monday or on demand.
    """
    today = date.today()
    week_start = today - timedelta(days=7)
    prev_week_start = today - timedelta(days=14)

    # ── Revenue this week vs last week ────────────────────────────────
    ingresos_semana = float(get_account_balance(
        db, "400", company_id, week_start, today
    )) + float(get_account_balance(
        db, "410", company_id, week_start, today
    ))

    ingresos_semana_anterior = float(get_account_balance(
        db, "400", company_id, prev_week_start, week_start
    )) + float(get_account_balance(
        db, "410", company_id, prev_week_start, week_start
    ))

    variacion_ingresos = 0
    if ingresos_semana_anterior > 0:
        variacion_ingresos = round(
            (ingresos_semana - ingresos_semana_anterior)
            / ingresos_semana_anterior * 100, 1
        )

    # ── Expenses this week ────────────────────────────────────────────
    gastos_semana = sum(
        float(get_account_balance(db, code, company_id, week_start, today))
        for code in ["500", "510", "520", "530", "540",
                     "550", "560", "570", "590", "595"]
    )

    # ── Net result ────────────────────────────────────────────────────
    resultado_semana = round(ingresos_semana - gastos_semana, 2)

    # ── Cash position ─────────────────────────────────────────────────
    saldo_caja = float(get_account_balance(
        db, "100", company_id, None, today
    ))

    # ── Anomalies ─────────────────────────────────────────────────────
    alertas = detect_anomalies(db, company_id)
    alertas_altas = [a for a in alertas if a["severidad"] == "alta"]
    alertas_medias = [a for a in alertas if a["severidad"] == "media"]

    # ── Build digest data ─────────────────────────────────────────────
    digest_data = {
        "periodo": {
            "inicio": str(week_start),
            "fin": str(today)
        },
        "ingresos": {
            "esta_semana": round(ingresos_semana, 2),
            "semana_anterior": round(ingresos_semana_anterior, 2),
            "variacion_porcentaje": variacion_ingresos,
            "tendencia": "positiva" if variacion_ingresos >= 0 else "negativa"
        },
        "gastos": {
            "esta_semana": round(gastos_semana, 2),
        },
        "resultado_neto": resultado_semana,
        "saldo_caja": round(saldo_caja, 2),
        "alertas": {
            "total": len(alertas),
            "alta_prioridad": len(alertas_altas),
            "media_prioridad": len(alertas_medias),
            "detalle": alertas
        },
        "es_semana_positiva": resultado_semana > 0
    }

    # ── AI narrative ──────────────────────────────────────────────────
    digest_data["resumen_ia"] = generate_digest_narrative(digest_data)
    digest_data["recomendaciones"] = generate_recommendations(digest_data)

    return digest_data


def generate_digest_narrative(data: dict) -> str:
    """Claude writes the weekly digest narrative in Spanish."""
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": f"""Eres el asistente de negocio de Nexum.
Escribe el resumen ejecutivo semanal para el dueño del negocio.
Máximo 4 oraciones. Tono directo y profesional en español.
Incluye los números clave. Destaca lo más importante.

Datos de la semana:
{json.dumps(data, ensure_ascii=False, indent=2, default=str)}

Solo el párrafo, sin títulos."""
        }]
    )
    return message.content[0].text


def generate_recommendations(data: dict) -> list:
    """Claude generates 3 specific recommendations for the week."""
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": f"""Eres el asistente de negocio de Nexum.
Basándote en estos datos semanales, genera exactamente 3 recomendaciones
específicas y accionables para el dueño del negocio esta semana.

Devuelve ÚNICAMENTE un array JSON con este formato:
[
    {{
        "prioridad": "alta",
        "accion": "descripción específica de la acción",
        "impacto": "qué mejora si se hace esto"
    }}
]

Datos:
{json.dumps(data, ensure_ascii=False, indent=2, default=str)}

Solo el JSON, sin explicaciones."""
        }]
    )

    try:
        return json.loads(message.content[0].text)
    except Exception:
        return []