"""RepairEngine — re-ask the model for ONLY the fields that failed validation or came
back low-confidence, then merge + re-validate. Bounds cost vs re-extracting everything."""
import json
import logging

from vera.llm_base import LLMRequest
from vera.llm_router import LLMFactory
from vera.quota_manager import record_usage
from vera.doc_template_service import validate_extracted_data
from vera.extraction.cheap_extractor import _parse_json, _confidence

logger = logging.getLogger("vera.extraction.repair")

LOW_CONF = 0.6


def _problem_fields(template, validation, field_confidence, force_keys=None) -> list:
    keys = set(validation.get("field_errors", {}).keys())
    for k, c in (field_confidence or {}).items():
        if c < LOW_CONF:
            keys.add(k)
    if force_keys:
        keys.update(force_keys)        # critic-directed fields
    # Map to field defs (encabezado only in Phase 1)
    return [f for f in template["fields"] if f["section"] == "encabezado" and f["field_key"] in keys]


def repair_fields(db, company_id: int, template: dict, data: dict, validation: dict,
                  field_confidence: dict, provider: str, images: list = None,
                  force_keys: list = None) -> dict | None:
    """Returns a NEW pass-result dict (same shape as cheap_extractor.run_pass) or None if nothing to repair."""
    problems = _problem_fields(template, validation, field_confidence, force_keys)
    if not problems:
        return None
    images = images or []

    encab = (data or {}).get("encabezado", {}) or {}
    lines = []
    for f in problems:
        err = ", ".join(validation.get("field_errors", {}).get(f["field_key"], [])) or "valor poco fiable"
        lines.append(f"- {f['field_key']} ({f['field_type']}): valor actual='{encab.get(f['field_key'])}' | problema: {err}"
                     + (f" | busca cerca de: {', '.join(f['keywords'])}" if f.get('keywords') else ""))
    cross = "; ".join(e["message"] for e in validation.get("cross_errors", []))

    sys_prompt = (
        "Eres un verificador de extracción. Te doy campos que probablemente están MAL extraídos "
        "de un documento. Vuelve a mirarlo con atención y corrige SOLO esos campos. "
        "Devuelve SOLO un JSON: {\"encabezado\": { <solo los campos corregidos> }}. Sin markdown."
    )
    user = "CAMPOS A REVISAR:\n" + "\n".join(lines)
    if cross:
        user += f"\n\nINCONSISTENCIAS DETECTADAS: {cross}"
    if not images:
        user += "\n\n(Usa el documento ya analizado; corrige según las reglas.)"

    factory = LLMFactory(db)
    client = factory.get(provider) or factory.get("claude")
    if client is None:
        return None
    req = LLMRequest(system_prompt=sys_prompt, user_message=user, max_tokens=1500,
                     temperature=0.1, images=images)
    resp = client.generate(req)
    try:
        record_usage(db, company_id, resp.provider, resp.tokens_input, resp.tokens_output)
    except Exception:
        pass

    fix = _parse_json(resp.text)
    fixed_encab = (fix or {}).get("encabezado", {}) or {}
    if not fixed_encab:
        return None

    # Merge only the repaired keys back in.
    merged = dict(data or {})
    merged_encab = dict(encab)
    for f in problems:
        k = f["field_key"]
        if k in fixed_encab and fixed_encab[k] not in (None, ""):
            merged_encab[k] = fixed_encab[k]
    merged["encabezado"] = merged_encab

    validation2 = validate_extracted_data(template, merged)
    overall, field_conf = _confidence(template, merged, validation2)
    return {
        "data": merged, "confidence": overall, "field_confidence": field_conf,
        "validation": validation2, "provider": resp.provider,
        "tokens_in": resp.tokens_input, "tokens_out": resp.tokens_output,
        "cost": resp.cost_estimated, "error": resp.error, "repaired": [f["field_key"] for f in problems],
    }
