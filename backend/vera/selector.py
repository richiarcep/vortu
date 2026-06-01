"""
Selector híbrido: reglas determinísticas primero, IA si hay duda.
Decide qué modelo usar y qué APIs externas activar.
"""
import anthropic
from typing import Literal
from core.config import get_settings

settings = get_settings()

Plan = Literal["base", "plus"]


PALABRAS_EXTERNAS = {
    "buscar", "busca", "buscame", "encuentra", "encuentrame",
    "mercado", "competencia", "competidores", "competidor",
    "precio", "precios", "cotizacion", "cotización",
    "noticia", "noticias", "actualidad", "actual", "hoy",
    "tendencia", "tendencias", "novedad", "novedades",
    "google", "internet", "web", "online",
    "investiga", "investigame", "averigua", "averíguame",
}

PALABRAS_TRIVIALES = {
    "hola", "buenas", "gracias", "ok", "vale", "perfecto",
    "adios", "adiós", "chao", "hasta luego",
}


def decidir_apis_externas(mensaje: str, plan: Plan = "base") -> dict:
    """
    Devuelve {'usar_apis': bool, 'apis_activas': [lista], 'razon': str}
    
    1. Reglas rápidas (palabras clave)
    2. Si no es claro, pregunta a Haiku
    """
    msg_lower = mensaje.lower()
    palabras = set(msg_lower.split())

    if palabras & PALABRAS_TRIVIALES and len(mensaje) < 30:
        return {
            "usar_apis": False,
            "apis_activas": [],
            "razon": "trivial",
        }

    if palabras & PALABRAS_EXTERNAS:
        apis = _apis_segun_plan(plan)
        return {
            "usar_apis": True,
            "apis_activas": apis,
            "razon": "regla_keyword",
        }

    decision_ia = _preguntar_haiku(mensaje)
    if decision_ia:
        apis = _apis_segun_plan(plan)
        return {
            "usar_apis": True,
            "apis_activas": apis,
            "razon": "ia_haiku",
        }

    return {
        "usar_apis": False,
        "apis_activas": [],
        "razon": "interno",
    }


def _apis_segun_plan(plan: Plan) -> list:
    """Pack base vs Plus."""
    if plan == "plus":
        return ["perplexity", "openai", "google_search"]
    return ["perplexity"]


def _preguntar_haiku(mensaje: str) -> bool:
    """
    Pregunta rápida a Haiku 4.5: ¿esta consulta necesita datos externos?
    Coste mínimo (~$0.001 por llamada).
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{
                "role": "user",
                "content": (
                    f"¿Esta pregunta de un dueño de negocio necesita datos "
                    f"externos de internet (mercado, competencia, noticias, "
                    f"precios actuales) o se puede responder solo con sus "
                    f"propios datos internos? Responde SOLO 'externo' o 'interno'.\n\n"
                    f"Pregunta: {mensaje}"
                )
            }]
        )
        respuesta = resp.content[0].text.strip().lower()
        return "externo" in respuesta
    except Exception:
        return False
