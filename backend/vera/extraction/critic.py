"""AdversarialCritic — assumes the extraction is WRONG and hunts for specific errors.

Gated (cost): only run on uncertain/high-value docs. Returns the fields it suspects;
the orchestrator then sends ONLY those to the RepairEngine. This is the "attack weak
answers" layer — evidence must survive an adversary before it's accepted.
"""
import logging

from vera.llm_base import LLMRequest
from vera.llm_router import LLMFactory
from vera.quota_manager import record_usage
from vera.extraction.cheap_extractor import _parse_json

logger = logging.getLogger("vera.extraction.critic")

CRITIC_SYSTEM = (
    "Eres un AUDITOR ADVERSARIO de extracción de documentos. PARTE DE LA BASE DE QUE LA "
    "EXTRACCIÓN ESTÁ MAL. Mira el documento adjunto y busca activamente errores en los "
    "valores propuestos. Presta especial atención a estas confusiones típicas:\n"
    "- fecha del documento vs fecha de vencimiento\n"
    "- base imponible vs total (subtotal vs total)\n"
    "- cliente vs proveedor (emisor vs receptor)\n"
    "- importes con el signo o los decimales equivocados\n"
    "- valores inventados que NO aparecen en el documento (alucinaciones)\n"
    "- etiquetas/campos cruzados\n\n"
    "Devuelve SOLO JSON:\n"
    "{\"suspect_fields\": [{\"field_key\": \"...\", \"current_value\": \"...\", "
    "\"problem\": \"...\", \"likely_correct\": \"... o null\"}], \"verdict\": \"ok|issues\"}\n"
    "Si tras mirar con atención todo es correcto, devuelve suspect_fields vacío y verdict 'ok'. "
    "No inventes problemas que no existan."
)


def critique(db, company_id: int, template: dict, encab: dict, provider: str,
             images: list = None) -> dict:
    """Returns {suspect_field_keys: [...], issues: [...], cost, tokens}."""
    images = images or []
    # Present the current values for the encabezado fields the template cares about.
    field_lines = []
    for f in template["fields"]:
        if f["section"] != "encabezado":
            continue
        field_lines.append(f"- {f['field_key']} ({f['field_type']}): '{encab.get(f['field_key'])}'")
    user = "VALORES EXTRAÍDOS A AUDITAR:\n" + "\n".join(field_lines)
    if not images:
        user += "\n\n(No hay imagen; razona sobre coherencia interna de los valores.)"

    factory = LLMFactory(db)
    client = factory.get(provider) or factory.get("claude")
    if client is None:
        return {"suspect_field_keys": [], "issues": [], "cost": 0.0, "tokens": 0}

    req = LLMRequest(system_prompt=CRITIC_SYSTEM, user_message=user, max_tokens=1200,
                     temperature=0.1, images=images)
    resp = client.generate(req)
    try:
        record_usage(db, company_id, resp.provider, resp.tokens_input, resp.tokens_output)
    except Exception:
        pass

    parsed = _parse_json(resp.text) or {}
    suspects = parsed.get("suspect_fields", []) or []
    valid_keys = {f["field_key"] for f in template["fields"] if f["section"] == "encabezado"}
    suspect_keys = [s.get("field_key") for s in suspects
                    if s.get("field_key") in valid_keys]
    return {
        "suspect_field_keys": suspect_keys,
        "issues": suspects,
        "verdict": parsed.get("verdict", "ok"),
        "cost": resp.cost_estimated or 0.0,
        "tokens": (resp.tokens_input or 0) + (resp.tokens_output or 0),
        "provider": resp.provider,
        "tokens_in": resp.tokens_input or 0,
        "tokens_out": resp.tokens_output or 0,
    }
