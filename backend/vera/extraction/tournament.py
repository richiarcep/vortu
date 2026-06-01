"""FieldTournament — pick the winning value per field across perspective results.

Scoring per candidate value: number of supporting perspectives (agreement) +
the value's confidence + a bonus if adopting it lets validation pass. The winner is
assembled into a merged record, then re-validated.
"""
import logging
from collections import defaultdict

from vera.doc_template_service import validate_extracted_data
from vera.extraction.cheap_extractor import _confidence

logger = logging.getLogger("vera.extraction.tournament")


def _norm(v):
    if v is None:
        return ""
    return str(v).strip().lower().replace(" ", "").replace("€", "").replace(",", ".")


def decide(template: dict, results: list) -> dict | None:
    """results: list of pass-results (from consensus.run). Returns a merged pass-result."""
    results = [r for r in results if r and r.get("data")]
    if not results:
        return None

    encab_fields = [f["field_key"] for f in template["fields"] if f["section"] == "encabezado"]

    winners = {}
    field_support = {}
    for key in encab_fields:
        # candidate value -> (count, best_confidence, a_raw_value)
        tally = defaultdict(lambda: [0, 0.0, None])
        for r in results:
            enc = (r["data"].get("encabezado", {}) or {})
            raw = enc.get(key)
            if raw in (None, ""):
                continue
            conf = (r.get("field_confidence", {}) or {}).get(key, 0.5)
            cell = tally[_norm(raw)]
            cell[0] += 1
            cell[1] = max(cell[1], conf)
            if cell[2] is None:
                cell[2] = raw
        if not tally:
            continue
        # Score = agreement_count + best_confidence (agreement dominates ties)
        best_norm = max(tally.items(), key=lambda kv: (kv[1][0], kv[1][1]))
        winners[key] = best_norm[1][2]
        field_support[key] = best_norm[1][0]

    # Assemble merged record: winning encabezado + lineas/impuestos from the
    # result with the best validation (structural arrays are hard to vote field-wise).
    base = max(results, key=lambda r: (r["validation"].get("passed", False),
                                       -r["validation"].get("errors_count", 99)))
    merged = dict(base["data"])
    merged_encab = dict(base["data"].get("encabezado", {}) or {})
    merged_encab.update(winners)
    merged["encabezado"] = merged_encab

    validation = validate_extracted_data(template, merged)
    overall, field_conf = _confidence(template, merged, validation)
    # Boost confidence of fields with multi-perspective agreement.
    n = len(results)
    for k, support in field_support.items():
        if support >= max(2, n) and k in field_conf:
            field_conf[k] = max(field_conf[k], 0.9)
    overall = min(field_conf.values()) if field_conf else overall

    return {
        "data": merged, "confidence": overall, "field_confidence": field_conf,
        "validation": validation, "provider": "consensus",
        "tokens_in": sum(r.get("tokens_in", 0) for r in results),
        "tokens_out": sum(r.get("tokens_out", 0) for r in results),
        "cost": sum(r.get("cost", 0) or 0 for r in results),
        "error": None, "field_support": field_support,
    }
