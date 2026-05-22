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

class CostEntry(Base):
    __tablename__ = "cost_entries"
    id            = Column(Integer, primary_key=True, index=True)
    company_id    = Column(Integer, ForeignKey("companies.id"), nullable=False)
    category_id   = Column(Integer, ForeignKey("cost_categories.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("cost_departments.id"), nullable=True)
    description   = Column(String(300), nullable=False)
    amount        = Column(Float, nullable=False)
    date          = Column(DateTime, default=datetime.utcnow)
    notes         = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    category      = relationship("CostCategory", back_populates="expenses")
    department    = relationship("CostDepartment", back_populates="expenses")
