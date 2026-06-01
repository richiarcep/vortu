"""Capability-aware, cost-driven model routing for the extraction pipeline.

The whole point of the evidence architecture: route each STEP to the cheapest model
that can actually do it, then recover accuracy with consensus/critic. So:
  - TEXT steps (cheap pass on a born-digital text layer, text-only reasoning) → the
    cheapest active model (e.g. DeepSeek, which is cheap but text-only).
  - VISION steps (scanned pages, "look at the document" escalation) → the cheapest
    model that can actually see.

Costs + active providers come from vera_models_config (admin), so adding a cheaper
provider (DeepSeek) automatically shifts text work onto it — no code change.
"""
import os
import logging
from sqlalchemy import text

logger = logging.getLogger("vera.extraction.routing")

# Which providers can process images/PDF vision (model facts, not tunables).
VISION_CAPABLE = {"claude", "claude-haiku", "claude-opus", "gemini", "openai"}
# Providers that are text-only (can't see) — never used for vision steps.
TEXT_ONLY = {"deepseek", "perplexity"}


def _active(db):
    """Active providers from vera_models_config that have an API key, with their cost."""
    try:
        rows = db.execute(text(
            "SELECT provider, api_key_env, cost_per_1k_input, cost_per_1k_output "
            "FROM vera_models_config WHERE is_active = 1"
        )).fetchall()
    except Exception as e:
        logger.info("vera_models_config read failed: %s", e)
        return []
    out = []
    for prov, env, ci, co in rows:
        if env and os.getenv(env):
            out.append({"provider": prov, "cost": (ci or 0) + (co or 0)})
    return out


def _cheapest(provs):
    return min(provs, key=lambda p: p["cost"])["provider"] if provs else None


def pick_text(db, default="claude-haiku") -> str:
    """Cheapest active model for a TEXT step (any LLM can do text)."""
    return _cheapest(_active(db)) or default


def pick_vision(db, default="claude") -> str:
    """Cheapest active VISION-capable model."""
    provs = [p for p in _active(db) if p["provider"] in VISION_CAPABLE and p["provider"] not in TEXT_ONLY]
    return _cheapest(provs) or default
