"""
Añade al backend:
1. modules/hr/extended.py — modelos Vacation, Contract, Payslip
2. Endpoints nuevos en api/hr.py:
   - GET  /api/hr/vacations          — todas las vacaciones
   - POST /api/hr/vacations          — crear solicitud
   - PUT  /api/hr/vacations/{id}     — aprobar/rechazar
   - GET  /api/hr/contracts          — contratos + alertas vencimiento
   - GET  /api/hr/payslips           — nóminas con filtros
   - GET  /api/hr/dashboard          — KPIs HR para Vela dashboard
   - POST /api/hr/vera/analyze       — Vera analiza estado HR completo
"""
import os

# ─────────────────────────────────────────────────────────
# 1. CREAR modules/hr/extended.py con los nuevos modelos
# ─────────────────────────────────────────────────────────
extended_path = os.path.expanduser('~/Desktop/vela/backend/modules/hr/extended.py')

extended_code = '''from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text
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
'''

os.makedirs(os.path.dirname(extended_path), exist_ok=True)
open(extended_path, 'w').write(extended_code)
print(f"OK Creado {extended_path}")

# ─────────────────────────────────────────────────────────
# 2. AÑADIR endpoints nuevos a api/hr.py
# ─────────────────────────────────────────────────────────
hr_api_path = os.path.expanduser('~/Desktop/vela/backend/api/hr.py')
s = open(hr_api_path).read()

# Marcador para no duplicar
if 'def list_vacations' in s:
    print("Los endpoints ya existen, no se vuelven a añadir")
else:
    # Añadir import
    if 'from modules.hr.extended' not in s:
        s = s.replace(
            'from modules.hr.payroll import process_payroll',
            'from modules.hr.payroll import process_payroll\nfrom modules.hr.extended import Vacation, Contract, Payslip\nfrom datetime import date, datetime, timedelta'
        )

    # Añadir schemas
    s = s.replace(
        'class FeedbackCreate(BaseModel):',
        '''class VacationCreate(BaseModel):
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


class FeedbackCreate(BaseModel):'''
    )

    # Añadir endpoints al FINAL del archivo
    NEW_ENDPOINTS = '''


# ─── VACACIONES ────────────────────────────────────────────────────────────
@router.get("/vacations")
def list_vacations(
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una nueva solicitud de vacaciones."""
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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


# ─── NÓMINAS ──────────────────────────────────────────────────────────────
@router.get("/payslips")
def list_payslips(
    employee_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pregunta abierta a Vera con contexto HR completo."""
    from vera.context import build_full_context
    from vera.llm_router import VeraRouter

    # Contexto HR específico
    dashboard = hr_dashboard(db=db, current_user=current_user)

    hr_context = f\"\"\"
CONTEXTO RECURSOS HUMANOS de la empresa (datos en tiempo real):

EQUIPO:
- Total: {dashboard['total_employees']} empleados activos
- Coste anual: {dashboard['total_salary_annual']:,.0f}€
- Coste mensual: {dashboard['monthly_cost']:,.0f}€

POR DEPARTAMENTO:
{chr(10).join(f"- {d['department']}: {d['count']} personas, {d['salary']:,.0f}€/año" for d in dashboard['by_department'])}

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
\"\"\"

    question = data.question or "Analiza el estado actual de RH y dime qué requiere mi atención HOY. Sé breve y directo. Máximo 4 acciones prioritarias."

    router = VeraRouter(db)
    full_context = build_full_context(db, current_user.company_id, question)
    full_context = hr_context + "\\n\\n" + full_context

    response = router.route(
        question=question,
        context=full_context,
        user_id=current_user.id,
        company_id=current_user.company_id,
        module="hr",
    )

    return {
        "response": response.content if hasattr(response, 'content') else str(response),
        "context_used": "hr_dashboard + sql + neo4j + chroma",
    }
'''

    s += NEW_ENDPOINTS
    open(hr_api_path, 'w').write(s)
    print(f"OK Añadidos endpoints a {hr_api_path}")

# ─────────────────────────────────────────────────────────
# 3. ASEGURAR que los modelos se importan en main.py
# ─────────────────────────────────────────────────────────
main_path = os.path.expanduser('~/Desktop/vela/backend/main.py')
ms = open(main_path).read()
if 'from modules.hr.extended' not in ms:
    # Buscar otros imports de modules y añadir después
    if 'from modules.hr' in ms:
        ms = ms.replace(
            'from modules.hr',
            'from modules.hr.extended import Vacation, Contract, Payslip\nfrom modules.hr',
            1
        )
    else:
        # Añadir después del import de routers
        ms = ms.replace(
            'from api.hr import router as hr_router',
            'from modules.hr.extended import Vacation, Contract, Payslip\nfrom api.hr import router as hr_router'
        )
    open(main_path, 'w').write(ms)
    print("OK Importados modelos en main.py")
else:
    print("Modelos ya importados en main.py")

print("\nLISTO. Reinicia uvicorn y prueba:")
print("  curl http://localhost:8000/api/hr/dashboard -H 'Authorization: Bearer TOKEN'")
