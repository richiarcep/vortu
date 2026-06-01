"""BudgetController — decides stop / escalate / review after each stage.

Reads per-template thresholds from the admin template's `budget` block (if present in
validation_rules_json / template config) and falls back to safe defaults. Combines
confidence + validation + document value + quota state.
"""

DEFAULTS = {
    "auto_accept_conf": 0.85,   # stop if validation passes and min-confidence ≥ this
    "review_conf": 0.45,        # below this (after escalation) → human review
    "high_value_threshold": 3000.0,
    "max_model_calls": 4,       # hard ceiling per document (cheap+vision+critic+repair worst case)
    "max_cost_per_doc": 5.0,    # USD safety net (model-call count is the primary ceiling;
                                # provider pricing in vera_models_config can be mis-scaled)
}


def thresholds(template: dict) -> dict:
    cfg = dict(DEFAULTS)
    if isinstance(template, dict):
        b = template.get("budget")
        if isinstance(b, dict):
            cfg.update({k: b[k] for k in DEFAULTS if k in b})
    return cfg


def decide(state: dict, template: dict, quota: dict) -> str:
    """state: {confidence, validation_passed, doc_value, calls_made, cost}
       quota: result of select_model_for_request (has 'degraded')
       Returns 'stop' | 'escalate' | 'review'."""
    t = thresholds(template)
    conf = state.get("confidence", 0.0)
    passed = state.get("validation_passed", False)
    calls = state.get("calls_made", 0)
    cost = state.get("cost", 0.0)

    # Hard ceilings → never loop
    if calls >= t["max_model_calls"] or cost >= t["max_cost_per_doc"]:
        return "stop" if passed else "review"

    # Good enough → stop (cheapest path; most clean docs land here)
    if passed and conf >= t["auto_accept_conf"]:
        return "stop"

    # Under quota degradation, don't keep burning premium escalations
    if quota.get("degraded") and calls >= 1:
        return "stop" if passed else "review"

    # Confidence collapsed after at least one pass → review (don't waste calls)
    if calls >= 1 and conf < t["review_conf"] and not passed:
        return "review"

    # Otherwise escalate once more
    return "escalate"
