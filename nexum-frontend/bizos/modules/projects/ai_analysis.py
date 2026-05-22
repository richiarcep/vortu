import json
from datetime import date
from sqlalchemy.orm import Session
from anthropic import Anthropic
from core.config import get_settings
from models.project import Project, Task, TimeEntry, ProjectExpense
from modules.projects.health import calculate_health_score
from modules.projects.velocity import calculate_velocity

settings = get_settings()


def analyze_project_with_ai(db: Session, project: Project) -> dict:
    """
    Sends full project context to Claude and gets back
    a structured analysis with risks, recommendations,
    and a prioritized action for today.
    """
    today = date.today()
    tasks = db.query(Task).filter(Task.project_id == project.id).all()
    time_entries = db.query(TimeEntry).filter(
        TimeEntry.task_id.in_([t.id for t in tasks])
    ).all()
    expenses = db.query(ProjectExpense).filter(
        ProjectExpense.project_id == project.id
    ).all()

    health = calculate_health_score(db, project)
    velocity = calculate_velocity(db, project.id)

    # ── Build task summary ────────────────────────────────────────────────────
    task_summary = []
    for t in tasks:
        task_summary.append({
            "titulo":        t.title,
            "estado":        t.status,
            "prioridad":     t.priority,
            "horas_estimadas": t.estimated_hours,
            "horas_reales":  t.actual_hours,
            "vencimiento":   str(t.due_date) if t.due_date else None,
            "asignado":      t.assigned_to,
        })

    total_cost = sum(e.cost or 0 for e in time_entries)
    total_expenses = sum(e.amount or 0 for e in expenses)

    project_context = {
        "nombre":           project.name,
        "cliente":          project.client_name,
        "estado":           project.status,
        "fecha_inicio":     str(project.start_date) if project.start_date else None,
        "fecha_limite":     str(project.deadline) if project.deadline else None,
        "dias_restantes":   (project.deadline - today).days if project.deadline else None,
        "presupuesto":      project.budget,
        "coste_equipo":     round(total_cost, 2),
        "gastos_directos":  round(total_expenses, 2),
        "coste_total":      round(total_cost + total_expenses, 2),
        "completado_pct":   project.completion_percentage,
        "health_score":     health["score"],
        "health_label":     health["label"],
        "health_factors":   health["factors"],
        "top_risk_factor":  health["top_risk"],
        "velocidad_tareas": velocity.get("velocity_per_day"),
        "fecha_fin_predicha": velocity.get("predicted_completion_date"),
        "terminara_a_tiempo": velocity.get("will_finish_on_time"),
        "tareas":           task_summary,
        "total_tareas":     len(tasks),
        "completadas":      len([t for t in tasks if t.status == "completada"]),
        "bloqueadas":       len([t for t in tasks if t.status == "bloqueada"]),
        "vencidas":         len([t for t in tasks if t.due_date and t.due_date < today and t.status != "completada"]),
    }

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Eres un consultor de gestión de proyectos experto. Analiza este proyecto y devuelve SOLO un JSON con esta estructura exacta:

{{
  "resumen_ejecutivo": "2-3 oraciones sobre el estado actual del proyecto en español",
  "riesgos": [
    {{
      "tipo": "nombre corto del riesgo",
      "severidad": "alta|media|baja",
      "descripcion": "qué está pasando exactamente",
      "impacto": "qué puede pasar si no se actúa"
    }}
  ],
  "recomendaciones": [
    {{
      "prioridad": 1,
      "accion": "acción concreta y específica",
      "responsable": "quién debe hacerlo",
      "plazo": "hoy|esta semana|este mes"
    }}
  ],
  "accion_hoy": "la única cosa más importante que debe hacerse hoy mismo",
  "prediccion": "una predicción honesta sobre cómo terminará este proyecto si continúa como está",
  "puntos_positivos": ["cosa positiva 1", "cosa positiva 2"],
  "señales_de_alerta": ["señal 1", "señal 2"]
}}

DATOS DEL PROYECTO:
{json.dumps(project_context, default=str, indent=2, ensure_ascii=False)}

Analiza en profundidad. Sé específico y directo. Solo el JSON."""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        result = json.loads(text)
        result["project_context"] = project_context
        result["generated_at"] = str(today)
        return result
    except Exception as e:
        return {
            "resumen_ejecutivo": "No se pudo generar el análisis.",
            "riesgos": [],
            "recomendaciones": [],
            "accion_hoy": "Verifica que el proyecto tenga tareas y datos suficientes.",
            "prediccion": "",
            "puntos_positivos": [],
            "señales_de_alerta": [],
            "error": str(e),
            "project_context": project_context,
        }


def generate_post_project_report(db: Session, project: Project) -> dict:
    """
    Generated automatically when a project is marked as complete.
    Analyses what went well, what went wrong, and lessons learned.
    """
    tasks = db.query(Task).filter(Task.project_id == project.id).all()
    time_entries = db.query(TimeEntry).filter(
        TimeEntry.task_id.in_([t.id for t in tasks])
    ).all()
    expenses = db.query(ProjectExpense).filter(
        ProjectExpense.project_id == project.id
    ).all()

    total_hours = sum(t.actual_hours or 0 for t in tasks)
    estimated_hours = sum(t.estimated_hours or 0 for t in tasks)
    total_cost = sum(e.cost or 0 for e in time_entries) + sum(e.amount or 0 for e in expenses)
    budget_accuracy = ((project.budget - total_cost) / project.budget * 100) if project.budget else 0
    time_accuracy = ((estimated_hours - total_hours) / estimated_hours * 100) if estimated_hours else 0

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Genera un informe post-proyecto profesional en español. Devuelve SOLO un JSON:

{{
  "titulo": "Informe Final — {project.name}",
  "resumen": "párrafo resumiendo el proyecto completo",
  "resultado_global": "exitoso|con_incidencias|fallido",
  "metricas": {{
    "presupuesto_inicial": {project.budget or 0},
    "coste_final": {round(total_cost, 2)},
    "desviacion_presupuesto_pct": {round(100 - budget_accuracy, 1)},
    "horas_estimadas": {round(estimated_hours, 1)},
    "horas_reales": {round(total_hours, 1)},
    "desviacion_tiempo_pct": {round(100 - time_accuracy, 1)},
    "total_tareas": {len(tasks)},
    "tareas_completadas": {len([t for t in tasks if t.status == "completada"])}
  }},
  "que_salio_bien": ["punto positivo 1", "punto positivo 2", "punto positivo 3"],
  "que_salio_mal": ["problema 1", "problema 2"],
  "lecciones_aprendidas": ["lección 1", "lección 2", "lección 3"],
  "recomendaciones_futuros": ["recomendación para próximos proyectos similares"],
  "conclusion": "párrafo de cierre profesional"
}}

Proyecto: {project.name}
Cliente: {project.client_name or 'Interno'}
Duración: {str(project.start_date)} a {str(project.deadline)}
Solo el JSON."""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        return json.loads(text)
    except Exception as e:
        return {
            "titulo": f"Informe Final — {project.name}",
            "resumen": "No se pudo generar el informe automáticamente.",
            "error": str(e)
        }