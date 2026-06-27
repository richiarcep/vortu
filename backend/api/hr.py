from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user, get_tenant_db
from core.audit import audit_event
from models.user import User
from models.document import Document
from modules.hr.employees import Employee, EmployeeFeedback, analyze_feedback
from modules.hr.payroll import process_payroll
from modules.hr.extended import Vacation, Contract, Payslip
from models.workgroup import WorkGroup, WorkGroupMember, GroupTask, GroupTaskTime
from datetime import date, datetime, timedelta
import json
import os


def _parse_date(value):
    """Acepta 'YYYY-MM-DD' o None y devuelve date|None."""
    if not value:
        return None
    return datetime.fromisoformat(value).date()

router = APIRouter(prefix="/api/hr", tags=["HR & Payroll"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    full_name: str
    email: str
    department: Optional[str] = None
    position: Optional[str] = None
    gross_salary: float = 0.0
    employee_type: Optional[str] = "permanente"   # permanente | temporal | voluntario
    start_date: Optional[str] = None              # ISO date
    end_date: Optional[str] = None
    availability: Optional[str] = None
    skills: Optional[str] = None


class WorkGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    lead_employee_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    color: Optional[str] = None


class WorkGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None                  # activo | archivado
    lead_employee_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    color: Optional[str] = None


class GroupMemberCreate(BaseModel):
    employee_id: int
    role: Optional[str] = None


class GroupTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "media"
    assigned_to: Optional[int] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = 0.0


class GroupTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None


class GroupTaskTimeCreate(BaseModel):
    employee_id: Optional[int] = None
    hours: float
    date: Optional[str] = None                    # ISO date; default hoy
    description: Optional[str] = None


class VacationCreate(BaseModel):
    employee_id: int
    start_date: str       # ISO date YYYY-MM-DD
    end_date: str
    vacation_type: Optional[str] = "vacation"
    notes: Optional[str] = None


class VacationUpdate(BaseModel):
    status: str           # approved | rejected
    notes: Optional[str] = None


class VeraHRRequest(BaseModel):
    question: Optional[str] = None


class FeedbackCreate(BaseModel):
    employee_id: int
    content: str


class FeedbackBatchAnalyze(BaseModel):
    comments: list[str]


# ── Employee routes ───────────────────────────────────────────────────────────

@router.post("/employees", status_code=201)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new employee record."""

    existing = db.query(Employee).filter(
        Employee.company_id == current_user.company_id,
        Employee.email == data.email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee email already exists")

    emp_type = (data.employee_type or "permanente").lower()
    if emp_type not in ("permanente", "temporal", "voluntario"):
        raise HTTPException(status_code=400, detail="employee_type inválido")

    # Los voluntarios no son remunerados.
    salary = 0.0 if emp_type == "voluntario" else (data.gross_salary or 0.0)

    employee = Employee(
        full_name=data.full_name,
        email=data.email,
        department=data.department,
        position=data.position,
        gross_salary=salary,
        employee_type=emp_type,
        start_date=_parse_date(data.start_date),
        end_date=_parse_date(data.end_date),
        availability=data.availability,
        skills=data.skills,
        company_id=current_user.company_id
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return _serialize_employee(employee)


def _serialize_employee(e: Employee) -> dict:
    return {
        "id": e.id,
        "full_name": e.full_name,
        "email": e.email,
        "department": e.department,
        "position": e.position,
        "gross_salary": e.gross_salary,
        "employee_type": getattr(e, "employee_type", "permanente") or "permanente",
        "start_date": e.start_date.isoformat() if getattr(e, "start_date", None) else None,
        "end_date": e.end_date.isoformat() if getattr(e, "end_date", None) else None,
        "availability": getattr(e, "availability", None),
        "skills": getattr(e, "skills", None),
    }


@router.get("/employees")
def get_employees(
    type: Optional[str] = None,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all employees for the company. Optional ?type= filter."""
    q = db.query(Employee).filter(
        Employee.company_id == current_user.company_id,
        Employee.is_active == True
    )
    if type:
        q = q.filter(Employee.employee_type == type)
    employees = q.all()

    # Horas aportadas por empleado (suma de registros en tareas de grupo).
    hours_rows = db.query(
        GroupTaskTime.employee_id,
        func.coalesce(func.sum(GroupTaskTime.hours), 0.0)
    ).filter(
        GroupTaskTime.company_id == current_user.company_id
    ).group_by(GroupTaskTime.employee_id).all()
    hours_by_emp = {emp_id: float(total) for emp_id, total in hours_rows}

    result = []
    for e in employees:
        item = _serialize_employee(e)
        item["hours_contributed"] = round(hours_by_emp.get(e.id, 0.0), 2)
        result.append(item)
    return result


@router.delete("/employees/{employee_id}")
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivates an employee (soft delete)."""
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.is_active = False
    db.commit()

    return {"message": f"{employee.full_name} deactivated successfully"}


# ── Payroll routes ────────────────────────────────────────────────────────────

@router.get("/payroll/{document_id}")
def process_payroll_document(
    document_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """
    Takes an uploaded payroll file and calculates
    net wages for every employee automatically.
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.company_id == current_user.company_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    from services.parsers import parse_file
    parsed_data = parse_file(document.file_path, document.file_type)

    result = process_payroll(parsed_data, country=current_user.company.country)

    return {
        "document_id": document_id,
        "filename": document.filename,
        "payroll": result
    }


@router.get("/payslip/{employee_name}")
def download_payslip(
    employee_name: str,
    request: Request,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Downloads a generated payslip PDF for an employee of the caller's company."""
    from core.files import safe_filename
    # Sanitize the path param (kills ../ traversal) and rebuild the path from the
    # safe value only — never from the raw param.
    safe_name = safe_filename(employee_name)

    # Authorize: the requested payslip must belong to an employee of THIS company.
    # Payslips are named from full_name with spaces → underscores (payroll.py).
    requested = safe_name.replace("_", " ").strip().lower()
    owns = (
        db.query(Employee)
        .filter(
            Employee.company_id == current_user.company_id,
            func.lower(func.replace(Employee.full_name, " ", "_")) == safe_name.lower(),
        )
        .first()
    )
    if not owns:
        # Fall back to a looser name match, still scoped to the company.
        owns = (
            db.query(Employee)
            .filter(
                Employee.company_id == current_user.company_id,
                func.lower(Employee.full_name) == requested,
            )
            .first()
        )
    if not owns:
        raise HTTPException(status_code=404, detail="Payslip not found.")

    filename = os.path.join("payslips", f"{safe_name}_payslip.pdf")
    if not os.path.exists(filename):
        raise HTTPException(
            status_code=404,
            detail="Payslip not found. Run payroll processing first."
        )

    audit_event(db, "data_export", actor_user_id=current_user.id, actor_email=current_user.email,
                target=f"employee:{owns.id}", company_id=current_user.company_id, request=request,
                detail={"resource": "payslip_pdf"})
    return FileResponse(
        filename,
        media_type="application/pdf",
        filename=f"{safe_name}_payslip.pdf"
    )


# ── Feedback routes ───────────────────────────────────────────────────────────

@router.post("/feedback", status_code=201)
def add_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Adds a feedback comment for an employee."""
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.company_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    feedback = EmployeeFeedback(
        employee_id=data.employee_id,
        content=data.content
    )
    db.add(feedback)
    db.commit()

    return {"message": "Feedback added successfully"}


@router.post("/feedback/analyze")
def analyze_employee_feedback(
    data: FeedbackBatchAnalyze,
    current_user: User = Depends(get_current_user)
):
    """
    Sends a batch of feedback comments to Claude
    for sentiment analysis.
    """
    if not data.comments:
        raise HTTPException(status_code=400, detail="No comments provided")

    result = analyze_feedback(data.comments)
    return result


@router.get("/summary")
def get_hr_summary(
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Returns HR overview — headcount, payroll cost, departments."""
    employees = db.query(Employee).filter(
        Employee.company_id == current_user.company_id,
        Employee.is_active == True
    ).all()

    total_gross = sum(e.gross_salary for e in employees)

    departments = {}
    for e in employees:
        dept = e.department or "General"
        if dept not in departments:
            departments[dept] = {"headcount": 0, "total_gross": 0}
        departments[dept]["headcount"] += 1
        departments[dept]["total_gross"] += e.gross_salary

    return {
        "total_employees": len(employees),
        "total_gross_payroll": round(total_gross, 2),
        "departments": departments
    }


# ─── VACACIONES ────────────────────────────────────────────────────────────
@router.get("/vacations")
def list_vacations(
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todas las vacaciones de la empresa."""
    q = db.query(Vacation).filter(Vacation.company_id == current_user.company_id)
    if status:
        q = q.filter(Vacation.status == status)
    if employee_id:
        q = q.filter(Vacation.employee_id == employee_id)
    vacations = q.order_by(Vacation.start_date.desc()).all()

    result = []
    for v in vacations:
        emp = db.query(Employee).filter(Employee.id == v.employee_id).first()
        result.append({
            "id": v.id,
            "employee_id": v.employee_id,
            "employee_name": emp.full_name if emp else None,
            "employee_department": emp.department if emp else None,
            "start_date": v.start_date.isoformat() if v.start_date else None,
            "end_date": v.end_date.isoformat() if v.end_date else None,
            "days": v.days,
            "vacation_type": v.vacation_type,
            "status": v.status,
            "notes": v.notes,
            "requested_at": v.requested_at.isoformat() if v.requested_at else None,
            "approved_at": v.approved_at.isoformat() if v.approved_at else None,
        })

    today = date.today()
    summary = {
        "total":      len(result),
        "pending":    len([v for v in vacations if v.status == "pending"]),
        "approved":   len([v for v in vacations if v.status == "approved"]),
        "today_out":  len([v for v in vacations if v.status == "approved" and v.start_date <= today <= v.end_date]),
        "this_week":  len([v for v in vacations if v.status == "approved" and v.start_date <= today + timedelta(days=7) and v.end_date >= today]),
    }
    return {"vacations": result, "summary": summary}


@router.post("/vacations", status_code=201)
def create_vacation(
    data: VacationCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una nueva solicitud de vacaciones."""
    # Authorize: the employee must belong to the caller's company (prevents
    # attaching vacation records to another tenant's employees).
    emp = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.company_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    start = datetime.fromisoformat(data.start_date).date()
    end = datetime.fromisoformat(data.end_date).date()
    days = (end - start).days + 1

    v = Vacation(
        employee_id=data.employee_id,
        company_id=current_user.company_id,
        start_date=start,
        end_date=end,
        days=days,
        vacation_type=data.vacation_type,
        notes=data.notes,
        status="pending",
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"id": v.id, "status": "pending"}


@router.put("/vacations/{vacation_id}")
def update_vacation(
    vacation_id: int,
    data: VacationUpdate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Aprueba o rechaza una solicitud."""
    v = db.query(Vacation).filter(
        Vacation.id == vacation_id,
        Vacation.company_id == current_user.company_id
    ).first()
    if not v:
        raise HTTPException(404, "Vacación no encontrada")

    v.status = data.status
    if data.notes:
        v.notes = data.notes
    if data.status == "approved":
        v.approved_by = current_user.id
        v.approved_at = datetime.now()
    db.commit()
    return {"id": v.id, "status": v.status}


# ─── CONTRATOS ─────────────────────────────────────────────────────────────
@router.get("/contracts")
def list_contracts(
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Lista contratos + alertas de vencimiento."""
    contracts = db.query(Contract).filter(
        Contract.company_id == current_user.company_id,
        Contract.is_active == True
    ).order_by(Contract.start_date.desc()).all()

    today = date.today()
    in_60_days = today + timedelta(days=60)

    result = []
    expiring = []
    for c in contracts:
        emp = db.query(Employee).filter(Employee.id == c.employee_id).first()
        item = {
            "id": c.id,
            "employee_id": c.employee_id,
            "employee_name": emp.full_name if emp else None,
            "employee_department": emp.department if emp else None,
            "employee_position": emp.position if emp else None,
            "contract_type": c.contract_type,
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "working_hours": c.working_hours,
            "salary_gross": c.salary_gross,
            "is_active": c.is_active,
            "expires_soon": bool(c.end_date and today <= c.end_date <= in_60_days),
            "expired":      bool(c.end_date and c.end_date < today),
        }
        result.append(item)
        if item["expires_soon"]:
            expiring.append(item)

    return {
        "contracts": result,
        "summary": {
            "total":            len(result),
            "indefinidos":      len([c for c in contracts if c.contract_type == "indefinido"]),
            "temporales":       len([c for c in contracts if c.contract_type == "temporal"]),
            "practicas":        len([c for c in contracts if c.contract_type == "practicas"]),
            "expiring_60d":     len(expiring),
            "expiring_list":    expiring,
        }
    }


class ContractCreate(BaseModel):
    employee_id:   int
    contract_type: str = "indefinido"   # indefinido | temporal | practicas
    start_date:    str                  # YYYY-MM-DD
    end_date:      Optional[str] = None
    working_hours: Optional[int] = 40
    salary_gross:  Optional[float] = None


@router.post("/contracts", status_code=201)
def create_contract(
    data: ContractCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un contrato para un empleado de la empresa del usuario."""
    emp = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.company_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    try:
        start = date.fromisoformat(data.start_date)
        end = date.fromisoformat(data.end_date) if data.end_date else None
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Fecha inválida (usa YYYY-MM-DD)")

    contract = Contract(
        employee_id=data.employee_id,
        company_id=current_user.company_id,
        contract_type=data.contract_type,
        start_date=start,
        end_date=end,
        working_hours=data.working_hours or 40,
        salary_gross=data.salary_gross if data.salary_gross is not None else (emp.gross_salary or 0),
        is_active=True,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return {"id": contract.id, "employee_name": emp.full_name, "contract_type": contract.contract_type}


# ─── NÓMINAS ──────────────────────────────────────────────────────────────
@router.get("/payslips")
def list_payslips(
    employee_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Lista nóminas con filtros opcionales."""
    q = db.query(Payslip).filter(Payslip.company_id == current_user.company_id)
    if employee_id:
        q = q.filter(Payslip.employee_id == employee_id)
    if year:
        q = q.filter(Payslip.period_year == year)
    if month:
        q = q.filter(Payslip.period_month == month)
    payslips = q.order_by(Payslip.period_year.desc(), Payslip.period_month.desc()).all()

    result = []
    for p in payslips:
        emp = db.query(Employee).filter(Employee.id == p.employee_id).first()
        result.append({
            "id": p.id,
            "employee_id": p.employee_id,
            "employee_name": emp.full_name if emp else None,
            "employee_department": emp.department if emp else None,
            "period_month": p.period_month,
            "period_year": p.period_year,
            "gross_amount": p.gross_amount,
            "net_amount": p.net_amount,
            "irpf": p.irpf,
            "ss_employee": p.ss_employee,
            "ss_company": p.ss_company,
            "extras": p.extras,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        })

    total_gross = sum(p["gross_amount"] for p in result)
    total_net = sum(p["net_amount"] for p in result)
    total_cost = sum(p["gross_amount"] + p["ss_company"] for p in result)

    return {
        "payslips": result,
        "summary": {
            "total":         len(result),
            "total_gross":   round(total_gross, 2),
            "total_net":     round(total_net, 2),
            "total_cost":    round(total_cost, 2),
        }
    }


# ─── DASHBOARD HR ─────────────────────────────────────────────────────────
@router.get("/dashboard")
def hr_dashboard(
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """KPIs clave de HR estilo Vela (dashboard simple)."""
    employees = db.query(Employee).filter(
        Employee.company_id == current_user.company_id,
        Employee.is_active == True
    ).all()

    total_employees = len(employees)
    total_salary = sum(e.gross_salary for e in employees)
    monthly_cost = total_salary / 12

    # Por departamento
    by_dept = {}
    for e in employees:
        d = e.department or "Sin departamento"
        if d not in by_dept:
            by_dept[d] = {"count": 0, "salary": 0}
        by_dept[d]["count"] += 1
        by_dept[d]["salary"] += e.gross_salary

    # Vacaciones hoy + esta semana
    today = date.today()
    in_7 = today + timedelta(days=7)
    out_today = db.query(Vacation).filter(
        Vacation.company_id == current_user.company_id,
        Vacation.status == "approved",
        Vacation.start_date <= today,
        Vacation.end_date >= today
    ).count()
    out_week = db.query(Vacation).filter(
        Vacation.company_id == current_user.company_id,
        Vacation.status == "approved",
        Vacation.start_date <= in_7,
        Vacation.end_date >= today
    ).count()

    # Contratos por vencer (60 días)
    in_60 = today + timedelta(days=60)
    expiring = db.query(Contract).filter(
        Contract.company_id == current_user.company_id,
        Contract.is_active == True,
        Contract.end_date.isnot(None),
        Contract.end_date >= today,
        Contract.end_date <= in_60
    ).count()

    # Feedback sentiment
    feedbacks = db.query(EmployeeFeedback).join(Employee).filter(
        Employee.company_id == current_user.company_id
    ).all()
    pos = len([f for f in feedbacks if f.sentiment == "positive"])
    neg = len([f for f in feedbacks if f.sentiment == "negative"])
    neu = len([f for f in feedbacks if f.sentiment == "neutral"])
    feedback_score = round((pos * 9 + neu * 5 + neg * 2) / max(len(feedbacks), 1), 1)

    # Empleados en riesgo (>50% feedback negativo)
    at_risk = []
    for e in employees:
        emp_fb = [f for f in feedbacks if f.employee_id == e.id]
        if len(emp_fb) >= 3:
            neg_pct = len([f for f in emp_fb if f.sentiment == "negative"]) / len(emp_fb)
            if neg_pct >= 0.5:
                at_risk.append({
                    "id": e.id,
                    "name": e.full_name,
                    "department": e.department,
                    "negative_pct": round(neg_pct * 100),
                    "feedback_count": len(emp_fb),
                })

    return {
        "total_employees": total_employees,
        "total_salary_annual": round(total_salary, 2),
        "monthly_cost": round(monthly_cost, 2),
        "by_department": [
            {"department": d, "count": v["count"], "salary": round(v["salary"], 2)}
            for d, v in by_dept.items()
        ],
        "out_today":     out_today,
        "out_this_week": out_week,
        "contracts_expiring_60d": expiring,
        "feedback": {
            "total": len(feedbacks),
            "positive_pct": round(pos * 100 / max(len(feedbacks), 1), 1),
            "negative_pct": round(neg * 100 / max(len(feedbacks), 1), 1),
            "neutral_pct":  round(neu * 100 / max(len(feedbacks), 1), 1),
            "score":        feedback_score,
        },
        "employees_at_risk": at_risk,
    }


# ─── VERA HR ──────────────────────────────────────────────────────────────
@router.post("/vera/analyze")
def vera_analyze_hr(
    data: VeraHRRequest,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Pregunta abierta a Vera con contexto HR completo."""
    from vera.context import build_full_context
    from vera.llm_router import VeraRouter

    # Contexto HR específico
    dashboard = hr_dashboard(db=db, current_user=current_user)

    from country.registry import get_country_info
    _country = getattr(getattr(current_user, "company", None), "country", None)
    sym = (get_country_info(_country) or {}).get("symbol", "€") if _country else "€"

    hr_context = f"""
CONTEXTO RECURSOS HUMANOS de la empresa (datos en tiempo real):

EQUIPO:
- Total: {dashboard['total_employees']} empleados activos
- Coste anual: {sym}{dashboard['total_salary_annual']:,.0f}
- Coste mensual: {sym}{dashboard['monthly_cost']:,.0f}

POR DEPARTAMENTO:
{chr(10).join(f"- {d['department']}: {d['count']} personas, {sym}{d['salary']:,.0f}/año" for d in dashboard['by_department'])}

VACACIONES:
- Fuera hoy: {dashboard['out_today']} personas
- Fuera esta semana: {dashboard['out_this_week']} personas

CONTRATOS:
- Vencen en próximos 60 días: {dashboard['contracts_expiring_60d']}

CLIMA LABORAL (feedback):
- Score global: {dashboard['feedback']['score']}/10
- Positivos: {dashboard['feedback']['positive_pct']}%
- Negativos: {dashboard['feedback']['negative_pct']}%

EMPLEADOS EN RIESGO (>50% feedback negativo):
{chr(10).join(f"- {e['name']} ({e['department']}): {e['negative_pct']}% feedback negativo ({e['feedback_count']} comentarios)" for e in dashboard['employees_at_risk']) if dashboard['employees_at_risk'] else "Ninguno"}
"""

    question = data.question or "Analiza el estado actual de RH y dime qué requiere mi atención HOY. Sé breve y directo. Máximo 4 acciones prioritarias."

    router = VeraRouter(db)
    full_context = build_full_context(db, current_user.company_id, question)
    full_system_prompt = f"""Eres Vera, IA central de gestión empresarial de Vela.

{hr_context}

DATOS GENERALES:
{full_context}

Responde de forma breve, directa y accionable. Usa markdown ligero. Prioriza qué hacer ahora."""

    result = router.route(
        question=question,
        system_prompt=full_system_prompt,
        module="hr",
    )

    return {
        "response": result.get('text') or result.get('error') or 'Sin respuesta',
        "model_used": result.get('rule_used'),
        "context_used": "hr_dashboard + sql + neo4j + chroma",
    }


# ─── GRUPOS DE TRABAJO ──────────────────────────────────────────────────────
# Patrón espejo de api/projects.py: grupo → miembros + tareas (kanban) + horas.

def _serialize_task(t: GroupTask, emp_names: dict) -> dict:
    return {
        "id": t.id,
        "group_id": t.group_id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "assigned_to": t.assigned_to,
        "assigned_name": emp_names.get(t.assigned_to),
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "estimated_hours": t.estimated_hours or 0.0,
        "actual_hours": t.actual_hours or 0.0,
    }


def _serialize_group(g: WorkGroup, db: Session, emp_names: dict, detail: bool = False) -> dict:
    tasks = g.tasks
    total = len(tasks)
    completed = len([t for t in tasks if t.status == "completada"])
    blocked = len([t for t in tasks if t.status == "bloqueada"])
    completion = round(completed / total * 100, 1) if total else 0.0
    total_hours = round(sum(t.actual_hours or 0.0 for t in tasks), 2)

    out = {
        "id": g.id,
        "name": g.name,
        "description": g.description,
        "status": g.status,
        "color": g.color,
        "lead_employee_id": g.lead_employee_id,
        "lead_name": emp_names.get(g.lead_employee_id),
        "start_date": g.start_date.isoformat() if g.start_date else None,
        "end_date": g.end_date.isoformat() if g.end_date else None,
        "member_count": len(g.members),
        "task_count": total,
        "completed_tasks": completed,
        "blocked_tasks": blocked,
        "completion_percentage": completion,
        "total_hours": total_hours,
    }
    if detail:
        out["members"] = [{
            "id": m.id,
            "employee_id": m.employee_id,
            "employee_name": emp_names.get(m.employee_id),
            "role": m.role,
        } for m in g.members]
        out["tasks"] = [_serialize_task(t, emp_names) for t in tasks]
    return out


def _company_emp_names(db: Session, company_id: int) -> dict:
    return {
        e.id: e.full_name
        for e in db.query(Employee).filter(Employee.company_id == company_id).all()
    }


def _get_group_or_404(group_id: int, db: Session, company_id: int) -> WorkGroup:
    g = db.query(WorkGroup).filter(
        WorkGroup.id == group_id,
        WorkGroup.company_id == company_id
    ).first()
    if not g:
        raise HTTPException(404, "Grupo no encontrado")
    return g


@router.post("/workgroups", status_code=201)
def create_workgroup(
    data: WorkGroupCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un grupo de trabajo."""
    g = WorkGroup(
        company_id=current_user.company_id,
        name=data.name,
        description=data.description,
        lead_employee_id=data.lead_employee_id,
        start_date=_parse_date(data.start_date),
        end_date=_parse_date(data.end_date),
        color=data.color,
        status="activo",
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return _serialize_group(g, db, _company_emp_names(db, current_user.company_id), detail=True)


@router.get("/workgroups")
def list_workgroups(
    include_archived: bool = False,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Lista los grupos de trabajo (con resumen de tareas/horas)."""
    q = db.query(WorkGroup).filter(WorkGroup.company_id == current_user.company_id)
    if not include_archived:
        q = q.filter(WorkGroup.status != "archivado")
    groups = q.order_by(WorkGroup.created_at.desc()).all()
    emp_names = _company_emp_names(db, current_user.company_id)
    return [_serialize_group(g, db, emp_names) for g in groups]


@router.get("/workgroups/{group_id}")
def get_workgroup(
    group_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Detalle del grupo: miembros + tareas + horas."""
    g = _get_group_or_404(group_id, db, current_user.company_id)
    return _serialize_group(g, db, _company_emp_names(db, current_user.company_id), detail=True)


@router.put("/workgroups/{group_id}")
def update_workgroup(
    group_id: int,
    data: WorkGroupUpdate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza un grupo de trabajo."""
    g = _get_group_or_404(group_id, db, current_user.company_id)
    if data.name is not None:             g.name = data.name
    if data.description is not None:      g.description = data.description
    if data.status is not None:           g.status = data.status
    if data.lead_employee_id is not None: g.lead_employee_id = data.lead_employee_id
    if data.color is not None:            g.color = data.color
    if data.start_date is not None:       g.start_date = _parse_date(data.start_date)
    if data.end_date is not None:         g.end_date = _parse_date(data.end_date)
    db.commit()
    db.refresh(g)
    return _serialize_group(g, db, _company_emp_names(db, current_user.company_id), detail=True)


@router.delete("/workgroups/{group_id}")
def archive_workgroup(
    group_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Archiva un grupo (soft delete)."""
    g = _get_group_or_404(group_id, db, current_user.company_id)
    g.status = "archivado"
    db.commit()
    return {"id": g.id, "status": "archivado"}


# ── Miembros ────────────────────────────────────────────────────────────────

@router.post("/workgroups/{group_id}/members", status_code=201)
def add_group_member(
    group_id: int,
    data: GroupMemberCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Añade un empleado/voluntario al grupo."""
    _get_group_or_404(group_id, db, current_user.company_id)
    emp = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.company_id
    ).first()
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")

    existing = db.query(WorkGroupMember).filter(
        WorkGroupMember.group_id == group_id,
        WorkGroupMember.employee_id == data.employee_id
    ).first()
    if existing:
        raise HTTPException(400, "El empleado ya es miembro del grupo")

    m = WorkGroupMember(group_id=group_id, employee_id=data.employee_id, role=data.role)
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "employee_id": m.employee_id, "employee_name": emp.full_name, "role": m.role}


@router.delete("/workgroups/{group_id}/members/{member_id}")
def remove_group_member(
    group_id: int,
    member_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Quita un miembro del grupo."""
    _get_group_or_404(group_id, db, current_user.company_id)
    m = db.query(WorkGroupMember).filter(
        WorkGroupMember.id == member_id,
        WorkGroupMember.group_id == group_id
    ).first()
    if not m:
        raise HTTPException(404, "Miembro no encontrado")
    db.delete(m)
    db.commit()
    return {"message": "Miembro eliminado"}


# ── Tareas ──────────────────────────────────────────────────────────────────

@router.post("/workgroups/{group_id}/tasks", status_code=201)
def create_group_task(
    group_id: int,
    data: GroupTaskCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una tarea dentro del grupo."""
    _get_group_or_404(group_id, db, current_user.company_id)
    t = GroupTask(
        group_id=group_id,
        company_id=current_user.company_id,
        title=data.title,
        description=data.description,
        status="pendiente",
        priority=data.priority or "media",
        assigned_to=data.assigned_to,
        due_date=_parse_date(data.due_date),
        estimated_hours=data.estimated_hours or 0.0,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _serialize_task(t, _company_emp_names(db, current_user.company_id))


@router.put("/tasks/{task_id}")
def update_group_task(
    task_id: int,
    data: GroupTaskUpdate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza una tarea de grupo (estado, asignación, prioridad...)."""
    t = db.query(GroupTask).filter(
        GroupTask.id == task_id,
        GroupTask.company_id == current_user.company_id
    ).first()
    if not t:
        raise HTTPException(404, "Tarea no encontrada")

    if data.title is not None:           t.title = data.title
    if data.description is not None:     t.description = data.description
    if data.status is not None:          t.status = data.status
    if data.priority is not None:        t.priority = data.priority
    if data.assigned_to is not None:     t.assigned_to = data.assigned_to
    if data.due_date is not None:        t.due_date = _parse_date(data.due_date)
    if data.estimated_hours is not None: t.estimated_hours = data.estimated_hours
    db.commit()
    db.refresh(t)
    return _serialize_task(t, _company_emp_names(db, current_user.company_id))


@router.delete("/tasks/{task_id}")
def delete_group_task(
    task_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina una tarea de grupo."""
    t = db.query(GroupTask).filter(
        GroupTask.id == task_id,
        GroupTask.company_id == current_user.company_id
    ).first()
    if not t:
        raise HTTPException(404, "Tarea no encontrada")
    db.delete(t)
    db.commit()
    return {"message": "Tarea eliminada"}


@router.post("/tasks/{task_id}/horas", status_code=201)
def log_task_hours(
    task_id: int,
    data: GroupTaskTimeCreate,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    """Registra horas aportadas a una tarea y recalcula actual_hours."""
    t = db.query(GroupTask).filter(
        GroupTask.id == task_id,
        GroupTask.company_id == current_user.company_id
    ).first()
    if not t:
        raise HTTPException(404, "Tarea no encontrada")

    entry = GroupTaskTime(
        task_id=task_id,
        group_id=t.group_id,
        company_id=current_user.company_id,
        employee_id=data.employee_id,
        hours=data.hours,
        date=_parse_date(data.date) or date.today(),
        description=data.description,
    )
    db.add(entry)
    db.flush()

    # Recalcular horas reales de la tarea desde los registros.
    total = db.query(func.coalesce(func.sum(GroupTaskTime.hours), 0.0)).filter(
        GroupTaskTime.task_id == task_id
    ).scalar() or 0.0
    t.actual_hours = round(float(total), 2)
    db.commit()
    return {"id": entry.id, "task_id": task_id, "actual_hours": t.actual_hours}
