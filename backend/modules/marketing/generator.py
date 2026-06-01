# modules/marketing/generator.py
"""
Generates all creative content for a campaign:
  - Google Ads copies (headlines, descriptions, keywords, extensions)
  - Meta Ads copies (primary text, headline, description, CTA)
  - TikTok / Reels scripts
  - Image generation prompts (for Stability AI / DALL-E / Ideogram)
  - Video scripts with hook, body, CTA
"""
import json
import anthropic

from core.config import get_settings
from modules.core.prompt_loader import get_prompt
settings = get_settings()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

OBJECTIVES = {
    "awareness":    "aumentar el conocimiento de marca y llegar al máximo de personas posible",
    "traffic":      "llevar tráfico cualificado al sitio web",
    "leads":        "captar leads y datos de contacto de clientes potenciales",
    "sales":        "generar ventas directas y conversiones",
    "retargeting":  "reconectar con personas que ya conocen la marca",
}


async def generate_campaign_content(
    analysis: dict,
    campaign_name: str,
    objective: str,
    budget_daily: float,
    platforms: list[str],
    extra_context: str = "",
) -> dict:
    """
    Returns a dict with all generated creative content.
    """

    objective_desc = OBJECTIVES.get(objective, objective)

    system_prompt = get_prompt("campaign_generator")

    prompt = f"""Crea todo el contenido creativo para esta campaña de publicidad digital.

ANÁLISIS DE EMPRESA:
- Sector: {analysis.get('sector')}
- Tipo de negocio: {analysis.get('business_type')}
- Público objetivo: {json.dumps(analysis.get('target_audience', {}), ensure_ascii=False)}
- Propuesta de valor: {analysis.get('value_proposition')}
- Tono de voz: {analysis.get('tone_of_voice')}
- Mensajes clave: {json.dumps(analysis.get('key_messages', []), ensure_ascii=False)}
- Posicionamiento: {analysis.get('competitive_position')}

CAMPAÑA:
- Nombre: {campaign_name}
- Objetivo: {objective_desc}
- Presupuesto diario: €{budget_daily}
- Plataformas: {', '.join(platforms)}
{f'- Contexto adicional: {extra_context}' if extra_context else ''}

Genera SOLO este JSON:
{{
  "google_ads": {{
    "headlines": [
      "titular 1 (máx 30 chars)",
      "titular 2 (máx 30 chars)",
      "titular 3 (máx 30 chars)",
      "titular 4 (máx 30 chars)",
      "titular 5 (máx 30 chars)"
    ],
    "descriptions": [
      "descripción 1 (máx 90 chars)",
      "descripción 2 (máx 90 chars)",
      "descripción 3 (máx 90 chars)"
    ],
    "keywords": {{
      "exact": ["[keyword exacta 1]", "[keyword exacta 2]", "[keyword exacta 3]"],
      "phrase": ["keyword de frase 1", "keyword de frase 2", "keyword de frase 3"],
      "broad": ["keyword amplia 1", "keyword amplia 2"]
    }},
    "negative_keywords": ["negativa 1", "negativa 2", "negativa 3"],
    "sitelinks": [
      {{"text": "texto sitelink", "description": "descripción", "url": "/pagina"}},
      {{"text": "texto sitelink", "description": "descripción", "url": "/pagina"}}
    ],
    "callouts": ["callout 1", "callout 2", "callout 3"],
    "display_path": ["path1", "path2"],
    "campaign_type": "Search|Display|Shopping|Performance Max",
    "bid_strategy": "estrategia de puja recomendada",
    "targeting_notes": "notas de segmentación recomendada"
  }},
  "meta_ads": {{
    "ads": [
      {{
        "variant": "A",
        "format": "imagen_unica|carrusel|video",
        "primary_text": "texto principal del anuncio (máx 125 chars para feed)",
        "headline": "titular del anuncio (máx 40 chars)",
        "description": "descripción (máx 30 chars)",
        "cta": "SHOP_NOW|LEARN_MORE|SIGN_UP|CONTACT_US|GET_OFFER|BOOK_NOW",
        "angle": "ángulo creativo del anuncio"
      }},
      {{
        "variant": "B",
        "format": "imagen_unica",
        "primary_text": "variante B del texto",
        "headline": "variante B del titular",
        "description": "variante B descripción",
        "cta": "LEARN_MORE",
        "angle": "ángulo alternativo"
      }}
    ],
    "audience": {{
      "age_min": 25,
      "age_max": 55,
      "interests": ["interés 1", "interés 2", "interés 3"],
      "behaviors": ["comportamiento 1", "comportamiento 2"],
      "locations": ["España"],
      "custom_audiences": ["Visitantes web", "Lista clientes existentes"],
      "lookalike": "Lookalike 1-3% de clientes actuales"
    }},
    "placements": ["Facebook Feed", "Instagram Feed", "Instagram Stories", "Reels"],
    "optimization_goal": "objetivo de optimización de Meta",
    "campaign_objective": "CONVERSIONS|REACH|TRAFFIC|LEAD_GENERATION"
  }},
  "tiktok_ads": {{
    "scripts": [
      {{
        "variant": "A",
        "duration_secs": 15,
        "hook": "gancho de los primeros 3 segundos (texto exacto)",
        "body": "cuerpo del vídeo (texto del narrador/locutor)",
        "cta": "llamada a la acción final",
        "visual_notes": "indicaciones visuales para la producción",
        "music_vibe": "tipo de música recomendada",
        "format": "ugc|animated_text|product_demo|testimonial"
      }},
      {{
        "variant": "B",
        "duration_secs": 30,
        "hook": "gancho alternativo más largo",
        "body": "cuerpo alternativo",
        "cta": "cta alternativo",
        "visual_notes": "notas visuales alternativas",
        "music_vibe": "vibe musical alternativo",
        "format": "storytelling"
      }}
    ]
  }},
  "image_prompts": [
    {{
      "id": "img_1",
      "platform": "meta",
      "format": "1:1 (1080x1080px)",
      "prompt": "prompt detallado para generador de imágenes (estilo fotografía profesional, colores de marca, composición, sujeto, ambiente)",
      "negative_prompt": "elementos a evitar",
      "style": "fotorrealista|ilustración|minimalista|corporativo"
    }},
    {{
      "id": "img_2",
      "platform": "meta",
      "format": "9:16 (1080x1920px) Stories/Reels",
      "prompt": "prompt para stories verticales",
      "negative_prompt": "elementos a evitar",
      "style": "fotorrealista"
    }},
    {{
      "id": "img_3",
      "platform": "google_display",
      "format": "16:9 (1200x628px)",
      "prompt": "prompt para banner horizontal Google Display",
      "negative_prompt": "elementos a evitar",
      "style": "corporativo"
    }}
  ],
  "video_scripts": [
    {{
      "id": "video_1",
      "platform": "meta_reels",
      "duration_secs": 15,
      "aspect_ratio": "9:16",
      "scenes": [
        {{
          "seconds": "0-3",
          "type": "hook",
          "narration": "texto exacto de la narración",
          "visual": "descripción de lo que se ve en pantalla",
          "text_overlay": "texto que aparece en pantalla",
          "music": "instrucción de música"
        }},
        {{
          "seconds": "3-12",
          "type": "body",
          "narration": "narración del cuerpo",
          "visual": "descripción visual",
          "text_overlay": "texto en pantalla",
          "music": "instrucción"
        }},
        {{
          "seconds": "12-15",
          "type": "cta",
          "narration": "narración del CTA",
          "visual": "descripción visual del CTA",
          "text_overlay": "texto CTA en pantalla",
          "music": "fade out"
        }}
      ]
    }},
    {{
      "id": "video_2",
      "platform": "google_video",
      "duration_secs": 30,
      "aspect_ratio": "16:9",
      "scenes": [
        {{
          "seconds": "0-5",
          "type": "hook",
          "narration": "narración hook YouTube",
          "visual": "descripción visual",
          "text_overlay": "texto en pantalla",
          "music": "intro music"
        }},
        {{
          "seconds": "5-25",
          "type": "body",
          "narration": "desarrollo del mensaje",
          "visual": "visuales del cuerpo",
          "text_overlay": "subtítulos/textos",
          "music": "background music"
        }},
        {{
          "seconds": "25-30",
          "type": "cta",
          "narration": "llamada a la acción",
          "visual": "pantalla final con logo y CTA",
          "text_overlay": "CTA + URL",
          "music": "fade"
        }}
      ]
    }}
  ],
  "ab_testing_plan": {{
    "test_1": {{
      "variable": "qué se está probando",
      "variant_a": "descripción variante A",
      "variant_b": "descripción variante B",
      "metric": "métrica a optimizar",
      "duration_days": 7
    }}
  }},
  "launch_checklist": [
    "elemento de checklist 1",
    "elemento de checklist 2",
    "elemento de checklist 3"
  ]
}}"""

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=5000,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("```").strip()

    return json.loads(raw)