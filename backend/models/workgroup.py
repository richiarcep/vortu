"""
Grupos de trabajo con tareas para RR.HH. (apto para voluntariado).

Espeja el patrón de models/project.py (Project/Task/TimeEntry) pero independiente:
- WorkGroup       : un grupo/equipo de trabajo (p.ej. "Logística evento").
- WorkGroupMember : relación M:N persona↔grupo, con rol.
- GroupTask       : tarea dentro de un grupo (kanban). Reutiliza TaskStatus/TaskPriority.
- GroupTaskTime   : horas aportadas a una tarea (clave para voluntarios).
"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
# Reusamos los enums de proyectos para no duplicar estados/prioridades.
from models.project import TaskStatus, TaskPriority  # noqa: F401  (consistencia de valores)


class WorkGroup(Base):
    __tablename__ = "work_groups"

    id               = Column(Integer, primary_key=True, index=True)
    company_id       = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name             = Column(String(200), nullable=False)
    description      = Column(Text, nullable=True)
    status           = Column(String(20), default="activo")  # activo | archivado
    lead_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    start_date       = Column(Date, nullable=True)
    end_date         = Column(Date, nullable=True)
    color            = Column(String(20), nullable=True)
    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, server_default=func.now(), onupdate=func.now())

    members = relationship("WorkGroupMember", back_populates="group", cascade="all, delete-orphan")
    tasks   = relationship("GroupTask", back_populates="group", cascade="all, delete-orphan")


class WorkGroupMember(Base):
    __tablename__ = "work_group_members"

    id          = Column(Integer, primary_key=True, index=True)
    group_id    = Column(Integer, ForeignKey("work_groups.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    role        = Column(String(100), nullable=True)
    added_at    = Column(DateTime, server_default=func.now())

    group = relationship("WorkGroup", back_populates="members")


class GroupTask(Base):
    __tablename__ = "group_tasks"

    id              = Column(Integer, primary_key=True, index=True)
    group_id        = Column(Integer, ForeignKey("work_groups.id"), nullable=False)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title           = Column(String(300), nullable=False)
    description     = Column(Text, nullable=True)
    status          = Column(String(20), default="pendiente")  # pendiente|en_progreso|completada|bloqueada
    priority        = Column(String(10), default="media")      # baja|media|alta|urgente
    assigned_to     = Column(Integer, ForeignKey("employees.id"), nullable=True)
    due_date        = Column(Date, nullable=True)
    estimated_hours = Column(Float, default=0.0)
    actual_hours    = Column(Float, default=0.0)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    group     = relationship("WorkGroup", back_populates="tasks")
    time_logs = relationship("GroupTaskTime", back_populates="task", cascade="all, delete-orphan")


class GroupTaskTime(Base):
    __tablename__ = "group_task_times"

    id          = Column(Integer, primary_key=True, index=True)
    task_id     = Column(Integer, ForeignKey("group_tasks.id"), nullable=False)
    group_id    = Column(Integer, ForeignKey("work_groups.id"), nullable=False)
    company_id  = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    hours       = Column(Float, nullable=False)
    date        = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    task = relationship("GroupTask", back_populates="time_logs")
