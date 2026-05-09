# modules/marketing/analyzer.py
"""
Analyzes the company using internal Vortu data + optional uploaded documents
and produces a full marketing intelligence report via Claude.
"""
import json
import anthropic
from sqlalchemy.orm import Session

from core.config import get_settings
settings = get_settings()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


async def analyze_company(
    db: Session,
    user_id: int,
    internal_data: dict,
    document_texts: list[str] | None = None,
) -> dict:
    """
    internal_data = {
        "ventas":         { total_revenue, top_products, payment_methods, ... },
        "contabilidad":   { ingresos, gastos, resultado_neto, categorias, ... },
        "clientes":       { total_contacts, sentiment_avg, risk_contacts, ... },
        "hr":             { total_employees, departments, payroll, ... },
    }
    document_texts = list of extracted text from uploaded docs (brief, competitor, etc.)
    """

    context_blocks = []

    # ── Internal data block ────────────────────────────────────────────────────
    context_blocks.append(f"""
=== DATOS INTERNOS DE LA EMPRESA ===

VENTAS (último mes):
{json.dumps(internal_data.get('ventas', {}), ensure_ascii=False, indent=2)}

CONTABILIDAD (último mes):
{json.dumps(internal_data.get('contabilidad', {}), ensure_ascii=False, indent=2)}

CLIENTES:
{json.dumps(internal_data.get('clientes', {}), ensure_ascii=False, indent=2)}

RECURSOS HUMANOS:
{json.dumps(internal_data.get('hr', {}), ensure_ascii=False, indent=2)}
""")

    # ── External documents block ───────────────────────────────────────────────
    if document_texts:
        for i, text in enumerate(document_texts, 1):
            context_blocks.append(f"\n=== DOCUMENTO ADICIONAL {i} ===\n{text[:3000]}")

    full_context = "\n".join(context_blocks)

    system_prompt = """Eres un experto en marketing digital y estrategia empresarial con 20 años de experiencia.
Analizas empresas en profundidad y generas estrategias de marketing basadas en datos reales.
Respondes SOLO en JSON válido, sin markdown, sin texto adicional."""

    user_prompt = f"""Analiza esta empresa en profundidad y genera un informe de inteligencia de marketing completo.

{full_context}

Responde SOLO con este JSON (sin markdown):
{{
  "sector": "sector específico de la empresa",
  "business_type": "tipo de negocio (B2B/B2C/híbrido, local/nacional/digital, etc.)",
  "target_audience": {{
    "primario": "descripción detallada del cliente ideal principal",
    "secundario": "segundo segmento si existe",
    "edad_rango": "rango de edad estimado",
    "intereses": ["interés 1", "interés 2", "interés 3"],
    "comportamiento": "descripción del comportamiento de compra"
  }},
  "value_proposition": "propuesta de valor única y diferenciadora",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "weaknesses": ["debilidad 1", "debilidad 2"],
  "opportunities": [
    {{
      "titulo": "nombre de la oportunidad",
      "descripcion": "descripción detallada",
      "impacto": "alto|medio|bajo",
      "plataforma": "google|meta|ambas|email|seo"
    }}
  ],
  "recommended_budget_monthly": 500,
  "budget_breakdown": {{
    "google": 40,
    "meta": 40,
    "otros": 20
  }},
  "best_platforms": ["google", "meta"],
  "tone_of_voice": "tono de comunicación recomendado (profesional, cercano, aspiracional, etc.)",
  "key_messages": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"],
  "competitive_position": "posicionamiento competitivo recomendado",
  "quick_wins": [
    {{
      "accion": "acción concreta",
      "impacto_estimado": "descripción del impacto",
      "tiempo": "1 semana|2 semanas|1 mes"
    }}
  ],
  "full_analysis": "análisis narrativo completo de 3-4 párrafos con contexto, diagnóstico y recomendaciones estratégicas"
}}"""

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=3000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )

    raw = response.content[0].text.strip()
    # Strip any accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("```").strip()

    return json.loads(raw)