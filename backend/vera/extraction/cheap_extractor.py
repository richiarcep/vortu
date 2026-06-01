"""Extraction pass — one schema-driven LLM/VLM call against a doc template.

Used for BOTH the cheap text pass and the VLM escalation (differs only by provider +
whether images are attached). Returns the structured data + a deterministic confidence
derived from validation (NOT the model's self-reported confidence — evidence is truth).
"""
import json
import logging

from vera.llm_base import LLMRequest
from vera.llm_router import LLMFactory
from vera.quota_manager import record_usage
from vera.doc_template_service import build_extraction_prompt, validate_extracted_data

logger = logging.getLogger("vera.extraction.extractor")

USER_TEXT = "Analiza el siguiente documento y devuelve SOLO el JSON del esquema indicado.\n\nCONTENIDO:\n{content}"
USER_VISION = "Lee el documento adjunto y devuelve SOLO el JSON del esquema indicado."


def _parse_json(raw: str) -> dict:
    """Robust JSON parse: strip code fences, isolate the object, one balance-repair retry.
    Replaces the old brittle quote-counting repair."""
    if not raw:
        return {}
    t = raw.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        if t.endswith("```"):
            t = t.rsplit("```", 1)[0]
        t = t.strip()
        if t.startswith("json"):
            t = t[4:].strip()
    if "{" in t:
        t = t[t.find("{"):]
    try:
        return json.loads(t)
    except Exception:
        pass
    # One repair attempt: close unbalanced braces/brackets after the last comma/brace.
    try:
        cut = max(t.rfind("}"), t.rfind("]"))
        if cut > 0:
            t2 = t[:cut + 1]
            t2 += "}" * max(0, t2.count("{") - t2.count("}"))
            t2 += "]" * max(0, t2.count("[") - t2.count("]"))
            return json.loads(t2)
    except Exception:
        pass
    return {}


def _confidence(template: dict, data: dict, validation: dict) -> tuple:
    """Deterministic confidence from validation + required-field completeness.
    Returns (overall_min_confidence, {field_key: confidence})."""
    encab = (data or {}).get("encabezado", {}) or {}
    field_errors = validation.get("field_errors", {})
    field_conf = {}
    for f in template["fields"]:
        if f["section"] != "encabezado":
            continue
        key = f["field_key"]
        val = encab.get(key)
        if key in field_errors:
            field_conf[key] = 0.4
        elif val in (None, ""):
            field_conf[key] = 0.0 if f["is_required"] else 0.7
        else:
            field_conf[key] = 0.92
    # Cross-rule errors drag the floor down
    base = min(field_conf.values()) if field_conf else (0.9 if data else 0.0)
    for e in validation.get("cross_errors", []):
        base -= 0.25 if e["severity"] == "error" else 0.05
    overall = max(0.0, min(1.0, base if data else 0.0))
    return overall, field_conf


def run_pass(db, company_id: int, template: dict, provider: str, *,
             user_text: str = "", images: list = None, provider_memory: dict = None,
             max_tokens: int = 3000, prompt_override: str = None,
             extra_instructions: str = "") -> dict:
    """One extraction pass. provider is a vera_models_config key ('claude'/'claude-haiku'/…).
    prompt_override replaces the built prompt; extra_instructions appends a perspective lens."""
    images = images or []
    prompt = prompt_override or build_extraction_prompt(template, provider_memory)
    if extra_instructions:
        prompt = prompt + "\n\nINSTRUCCIÓN ADICIONAL DE ESTA REVISIÓN:\n" + extra_instructions
    if images:
        user_message = USER_VISION
    else:
        user_message = USER_TEXT.format(content=(user_text or "")[:8000])

    factory = LLMFactory(db)
    client = factory.get(provider) or factory.get("claude")
    if client is None:
        return {"data": {}, "confidence": 0.0, "field_confidence": {}, "provider": provider,
                "validation": {"passed": False, "field_errors": {}, "cross_errors": []},
                "tokens_in": 0, "tokens_out": 0, "cost": 0.0, "error": "no_llm_client"}

    req = LLMRequest(system_prompt=prompt, user_message=user_message,
                     max_tokens=max_tokens, temperature=0.2, images=images)
    resp = client.generate(req)

    # Record token usage against the company's daily quota.
    try:
        record_usage(db, company_id, resp.provider, resp.tokens_input, resp.tokens_output)
    except Exception as e:
        logger.info("record_usage skipped: %s", e)

    data = _parse_json(resp.text)
    validation = validate_extracted_data(template, data) if data else {
        "passed": False, "field_errors": {}, "cross_errors": [], "errors_count": 1, "warnings_count": 0}
    overall, field_conf = _confidence(template, data, validation)

    return {
        "data": data,
        "confidence": overall,
        "field_confidence": field_conf,
        "validation": validation,
        "provider": resp.provider,
        "tokens_in": resp.tokens_input,
        "tokens_out": resp.tokens_output,
        "cost": resp.cost_estimated,
        "error": resp.error,
    }
