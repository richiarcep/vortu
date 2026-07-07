"""
Engine de Vera — el orquestador central.

Cada petición pasa por aquí:
1. Construye contexto (SQL + Chroma + Neo4j)
2. Decide si necesita APIs externas
3. Llama UNA vez a Sonnet 4.6 con todo consolidado
4. Guarda la conversación en Chroma
"""
import json
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from anthropic import Anthropic
from core.config import get_settings
from vera.context import construir_contexto
from vera.selector import decidir_apis_externas
from vera.apis import ejecutar_apis
from services.vector.store import vector_store, COLLECTIONS

settings = get_settings()

MODELO_VERA = "claude-sonnet-4-6"


def vera_chat(
    db: Session,
    company_id: int,
    mensaje: str,
    plan: str = "base",
    modulo: Optional[str] = None,
    historial: Optional[list] = None,
) -> dict:
    """
    Punto de entrada principal de Vera.
    
    Args:
        db: sesión SQLAlchemy
        company_id: empresa que pregunta
        mensaje: texto del usuario o del módulo
        plan: 'base' o 'plus'
        modulo: opcional, qué módulo está llamando (finance, hr, etc)
        historial: conversación previa
    
    Returns:
        {respuesta, historial, metadata: {apis_usadas, modelo, razon_apis}}
    """
    if historial is None:
        historial = []

    contexto_interno = construir_contexto(db, company_id, mensaje, modulo)

    decision = decidir_apis_externas(mensaje, plan)
    contexto_externo = ""
    if decision["usar_apis"]:
        contexto_externo = ejecutar_apis(decision["apis_activas"], mensaje)

    system_prompt = _construir_system_prompt(
        contexto_interno=contexto_interno,
        contexto_externo=contexto_externo,
        modulo=modulo,
    )

    messages = historial.copy()
    messages.append({"role": "user", "content": mensaje})

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=90.0)
    response = client.messages.create(
        model=MODELO_VERA,
        max_tokens=2048,
        system=system_prompt,
        messages=messages,
    )

    respuesta = response.content[0].text
    messages.append({"role": "assistant", "content": respuesta})

    _guardar_en_memoria(company_id, mensaje, respuesta, modulo)

    return {
        "respuesta": respuesta,
        "historial": messages,
        "metadata": {
            "modelo": MODELO_VERA,
            "plan": plan,
            "modulo": modulo,
            "apis_usadas": decision["apis_activas"],
            "razon_apis": decision["razon"],
            "tokens_input": response.usage.input_tokens,
            "tokens_output": response.usage.output_tokens,
        },
    }


def vera_analyze(
    db: Session,
    company_id: int,
    datos: dict,
    modulo: str,
    plan: str = "base",
) -> dict:
    """
    Análisis estructurado de datos de un módulo.
    Devuelve JSON parseado en vez de texto conversacional.
    """
    mensaje = (
        f"Analiza estos datos del módulo {modulo} y devuelve un JSON estructurado "
        f"con: resumen, hallazgos clave, anomalías, recomendaciones, salud (1-10).\n\n"
        f"Datos:\n{json.dumps(datos, ensure_ascii=False, indent=2, default=str)}\n\n"
        f"Responde SOLO el JSON, sin markdown ni explicación."
    )

    result = vera_chat(
        db=db,
        company_id=company_id,
        mensaje=mensaje,
        plan=plan,
        modulo=modulo,
    )

    try:
        analisis = json.loads(result["respuesta"])
    except json.JSONDecodeError:
        analisis = {"raw": result["respuesta"], "error": "no_json"}

    return {
        "analisis": analisis,
        "metadata": result["metadata"],
    }


def _construir_system_prompt(
    contexto_interno: str,
    contexto_externo: str,
    modulo: Optional[str],
) -> str:
    """Prompt unificado de Vera."""
    rol_modulo = f"Estás respondiendo desde el módulo: {modulo}." if modulo else ""

    return f"""Eres Vera, la IA central de Vela — el sistema operativo de negocio.
Eres directa, precisa y útil. Hablas en español neutro.
Te basas EXCLUSIVAMENTE en los datos que se te proporcionan abajo.
Si no tienes datos suficientes, dilo claramente.

{rol_modulo}

Fecha actual: {date.today().strftime('%d/%m/%Y')}

═══════════════════════════════════════
CONTEXTO INTERNO (datos de la empresa)
═══════════════════════════════════════
{contexto_interno}

{contexto_externo if contexto_externo else ""}
"""


def _guardar_en_memoria(
    company_id: int,
    pregunta: str,
    respuesta: str,
    modulo: Optional[str],
) -> None:
    """Guarda la interacción en Chroma para memoria futura."""
    try:
        collection = COLLECTIONS["memory"]
        from datetime import datetime
        doc_id = f"vera_{company_id}_{datetime.utcnow().isoformat()}"
        texto = f"P: {pregunta}\nR: {respuesta}"
        metadata = {
            "company_id": str(company_id),
            "tipo": "vera_chat",
            "modulo": modulo or "general",
            "fecha": datetime.utcnow().isoformat(),
        }
        vector_store.upsert(collection, doc_id, texto, metadata)
    except Exception:
        pass
