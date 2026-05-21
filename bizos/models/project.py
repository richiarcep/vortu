from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
import enum


class ProjectStatus(str, enum.Enum):
    borrador = "borrador"
    activo = "activo"
    pausado = "pausado"
    completado = "completado"
    cancelado = "cancelado"


class TaskStatus(str, enum.Enum):
    pendiente = "pendiente"
    en_progreso = "en_progreso"
    completada = "completada"
    bloqueada = "bloqueada"


class TaskPriority(str, enum.Enum):
    baja = "baja"
    media = "media"
    alta = "alta"
    urgente = "urgente"


class Project(Base):
    __tablename__ = "projects"

    id                    = Column(Integer, primary_key=True, index=True)
    company_id            = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name                  = Column(String(200), nullable=False)
    description           = Column(Text, nullable=True)
    client_name           = Column(String(200), nullable=True)
    status                = Column(String(20), default="activo")
    start_date            = Column(Date, nullable=True)
    deadline              = Column(Date, nullable=True)
    budget                = Column(Float, default=0.0)
    health_score          = Column(Float, default=10.0)
    completion_percentage = Column(Float, default=0.0)
    last_ai_analysis      = Column(Text, nullable=True)
    last_analyzed_at      = Column(DateTime, nullable=True)
    created_at            = Column(DateTime, server_default=func.now())
    updated_at            = Column(DateTime, server_default=func.now(), onupdate=func.now())

    tasks    = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    expenses = relationship("ProjectExpense", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id               = Column(Integer, primary_key=True, index=True)
    project_id       = Column(Integer, ForeignKey("projects.id"), nullable=False)
    company_id       = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title            = Column(String(300), nullable=False)
    description      = Column(Text, nullable=True)
    status           = Column(String(20), default="pendiente")
    priority         = Column(String(10), default="media")
    assigned_to      = Column(Integer, ForeignKey("employees.id"), nullable=True)
    due_date         = Column(Date, nullable=True)
    estimated_hours  = Column(Float, default=0.0)
    actual_hours     = Column(Float, default=0.0)
    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project     = relationship("Project", back_populates="tasks")
    time_entries = relationship("TimeEntry", back_populates="task", cascade="all, delete-orphan")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id          = Column(Integer, primary_key=True, index=True)
    task_id     = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    company_id  = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    hours       = Column(Float, nullable=False)
    date        = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    cost        = Column(Float, default=0.0)
    created_at  = Column(DateTime, server_default=func.now())

    task = relationship("Task", back_populates="time_entries")


class ProjectExpense(Base):
    __tablename__ = "project_expenses"

    id          = Column(Integer, primary_key=True, index=True)
    project_id  = Column(Integer, ForeignKey("projects.id"), nullable=False)
    company_id  = Column(Integer, ForeignKey("companies.id"), nullable=False)
    description = Column(String(300), nullable=False)
    amount      = Column(Float, nullable=False)
    date        = Column(Date, nullable=False)
    category    = Column(String(100), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="expenses")