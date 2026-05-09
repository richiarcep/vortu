from datetime import date, datetime
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.project import Project, Task
from modules.projects.health import update_project_health
from modules.projects.velocity import calculate_velocity


def scan_all_projects():
    """
    Runs daily at 8am. Scans every active project,
    recalculates health scores, and detects at-risk projects.
    """
    db: Session = SessionLocal()
    try:
        projects = db.query(Project).filter(
            Project.status == "activo"
        ).all()

        alerts_generated = []

        for project in projects:
            # Recalculate health
            update_project_health(db, project.id)
            db.refresh(project)

            velocity = calculate_velocity(db, project.id)
            today = date.today()

            # ── Check deadline risk ───────────────────────────────────────────
            if project.deadline:
                days_left = (project.deadline - today).days
                completion = project.completion_percentage or 0

                if days_left < 0 and completion < 100:
                    alerts_generated.append({
                        "project_id":   project.id,
                        "project_name": project.name,
                        "type":         "deadline_passed",
                        "severity":     "alta",
                        "message":      f"El proyecto '{project.name}' ha superado su fecha límite con {completion:.0f}% completado.",
                    })
                elif days_left <= 3 and completion < 80:
                    alerts_generated.append({
                        "project_id":   project.id,
                        "project_name": project.name,
                        "type":         "deadline_risk",
                        "severity":     "alta",
                        "message":      f"'{project.name}' vence en {days_left} días con solo {completion:.0f}% completado.",
                    })
                elif days_left <= 7 and completion < 60:
                    alerts_generated.append({
                        "project_id":   project.id,
                        "project_name": project.name,
                        "type":         "deadline_warning",
                        "severity":     "media",
                        "message":      f"'{project.name}' vence en {days_left} días con {completion:.0f}% completado. Ritmo insuficiente.",
                    })

            # ── Check health score drop ───────────────────────────────────────
            if project.health_score < 3:
                alerts_generated.append({
                    "project_id":   project.id,
                    "project_name": project.name,
                    "type":         "health_critical",
                    "severity":     "alta",
                    "message":      f"'{project.name}' tiene un health score crítico de {project.health_score}/10. Requiere atención urgente.",
                })
            elif project.health_score < 5:
                alerts_generated.append({
                    "project_id":   project.id,
                    "project_name": project.name,
                    "type":         "health_warning",
                    "severity":     "media",
                    "message":      f"'{project.name}' tiene un health score de {project.health_score}/10. Se recomienda revisión.",
                })

            # ── Check budget overrun ──────────────────────────────────────────
            if velocity.get("budget_warning"):
                alerts_generated.append({
                    "project_id":   project.id,
                    "project_name": project.name,
                    "type":         "budget_risk",
                    "severity":     "media",
                    "message":      velocity["budget_warning"],
                })

            # ── Check blocked tasks older than 3 days ─────────────────────────
            tasks = db.query(Task).filter(
                Task.project_id == project.id,
                Task.status == "bloqueada"
            ).all()
            old_blocked = [
                t for t in tasks
                if t.updated_at and (datetime.now() - t.updated_at).days >= 3
            ]
            if old_blocked:
                alerts_generated.append({
                    "project_id":   project.id,
                    "project_name": project.name,
                    "type":         "blocked_tasks",
                    "severity":     "media",
                    "message":      f"'{project.name}' tiene {len(old_blocked)} tarea(s) bloqueada(s) por más de 3 días.",
                })

            # ── Check milestone reached ───────────────────────────────────────
            completion = project.completion_percentage or 0
            for milestone in [25, 50, 75]:
                if completion >= milestone:
                    # In production store which milestones were already notified
                    pass

        return {
            "scanned":         len(projects),
            "alerts":          len(alerts_generated),
            "alerts_detail":   alerts_generated,
            "scanned_at":      str(datetime.now()),
        }

    finally:
        db.close()


def generate_weekly_projects_digest(company_id: int) -> dict:
    """
    Called every Monday. Summarizes all projects for the week.
    """
    db: Session = SessionLocal()
    try:
        projects = db.query(Project).filter(
            Project.company_id == company_id
        ).all()

        active    = [p for p in projects if p.status == "activo"]
        completed = [p for p in projects if p.status == "completado"]
        at_risk   = [p for p in active if p.health_score < 5]

        project_summaries = []
        for p in active:
            velocity = calculate_velocity(db, p.id)
            project_summaries.append({
                "name":                  p.name,
                "health_score":          p.health_score,
                "completion_percentage": p.completion_percentage,
                "deadline":              str(p.deadline) if p.deadline else None,
                "days_left":             (p.deadline - date.today()).days if p.deadline else None,
                "will_finish_on_time":   velocity.get("will_finish_on_time"),
                "predicted_end":         velocity.get("predicted_completion_date"),
                "budget_warning":        velocity.get("budget_warning"),
            })

        return {
            "week":             str(date.today()),
            "total_active":     len(active),
            "total_completed":  len(completed),
            "at_risk":          len(at_risk),
            "projects":         project_summaries,
            "needs_attention":  [p["name"] for p in project_summaries if p["health_score"] < 5],
            "on_track":         [p["name"] for p in project_summaries if p["health_score"] >= 8],
        }

    finally:
        db.close()


def setup_project_scheduler(scheduler):
    """
    Registers project jobs with the APScheduler instance.
    Call this from main.py after creating the scheduler.
    """
    # Daily scan at 8am
    scheduler.add_job(
        scan_all_projects,
        trigger="cron",
        hour=8,
        minute=0,
        id="daily_project_scan",
        replace_existing=True,
    )

    print("✓ Project scheduler jobs registered")