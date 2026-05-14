from datetime import date, datetime
from sqlalchemy.orm import Session
from models.project import Project, Task, TimeEntry


def calculate_health_score(db: Session, project: Project) -> dict:
    """
    Calculates a 1-10 health score based on 7 weighted factors.
    Returns the score and a breakdown explaining each factor.
    """
    today = date.today()
    tasks = db.query(Task).filter(Task.project_id == project.id).all()

    total_tasks = len(tasks)
    if total_tasks == 0:
        return {
            "score": 10.0,
            "color": "green",
            "label": "En buen camino",
            "factors": {},
            "top_risk": None,
        }

    # ── Factor 1 — Timeline progress (25%) ───────────────────────────────────
    timeline_score = 10.0
    if project.start_date and project.deadline:
        total_days = (project.deadline - project.start_date).days
        elapsed_days = (today - project.start_date).days
        if total_days > 0:
            expected_pct = min((elapsed_days / total_days) * 100, 100)
            actual_pct = project.completion_percentage or 0
            gap = expected_pct - actual_pct
            if gap <= 0:
                timeline_score = 10.0
            elif gap <= 10:
                timeline_score = 8.0
            elif gap <= 20:
                timeline_score = 6.0
            elif gap <= 35:
                timeline_score = 4.0
            else:
                timeline_score = 2.0

        # Deadline in less than 3 days and not complete
        days_left = (project.deadline - today).days
        if days_left < 0 and project.completion_percentage < 100:
            timeline_score = 1.0
        elif days_left <= 3 and project.completion_percentage < 80:
            timeline_score = min(timeline_score, 3.0)

    # ── Factor 2 — Budget control (25%) ──────────────────────────────────────
    budget_score = 10.0
    if project.budget and project.budget > 0:
        expenses = db.query(ProjectExpense).filter(
            ProjectExpense.project_id == project.id
        ).all() if False else []  # placeholder — import below

        # Calculate from time entries cost + expenses
        time_entries = db.query(TimeEntry).filter(
            TimeEntry.task_id.in_([t.id for t in tasks])
        ).all()
        total_spent = sum(e.cost or 0 for e in time_entries)

        completion = project.completion_percentage or 1
        expected_spend_pct = completion / 100
        actual_spend_pct = total_spent / project.budget

        overspend_ratio = actual_spend_pct / max(expected_spend_pct, 0.01)
        if overspend_ratio <= 1.0:
            budget_score = 10.0
        elif overspend_ratio <= 1.1:
            budget_score = 8.0
        elif overspend_ratio <= 1.25:
            budget_score = 6.0
        elif overspend_ratio <= 1.5:
            budget_score = 3.0
        else:
            budget_score = 1.0

    # ── Factor 3 — Task velocity (15%) ───────────────────────────────────────
    completed_tasks = [t for t in tasks if t.status == "completada"]
    completion_rate = len(completed_tasks) / total_tasks
    if completion_rate >= 0.7:
        velocity_score = 10.0
    elif completion_rate >= 0.5:
        velocity_score = 8.0
    elif completion_rate >= 0.3:
        velocity_score = 6.0
    elif completion_rate >= 0.1:
        velocity_score = 4.0
    else:
        velocity_score = 2.0

    # ── Factor 4 — Blocked tasks (15%) ───────────────────────────────────────
    blocked = [t for t in tasks if t.status == "bloqueada"]
    blocked_pct = len(blocked) / total_tasks
    if blocked_pct == 0:
        blocked_score = 10.0
    elif blocked_pct <= 0.1:
        blocked_score = 7.0
    elif blocked_pct <= 0.2:
        blocked_score = 5.0
    elif blocked_pct <= 0.4:
        blocked_score = 3.0
    else:
        blocked_score = 1.0

    # ── Factor 5 — Workload balance (10%) ────────────────────────────────────
    workload_score = 10.0
    assignee_hours = {}
    for task in tasks:
        if task.assigned_to:
            assignee_hours[task.assigned_to] = (
                assignee_hours.get(task.assigned_to, 0) + (task.actual_hours or 0)
            )
    if len(assignee_hours) > 1:
        total_h = sum(assignee_hours.values()) or 1
        max_share = max(assignee_hours.values()) / total_h
        if max_share <= 0.4:
            workload_score = 10.0
        elif max_share <= 0.6:
            workload_score = 7.0
        elif max_share <= 0.8:
            workload_score = 4.0
        else:
            workload_score = 2.0

    # ── Factor 6 — Overdue tasks (5%) ────────────────────────────────────────
    overdue = [
        t for t in tasks
        if t.due_date and t.due_date < today and t.status != "completada"
    ]
    overdue_pct = len(overdue) / total_tasks
    if overdue_pct == 0:
        overdue_score = 10.0
    elif overdue_pct <= 0.1:
        overdue_score = 7.0
    elif overdue_pct <= 0.25:
        overdue_score = 4.0
    else:
        overdue_score = 1.0

    # ── Factor 7 — Task assignment coverage (5%) ─────────────────────────────
    assigned = [t for t in tasks if t.assigned_to is not None]
    assign_pct = len(assigned) / total_tasks
    if assign_pct >= 0.8:
        assignment_score = 10.0
    elif assign_pct >= 0.5:
        assignment_score = 7.0
    elif assign_pct >= 0.2:
        assignment_score = 4.0
    else:
        assignment_score = 2.0

    # ── Weighted final score ──────────────────────────────────────────────────
    final_score = (
        timeline_score   * 0.25 +
        budget_score     * 0.25 +
        velocity_score   * 0.15 +
        blocked_score    * 0.15 +
        workload_score   * 0.10 +
        overdue_score    * 0.05 +
        assignment_score * 0.05
    )
    final_score = round(final_score, 1)

    # ── Color and label ───────────────────────────────────────────────────────
    if final_score >= 8:
        color, label = "green",  "En buen camino"
    elif final_score >= 5:
        color, label = "yellow", "Atención recomendada"
    elif final_score >= 3:
        color, label = "orange", "En riesgo"
    else:
        color, label = "red",    "Acción urgente"

    # ── Find top risk ─────────────────────────────────────────────────────────
    factors = {
        "Progreso temporal":      {"score": timeline_score,   "weight": 0.25},
        "Control de presupuesto": {"score": budget_score,     "weight": 0.25},
        "Velocidad de tareas":    {"score": velocity_score,   "weight": 0.15},
        "Tareas bloqueadas":      {"score": blocked_score,    "weight": 0.15},
        "Balance de trabajo":     {"score": workload_score,   "weight": 0.10},
        "Tareas vencidas":        {"score": overdue_score,    "weight": 0.05},
        "Asignación de tareas":   {"score": assignment_score, "weight": 0.05},
    }
    top_risk = min(factors, key=lambda k: factors[k]["score"])

    return {
        "score":      final_score,
        "color":      color,
        "label":      label,
        "factors":    factors,
        "top_risk":   top_risk,
        "stats": {
            "total_tasks":     total_tasks,
            "completed_tasks": len(completed_tasks),
            "blocked_tasks":   len(blocked),
            "overdue_tasks":   len(overdue),
            "days_left":       (project.deadline - today).days if project.deadline else None,
        }
    }


def update_project_health(db: Session, project_id: int) -> float:
    """
    Recalculates and saves the health score for a project.
    Called after any task update.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return 10.0

    # Recalculate completion percentage from tasks
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    if tasks:
        completed = len([t for t in tasks if t.status == "completada"])
        project.completion_percentage = round((completed / len(tasks)) * 100, 1)

    result = calculate_health_score(db, project)
    project.health_score = result["score"]
    db.commit()

    return result["score"]


# Fix missing import at top of file
from models.project import ProjectExpense