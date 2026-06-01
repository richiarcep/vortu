"""
Genera snapshots diarios/mensuales de KPIs por empresa.
Se ejecuta automáticamente via scheduler o manualmente via API.
"""
import json
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.analytics import BusinessSnapshot, BusinessAIMemory
from models.sales import Sale, SaleItem, Product
from models.customer import Contact, Message
from models.project import Project, Task
from models.user import Company, User


def generate_snapshot(db: Session, company_id: int, target_date: date = None) -> BusinessSnapshot:
    """Genera un snapshot mensual de KPIs para una empresa."""
    if not target_date:
        target_date = date.today().replace(day=1)

    # Período del mes
    month_start = target_date.replace(day=1)
    if target_date.month == 12:
        month_end = target_date.replace(year=target_date.year + 1, month=1, day=1)
    else:
        month_end = target_date.replace(month=target_date.month + 1, day=1)

    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # ── Empresa ────────────────────────────────────────────────────────────
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return None

    user_count = db.query(func.count(User.id)).filter(User.company_id == company_id).scalar() or 0
    created_months = 0
    if hasattr(company, 'created_at') and company.created_at:
        delta = datetime.utcnow() - company.created_at.replace(tzinfo=None)
        created_months = int(delta.days / 30)

    # ── Ventas ─────────────────────────────────────────────────────────────
    ventas_mes = db.query(
        func.count(Sale.id),
        func.sum(Sale.total),
        func.avg(Sale.total)
    ).filter(
        Sale.company_id == company_id,
        Sale.sale_date >= month_start,
        Sale.sale_date < month_end
    ).first()
    num_ventas = ventas_mes[0] or 0
    ingresos_mes = float(ventas_mes[1] or 0)
    ticket_medio = float(ventas_mes[2] or 0)

    ventas_anterior = db.query(func.sum(Sale.total)).filter(
        Sale.company_id == company_id,
        Sale.sale_date >= prev_month_start,
        Sale.sale_date < month_start
    ).scalar() or 0
    ingresos_anterior = float(ventas_anterior)

    crecimiento_pct = 0
    if ingresos_anterior > 0:
        crecimiento_pct = ((ingresos_mes - ingresos_anterior) / ingresos_anterior) * 100

    # Método de pago dominante
    metodos = db.query(Sale.payment_method, func.count(Sale.id)).filter(
        Sale.company_id == company_id,
        Sale.sale_date >= month_start,
        Sale.sale_date < month_end
    ).group_by(Sale.payment_method).order_by(func.count(Sale.id).desc()).first()
    metodo_dominante = metodos[0] if metodos else "efectivo"

    pct_efectivo = 0
    pct_tarjeta = 0
    if num_ventas > 0:
        ef = db.query(func.count(Sale.id)).filter(Sale.company_id == company_id, Sale.sale_date >= month_start, Sale.sale_date < month_end, Sale.payment_method == "efectivo").scalar() or 0
        tar = db.query(func.count(Sale.id)).filter(Sale.company_id == company_id, Sale.sale_date >= month_start, Sale.sale_date < month_end, Sale.payment_method == "tarjeta").scalar() or 0
        pct_efectivo = (ef / num_ventas) * 100
        pct_tarjeta = (tar / num_ventas) * 100

    # Productos
    num_productos = db.query(func.count(Product.id)).filter(Product.company_id == company_id, Product.is_active == True).scalar() or 0
    bajo_stock = db.query(func.count(Product.id)).filter(
        Product.company_id == company_id,
        Product.is_active == True,
        Product.stock_quantity <= Product.low_stock_threshold
    ).scalar() or 0

    # ── Clientes ───────────────────────────────────────────────────────────
    total_contactos = db.query(func.count(Contact.id)).filter(Contact.company_id == company_id).scalar() or 0
    nuevos_mes = db.query(func.count(Contact.id)).filter(
        Contact.company_id == company_id,
        Contact.created_at >= month_start
    ).scalar() or 0
    sentiment_avg = db.query(func.avg(Contact.sentiment_score)).filter(Contact.company_id == company_id).scalar() or 5.0
    clientes_riesgo = db.query(func.count(Contact.id)).filter(
        Contact.company_id == company_id,
        Contact.risk_level.in_(["alto", "critico"])
    ).scalar() or 0
    vip = db.query(func.count(Contact.id)).filter(Contact.company_id == company_id, Contact.is_vip == True).scalar() or 0
    pendientes = db.query(func.count(Message.id)).filter(
        Message.company_id == company_id,
        Message.requires_human == True,
        Message.status == "pending"
    ).scalar() or 0

    # ── Proyectos ──────────────────────────────────────────────────────────
    proyectos_activos = db.query(func.count(Project.id)).filter(Project.company_id == company_id, Project.status == "activo").scalar() or 0
    health_avg = db.query(func.avg(Project.health_score)).filter(Project.company_id == company_id, Project.status == "activo").scalar() or 10.0
    proyectos_riesgo = db.query(func.count(Project.id)).filter(Project.company_id == company_id, Project.health_score < 5).scalar() or 0

    # ── Calcular labels automáticos ────────────────────────────────────────
    margen_pct = (float((ingresos_mes - 0) / ingresos_mes * 100) if ingresos_mes > 0 else 0)

    # Label riesgo negocio
    riesgo = "bajo"
    if clientes_riesgo > total_contactos * 0.3 or crecimiento_pct < -20:
        riesgo = "alto"
    elif clientes_riesgo > total_contactos * 0.15 or crecimiento_pct < -10:
        riesgo = "medio"
    elif proyectos_riesgo > proyectos_activos * 0.5:
        riesgo = "medio"

    # Label tendencia
    tendencia = "estable"
    if crecimiento_pct > 10:
        tendencia = "creciendo"
    elif crecimiento_pct < -10:
        tendencia = "bajando"

    # Label salud financiera
    salud = "saludable"
    if margen_pct < 0:
        salud = "crisis"
    elif margen_pct < 10:
        salud = "problemas"
    elif margen_pct < 20:
        salud = "ajustado"

    # Empresa size
    if user_count <= 5:
        size = "micro"
    elif user_count <= 20:
        size = "pequeña"
    elif user_count <= 50:
        size = "mediana"
    else:
        size = "grande"

    size_rango = "1-5" if user_count <= 5 else "6-20" if user_count <= 20 else "21-50" if user_count <= 50 else "50+"

    ingresos_por_empleado = ingresos_mes / user_count if user_count > 0 else 0
    pct_clientes_riesgo = (clientes_riesgo / total_contactos * 100) if total_contactos > 0 else 0
    pct_proyectos_riesgo = (proyectos_riesgo / proyectos_activos * 100) if proyectos_activos > 0 else 0
    pct_bajo_stock = (bajo_stock / num_productos * 100) if num_productos > 0 else 0

    # ── Crear o actualizar snapshot ────────────────────────────────────────
    existing = db.query(BusinessSnapshot).filter(
        BusinessSnapshot.company_id == company_id,
        BusinessSnapshot.snapshot_date == month_start,
        BusinessSnapshot.periodo == "monthly"
    ).first()

    snapshot = existing or BusinessSnapshot()
    snapshot.company_id             = company_id
    snapshot.snapshot_date          = month_start
    snapshot.periodo                = "monthly"
    snapshot.meses_en_vortu         = created_months
    snapshot.num_empleados          = user_count
    snapshot.num_empleados_rango    = size_rango
    snapshot.empresa_size           = size
    snapshot.ingresos_mes           = round(ingresos_mes, 2)
    snapshot.gastos_mes             = 0  # TODO: conectar contabilidad
    snapshot.resultado_neto         = round(ingresos_mes, 2)
    snapshot.margen_neto_pct        = round(margen_pct, 2)
    snapshot.ratio_gastos_ingresos  = 0
    snapshot.ingresos_mes_anterior  = round(ingresos_anterior, 2)
    snapshot.crecimiento_ingresos_pct = round(crecimiento_pct, 2)
    snapshot.num_ventas_mes         = num_ventas
    snapshot.ticket_medio           = round(ticket_medio, 2)
    snapshot.num_productos_activos  = num_productos
    snapshot.productos_bajo_stock   = bajo_stock
    snapshot.pct_productos_bajo_stock = round(pct_bajo_stock, 2)
    snapshot.metodo_pago_dominante  = metodo_dominante
    snapshot.pct_pago_efectivo      = round(pct_efectivo, 2)
    snapshot.pct_pago_tarjeta       = round(pct_tarjeta, 2)
    snapshot.ingresos_por_empleado  = round(ingresos_por_empleado, 2)
    snapshot.total_contactos        = total_contactos
    snapshot.contactos_nuevos_mes   = nuevos_mes
    snapshot.sentiment_score_avg    = round(float(sentiment_avg), 2)
    snapshot.clientes_riesgo        = clientes_riesgo
    snapshot.pct_clientes_riesgo    = round(pct_clientes_riesgo, 2)
    snapshot.mensajes_pendientes    = pendientes
    snapshot.clientes_vip           = vip
    snapshot.proyectos_activos      = proyectos_activos
    snapshot.health_score_avg       = round(float(health_avg), 2)
    snapshot.proyectos_en_riesgo    = proyectos_riesgo
    snapshot.pct_proyectos_riesgo   = round(pct_proyectos_riesgo, 2)
    snapshot.label_riesgo_negocio   = riesgo
    snapshot.label_tendencia        = tendencia
    snapshot.label_salud_financiera = salud
    snapshot.generated_by           = "auto"
    snapshot.generated_at           = datetime.utcnow()

    if not existing:
        db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def generate_all_snapshots(db: Session):
    """Genera snapshots para todas las empresas activas."""
    companies = db.query(Company).all()
    results = []
    for company in companies:
        try:
            snap = generate_snapshot(db, company.id)
            if snap:
                results.append({"company_id": company.id, "status": "ok"})
        except Exception as e:
            results.append({"company_id": company.id, "status": "error", "error": str(e)})
    return results
