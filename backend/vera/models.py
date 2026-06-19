"""
Central registry of LLM model IDs and pricing.

Why this file exists: model identifiers and per-token prices were hardcoded in
many places (network_engine, ai_service, admin, the llm_* clients). When a model is
retired/renamed or a provider changes prices, you had to hunt them down. Reference
these constants instead so there is one place to update.

NOTE — version drift to resolve: the document/insights path used "claude-opus-4-6"
while the Vela super-admin engine used "claude-opus-4-7". Both are kept below as
distinct constants to preserve current behaviour exactly; decide which is canonical
and collapse them.
"""

# ── Anthropic model IDs ──────────────────────────────────────────────────────
OPUS = "claude-opus-4-6"            # used by ai_service / admin insights
OPUS_NETWORK = "claude-opus-4-7"      # used by the Vela super-admin engine (see NOTE)
SONNET = "claude-sonnet-4-6"
HAIKU = "claude-haiku-4-5-20251001"

# ── Pricing in USD per 1,000,000 tokens: (input, output) ─────────────────────
PRICING = {
    OPUS:       (15.0, 75.0),
    OPUS_NETWORK: (15.0, 75.0),
    SONNET:     (3.0, 15.0),
    HAIKU:      (1.0, 5.0),
}

# Fallback price if a model is missing from PRICING (Sonnet-class).
_DEFAULT_PRICE = (3.0, 15.0)


def cost_usd(model: str, tokens_in: int, tokens_out: int) -> float:
    """Cost in USD for a call, from the central PRICING table."""
    price_in, price_out = PRICING.get(model, _DEFAULT_PRICE)
    return (tokens_in * price_in + tokens_out * price_out) / 1_000_000
