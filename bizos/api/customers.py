from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from core.database import get_db
from services.graph.sync import sync_contact
from core.security import get_current_user
from models.user import User
from models.customer import Contact, Message, KnowledgeBase, AutoResponse, EmailConfig
from modules.customers.ai import (
    analyze_message, update_contact_sentiment,
    generate_sentiment_report, extract_knowledge_from_document
)
from modules.customers.email import (
    fetch_new_emails, send_email_reply, test_email_connection
)
from modules.customers.analytics import (
    get_inbox_analytics, get_contact_analytics, get_latest_sentiment_report
)

router = APIRouter(prefix="/api/clientes", tags=["Atención al Cliente"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name:     str
    email:    Optional[str] = None
    phone:    Optional[str] = None
    platform: Optional[str] = "manual"
    is_vip:   Optional[bool] = False
    notes:    Optional[str] = None

class MessageCreate(BaseModel):
    contact_id:   Optional[int] = None
    contact_name: Optional[str] = None
    platform:     Optional[str] = "manual"
    content:      str

class MessageEdit(BaseModel):
    draft: str

class KnowledgeBaseCreate(BaseModel):
    title:       str
    full_content: str
    kb_type:     Optional[str] = "general"

class AutoResponseCreate(BaseModel):
    trigger_keywords:  list[str]
    response_template: str
    platform:          Optional[str] = "all"

class EmailConfigCreate(BaseModel):
    imap_host:  str
    imap_port:  Optional[int] = 993
    smtp_host:  str
    smtp_port:  Optional[int] = 587
    email:      str
    password:   str

class ApproveMessage(BaseModel):
    send_via_email: Optional[bool] = False


# ── Helpers ───────────────────────────────────────────────────────────────────

def serialize_contact(c: Contact) -> dict:
    return {
        "id":               c.id,
        "name":             c.name,
        "email":            c.email,
        "phone":            c.phone,
        "platform":         c.platform,
        "is_vip":           c.is_vip,
        "notes":            c.notes,
        "sentiment_score":  c.sentiment_score,
        "sentiment_trend":  c.sentiment_trend,
        "sentiment_history": c.sentiment_history or [],
        "risk_level":       c.risk_level,
        "last_sentiment":   c.last_sentiment,
        "total_messages":   c.total_messages,
        "last_contact_at":  str(c.last_contact_at) if c.last_contact_at else None,
        "created_at":       str(c.created_at),
    }


def serialize_message(m: Message) -> dict:
    return {
        "id":              m.id,
        "contact_id":      m.contact_id,
        "platform":        m.platform,
        "direction":       m.direction,
        "content":         m.content,
        "status":          m.status,
        "ai_draft":        m.ai_draft,
        "ai_sentiment":    m.ai_sentiment,
        "ai_intent":       m.ai_intent,
        "ai_topics":       m.ai_topics or [],
        "ai_confidence":   m.ai_confidence,
        "requires_human":  m.requires_human,
        "urgency_score":   m.urgency_score,
        "responded_at":    str(m.responded_at) if m.responded_at else None,
        "created_at":      str(m.created_at),
    }


# ── Contacts ──────────────────────────────────────────────────────────────────

@router.get("/contactos")
def list_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = db.query(Contact).filter(
        Contact.company_id == current_user.company_id
    ).order_by(Contact.last_contact_at.desc().nullslast()).all()

    return {
        "total": len(contacts),
        "contacts": [serialize_contact(c) for c in contacts]
    }


@router.post("/contactos", status_code=201)
def create_contact(
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = Contact(
        company_id=current_user.company_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        platform=data.platform or "manual",
        is_vip=data.is_vip or False,
        notes=data.notes,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return serialize_contact(contact)


@router.get("/contactos/{contact_id}")
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.company_id == current_user.company_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    messages = db.query(Message).filter(
        Message.contact_id == contact_id
    ).order_by(Message.created_at.desc()).all()

    analytics = get_contact_analytics(db, contact_id, current_user.company_id)

    return {
        **serialize_contact(contact),
        "messages":  [serialize_message(m) for m in messages],
        "analytics": analytics,
    }


@router.put("/contactos/{contact_id}/vip")
def toggle_vip(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.company_id == current_user.company_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    contact.is_vip = not contact.is_vip
    db.commit()
    return {"is_vip": contact.is_vip}


# ── Inbox / Messages ──────────────────────────────────────────────────────────

@router.get("/inbox")
def get_inbox(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Message).filter(
        Message.company_id == current_user.company_id,
        Message.direction == "inbound"
    )
    if status:
        query = query.filter(Message.status == status)

    messages = query.order_by(
        Message.urgency_score.desc(),
        Message.created_at.desc()
    ).all()

    # Enrich with contact info
    result = []
    for m in messages:
        contact = db.query(Contact).filter(Contact.id == m.contact_id).first()
        msg_dict = serialize_message(m)
        msg_dict["contact"] = serialize_contact(contact) if contact else None
        result.append(msg_dict)

    pending      = len([m for m in messages if m.status == "pending"])
    draft_ready  = len([m for m in messages if m.status == "draft_ready"])
    requires_human = len([m for m in messages if m.requires_human and m.status not in ["sent", "auto_sent"]])

    return {
        "total":            len(result),
        "pending":          pending,
        "draft_ready":      draft_ready,
        "requires_human":   requires_human,
        "messages":         result,
    }


@router.post("/mensaje", status_code=201)
def receive_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Receives a new inbound message (manual or from integration).
    Automatically runs Claude analysis and generates a draft response.
    """
    company_id = current_user.company_id

    # ── Find or create contact ────────────────────────────────────────────────
    contact = None
    if data.contact_id:
        contact = db.query(Contact).filter(
            Contact.id == data.contact_id,
            Contact.company_id == company_id
        ).first()

    if not contact and data.contact_name:
        contact = Contact(
            company_id=company_id,
            name=data.contact_name,
            platform=data.platform or "manual",
        )
        db.add(contact)
        db.flush()

    if not contact:
        raise HTTPException(status_code=400, detail="Se requiere contact_id o contact_name")

    # ── Get conversation history ──────────────────────────────────────────────
    history = db.query(Message).filter(
        Message.contact_id == contact.id
    ).order_by(Message.created_at.desc()).limit(5).all()

    history_list = [
        {"direction": m.direction, "content": m.content}
        for m in reversed(history)
    ]

    # ── Save message first ────────────────────────────────────────────────────
    message = Message(
        company_id=company_id,
        contact_id=contact.id,
        platform=data.platform or "manual",
        direction="inbound",
        content=data.content,
        status="pending",
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    # ── Run Claude analysis ───────────────────────────────────────────────────
    analysis = analyze_message(
        db=db,
        company_id=company_id,
        message_content=data.content,
        contact_name=contact.name,
        platform=data.platform or "manual",
        conversation_history=history_list,
    )

    # ── Update message with analysis ──────────────────────────────────────────
    message.ai_draft        = analysis.get("respuesta_borrador")
    message.ai_sentiment    = analysis.get("sentimiento")
    message.ai_intent       = analysis.get("intencion")
    message.ai_topics       = analysis.get("temas", [])
    message.ai_confidence   = analysis.get("confianza", 0.0)
    message.requires_human  = analysis.get("requiere_humano", False)
    message.urgency_score   = analysis.get("puntuacion_urgencia", 0)
    message.status          = "draft_ready"
    db.commit()

    # ── Update contact sentiment ──────────────────────────────────────────────
    update_contact_sentiment(db, contact, analysis.get("sentimiento", "neutral"))

    return {
        "message":  serialize_message(message),
        "contact":  serialize_contact(contact),
        "analysis": analysis,
    }


@router.post("/mensaje/{message_id}/aprobar")
def approve_message(
    message_id: int,
    data: ApproveMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approves Claude's draft and marks it as sent."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.company_id == current_user.company_id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    # Send via email if contact has email and flag is set
    if data.send_via_email and message.ai_draft:
        contact = db.query(Contact).filter(Contact.id == message.contact_id).first()
        if contact and contact.email:
            send_email_reply(
                db=db,
                company_id=current_user.company_id,
                to_email=contact.email,
                subject="Re: Tu consulta",
                body=message.ai_draft,
            )

    message.status       = "sent"
    message.responded_at = datetime.now()

    # Create outbound message record
    outbound = Message(
        company_id=current_user.company_id,
        contact_id=message.contact_id,
        platform=message.platform,
        direction="outbound",
        content=message.ai_draft or "",
        status="sent",
        responded_at=datetime.now(),
    )
    db.add(outbound)
    db.commit()

    return {"success": True, "message": serialize_message(message)}


@router.post("/mensaje/{message_id}/editar")
def edit_and_send(
    message_id: int,
    data: MessageEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves edited draft and marks as sent."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.company_id == current_user.company_id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    message.ai_draft     = data.draft
    message.status       = "sent"
    message.responded_at = datetime.now()

    outbound = Message(
        company_id=current_user.company_id,
        contact_id=message.contact_id,
        platform=message.platform,
        direction="outbound",
        content=data.draft,
        status="sent",
        responded_at=datetime.now(),
    )
    db.add(outbound)
    db.commit()

    return {"success": True, "message": serialize_message(message)}


@router.post("/mensaje/{message_id}/rechazar")
def reject_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rejects Claude's draft — owner will respond manually."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.company_id == current_user.company_id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    message.status = "rejected"
    db.commit()
    return {"success": True}


# ── Knowledge Base ────────────────────────────────────────────────────────────

@router.get("/knowledge-base")
def get_knowledge_base(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entries = db.query(KnowledgeBase).filter(
        KnowledgeBase.company_id == current_user.company_id
    ).all()
    return {
        "total": len(entries),
        "entries": [
            {
                "id":              e.id,
                "title":           e.title,
                "kb_type":         e.kb_type,
                "content_summary": e.content_summary,
                "is_active":       e.is_active,
                "created_at":      str(e.created_at),
            }
            for e in entries
        ]
    }


@router.post("/knowledge-base", status_code=201)
def add_knowledge_base(
    data: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    extracted = extract_knowledge_from_document(
        content=data.full_content,
        title=data.title,
        kb_type=data.kb_type or "general",
    )
    entry = KnowledgeBase(
        company_id=current_user.company_id,
        title=data.title,
        full_content=data.full_content,
        content_summary=extracted.get("resumen", ""),
        kb_type=data.kb_type or "general",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id":              entry.id,
        "title":           entry.title,
        "kb_type":         entry.kb_type,
        "content_summary": entry.content_summary,
        "extracted":       extracted,
    }


@router.delete("/knowledge-base/{entry_id}")
def delete_knowledge_base(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == entry_id,
        KnowledgeBase.company_id == current_user.company_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    entry.is_active = False
    db.commit()
    return {"success": True}


# ── Email Config ──────────────────────────────────────────────────────────────

@router.post("/email/conectar")
def connect_email(
    data: EmailConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    test = test_email_connection(
        data.imap_host, data.imap_port, data.email, data.password
    )
    if not test["success"]:
        raise HTTPException(status_code=400, detail=test["message"])

    config = db.query(EmailConfig).filter(
        EmailConfig.company_id == current_user.company_id
    ).first()

    if config:
        config.imap_host    = data.imap_host
        config.imap_port    = data.imap_port
        config.smtp_host    = data.smtp_host
        config.smtp_port    = data.smtp_port
        config.email        = data.email
        config.password     = data.password
        config.is_connected = True
    else:
        config = EmailConfig(
            company_id=current_user.company_id,
            imap_host=data.imap_host,
            imap_port=data.imap_port,
            smtp_host=data.smtp_host,
            smtp_port=data.smtp_port,
            email=data.email,
            password=data.password,
            is_connected=True,
        )
        db.add(config)

    db.commit()
    return {"success": True, "message": test["message"]}


@router.post("/email/sync")
def sync_emails(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_messages = fetch_new_emails(db, current_user.company_id)
    return {
        "synced":   len(new_messages),
        "messages": new_messages,
    }


@router.get("/email/config")
def get_email_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = db.query(EmailConfig).filter(
        EmailConfig.company_id == current_user.company_id
    ).first()
    if not config:
        return {"connected": False}
    return {
        "connected":    config.is_connected,
        "email":        config.email,
        "imap_host":    config.imap_host,
        "last_sync_at": str(config.last_sync_at) if config.last_sync_at else None,
    }


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_inbox_analytics(db, current_user.company_id)


@router.get("/sentiment-report")
def get_sentiment_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_latest_sentiment_report(db, current_user.company_id)


@router.post("/sentiment-report/generar")
def generate_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return generate_sentiment_report(db, current_user.company_id)


# ── Auto responses ────────────────────────────────────────────────────────────

@router.get("/auto-responses")
def get_auto_responses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    responses = db.query(AutoResponse).filter(
        AutoResponse.company_id == current_user.company_id
    ).all()
    return {
        "total": len(responses),
        "responses": [
            {
                "id":                r.id,
                "trigger_keywords":  r.trigger_keywords,
                "response_template": r.response_template,
                "platform":          r.platform,
                "is_active":         r.is_active,
            }
            for r in responses
        ]
    }


@router.post("/auto-responses", status_code=201)
def create_auto_response(
    data: AutoResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    response = AutoResponse(
        company_id=current_user.company_id,
        trigger_keywords=data.trigger_keywords,
        response_template=data.response_template,
        platform=data.platform or "all",
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return {"id": response.id, "success": True}