from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from core.database import Base


class Vacation(Base):
    __tablename__ = "vacations"
    __table_args__ = {"extend_existing": True}

    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=False)
    start_date      = Column(Date, nullable=False)
    end_date        = Column(Date, nullable=False)
    days            = Column(Integer, nullable=False)
    vacation_type   = Column(String(30), default="vacation")
    status          = Column(String(20), default="pending")
    notes           = Column(Text, nullable=True)
    requested_at    = Column(DateTime, server_default=func.now())
    approved_by     = Column(Integer, nullable=True)
    approved_at     = Column(DateTime, nullable=True)


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = {"extend_existing": True}

    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=False)
    contract_type   = Column(String(30), nullable=False)
    start_date      = Column(Date, nullable=False)
    end_date        = Column(Date, nullable=True)
    working_hours   = Column(Integer, default=40)
    salary_gross    = Column(Float, nullable=False)
    document_url    = Column(String(500), nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())


class Payslip(Base):
    __tablename__ = "payslips"
    __table_args__ = {"extend_existing": True}

    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=False)
    period_month    = Column(Integer, nullable=False)
    period_year     = Column(Integer, nullable=False)
    gross_amount    = Column(Float, nullable=False)
    net_amount      = Column(Float, nullable=False)
    irpf            = Column(Float, nullable=False)
    ss_employee     = Column(Float, nullable=False)
    ss_company      = Column(Float, nullable=False)
    extras          = Column(Float, default=0)
    document_url    = Column(String(500), nullable=True)
    paid_at         = Column(Date, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())
