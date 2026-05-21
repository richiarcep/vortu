from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # csv, pdf, xlsx
    file_path = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, processing, complete, failed
    module = Column(String, nullable=False)  # finance, hr, marketing
    ai_result = Column(Text, nullable=True)  # JSON string from Claude
    error_message = Column(Text, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", backref="documents")
    uploader = relationship("User", backref="documents")