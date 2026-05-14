from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from core.database import get_db
from services.graph.sync import sync_project
from core.security import get_current_user
from models.user import User
from models.project import Project, Task, TimeEntry, ProjectExpense
from modules.projects.health import calculate_health_score, update_project_health
from modules.projects.velocity import calculate_velocity, get_all_projects_velocity
from modules.projects.ai_analysis import analyze_project_with_ai, generate_post_project_report
from modules.projects.report import generate_project_report_pdf

router = APIRouter(prefix="/api/proyectos", tags=["Proyectos"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    client_name: Optional[str] = None
    start_date:  Optional[date] = None
    deadline:    Optional[date] = None
    budget:      Optional[float] = 0.0

class ProjectUpdate(BaseModel):
    name:                  Optional[str]   = None
    description:           Optional[str]   = None
    client_name:           Optional[str]   = None
    status:                Optional[str]   = None
    start_date:            Optional[date]  = None
    deadline:              Optional[date]  = None
    budget:                Optional[float] = None
    completion_percentage: Optional[float] = None

class TaskCreate(BaseModel):
    title:           str
    description:     Optional[str]   = None
    priority:        Optional[str]   = "media"
    assigned_to:     Optional[int]   = None
    due_date:        Optional[date]  = None
    estimated_hours: Optional[float] = 0.0

class TaskUpdate(BaseModel):
    title:           Optional[str]   = None
    description:     Optional[str]   = None
    status:          Optional[str]   = None
    priority:        Optional[str]   = None
    assigned_to:     Optional[int]   = None
    due_date:        Optional[date]  = None
    estimated_hours: Optional[float] = None
    actual_hours:    Optional[float] = None

class TimeEntryCreate(BaseModel):
    hours:       float
    date:        date
    description: Optional[str] = None
    employee_id: Optional[int] = None

class ExpenseCreate(BaseModel):
    description: str
    amount:      float
    date:        date
    category:    Optional[str] = None


# ── Helper ────────────────────────────────────────────────────────────────────

def get_project_or_404(db, project_id, company_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == company_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


def serialize_project(db, project, include_tasks=False):
    health   = calculate_health_score(db, project)
    velocity = calculate_velocity(db, project.id)

    tasks = db.query(Task).filter(Task.project_id == project.id).all()
    time_entries = db.query(TimeEntry).filter(
        TimeEntry.task_id.in_([t.id for t in tasks])
    ).all()
    expenses = db.query(ProjectExpense).filter(
        ProjectExpense.project_id == project.id
    ).all()

    total_cost     = sum(e.cost or 0 for e in time_entries)
    total_expenses = sum(e.amount or 0 for e in expenses)
    total_hours    = sum(t.actual_hours or 0 for t in tasks)

    data = {
        "id":                    project.id,
        "name":                  project.name,
        "description":           project.description,
        "client_name":           project.client_name,
        "status":                project.status,
        "start_date":            str(project.start_date) if project.start_date else None,
        "deadline":              str(project.deadline) if project.deadline else None,
        "days_left":             (project.deadline - date.today()).days if project.deadline else None,
        "budget":                project.budget,
        "total_spent":           round(total_cost + total_expenses, 2),
        "budget_remaining":      round((project.budget or 0) - total_cost - total_expenses, 2),
        "total_hours":           round(total_hours, 1),
        "completion_percentage": project.completion_percentage,
        "health":                health,
        "velocity":              velocity,
        "total_tasks":           len(tasks),
        "completed_tasks":       len([t for t in tasks if t.status == "completada"]),
        "blocked_tasks":         len([t for t in tasks if t.status == "bloqueada"]),
        "created_at":            str(project.created_at),
    }

    if include_tasks:
        data["tasks"] = [serialize_task(t) for t in tasks]
        data["expenses"] = [
            {"id": e.id, "description": e.description, "amount": e.amount,
             "date": str(e.date), "category": e.category}
            for e in expenses
        ]
        data["time_entries"] = [
            {"id": e.id, "task_id": e.task_id, "hours": e.hours,
             "date": str(e.date), "cost": e.cost, "description": e.description}
            for e in time_entries
        ]

    return data


def serialize_task(task):
    return {
        "id":              task.id,
        "project_id":      task.project_id,
        "title":           task.title,
        "description":     task.description,
        "status":          task.status,
        "priority":        task.priority,
        "assigned_to":     task.assigned_to,
        "due_date":        str(task.due_date) if task.due_date else None,
        "estimated_hours": task.estimated_hours,
        "actual_hours":    task.actual_hours,
        "created_at":      str(task.created_at),
    }


# ── Project endpoints ─────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(
        company_id=current_user.company_id,
        name=data.name,
        description=data.description,
        client_name=data.client_name,
        start_date=data.start_date,
        deadline=data.deadline,
        budget=data.budget or 0.0,
        status="activo",
        health_score=10.0,
        completion_percentage=0.0,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return serialize_project(db, project)


@router.get("/")
def list_projects(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project).filter(
        Project.company_id == current_user.company_id
    )
    if status:
        query = query.filter(Project.status == status)
    projects = query.order_by(Project.created_at.desc()).all()

    # Update health scores on fetch
    result = []
    for p in projects:
        update_project_health(db, p.id)
        result.append(serialize_project(db, p))
    return {"total": len(result), "projects": result}


@router.get("/resumen")
def get_projects_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).filter(
        Project.company_id == current_user.company_id
    ).all()

    active    = [p for p in projects if p.status == "activo"]
    completed = [p for p in projects if p.status == "completado"]

    total_budget  = sum(p.budget or 0 for p in active)
    at_risk       = [p for p in active if p.health_score < 5]
    urgent        = [p for p in active if p.health_score < 3]
    velocity_data = get_all_projects_velocity(db, current_user.company_id)

    return {
        "total_projects":    len(projects),
        "active":            len(active),
        "completed":         len(completed),
        "at_risk":           len(at_risk),
        "urgent":            len(urgent),
        "total_budget_active": round(total_budget, 2),
        "average_health":    round(
            sum(p.health_score for p in active) / len(active), 1
        ) if active else 0,
        "velocity_by_project": velocity_data,
    }


@router.get("/{project_id}")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_or_404(db, project_id, current_user.company_id)
    update_project_health(db, project.id)
    return serialize_project(db, project, include_tasks=True)


@router.put("/{project_id}")
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_or_404(db, project_id, current_user.company_id)
    was_completed = project.status == "completado"

    for field, value in data.dict(exclude_none=True).items():
        setattr(project, field, value)

    # Auto post-project report when marked complete
    if data.status == "completado" and not was_completed:
        report = generate_post_project_report(db, project)
        project.last_ai_analysis = str(report)
        project.completion_percentage = 100.0

    db.commit()
    db.refresh(project)
    update_project_health(db, project.id)
    return serialize_project(db, project, include_tasks=True)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_or_404(db, project_id, current_user.company_id)
    project.status = "cancelado"
    db.commit()
    return {"message": "Proyecto archivado correctamente"}


# ── Task endpoints ────────────────────────────────────────────────────────────

@router.post("/{project_id}/tareas", status_code=201)
def create_task(
    project_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    get_project_or_404(db, project_id, current_user.company_id)
    task = Task(
        project_id=project_id,
        company_id=current_user.company_id,
        title=data.title,
        description=data.description,
        priority=data.priority or "media",
        assigned_to=data.assigned_to,
        due_date=data.due_date,
        estimated_hours=data.estimated_hours or 0.0,
        actual_hours=0.0,
        status="pendiente",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    update_project_health(db, project_id)
    return serialize_task(task)


@router.put("/tareas/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.company_id == current_user.company_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    for field, value in data.dict(exclude_none=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    update_project_health(db, task.project_id)
    return serialize_task(task)


@router.delete("/tareas/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.company_id == current_user.company_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    project_id = task.project_id
    db.delete(task)
    db.commit()
    update_project_health(db, project_id)
    return {"message": "Tarea eliminada"}


# ── Time tracking ─────────────────────────────────────────────────────────────

@router.post("/tareas/{task_id}/tiempo", status_code=201)
def log_time(
    task_id: int,
    data: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.company_id == current_user.company_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    # Calculate cost from employee hourly rate
    cost = 0.0
    if data.employee_id:
        from modules.hr.employees import Employee
        employee = db.query(Employee).filter(
            Employee.id == data.employee_id
        ).first()
        if employee and employee.gross_salary:
            hourly_rate = employee.gross_salary / 1760
            cost = round(hourly_rate * data.hours, 2)

    entry = TimeEntry(
        task_id=task_id,
        company_id=current_user.company_id,
        employee_id=data.employee_id,
        hours=data.hours,
        date=data.date,
        description=data.description,
        cost=cost,
    )
    db.add(entry)

    # Update actual hours on the task
    task.actual_hours = (task.actual_hours or 0) + data.hours
    db.commit()
    db.refresh(entry)
    update_project_health(db, task.project_id)

    return {
        "id": entry.id, "hours": entry.hours,
        "cost": entry.cost, "date": str(entry.date)
    }


@router.get("/{project_id}/tiempo")
def get_time_entries(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    get_project_or_404(db, project_id, current_user.company_id)
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    entries = db.query(TimeEntry).filter(
        TimeEntry.task_id.in_([t.id for t in tasks])
    ).all()
    total_hours = sum(e.hours for e in entries)
    total_cost  = sum(e.cost or 0 for e in entries)
    return {
        "total_hours": round(total_hours, 1),
        "total_cost":  round(total_cost, 2),
        "entries": [
            {"id": e.id, "task_id": e.task_id, "employee_id": e.employee_id,
             "hours": e.hours, "cost": e.cost, "date": str(e.date),
             "description": e.description}
            for e in entries
        ]
    }


# ── Expenses ──────────────────────────────────────────────────────────────────

@router.post("/{project_id}/gastos", status_code=201)
def add_expense(
    project_id: int,
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    get_project_or_404(db, project_id, current_user.company_id)
    expense = ProjectExpense(
        project_id=project_id,
        company_id=current_user.company_id,
        description=data.description,
        amount=data.amount,
        date=data.date,
        category=data.category,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    update_project_health(db, project_id)
    return {"id": expense.id, "amount": expense.amount, "description": expense.description}


# ── AI analysis ───────────────────────────────────────────────────────────────

@router.get("/{project_id}/analisis")
def get_ai_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_or_404(db, project_id, current_user.company_id)
    analysis = analyze_project_with_ai(db, project)
    project.last_ai_analysis = str(analysis)
    project.last_analyzed_at = datetime.now()
    db.commit()
    return analysis


# ── PDF report ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/reporte")
def download_report(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_or_404(db, project_id, current_user.company_id)
    ai_analysis = None
    if project.last_ai_analysis:
        try:
            import ast
            ai_analysis = ast.literal_eval(project.last_ai_analysis)
        except Exception:
            pass

    pdf_bytes = generate_project_report_pdf(db, project, ai_analysis)
    filename  = f"nexum_proyecto_{project.id}_{date.today()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )