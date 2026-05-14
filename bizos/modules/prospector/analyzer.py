"""
Nexum Prospector — Analisis IA de leads con Claude.
Puntua cada lead del 1-10 y detecta el mejor canal de contacto.
"""
import json
import anthropic
from core.config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def analyze_leads(leads: list, search_prompt: str, batch_size: int = 20) -> list:
    """
    Claude analiza y puntua los leads en batches.
    Devuelve los leads con score, razon y canal recomendado.
    """
    if not leads:
        return []
    
    analyzed = []
    total_batches = (len(leads) + batch_size - 1) // batch_size
    
    for i in range(0, len(leads), batch_size):
        batch = leads[i:i + batch_size]
        batch_num = i // batch_size + 1
        print(f"Analizando batch {batch_num}/{total_batches} ({len(batch)} leads)...")
        
        batch_analyzed = _analyze_batch(batch, search_prompt)
        analyzed.extend(batch_analyzed)
    
    # Ordenar por score descendente
    analyzed.sort(key=lambda x: x.get("score", 0), reverse=True)
    return analyzed


def _analyze_batch(leads: list, search_prompt: str) -> list:
    """Analiza un batch de leads con Claude."""
    
    leads_text = json.dumps([{
        "id": i,
        "nombre": l.get("nombre", ""),
        "categoria": l.get("categoria", ""),
        "ciudad": l.get("ciudad", ""),
        "rating": l.get("rating", 0),
        "reviews": l.get("reviews", 0),
        "tiene_web": bool(l.get("website")),
        "tiene_instagram": bool(l.get("instagram")),
        "tiene_telefono": bool(l.get("telefono")),
        "tiene_email": bool(l.get("email")),
        "source": l.get("source", ""),
        "descripcion": (l.get("descripcion") or "")[:100],
    } for i, l in enumerate(leads)], ensure_ascii=False, indent=2)
    
    prompt = f"""Eres el analista de ventas de Nexum Solutions, una plataforma SaaS de gestion empresarial con IA para pymes españolas.

CONTEXTO DE BUSQUEDA: "{search_prompt}"

Nexum Vortu ayuda a pymes españolas con: contabilidad, finanzas, RRHH, proyectos, clientes, ventas, marketing IA.
Precio: desde 9 EUR/mes. Target ideal: pymes de 2-20 empleados que ya tienen cierta actividad digital.

Analiza estos leads y para cada uno determina:
1. Score de relevancia 1-10 (10 = cliente ideal para Vortu)
2. Razon principal del score
3. Canal de contacto recomendado
4. Si merece contacto directo

Criterios de score alto:
- Negocio activo con reviews y rating
- Tiene web o presencia digital (mas probable que paguen SaaS)
- Categoria relacionada con necesidades que Vortu resuelve
- Tamaño aparente de pyme (no multinacional ni microempresa sin potencial)

LEADS A ANALIZAR:
{leads_text}

Devuelve SOLO un JSON valido:
{{
  "leads": [
    {{
      "id": 0,
      "score": 8,
      "razon": "Restaurante activo con 150 reviews, tiene web, probablemente necesita gestion de pedidos y contabilidad",
      "canal_recomendado": "google_maps",
      "contactar": true,
      "tipo_negocio": "restaurante",
      "pain_point_principal": "gestion contable y control de costes"
    }}
  ]
}}"""

    try:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        if not response.content:
            raise ValueError("No content in Claude response")
        text = response.content[0].text.strip()
        clean = text.replace("```json", "").replace("```", "").strip()
        # Handle possible None or empty response
        if not clean:
            raise ValueError("Empty response from Claude")
        
        data = json.loads(clean)
        
        # Merge analysis back into leads
        analysis_map = {item["id"]: item for item in data.get("leads", [])}
        
        result = []
        for i, lead in enumerate(leads):
            analysis = analysis_map.get(i, {})
            enriched_lead = {**lead}
            enriched_lead["score"] = analysis.get("score", 5)
            enriched_lead["razon_score"] = analysis.get("razon", "")
            enriched_lead["canal_recomendado"] = analysis.get("canal_recomendado", lead.get("source", ""))
            enriched_lead["contactar"] = analysis.get("contactar", True)
            enriched_lead["tipo_negocio"] = analysis.get("tipo_negocio", "")
            enriched_lead["pain_point"] = analysis.get("pain_point_principal", "")
            enriched_lead["mensaje_generado"] = ""
            enriched_lead["estado"] = "pendiente"
            result.append(enriched_lead)
        
        return result
    
    except Exception as e:
        print(f"Error analizando batch: {e}")
        # Return leads with default score if Claude fails
        return [{**lead, "score": 5, "razon_score": "Error en analisis", "contactar": True, "estado": "pendiente"} for lead in leads]
