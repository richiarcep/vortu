from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

PLANS = {
    "trial": {
        "name": "Free Trial",
        "price_monthly": 0,
        "license_price": 0,
        "duration_days": 14,
        "max_users": 10,
        "ai_queries_monthly": 99999,
        "max_documents_monthly": 99999,
        "modules": ["dashboard","contabilidad","finanzas","hr","proyectos","clientes","ventas","documentos","agente","marketing"],
    },
    "starter": {
        "name": "Starter",
        "price_monthly": 9,
        "license_price": 149,
        "max_users": 1,
        "extra_user_price": 8,
        "ai_queries_monthly": 50,
        "max_documents_monthly": 25,
        "modules": ["dashboard","contabilidad","finanzas","ventas"],
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 19,
        "license_price": 299,
        "max_users": 3,
        "extra_user_price": 8,
        "ai_queries_monthly": 500,
        "max_documents_monthly": 50,
        "modules": ["dashboard","contabilidad","finanzas","ventas","hr","proyectos","clientes","documentos","agente"],
    },
    "business": {
        "name": "Business",
        "price_monthly": 39,
        "license_price": 499,
        "max_users": 10,
        "extra_user_price": 8,
        "ai_queries_monthly": 99999,
        "max_documents_monthly": 99999,
        "modules": ["dashboard","contabilidad","finanzas","ventas","hr","proyectos","clientes","documentos","agente","marketing"],
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 0,
        "license_price": 0,
        "max_users": 99999,
        "extra_user_price": 0,
        "ai_queries_monthly": 99999,
        "max_documents_monthly": 99999,
        "modules": ["dashboard","contabilidad","finanzas","ventas","hr","proyectos","clientes","documentos","agente","marketing"],
    },
}

class License(Base):
    __tablename__ = "billing_licenses"
    id                       = Column(Integer, primary_key=True, index=True)
    user_id                  = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    plan_id                  = Column(String(50), nullable=False)
    stripe_payment_intent_id = Column(String(200))
    stripe_customer_id       = Column(String(200))
    amount_paid              = Column(Float, default=0)
    currency                 = Column(String(10), default="eur")
    paid_at                  = Column(DateTime)
    status                   = Column(String(50), default="pending")
    created_at               = Column(DateTime, default=datetime.utcnow)

class Subscription(Base):
    __tablename__ = "billing_subscriptions"
    id                     = Column(Integer, primary_key=True, index=True)
    user_id                = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    plan_id                = Column(String(50), nullable=False)
    stripe_subscription_id = Column(String(200), unique=True)
    stripe_customer_id     = Column(String(200))
    stripe_price_id        = Column(String(200))
    status                 = Column(String(50), default="trialing")
    trial_start            = Column(DateTime)
    trial_end              = Column(DateTime)
    trial_used             = Column(Boolean, default=False)
    current_period_start   = Column(DateTime)
    current_period_end     = Column(DateTime)
    cancel_at_period_end   = Column(Boolean, default=False)
    canceled_at            = Column(DateTime)
    fase                   = Column(String(20), default="beta")  # beta | early_adopter | paid
    fase_expiry            = Column(DateTime, nullable=True)  # cuando vence el periodo gratis
    extra_users            = Column(Integer, default=0)
    extra_users_price_id   = Column(String(200))
    license_paid               = Column(Boolean, default=False)
    pending_downgrade_plan     = Column(String(50), nullable=True)
    created_at             = Column(DateTime, default=datetime.utcnow)
    updated_at             = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    usage = relationship("UsageTracking", back_populates="subscription")

class UsageTracking(Base):
    __tablename__ = "billing_usage"
    id              = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("billing_subscriptions.id"), nullable=False)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_start    = Column(DateTime, nullable=False)
    period_end      = Column(DateTime, nullable=False)
    ai_queries_used = Column(Integer, default=0)
    documents_used  = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    subscription = relationship("Subscription", back_populates="usage")

class BillingEvent(Base):
    __tablename__ = "billing_events"
    id              = Column(Integer, primary_key=True, index=True)
    stripe_event_id = Column(String(200), unique=True)
    event_type      = Column(String(100))
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=True)
    data            = Column(Text)
    processed       = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

class TeamMember(Base):
    __tablename__ = "billing_team_members"
    id             = Column(Integer, primary_key=True, index=True)
    owner_user_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    member_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email          = Column(String(200), nullable=False)
    role           = Column(String(50), default="member")
    status         = Column(String(50), default="pending")
    invite_token   = Column(String(200))
    invited_at     = Column(DateTime, default=datetime.utcnow)
    joined_at      = Column(DateTime)
