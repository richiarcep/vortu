from datetime import date, timedelta
from sqlalchemy.orm import Session
from models.project import Project, Task, TimeEntry


def calculate_velocity(db: Session, project_id: int) -> dict:
    """
    Calculates task completion velocity and predicts
    whether the project will finish on time.
    """
    today = date.today()
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {}

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    if not tasks:
        return {
            "velocity_per_day": 0,
            "predicted_completion_date": None,
            "will_finish_on_time": None,
            "days_ahead_or_behind": None,
            "recommendation": "Añade tareas al proyecto para calcular la velocidad.",
        }

    total_tasks = len(tasks)
    completed_tasks = [t for t in tasks if t.status == "completada"]
    remaining_tasks = total_tasks - len(completed_tasks)

    # ── Velocity: tasks completed per day over last 7 days ───────────────────
    week_ago = today - timedelta(days=7)
    recently_completed = [
        t for t in completed_tasks
        if t.updated_at and t.updated_at.date() >= week_ago
    ]
    velocity_per_day = len(recently_completed) / 7

    # ── Predicted completion date ─────────────────────────────────────────────
    predicted_completion_date = None
    days_to_finish = None
    if velocity_per_day > 0 and remaining_tasks > 0:
        days_to_finish = remaining_tasks / velocity_per_day
        predicted_completion_date = today + timedelta(days=int(days_to_finish))
    elif remaining_tasks == 0:
        predicted_completion_date = today
        days_to_finish = 0

    # ── On time prediction ────────────────────────────────────────────────────
    will_finish_on_time = None
    days_ahead_or_behind = None
    if project.deadline and predicted_completion_date:
        days_ahead_or_behind = (project.deadline - predicted_completion_date).days
        will_finish_on_time = predicted_completion_date <= project.deadline

    # ── Budget burn rate ──────────────────────────────────────────────────────
    time_entries = db.query(TimeEntry).filter(
        TimeEntry.task_id.in_([t.id for t in tasks])
    ).all()
    total_cost = sum(e.cost or 0 for e in time_entries)
    budget_remaining = (project.budget or 0) - total_cost
    completion = project.completion_percentage or 0

    burn_rate_ok = True
    budget_warning = None
    if project.budget and project.budget > 0 and completion > 0:
        projected_total_cost = total_cost / (completion / 100)
        if projected_total_cost > project.budget * 1.1:
            burn_rate_ok = False
            overage = projected_total_cost - project.budget
            budget_warning = f"Al ritmo actual el proyecto excederá el presupuesto en €{overage:,.0f}"

    # ── Recommendation ────────────────────────────────────────────────────────
    if velocity_per_day == 0 and remaining_tasks > 0:
        recommendation = "No se han completado tareas en los últimos 7 días. El equipo necesita retomar el ritmo."
    elif will_finish_on_time is False:
        days_late = abs(days_ahead_or_behind or 0)
        recommendation = f"Al ritmo actual el proyecto terminará {days_late} días tarde. Considera añadir recursos o reducir alcance."
    elif will_finish_on_time is True and days_ahead_or_behind and days_ahead_or_behind > 7:
        recommendation = f"El proyecto va {days_ahead_or_behind} días adelantado. Buen ritmo — mantén el equipo enfocado."
    elif not burn_rate_ok:
        recommendation = budget_warning or "El presupuesto está en riesgo al ritmo actual de gasto."
    else:
        recommendation = "El proyecto avanza dentro de los parámetros esperados."

    return {
        "velocity_per_day":           round(velocity_per_day, 2),
        "tasks_completed_last_7_days": len(recently_completed),
        "remaining_tasks":            remaining_tasks,
        "predicted_completion_date":  str(predicted_completion_date) if predicted_completion_date else None,
        "will_finish_on_time":        will_finish_on_time,
        "days_ahead_or_behind":       days_ahead_or_behind,
        "total_cost_so_far":          round(total_cost, 2),
        "budget_remaining":           round(budget_remaining, 2),
        "burn_rate_ok":               burn_rate_ok,
        "budget_warning":             budget_warning,
        "recommendation":             recommendation,
    }


def get_all_projects_velocity(db: Session, company_id: int) -> list:
    """
    Returns velocity summary for all active projects.
    Used by the daily scheduler to detect at-risk projects.
    """
    projects = db.query(Project).filter(
        Project.company_id == company_id,
        Project.status == "activo"
    ).all()

    results = []
    for project in projects:
        velocity = calculate_velocity(db, project.id)
        results.append({
            "project_id":   project.id,
            "project_name": project.name,
            "health_score": project.health_score,
            "deadline":     str(project.deadline) if project.deadline else None,
            **velocity,
        })
    return results