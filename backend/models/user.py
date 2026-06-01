from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    country = Column(String, nullable=True)
    users = relationship("User", back_populates="company")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    has_vera_plus = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_superadmin = Column(Boolean, default=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    last_login = Column(String, nullable=True)
    last_2fa_device = Column(String, nullable=True)
    last_2fa_verified = Column(String, nullable=True)
    totp_secret = Column(String, nullable=True)
    totp_enabled = Column(Boolean, default=False)
    totp_verified_at = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    company = relationship("Company", back_populates="users")
