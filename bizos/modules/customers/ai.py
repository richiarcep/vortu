import json
from datetime import date, datetime
from sqlalchemy.orm import Session
from anthropic import Anthropic
from core.config import get_settings
from models.customer import Contact, Message, KnowledgeBase, SentimentReport

settings = get_settings()


def get_knowledge_base_context(db: Session, company_id: int) -> str:
    """Fetches all active knowledge base entries for context."""
    entries = db.query(KnowledgeBase).filter(
        KnowledgeBase.company_id == company_id,
        KnowledgeBase.is_active == True
    ).all()

    if not entries:
        return "Sin base de conocimiento configurada."

    context = ""
    for entry in entries:
        context += f"\n[{entry.kb_type.upper()}] {entry.title}:\n"
        context += entry.full_content or entry.content_summary or ""
        context += "\n"
    return context


def analyze_message(
    db: Session,
    company_id: int,
    message_content: str,
    contact_name: str = None,
    platform: str = "manual",
    conversation_history: list = None,
) -> dict:
    """
    Sends a customer message to Claude and gets back:
    - sentiment (positive/neutral/negative/urgent)
    - intent (question/complaint/purchase/compliment/other)
    - topics mentioned
    - urgency score 0-10
    - requires_human bool
    - ai_confidence 0-1
    - draft response in Spanish
    """
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    kb_context = get_knowledge_base_context(db, company_id)

    history_text = ""
    if conversation_history:
        history_text = "\nHISTORIAL DE CONVERSACIÓN RECIENTE:\n"
        for msg in conversation_history[-5:]:
            direction = "Cliente" if msg["direction"] == "inbound" else "Negocio"
            history_text += f"{direction}: {msg['content']}\n"

    prompt = f"""Eres el asistente de atención al cliente de un negocio. Analiza el siguiente mensaje de un cliente y genera una respuesta profesional.

BASE DE CONOCIMIENTO DEL NEGOCIO:
{kb_context}

{history_text}

MENSAJE DEL CLIENTE ({contact_name or 'Cliente'}):
{message_content}

PLATAFORMA: {platform}

Devuelve SOLO este JSON:
{{
  "sentimiento": "positive|neutral|negative|urgent",
  "intencion": "question|complaint|purchase|compliment|other",
  "temas": ["tema1", "tema2"],
  "puntuacion_urgencia": 0,
  "requiere_humano": false,
  "confianza": 0.9,
  "motivo_humano": null,
  "respuesta_borrador": "Respuesta profesional y personalizada en español",
  "resumen_interno": "Resumen breve para el equipo de qué quiere el cliente"
}}

Reglas:
- requiere_humano = true si el sentimiento es muy negativo, hay una queja grave, o Claude no tiene suficiente información para responder bien
- puntuacion_urgencia 0-10 donde 10 es emergencia
- La respuesta debe ser cálida, profesional y en el mismo idioma que el cliente
- Usa el nombre del cliente si está disponible
- Si hay información relevante en la base de conocimiento úsala en la respuesta
- Solo el JSON"""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        return json.loads(text)
    except Exception as e:
        return {
            "sentimiento": "neutral",
            "intencion": "other",
            "temas": [],
            "puntuacion_urgencia": 0,
            "requiere_humano": True,
            "confianza": 0.0,
            "motivo_humano": "Error al analizar",
            "respuesta_borrador": "Gracias por tu mensaje. Nos pondremos en contacto contigo pronto.",
            "resumen_interno": "Error en el análisis automático",
            "error": str(e)
        }


def update_contact_sentiment(db: Session, contact: Contact, new_sentiment: str) -> None:
    """
    Updates the running sentiment score and trend for a contact
    after each new message is analyzed.
    """
    sentiment_map = {
        "positive": 8.5,
        "compliment": 9.0,
        "neutral": 5.0,
        "negative": 2.5,
        "urgent": 1.5,
    }

    new_score = sentiment_map.get(new_sentiment, 5.0)

    # Running weighted average — recent messages count more
    if contact.total_messages == 0:
        contact.sentiment_score = new_score
    else:
        weight_new = 0.3
        weight_old = 0.7
        contact.sentiment_score = round(
            (new_score * weight_new) + (contact.sentiment_score * weight_old), 2
        )

    # Update history
    history = contact.sentiment_history or []
    history.append({
        "date": str(date.today()),
        "score": contact.sentiment_score,
        "sentiment": new_sentiment,
    })
    # Keep last 30 entries
    contact.sentiment_history = history[-30:]

    # Update trend
    if len(history) >= 3:
        recent_avg = sum(h["score"] for h in history[-3:]) / 3
        older_avg  = sum(h["score"] for h in history[-6:-3]) / max(len(history[-6:-3]), 1)
        if recent_avg > older_avg + 0.5:
            contact.sentiment_trend = "mejorando"
        elif recent_avg < older_avg - 0.5:
            contact.sentiment_trend = "deteriorando"
        else:
            contact.sentiment_trend = "estable"

    # Update risk level
    score = contact.sentiment_score
    if score >= 7:
        contact.risk_level = "bajo"
    elif score >= 5:
        contact.risk_level = "medio"
    elif score >= 3:
        contact.risk_level = "alto"
    else:
        contact.risk_level = "critico"

    contact.last_sentiment  = new_sentiment
    contact.total_messages  = (contact.total_messages or 0) + 1
    contact.last_contact_at = datetime.now()

    db.commit()


def generate_sentiment_report(db: Session, company_id: int) -> dict:
    """
    Generates the weekly sentiment report with Claude narrative.
    Called every Monday by the scheduler.
    """
    today = date.today()
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    contacts = db.query(Contact).filter(
        Contact.company_id == company_id
    ).all()

    if not contacts:
        return {"error": "Sin contactos registrados"}

    # ── Calculate aggregate stats ─────────────────────────────────────────────
    total = len(contacts)
    scores = [c.sentiment_score for c in contacts]
    overall_score = round(sum(scores) / total, 2) if scores else 5.0

    at_risk = [
        {"name": c.name, "score": c.sentiment_score, "risk": c.risk_level, "trend": c.sentiment_trend}
        for c in contacts if c.risk_level in ["alto", "critico"]
    ]

    # Message sentiment breakdown from last 7 days
    from datetime import timedelta
    week_ago = datetime.now() - timedelta(days=7)
    recent_messages = db.query(Message).filter(
        Message.company_id == company_id,
        Message.direction == "inbound",
        Message.created_at >= week_ago
    ).all()

    total_msgs = len(recent_messages)
    pos = len([m for m in recent_messages if m.ai_sentiment == "positive"])
    neg = len([m for m in recent_messages if m.ai_sentiment in ["negative", "urgent"]])
    neu = total_msgs - pos - neg

    positive_pct = round((pos / total_msgs * 100), 1) if total_msgs > 0 else 0
    negative_pct = round((neg / total_msgs * 100), 1) if total_msgs > 0 else 0
    neutral_pct  = round((neu / total_msgs * 100), 1) if total_msgs > 0 else 0

    # Trending topics
    all_topics = []
    for msg in recent_messages:
        all_topics.extend(msg.ai_topics or [])
    from collections import Counter
    topic_counts = Counter(all_topics)
    trending_topics = [t for t, _ in topic_counts.most_common(5)]

    # ── Claude narrative ──────────────────────────────────────────────────────
    data_summary = {
        "total_contactos":    total,
        "puntuacion_general": overall_score,
        "mensajes_semana":    total_msgs,
        "positivos_pct":      positive_pct,
        "negativos_pct":      negative_pct,
        "en_riesgo":          len(at_risk),
        "clientes_criticos":  [c["name"] for c in at_risk if c["risk"] == "critico"],
        "temas_frecuentes":   trending_topics,
    }

    narrative_prompt = f"""Eres un analista de atención al cliente. Escribe un párrafo ejecutivo en español sobre el estado de satisfacción de los clientes esta semana.

Datos:
{json.dumps(data_summary, ensure_ascii=False, indent=2)}

Escribe 2-3 oraciones directas y accionables. Menciona si hay clientes en riesgo. Termina con la acción más urgente.
Solo el texto del párrafo, sin JSON."""

    narrative_msg = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": narrative_prompt}]
    )
    narrative = narrative_msg.content[0].text.strip()

    # ── Save report to DB ─────────────────────────────────────────────────────
    report = SentimentReport(
        company_id=company_id,
        week_of=today,
        overall_score=overall_score,
        clients_at_risk=at_risk,
        trending_topics=trending_topics,
        claude_narrative=narrative,
        total_messages=total_msgs,
        positive_pct=positive_pct,
        negative_pct=negative_pct,
        neutral_pct=neutral_pct,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "week_of":          str(today),
        "overall_score":    overall_score,
        "total_contacts":   total,
        "total_messages":   total_msgs,
        "positive_pct":     positive_pct,
        "negative_pct":     negative_pct,
        "neutral_pct":      neutral_pct,
        "clients_at_risk":  at_risk,
        "trending_topics":  trending_topics,
        "narrative":        narrative,
    }


def extract_knowledge_from_document(content: str, title: str, kb_type: str) -> dict:
    """
    When a document is uploaded to the knowledge base,
    Claude extracts a clean summary for use in responses.
    """
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Extrae la información más útil de este documento para responder preguntas de clientes.

Título: {title}
Tipo: {kb_type}
Contenido:
{content[:3000]}

Devuelve SOLO este JSON:
{{
  "resumen": "Resumen de 2-3 oraciones de qué contiene este documento",
  "puntos_clave": ["punto 1", "punto 2", "punto 3"],
  "preguntas_frecuentes": [
    {{"pregunta": "¿...?", "respuesta": "..."}}
  ],
  "palabras_clave": ["keyword1", "keyword2"]
}}

Solo el JSON."""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        return json.loads(text)
    except Exception:
        return {"resumen": content[:200], "puntos_clave": [], "preguntas_frecuentes": [], "palabras_clave": []}