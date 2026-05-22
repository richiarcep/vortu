from datetime import datetime, timedelta, date
from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.customer import Contact, Message, SentimentReport


def get_inbox_analytics(db: Session, company_id: int) -> dict:
    """
    Full analytics for the customer service module.
    Used by the Analytics tab in the frontend.
    """
    today = datetime.now()
    week_ago  = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # ── All messages ──────────────────────────────────────────────────────────
    all_messages = db.query(Message).filter(
        Message.company_id == company_id
    ).all()

    inbound  = [m for m in all_messages if m.direction == "inbound"]
    outbound = [m for m in all_messages if m.direction == "outbound"]

    # ── Last 7 days ───────────────────────────────────────────────────────────
    recent = [m for m in inbound if m.created_at and m.created_at >= week_ago]

    # ── Sentiment breakdown ───────────────────────────────────────────────────
    sentiments = [m.ai_sentiment for m in inbound if m.ai_sentiment]
    sentiment_counts = Counter(sentiments)
    total_analyzed = len(sentiments) or 1

    sentiment_breakdown = {
        "positive": round(sentiment_counts.get("positive", 0) / total_analyzed * 100, 1),
        "neutral":  round(sentiment_counts.get("neutral", 0)  / total_analyzed * 100, 1),
        "negative": round(sentiment_counts.get("negative", 0) / total_analyzed * 100, 1),
        "urgent":   round(sentiment_counts.get("urgent", 0)   / total_analyzed * 100, 1),
    }

    # ── Intent breakdown ──────────────────────────────────────────────────────
    intents = [m.ai_intent for m in inbound if m.ai_intent]
    intent_counts = Counter(intents)
    intent_breakdown = dict(intent_counts.most_common(6))

    # ── Average response time ─────────────────────────────────────────────────
    responded = [
        m for m in inbound
        if m.responded_at and m.created_at
    ]
    if responded:
        times = [
            (m.responded_at - m.created_at).total_seconds() / 60
            for m in responded
        ]
        avg_response_minutes = round(sum(times) / len(times), 1)
    else:
        avg_response_minutes = None

    # ── Busiest hours ─────────────────────────────────────────────────────────
    hour_counts = Counter()
    for m in inbound:
        if m.created_at:
            hour_counts[m.created_at.hour] += 1

    busiest_hours = [
        {"hour": f"{h:02d}:00", "messages": count}
        for h, count in sorted(hour_counts.items())
    ]

    # ── Messages by platform ──────────────────────────────────────────────────
    platform_counts = Counter(m.platform for m in inbound)
    messages_by_platform = dict(platform_counts)

    # ── Trending topics ───────────────────────────────────────────────────────
    all_topics = []
    for m in recent:
        all_topics.extend(m.ai_topics or [])
    topic_counts = Counter(all_topics)
    trending_topics = [
        {"topic": t, "count": c}
        for t, c in topic_counts.most_common(8)
    ]

    # ── Contact stats ─────────────────────────────────────────────────────────
    contacts = db.query(Contact).filter(
        Contact.company_id == company_id
    ).all()

    total_contacts    = len(contacts)
    at_risk_contacts  = [c for c in contacts if c.risk_level in ["alto", "critico"]]
    vip_contacts      = [c for c in contacts if c.is_vip]
    avg_satisfaction  = round(
        sum(c.sentiment_score for c in contacts) / total_contacts, 2
    ) if contacts else 0.0

    # ── Pending messages ──────────────────────────────────────────────────────
    pending  = len([m for m in inbound if m.status == "pending"])
    drafts   = len([m for m in inbound if m.status == "draft_ready"])
    requires_human = len([m for m in inbound if m.requires_human and m.status not in ["sent", "auto_sent"]])

    # ── Week over week comparison ─────────────────────────────────────────────
    two_weeks_ago = today - timedelta(days=14)
    prev_week = [
        m for m in inbound
        if m.created_at and two_weeks_ago <= m.created_at < week_ago
    ]
    messages_this_week = len(recent)
    messages_last_week = len(prev_week)
    week_change_pct = round(
        ((messages_this_week - messages_last_week) / max(messages_last_week, 1)) * 100, 1
    )

    # ── Clients needing attention ─────────────────────────────────────────────
    clients_needing_attention = [
        {
            "id":          c.id,
            "name":        c.name,
            "risk_level":  c.risk_level,
            "sentiment_score": c.sentiment_score,
            "trend":       c.sentiment_trend,
            "last_contact": str(c.last_contact_at) if c.last_contact_at else None,
        }
        for c in sorted(at_risk_contacts, key=lambda x: x.sentiment_score)[:5]
    ]

    return {
        "overview": {
            "total_contacts":         total_contacts,
            "total_messages":         len(all_messages),
            "messages_this_week":     messages_this_week,
            "messages_last_week":     messages_last_week,
            "week_change_pct":        week_change_pct,
            "pending_responses":      pending,
            "drafts_ready":           drafts,
            "requires_human":         requires_human,
            "at_risk_contacts":       len(at_risk_contacts),
            "vip_contacts":           len(vip_contacts),
            "avg_satisfaction":       avg_satisfaction,
            "avg_response_minutes":   avg_response_minutes,
        },
        "sentiment_breakdown":        sentiment_breakdown,
        "intent_breakdown":           intent_breakdown,
        "messages_by_platform":       messages_by_platform,
        "busiest_hours":              busiest_hours,
        "trending_topics":            trending_topics,
        "clients_needing_attention":  clients_needing_attention,
    }


def get_contact_analytics(db: Session, contact_id: int, company_id: int) -> dict:
    """
    Per-contact analytics — full sentiment history,
    response times, topics, message frequency.
    """
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.company_id == company_id
    ).first()

    if not contact:
        return {}

    messages = db.query(Message).filter(
        Message.contact_id == contact_id,
        Message.direction == "inbound"
    ).order_by(Message.created_at.asc()).all()

    sentiments = [m.ai_sentiment for m in messages if m.ai_sentiment]
    sentiment_counts = Counter(sentiments)

    all_topics = []
    for m in messages:
        all_topics.extend(m.ai_topics or [])
    top_topics = [t for t, _ in Counter(all_topics).most_common(5)]

    return {
        "contact": {
            "id":               contact.id,
            "name":             contact.name,
            "email":            contact.email,
            "phone":            contact.phone,
            "platform":         contact.platform,
            "is_vip":           contact.is_vip,
            "sentiment_score":  contact.sentiment_score,
            "sentiment_trend":  contact.sentiment_trend,
            "sentiment_history": contact.sentiment_history or [],
            "risk_level":       contact.risk_level,
            "total_messages":   contact.total_messages,
            "last_contact_at":  str(contact.last_contact_at) if contact.last_contact_at else None,
        },
        "sentiment_breakdown": dict(sentiment_counts),
        "top_topics":          top_topics,
        "total_messages":      len(messages),
    }


def get_latest_sentiment_report(db: Session, company_id: int) -> dict:
    """Returns the most recent weekly sentiment report."""
    report = db.query(SentimentReport).filter(
        SentimentReport.company_id == company_id
    ).order_by(SentimentReport.generated_at.desc()).first()

    if not report:
        return {}

    return {
        "week_of":         str(report.week_of),
        "overall_score":   report.overall_score,
        "total_messages":  report.total_messages,
        "positive_pct":    report.positive_pct,
        "negative_pct":    report.negative_pct,
        "neutral_pct":     report.neutral_pct,
        "clients_at_risk": report.clients_at_risk,
        "trending_topics": report.trending_topics,
        "narrative":       report.claude_narrative,
        "generated_at":    str(report.generated_at),
    }