import io
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from sqlalchemy.orm import Session
from models.project import Project, Task, TimeEntry, ProjectExpense
from modules.projects.health import calculate_health_score
from modules.projects.velocity import calculate_velocity


# ── Colors ────────────────────────────────────────────────────────────────────
NAVY    = colors.HexColor("#0B1426")
WHITE   = colors.white
LIGHT   = colors.HexColor("#F4F6FB")
BORDER  = colors.HexColor("#E5E9F0")
GREEN   = colors.HexColor("#16A34A")
AMBER   = colors.HexColor("#D97706")
RED     = colors.HexColor("#DC2626")
MUTED   = colors.HexColor("#6B7280")

W, H    = A4
MARGIN  = 18 * mm


def health_color(score):
    if score >= 8: return GREEN
    if score >= 5: return AMBER
    return RED


def generate_project_report_pdf(
    db: Session,
    project: Project,
    ai_analysis: dict = None
) -> bytes:
    """
    Generates a branded PDF report for a project.
    Returns the PDF as bytes ready to stream or save.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    ST = {
        "h1":    S("h1",    fontName="Helvetica-Bold",   fontSize=18, textColor=NAVY,  spaceAfter=4),
        "h2":    S("h2",    fontName="Helvetica-Bold",   fontSize=13, textColor=NAVY,  spaceAfter=3),
        "h3":    S("h3",    fontName="Helvetica-Bold",   fontSize=10, textColor=NAVY,  spaceAfter=2),
        "body":  S("body",  fontName="Helvetica",        fontSize=9,  textColor=colors.HexColor("#374151"), leading=14, spaceAfter=4),
        "muted": S("muted", fontName="Helvetica",        fontSize=8,  textColor=MUTED, leading=12),
        "white": S("white", fontName="Helvetica-Bold",   fontSize=10, textColor=WHITE),
        "kpi_v": S("kpi_v", fontName="Helvetica-Bold",   fontSize=20, textColor=NAVY,  alignment=TA_CENTER),
        "kpi_l": S("kpi_l", fontName="Helvetica",        fontSize=8,  textColor=MUTED, alignment=TA_CENTER),
    }

    today = date.today()
    tasks = db.query(Task).filter(Task.project_id == project.id).all()
    time_entries = db.query(TimeEntry).filter(
        TimeEntry.task_id.in_([t.id for t in tasks])
    ).all()
    expenses = db.query(ProjectExpense).filter(
        ProjectExpense.project_id == project.id
    ).all()

    health   = calculate_health_score(db, project)
    velocity = calculate_velocity(db, project.id)

    total_hours    = sum(t.actual_hours or 0 for t in tasks)
    total_cost     = sum(e.cost or 0 for e in time_entries)
    total_expenses = sum(e.amount or 0 for e in expenses)
    total_spent    = total_cost + total_expenses
    budget_left    = (project.budget or 0) - total_spent
    completed      = len([t for t in tasks if t.status == "completada"])
    blocked        = len([t for t in tasks if t.status == "bloqueada"])

    E = []  # elements

    # ── COVER HEADER ──────────────────────────────────────────────────────────
    cover = Table([[
        Paragraph("N", S("logo", fontName="Helvetica-Bold", fontSize=28, textColor=WHITE)),
        Table([[
            Paragraph("NEXUM", S("n", fontName="Helvetica-Bold", fontSize=11, textColor=WHITE)),
            Paragraph(f"Informe de Proyecto · {today.strftime('%d %b %Y')}", S("d", fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#94A3B8"))),
        ]], colWidths=[60*mm, W - MARGIN*2 - 80*mm]),
    ]], colWidths=[20*mm, W - MARGIN*2 - 20*mm])
    cover.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), NAVY),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [8,8,8,8]),
        ("TOPPADDING",    (0,0),(-1,-1), 14),
        ("BOTTOMPADDING", (0,0),(-1,-1), 14),
        ("LEFTPADDING",   (0,0),(-1,-1), 16),
        ("RIGHTPADDING",  (0,0),(-1,-1), 16),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))
    E.append(cover)
    E.append(Spacer(1, 10))

    # ── PROJECT TITLE ─────────────────────────────────────────────────────────
    E.append(Paragraph(project.name, ST["h1"]))
    if project.client_name:
        E.append(Paragraph(f"Cliente: {project.client_name}", ST["muted"]))
    E.append(Paragraph(
        f"Estado: {project.status.upper()}  ·  "
        f"Inicio: {project.start_date}  ·  "
        f"Vencimiento: {project.deadline}  ·  "
        f"Días restantes: {(project.deadline - today).days if project.deadline else '—'}",
        ST["muted"]
    ))
    E.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=10))

    # ── HEALTH SCORE BANNER ───────────────────────────────────────────────────
    hc = health_color(health["score"])
    banner_data = [[
        Paragraph(f"{health['score']}", S("hs", fontName="Helvetica-Bold", fontSize=32, textColor=WHITE, alignment=TA_CENTER)),
        Paragraph(f"Health Score\n{health['label']}", S("hl", fontName="Helvetica-Bold", fontSize=10, textColor=WHITE, leading=16)),
    ]]
    banner = Table(banner_data, colWidths=[30*mm, W - MARGIN*2 - 30*mm])
    banner.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), hc),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [8,8,8,8]),
        ("TOPPADDING",    (0,0),(-1,-1), 12),
        ("BOTTOMPADDING", (0,0),(-1,-1), 12),
        ("LEFTPADDING",   (0,0),(-1,-1), 16),
        ("RIGHTPADDING",  (0,0),(-1,-1), 16),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))
    E.append(banner)
    E.append(Spacer(1, 12))

    # ── KPI CARDS ─────────────────────────────────────────────────────────────
    kpi_data = [[
        Paragraph(f"{project.completion_percentage:.0f}%", ST["kpi_v"]),
        Paragraph(f"€{total_spent:,.0f}", ST["kpi_v"]),
        Paragraph(f"€{budget_left:,.0f}", ST["kpi_v"]),
        Paragraph(f"{total_hours:.1f}h", ST["kpi_v"]),
    ],[
        Paragraph("Completado", ST["kpi_l"]),
        Paragraph("Gasto total", ST["kpi_l"]),
        Paragraph("Presupuesto restante", ST["kpi_l"]),
        Paragraph("Horas registradas", ST["kpi_l"]),
    ]]
    cw = (W - MARGIN*2) / 4
    kpi = Table(kpi_data, colWidths=[cw]*4)
    kpi.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), LIGHT),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [6,6,6,6]),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LINEAFTER",     (0,0),(2,-1),  0.5, BORDER),
        ("ALIGN",         (0,0),(-1,-1), "CENTER"),
    ]))
    E.append(kpi)
    E.append(Spacer(1, 14))

    # ── AI ANALYSIS ───────────────────────────────────────────────────────────
    if ai_analysis and ai_analysis.get("resumen_ejecutivo"):
        E.append(Paragraph("Análisis IA", ST["h2"]))
        E.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))
        E.append(Paragraph(ai_analysis["resumen_ejecutivo"], ST["body"]))

        if ai_analysis.get("accion_hoy"):
            action_box = Table([[
                Paragraph("Acción prioritaria hoy:", S("ab", fontName="Helvetica-Bold", fontSize=9, textColor=NAVY)),
                Paragraph(ai_analysis["accion_hoy"], ST["body"]),
            ]], colWidths=[42*mm, W - MARGIN*2 - 42*mm])
            action_box.setStyle(TableStyle([
                ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#F0F7FF")),
                ("ROUNDEDCORNERS",(0,0),(-1,-1), [6,6,6,6]),
                ("TOPPADDING",    (0,0),(-1,-1), 8),
                ("BOTTOMPADDING", (0,0),(-1,-1), 8),
                ("LEFTPADDING",   (0,0),(-1,-1), 10),
                ("RIGHTPADDING",  (0,0),(-1,-1), 10),
                ("VALIGN",        (0,0),(-1,-1), "TOP"),
            ]))
            E.append(action_box)
            E.append(Spacer(1, 8))

        # Risks
        if ai_analysis.get("riesgos"):
            E.append(Paragraph("Riesgos identificados", ST["h3"]))
            risk_rows = [["Severidad", "Riesgo", "Descripción"]]
            for r in ai_analysis["riesgos"]:
                risk_rows.append([
                    r.get("severidad", "").upper(),
                    r.get("tipo", ""),
                    r.get("descripcion", ""),
                ])
            risk_table = Table(risk_rows, colWidths=[22*mm, 40*mm, W - MARGIN*2 - 62*mm])
            risk_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0),(-1,0),  NAVY),
                ("TEXTCOLOR",     (0,0),(-1,0),  WHITE),
                ("FONTNAME",      (0,0),(-1,0),  "Helvetica-Bold"),
                ("FONTSIZE",      (0,0),(-1,-1), 8),
                ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT]),
                ("GRID",          (0,0),(-1,-1), 0.3, BORDER),
                ("TOPPADDING",    (0,0),(-1,-1), 5),
                ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                ("LEFTPADDING",   (0,0),(-1,-1), 6),
            ]))
            E.append(risk_table)
            E.append(Spacer(1, 10))

    # ── TASK TABLE ────────────────────────────────────────────────────────────
    E.append(Paragraph("Tareas del proyecto", ST["h2"]))
    E.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))

    task_rows = [["Tarea", "Estado", "Prioridad", "H. Est.", "H. Real", "Vencimiento"]]
    status_colors = {
        "completada": GREEN, "en_progreso": colors.HexColor("#2563EB"),
        "bloqueada": RED,    "pendiente": MUTED,
    }
    for t in tasks:
        task_rows.append([
            t.title[:45] + ("..." if len(t.title) > 45 else ""),
            t.status.replace("_", " ").upper(),
            t.priority.upper(),
            f"{t.estimated_hours:.1f}h",
            f"{t.actual_hours:.1f}h",
            str(t.due_date) if t.due_date else "—",
        ])

    cw2 = [(W - MARGIN*2) * p for p in [0.35, 0.15, 0.12, 0.10, 0.10, 0.18]]
    task_table = Table(task_rows, colWidths=cw2, repeatRows=1)
    task_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  NAVY),
        ("TEXTCOLOR",     (0,0),(-1,0),  WHITE),
        ("FONTNAME",      (0,0),(-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,-1), 8),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT]),
        ("GRID",          (0,0),(-1,-1), 0.3, BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
    ]))
    E.append(task_table)
    E.append(Spacer(1, 14))

    # ── VELOCITY ─────────────────────────────────────────────────────────────
    E.append(Paragraph("Velocidad y predicción", ST["h2"]))
    E.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))
    E.append(Paragraph(
        f"Tareas completadas los últimos 7 días: {velocity.get('tasks_completed_last_7_days', 0)}  ·  "
        f"Velocidad: {velocity.get('velocity_per_day', 0):.2f} tareas/día  ·  "
        f"Fecha estimada de finalización: {velocity.get('predicted_completion_date', '—')}",
        ST["body"]
    ))
    E.append(Paragraph(velocity.get("recommendation", ""), ST["body"]))
    E.append(Spacer(1, 8))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawCentredString(W/2, 12*mm, f"Nexum · Informe de Proyecto · {project.name} · Página {doc.page}")
        canvas.restoreState()

    doc.build(E, onFirstPage=on_page, onLaterPages=on_page)
    buffer.seek(0)
    return buffer.read()