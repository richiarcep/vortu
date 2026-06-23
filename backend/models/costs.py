from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class CostCategory(Base):
    __tablename__ = "cost_categories"
    id         = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name       = Column(String(100), nullable=False)
    color      = Column(String(20), default="#6b7280")
    icon       = Column(String(10), default="💰")
    created_at = Column(DateTime, default=datetime.utcnow)
    expenses   = relationship("CostEntry", back_populates="category")

class CostDepartment(Base):
    __tablename__ = "cost_departments"
    id         = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name       = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expenses   = relationship("CostEntry", back_populates="department")

class CostProvider(Base):
    """Proveedor como entidad de primera clase (antes iba como texto en notes)."""
    __tablename__ = "cost_providers"
    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name            = Column(String(200), nullable=False)
    # Nombre normalizado para deduplicar ("Repsol" == "REPSOL S.A."). Unicidad
    # (company_id, normalized_name) garantizada por índice en ensure_runtime_schema.
    normalized_name = Column(String(200), nullable=False, index=True)
    nif             = Column(String(40), nullable=True)
    iban            = Column(String(40), nullable=True)
    email           = Column(String(200), nullable=True)
    phone           = Column(String(40), nullable=True)
    payment_terms   = Column(String(80), nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    expenses        = relationship("CostEntry", back_populates="provider")

class CostEntry(Base):
    __tablename__ = "cost_entries"
    id            = Column(Integer, primary_key=True, index=True)
    company_id    = Column(Integer, ForeignKey("companies.id"), nullable=False)
    category_id   = Column(Integer, ForeignKey("cost_categories.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("cost_departments.id"), nullable=True)
    provider_id   = Column(Integer, ForeignKey("cost_providers.id"), nullable=True, index=True)
    description   = Column(String(300), nullable=False)
    amount        = Column(Float, nullable=False)
    date          = Column(DateTime, default=datetime.utcnow)
    notes         = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    category      = relationship("CostCategory", back_populates="expenses")
    department    = relationship("CostDepartment", back_populates="expenses")
    provider      = relationship("CostProvider", back_populates="expenses")
