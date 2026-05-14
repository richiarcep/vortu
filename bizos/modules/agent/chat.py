import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from anthropic import Anthropic
from core.config import get_settings
from modules.accounting.journal import get_account_balance
from modules.core.prompt_loader import get_prompt
from services.vector.memory_sync import get_semantic_context

settings = get_settings()


def chat_with_agent(
    db: Session,
    company_id: int,
    message: str,
    conversation_history: list = None
) -> dict:
    """
    Main chat function. The owner asks anything about
    their business and Claude answers based on real data.
    """
    if conversation_history is None:
        conversation_history = []

    today = date.today()
    last_30 = today - timedelta(days=30)
    context = build_business_context(db, company_id, today, last_30)

    _base_prompt = get_prompt("agent_chat")

    # Busqueda semantica en memoria de la empresa
    semantic_context = get_semantic_context(company_id, message, n_results=5)

    system_prompt = f"""{_base_prompt}

DATOS ACTUALES DEL NEGOCIO (últimos 30 días):
{json.dumps(context, ensure_ascii=False, indent=2, default=str)}

MEMORIA SEMANTICA RELEVANTE:
{semantic_context if semantic_context else "Sin contexto previo relevante."}

Fecha actual: {today.strftime('%d/%m/%Y')}"""

    messages = conversation_history.copy()
    messages.append({"role": "user", "content": message})

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=messages
    )

    assistant_message = response.content[0].text
    messages.append({"role": "assistant", "content": assistant_message})

    return {
        "respuesta": assistant_message,
        "historial": messages,
        "contexto_usado": True
    }


def build_business_context(
    db: Session,
    company_id: int,
    today: date,
    since: date
) -> dict:
    ingresos_ventas = float(get_account_balance(
        db, "400", company_id, since, today
    ))
    ingresos_servicios = float(get_account_balance(
        db, "410", company_id, since, today
    ))
    total_ingresos = ingresos_ventas + ingresos_servicios

    gastos = {
        "nomina": float(get_account_balance(
            db, "500", company_id, since, today)),
        "alquiler": float(get_account_balance(
            db, "520", company_id, since, today)),
        "marketing": float(get_account_balance(
            db, "540", company_id, since, today)),
        "otros": float(get_account_balance(
            db, "590", company_id, since, today)),
    }
    total_gastos = sum(gastos.values())
    saldo_caja = float(get_account_balance(
        db, "100", company_id, None, today
    ))

    return {
        "periodo": {"desde": str(since), "hasta": str(today)},
        "ingresos": {
            "ventas": round(ingresos_ventas, 2),
            "servicios": round(ingresos_servicios, 2),
            "total": round(total_ingresos, 2)
        },
        "gastos": {
            "detalle": {k: round(v, 2) for k, v in gastos.items()},
            "total": round(total_gastos, 2)
        },
        "resultado_neto": round(total_ingresos - total_gastos, 2),
        "saldo_caja_actual": round(saldo_caja, 2),
        "margen_utilidad": round(
            (total_ingresos - total_gastos) / total_ingresos * 100, 1
        ) if total_ingresos > 0 else 0
    }