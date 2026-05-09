from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from datetime import datetime
from core.database import Base


class SystemPrompt(Base):
    """
    Prompts del sistema guardados en PostgreSQL.
    Los módulos los leen en cada llamada a Claude.
    """
    __tablename__ = "system_prompts"

    id           = Column(Integer, primary_key=True, index=True)
    key          = Column(String(100), unique=True, nullable=False, index=True)
    name         = Column(String(200), nullable=False)
    module       = Column(String(100), nullable=False)
    description  = Column(Text)
    content      = Column(Text, nullable=False)
    variables    = Column(String(500))   # JSON string: ["sector","ventas"]
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by   = Column(String(200))   # email del admin que lo editó
