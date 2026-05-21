from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id                 = Column(Integer, primary_key=True, index=True)
    company_id         = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name               = Column(String(200), nullable=False)
    email              = Column(String(200), nullable=True)
    phone              = Column(String(50), nullable=True)
    platform           = Column(String(50), default="manual")  # email, whatsapp, instagram, facebook, manual
    is_vip             = Column(Boolean, default=False)
    notes              = Column(Text, nullable=True)

    # Sentiment profile
    sentiment_score    = Column(Float, default=5.0)   # 1-10 running average
    sentiment_trend    = Column(String(20), default="estable")  # mejorando | estable | deteriorando
    sentiment_history  = Column(JSON, default=list)   # [{date, score}]
    risk_level         = Column(String(20), default="bajo")  # bajo | medio | alto | critico
    last_sentiment     = Column(String(20), nullable=True)   # positive | neutral | negative | urgent
    total_messages     = Column(Integer, default=0)

    last_contact_at    = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())

    messages           = relationship("Message", back_populates="contact", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id               = Column(Integer, primary_key=True, index=True)
    company_id       = Column(Integer, ForeignKey("companies.id"), nullable=False)
    contact_id       = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    platform         = Column(String(50), default="manual")
    direction        = Column(String(10), default="inbound")   # inbound | outbound
    content          = Column(Text, nullable=False)
    status           = Column(String(20), default="pending")   # pending | draft_ready | approved | sent | auto_sent | rejected

    # Claude analysis
    ai_draft         = Column(Text, nullable=True)
    ai_sentiment     = Column(String(20), nullable=True)   # positive | neutral | negative | urgent
    ai_intent        = Column(String(30), nullable=True)   # question | complaint | purchase | compliment | other
    ai_topics        = Column(JSON, default=list)          # ["precio", "envío", ...]
    ai_confidence    = Column(Float, default=0.0)          # 0-1 how confident Claude is
    requires_human   = Column(Boolean, default=False)
    urgency_score    = Column(Integer, default=0)          # 0-10

    responded_at     = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, server_default=func.now())

    contact          = relationship("Contact", back_populates="messages")


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id               = Column(Integer, primary_key=True, index=True)
    company_id       = Column(Integer, ForeignKey("companies.id"), nullable=False)
    document_id      = Column(Integer, nullable=True)   # links to Document in upload module
    title            = Column(String(300), nullable=False)
    content_summary  = Column(Text, nullable=True)
    full_content     = Column(Text, nullable=True)
    kb_type          = Column(String(50), default="general")  # faq | product_catalog | pricing | policy | general
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, server_default=func.now())


class AutoResponse(Base):
    __tablename__ = "auto_responses"

    id                = Column(Integer, primary_key=True, index=True)
    company_id        = Column(Integer, ForeignKey("companies.id"), nullable=False)
    trigger_keywords  = Column(JSON, default=list)   # ["horario", "precio", "envío"]
    response_template = Column(Text, nullable=False)
    platform          = Column(String(50), default="all")
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime, server_default=func.now())


class SentimentReport(Base):
    __tablename__ = "sentiment_reports"

    id                = Column(Integer, primary_key=True, index=True)
    company_id        = Column(Integer, ForeignKey("companies.id"), nullable=False)
    week_of           = Column(Date, nullable=False)
    overall_score     = Column(Float, default=5.0)
    clients_at_risk   = Column(JSON, default=list)
    trending_topics   = Column(JSON, default=list)
    claude_narrative  = Column(Text, nullable=True)
    total_messages    = Column(Integer, default=0)
    positive_pct      = Column(Float, default=0.0)
    negative_pct      = Column(Float, default=0.0)
    neutral_pct       = Column(Float, default=0.0)
    generated_at      = Column(DateTime, server_default=func.now())


class EmailConfig(Base):
    __tablename__ = "email_configs"

    id           = Column(Integer, primary_key=True, index=True)
    company_id   = Column(Integer, ForeignKey("companies.id"), nullable=False, unique=True)
    imap_host    = Column(String(200), nullable=True)
    imap_port    = Column(Integer, default=993)
    smtp_host    = Column(String(200), nullable=True)
    smtp_port    = Column(Integer, default=587)
    email        = Column(String(200), nullable=True)
    password     = Column(String(500), nullable=True)   # encrypted in production
    is_connected = Column(Boolean, default=False)
    last_sync_at = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, server_default=func.now())