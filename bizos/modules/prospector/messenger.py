"""
Nexum Prospector — Generador de mensajes personalizados por plataforma.
Claude genera el mensaje perfecto para cada lead segun su canal.
"""
import json
import anthropic
from core.config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

TEMPLATES = {
    "google_maps": {
        "canal": "Email / llamada telefonica",
        "tono": "profesional y directo",
        "longitud": "3-4 frases cortas",
    },
    "instagram": {
        "canal": "DM de Instagram",
        "tono": "cercano, casual pero profesional",
        "longitud": "2-3 frases muy cortas, maximo 300 caracteres",
    },
    "facebook": {
        "canal": "Mensaje de Facebook",
        "tono": "amigable y directo",
        "longitud": "3-4 frases cortas",
    },
    "linkedin": {
        "canal": "InMail de LinkedIn",
        "tono": "muy profesional, orientado a resultados",
        "longitud": "4-5 frases con propuesta de valor clara",
    },
}


def generate_message(lead: dict) -> str:
    """
    Claude genera un mensaje personalizado para un lead especifico.
    """
    canal = lead.get("canal_recomendado", "google_maps")
    template = TEMPLATES.get(canal, TEMPLATES["google_maps"])
    
    prompt = f"""Eres el director comercial de Nexum Solutions. 
Genera un mensaje de prospección para contactar a este negocio sobre Vortu, 
nuestra plataforma de gestion empresarial con IA para pymes españolas.

LEAD:
- Nombre: {lead.get("nombre", "")}
- Tipo: {lead.get("tipo_negocio", lead.get("categoria", ""))}
- Ciudad: {lead.get("ciudad", "España")}
- Rating: {lead.get("rating", "")} ({lead.get("reviews", 0)} reviews)
- Pain point detectado: {lead.get("pain_point", "gestion empresarial")}
- Canal: {template["canal"]}

MENSAJE:
- Tono: {template["tono"]}
- Longitud: {template["longitud"]}
- Menciona el nombre del negocio
- Referencia algo especifico de su negocio (tipo, ciudad, actividad)
- Propuesta de valor clara de Vortu (ahorra tiempo, gestiona todo desde un sitio, IA incluida)
- CTA claro: reunion, llamada o demo gratuita
- NO menciones precios
- NO uses palabras como "revolucionario" o "innovador"
- Firma como Eduardo de Nexum

Devuelve SOLO el mensaje, sin explicaciones ni comillas."""

    try:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"Error generando mensaje: {e}")
        return f"Hola {lead.get('nombre', '')}, me gustaría hablar contigo sobre cómo Vortu puede ayudar a tu negocio. ¿Tienes 15 minutos esta semana? Eduardo de Nexum."


def generate_messages_batch(leads: list) -> list:
    """
    Genera mensajes para todos los leads que deben ser contactados.
    Solo procesa leads con score >= 6 y contactar = True.
    """
    results = []
    to_contact = [l for l in leads if l.get("contactar", True) and l.get("score", 0) >= 6]
    
    print(f"Generando mensajes para {len(to_contact)} leads prioritarios...")
    
    for i, lead in enumerate(to_contact):
        print(f"  Mensaje {i+1}/{len(to_contact)}: {lead.get('nombre', '')}")
        mensaje = generate_message(lead)
        lead["mensaje_generado"] = mensaje
        results.append(lead)
    
    return leads
