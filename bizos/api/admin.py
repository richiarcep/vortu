"""
Backoffice API — solo accesible para usuarios con is_admin=True.
Gestión de empresas, usuarios, planes, snapshots y prompts.
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.database import get_db
from core.security import get_admin_user
from models.user import User, Company
from models.billing import Subscription, License, PLANS
from models.analytics import BusinessSnapshot, BusinessAIMemory
from models.sales import Sale, Product
from models.customer import Contact
from models.project import Project
from modules.analytics.snapshot_worker import generate_snapshot, generate_all_snapshots
from modules.analytics.memory_updater import auto_update_memory, generate_memory_txt
from models.analytics import MemoryEntry
from models.prompt import SystemPrompt
from modules.core.prompt_loader import invalidate_cache

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class PlanUpdateRequest(BaseModel):
    plan_id: str

class UserStatusRequest(BaseModel):
    is_active: bool

class CompanyStatusRequest(BaseModel):
    is_active: bool

class PromptUpdateRequest(BaseModel):
    prompt_key: str
    new_content: str

class MemoryUpdateRequest(BaseModel):
    company_id: int
    manual_training: Optional[str] = None
    business_personality: Optional[str] = None
    business_goals: Optional[str] = None


# ── Dashboard overview ─────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Stats globales de Vortu para el backoffice."""
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    # Suscripciones por plan
    subs = db.query(Subscription.plan_id, func.count(Subscription.id)).group_by(Subscription.plan_id).all()
    subs_by_plan = {s[0]: s[1] for s in subs}

    active_subs = db.query(func.count(Subscription.id)).filter(
        Subscription.status.in_(["active", "trialing"])
    ).scalar() or 0

    trial_subs = db.query(func.count(Subscription.id)).filter(
        Subscription.status == "trialing"
    ).scalar() or 0

    # MRR estimado
    mrr = 0
    for sub in db.query(Subscription).filter(Subscription.status == "active").all():
        plan = PLANS.get(sub.plan_id, {})
        mrr += plan.get("price_monthly", 0) + (sub.extra_users or 0) * 8

    # Snapshots generados
    total_snapshots = db.query(func.count(BusinessSnapshot.id)).scalar() or 0

    return {
        "total_companies": total_companies,
        "total_users": total_users,
        "active_users": active_users,
        "active_subscriptions": active_subs,
        "trial_subscriptions": trial_subs,
        "subscriptions_by_plan": subs_by_plan,
        "mrr_estimated": round(mrr, 2),
        "total_snapshots": total_snapshots,
    }


# ── Companies ──────────────────────────────────────────────────────────────────

@router.get("/companies")
def list_companies(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todas las empresas con su info de suscripción."""
    companies = db.query(Company).all()
    result = []

    for company in companies:
        # Users of this company
        users = db.query(User).filter(User.company_id == company.id).all()

        # Subscription
        sub = None
        for user in users:
            sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if sub:
                break

        # Latest snapshot
        snap = db.query(BusinessSnapshot).filter(
            BusinessSnapshot.company_id == company.id
        ).order_by(BusinessSnapshot.snapshot_date.desc()).first()

        # Sales this month
        from datetime import date
        month_start = date.today().replace(day=1)
        monthly_revenue = db.query(func.sum(Sale.total)).filter(
            Sale.company_id == company.id,
            Sale.sale_date >= month_start
        ).scalar() or 0

        result.append({
            "id": company.id,
            "name": company.name,
            "email": company.email,
            "created_at": company.created_at.isoformat() if company.created_at else None,
            "users_count": len(users),
            "users": [{"id": u.id, "email": u.email, "full_name": u.full_name, "is_active": u.is_active, "is_admin": u.is_admin} for u in users],
            "plan": sub.plan_id if sub else "none",
            "plan_status": sub.status if sub else "none",
            "trial_active": sub.status == "trialing" if sub else False,
            "monthly_revenue": round(float(monthly_revenue), 2),
            "snapshot": {
                "date": snap.snapshot_date.isoformat() if snap else None,
                "ingresos": snap.ingresos_mes if snap else 0,
                "tendencia": snap.label_tendencia if snap else None,
                "salud": snap.label_salud_financiera if snap else None,
                "riesgo": snap.label_riesgo_negocio if snap else None,
                "health_score": snap.health_score_avg if snap else None,
            } if snap else None,
        })

    return {"companies": result, "total": len(result)}


@router.get("/companies/{company_id}")
def get_company_detail(
    company_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Detalle completo de una empresa."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    users = db.query(User).filter(User.company_id == company_id).all()
    snapshots = db.query(BusinessSnapshot).filter(
        BusinessSnapshot.company_id == company_id
    ).order_by(BusinessSnapshot.snapshot_date.desc()).limit(12).all()

    memory = db.query(BusinessAIMemory).filter(
        BusinessAIMemory.company_id == company_id
    ).first()

    contacts = db.query(func.count(Contact.id)).filter(Contact.company_id == company_id).scalar() or 0
    products = db.query(func.count(Product.id)).filter(Product.company_id == company_id).scalar() or 0
    projects = db.query(func.count(Project.id)).filter(Project.company_id == company_id).scalar() or 0

    return {
        "company": {"id": company.id, "name": company.name, "email": company.email, "created_at": company.created_at.isoformat() if company.created_at else None},
        "users": [{"id": u.id, "email": u.email, "full_name": u.full_name, "is_active": u.is_active} for u in users],
        "stats": {"contacts": contacts, "products": products, "projects": projects},
        "snapshots": [
            {
                "date": s.snapshot_date.isoformat(),
                "ingresos": s.ingresos_mes,
                "resultado_neto": s.resultado_neto,
                "margen_pct": s.margen_neto_pct,
                "crecimiento_pct": s.crecimiento_ingresos_pct,
                "tendencia": s.label_tendencia,
                "salud": s.label_salud_financiera,
                "riesgo": s.label_riesgo_negocio,
                "health_score": s.health_score_avg,
                "sentiment_avg": s.sentiment_score_avg,
                "clientes_riesgo": s.clientes_riesgo,
            }
            for s in snapshots
        ],
        "memory": {
            "learned_facts": memory.learned_facts if memory else None,
            "manual_training": memory.manual_training if memory else None,
            "business_personality": memory.business_personality if memory else None,
            "business_goals": memory.business_goals if memory else None,
            "last_auto_update": memory.last_auto_update.isoformat() if memory and memory.last_auto_update else None,
            "auto_update_count": memory.auto_update_count if memory else 0,
        } if memory else None,
    }


@router.put("/companies/{company_id}/plan")
def update_company_plan(
    company_id: int,
    body: PlanUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Cambia el plan de una empresa manualmente."""
    if body.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Plan no válido")

    users = db.query(User).filter(User.company_id == company_id).all()
    updated = False
    for user in users:
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if sub:
            sub.plan_id = body.plan_id
            sub.status = "active"
            updated = True
            break

    if not updated:
        # Create subscription
        if users:
            sub = Subscription(
                user_id=users[0].id,
                plan_id=body.plan_id,
                status="active",
            )
            db.add(sub)

    db.commit()
    return {"message": f"Plan actualizado a {body.plan_id}", "company_id": company_id}


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todos los usuarios."""
    users = db.query(User).all()
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "is_active": u.is_active,
                "is_admin": u.is_admin,
                "company_id": u.company_id,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": len(users)
    }


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: UserStatusRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Activa o desactiva un usuario."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active = body.is_active
    db.commit()
    return {"message": f"Usuario {'activado' if body.is_active else 'desactivado'}", "user_id": user_id}


# ── Snapshots ──────────────────────────────────────────────────────────────────

@router.get("/snapshots")
def get_all_snapshots(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Tabla maestra de snapshots de todas las empresas."""
    snapshots = db.query(BusinessSnapshot).order_by(
        BusinessSnapshot.snapshot_date.desc()
    ).limit(500).all()

    return {
        "snapshots": [
            {
                "id": s.id,
                "company_id": s.company_id,
                "date": s.snapshot_date.isoformat(),
                "sector": s.sector,
                "empresa_size": s.empresa_size,
                "num_empleados": s.num_empleados,
                "ingresos_mes": s.ingresos_mes,
                "gastos_mes": s.gastos_mes,
                "resultado_neto": s.resultado_neto,
                "margen_neto_pct": s.margen_neto_pct,
                "crecimiento_pct": s.crecimiento_ingresos_pct,
                "num_ventas": s.num_ventas_mes,
                "ticket_medio": s.ticket_medio,
                "total_contactos": s.total_contactos,
                "sentiment_avg": s.sentiment_score_avg,
                "clientes_riesgo": s.clientes_riesgo,
                "proyectos_activos": s.proyectos_activos,
                "health_score_avg": s.health_score_avg,
                "tendencia": s.label_tendencia,
                "salud_financiera": s.label_salud_financiera,
                "riesgo_negocio": s.label_riesgo_negocio,
                "ai_health_score": s.ai_health_score,
                "num_empleados": s.num_empleados,
                "sector": s.sector,
                "ticket_medio": s.ticket_medio,
                "margen_neto_pct": s.margen_neto_pct,
            }
            for s in snapshots
        ],
        "total": len(snapshots)
    }


@router.post("/snapshots/generate-all")
def generate_all(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Genera snapshots para todas las empresas."""
    results = generate_all_snapshots(db)
    return {"results": results, "total": len(results)}


@router.post("/snapshots/generate/{company_id}")
def generate_one(
    company_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Genera snapshot para una empresa específica."""
    snap = generate_snapshot(db, company_id)
    if not snap:
        raise HTTPException(status_code=500, detail="Error generando snapshot")
    return {"message": "Snapshot generado", "date": snap.snapshot_date.isoformat()}


# ── Prompts ────────────────────────────────────────────────────────────────────

# Prompts guardados en memoria (en producción esto iría a BD)
_PROMPTS = {
    "marketing_analyzer": {
        "key": "marketing_analyzer",
        "name": "Analizador de empresa (Marketing)",
        "module": "Marketing",
        "description": "Analiza la empresa con datos internos y genera estrategia de marketing",
        "content": """Eres un experto en marketing digital y estrategia empresarial con 20 años de experiencia.
Analizas empresas en profundidad y generas estrategias de marketing basadas en datos reales.
Respondes SOLO en JSON válido, sin markdown, sin texto adicional.""",
        "variables": ["sector", "ventas", "clientes", "hr"],
        "last_modified": None,
    },
    "campaign_generator": {
        "key": "campaign_generator",
        "name": "Generador de campañas IA",
        "module": "Marketing",
        "description": "Genera copies, keywords e imágenes para campañas de publicidad",
        "content": """Eres un experto en publicidad digital con especialización en Google Ads, Meta Ads y TikTok.
Creas copies de alta conversión basados en datos reales de la empresa.
Respondes SOLO en JSON válido sin markdown.""",
        "variables": ["analysis", "campaign_name", "objective", "budget_daily", "platforms"],
        "last_modified": None,
    },
    "agent_chat": {
        "key": "agent_chat",
        "name": "Agente IA — Chat",
        "module": "Agente",
        "description": "Prompt del agente de chat que responde preguntas sobre el negocio",
        "content": """Eres el agente IA de Vortu para esta empresa. Tienes acceso completo a todos los datos del negocio.
Responde de forma concisa y accionable. Usa datos reales cuando estén disponibles.
Si no tienes datos suficientes, dilo claramente.""",
        "variables": ["company_context", "historial", "mensaje"],
        "last_modified": None,
    },
    "customer_response": {
        "key": "customer_response",
        "name": "Respuesta automática a clientes",
        "module": "Clientes",
        "description": "Genera respuestas automáticas a mensajes de clientes",
        "content": """Eres el asistente de atención al cliente de esta empresa. 
Responde de forma amable, profesional y resolutiva.
Usa la información de la base de conocimiento cuando sea relevante.
Si no puedes resolver el problema, escala al equipo humano.""",
        "variables": ["knowledge_base", "contact_name", "message", "sentiment"],
        "last_modified": None,
    },
    "project_analysis": {
        "key": "project_analysis",
        "name": "Análisis de proyecto",
        "module": "Proyectos",
        "description": "Analiza el estado de un proyecto y genera recomendaciones",
        "content": """Eres un project manager experto. Analiza el estado del proyecto y genera:
1. Resumen ejecutivo
2. Riesgos detectados con severidad
3. Recomendaciones priorizadas
4. Predicción de finalización
Sé conciso y accionable.""",
        "variables": ["project_name", "tasks", "budget", "deadline", "health_score"],
        "last_modified": None,
    },
    "finance_analyzer": {
        "key": "finance_analyzer",
        "name": "Analizador financiero",
        "module": "Finanzas",
        "description": "Analiza documentos financieros y genera insights",
        "content": """Eres un analista financiero experto en pymes españolas.
Analiza los datos financieros y genera un informe con:
- Resumen ejecutivo
- Puntuación de salud financiera (1-10)
- Principales métricas
- Recomendaciones concretas
Responde en JSON.""",
        "variables": ["file_type", "data", "module"],
        "last_modified": None,
    },
    "memory_updater": {
        "key": "memory_updater",
        "name": "Actualizador de memoria IA",
        "module": "Analytics",
        "description": "Extrae patrones y hechos aprendidos del negocio para la memoria IA",
        "content": """Eres el analista de IA de Vortu. Analiza los datos de este negocio y extrae patrones y hechos aprendidos.
Sé específico con números cuando puedas.
Formato: una línea por hecho, empezando con "- ".
Solo incluye hechos relevantes y accionables.
No repitas hechos que ya están en los conocidos anteriores.""",
        "variables": ["snapshot_data", "existing_facts", "manual_context"],
        "last_modified": None,
    },
}


@router.get("/prompts")
def list_prompts(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todos los prompts desde PostgreSQL."""
    prompts = db.query(SystemPrompt).order_by(SystemPrompt.module, SystemPrompt.name).all()
    result = [
        {
            "key": p.key, "name": p.name, "module": p.module,
            "description": p.description, "content": p.content,
            "variables": p.variables, "is_active": p.is_active,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            "updated_by": p.updated_by,
        }
        for p in prompts
    ]
    modules = list(set(p.module for p in prompts))
    return {"prompts": result, "total": len(result), "modules": modules}


@router.get("/prompts/{prompt_key}")
def get_prompt_detail(
    prompt_key: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Obtiene un prompt específico desde PostgreSQL."""
    prompt = db.query(SystemPrompt).filter(SystemPrompt.key == prompt_key).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")
    return {
        "key": prompt.key, "name": prompt.name, "module": prompt.module,
        "description": prompt.description, "content": prompt.content,
        "variables": prompt.variables, "is_active": prompt.is_active,
        "updated_at": prompt.updated_at.isoformat() if prompt.updated_at else None,
        "updated_by": prompt.updated_by,
    }


@router.put("/prompts/{prompt_key}")
def update_prompt(
    prompt_key: str,
    body: PromptUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Actualiza el prompt en PostgreSQL e invalida la cache."""
    prompt = db.query(SystemPrompt).filter(SystemPrompt.key == prompt_key).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    prompt.content = body.new_content
    prompt.updated_at = datetime.utcnow()
    prompt.updated_by = admin.email
    db.commit()

    # Invalidar cache para que el cambio sea inmediato
    invalidate_cache(prompt_key)

    return {
        "message": f"Prompt '{prompt_key}' guardado en BD y cache invalidada",
        "updated_at": prompt.updated_at.isoformat(),
        "updated_by": prompt.updated_by,
    }


# ── Billing Admin ─────────────────────────────────────────────────────────────

class FaseUpdateRequest(BaseModel):
    fase: str  # beta | early_adopter | paid
    fase_expiry_days: Optional[int] = None  # dias de periodo gratis


@router.get("/billing/overview")
def billing_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Vista completa de billing — fases, MRR, uso de IA."""
    from models.billing import Subscription, UsageTracking, PLANS
    from models.analytics import BusinessSnapshot
    from datetime import date

    companies = db.query(Company).all()
    result = []

    for company in companies:
        users = db.query(User).filter(User.company_id == company.id).all()
        if not users:
            continue

        sub = None
        for user in users:
            sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if sub:
                break

        # Usage this month
        month_start = date.today().replace(day=1)
        ai_usage = 0
        doc_usage = 0
        if sub:
            from datetime import datetime
            usage_records = db.query(UsageTracking).filter(
                UsageTracking.subscription_id == sub.id,
                UsageTracking.period_start >= datetime.combine(month_start, datetime.min.time())
            ).all()
            ai_usage = sum(u.ai_queries_used for u in usage_records)
            doc_usage = sum(u.documents_used for u in usage_records)

        # Plan limits
        plan = PLANS.get(sub.plan_id if sub else "starter", {})
        ai_limit = plan.get("ai_queries", 50)
        doc_limit = plan.get("documents", 25)

        # MRR
        mrr = 0
        if sub and sub.fase == "paid" and sub.status == "active":
            mrr = plan.get("price_monthly", 0) + (sub.extra_users or 0) * 8

        result.append({
            "company_id": company.id,
            "company_name": company.name,
            "company_email": company.email,
            "plan": sub.plan_id if sub else "none",
            "plan_status": sub.status if sub else "none",
            "fase": sub.fase if sub else "beta",
            "fase_expiry": sub.fase_expiry.isoformat() if sub and sub.fase_expiry else None,
            "sub_id": sub.id if sub else None,
            "ai_queries_used": ai_usage,
            "ai_queries_limit": ai_limit,
            "ai_pct": round(ai_usage / ai_limit * 100) if ai_limit > 0 else 0,
            "documents_used": doc_usage,
            "documents_limit": doc_limit,
            "doc_pct": round(doc_usage / doc_limit * 100) if doc_limit > 0 else 0,
            "mrr": mrr,
            "users_count": len(users),
            "created_at": company.created_at.isoformat() if company.created_at else None,
        })

    total_mrr = sum(r["mrr"] for r in result)
    by_fase = {
        "beta": sum(1 for r in result if r["fase"] == "beta"),
        "early_adopter": sum(1 for r in result if r["fase"] == "early_adopter"),
        "paid": sum(1 for r in result if r["fase"] == "paid"),
    }

    return {
        "companies": result,
        "total_mrr": round(total_mrr, 2),
        "by_fase": by_fase,
        "total": len(result),
    }


@router.put("/billing/{company_id}/fase")
def update_fase(
    company_id: int,
    body: FaseUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Cambia la fase de una empresa (beta/early_adopter/paid)."""
    from models.billing import Subscription
    from datetime import datetime, timedelta

    if body.fase not in ["beta", "early_adopter", "paid"]:
        raise HTTPException(status_code=400, detail="Fase inválida")

    users = db.query(User).filter(User.company_id == company_id).all()
    sub = None
    for user in users:
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if sub:
            break

    if not sub:
        raise HTTPException(status_code=404, detail="Sin suscripción")

    sub.fase = body.fase
    if body.fase_expiry_days:
        sub.fase_expiry = datetime.utcnow() + timedelta(days=body.fase_expiry_days)
    if body.fase == "paid":
        sub.status = "active"
    elif body.fase in ["beta", "early_adopter"]:
        sub.status = "trialing"

    db.commit()
    return {"message": f"Fase actualizada a {body.fase}", "company_id": company_id}


# ── Graph DB ──────────────────────────────────────────────────────────────────

@router.post("/graph/migrate")
def migrate_to_graph(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Migra todos los datos de PostgreSQL a Neo4j."""
    from services.graph.sync import migrate_all_to_graph
    stats = migrate_all_to_graph(db)
    return {"message": "Migración completada", "stats": stats}


@router.get("/graph/overview/{company_id}")
def graph_overview(
    company_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Vista general del negocio como grafo."""
    from services.graph.queries import get_business_overview_graph, get_risk_chain, get_product_affinity
    return {
        "overview": get_business_overview_graph(company_id),
        "risk_chain": get_risk_chain(company_id),
        "product_affinity": get_product_affinity(company_id),
    }


@router.get("/graph/stats")
def graph_stats(
    admin: User = Depends(get_admin_user)
):
    """Estadísticas globales del grafo Neo4j."""
    from services.graph.neo4j_store import graph_store
    result = graph_store.run(
        "MATCH (n) RETURN labels(n)[0] AS tipo, COUNT(*) AS total ORDER BY total DESC"
    )
    rels = graph_store.run("MATCH ()-[r]->() RETURN type(r) AS tipo, COUNT(*) AS total ORDER BY total DESC")
    return {"nodos": result, "relaciones": rels}


# ── AI Insights ───────────────────────────────────────────────────────────────

@router.post("/ai-insights")
def get_ai_insights(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Claude analiza los datos de la plataforma y devuelve oportunidades y riesgos."""
    import anthropic as _anthropic
    from core.config import get_settings
    settings = get_settings()

    # Recoger datos reales
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_subs = db.query(func.count(Subscription.id)).filter(Subscription.status.in_(["active","trialing"])).scalar() or 0
    trial_subs = db.query(func.count(Subscription.id)).filter(Subscription.status == "trialing").scalar() or 0

    mrr = 0
    for sub in db.query(Subscription).filter(Subscription.status == "active").all():
        plan = PLANS.get(sub.plan_id, {})
        mrr += plan.get("price_monthly", 0) + (sub.extra_users or 0) * 8

    subs = db.query(Subscription.plan_id, func.count(Subscription.id)).group_by(Subscription.plan_id).all()
    subs_by_plan = {s[0]: s[1] for s in subs}

    snapshots = db.query(BusinessSnapshot).order_by(BusinessSnapshot.snapshot_date.desc()).limit(20).all()
    snap_data = [
        {
            "company_id": s.company_id,
            "fecha": s.snapshot_date.isoformat(),
            "sector": s.sector,
            "ingresos": s.ingresos_mes,
            "gastos": s.gastos_mes,
            "resultado_neto": s.resultado_neto,
            "margen_pct": s.margen_neto_pct,
            "crecimiento_pct": s.crecimiento_ingresos_pct,
            "num_ventas": s.num_ventas_mes,
            "ticket_medio": s.ticket_medio,
            "clientes": s.total_contactos,
            "sentiment": s.sentiment_score_avg,
            "proyectos_activos": s.proyectos_activos,
            "health_score": s.health_score_avg,
            "tendencia": s.label_tendencia,
            "salud_financiera": s.label_salud_financiera,
            "riesgo_negocio": s.label_riesgo_negocio,
        }
        for s in snapshots
    ]

    summary = {
        "plataforma": "Nexum — SaaS de gestión empresarial con IA para pymes españolas",
        "empresas_registradas": total_companies,
        "usuarios_totales": total_users,
        "suscripciones_activas": active_subs,
        "en_trial": trial_subs,
        "mrr_estimado_eur": round(mrr, 2),
        "distribucion_planes": subs_by_plan,
        "snapshots_disponibles": len(snap_data),
        "datos_empresas": snap_data,
    }

    prompt = f"""Eres el analista de negocio de Nexum Solutions, una plataforma SaaS de gestión empresarial con IA para pymes españolas.

Analiza estos datos reales de la plataforma y devuelve SOLO un JSON válido con esta estructura exacta:
{{
  "resumen": "2-3 frases sobre el estado actual de la plataforma",
  "oportunidades": [
    {{ "titulo": "...", "descripcion": "...", "impacto": "alto|medio|bajo", "accion": "..." }}
  ],
  "riesgos": [
    {{ "titulo": "...", "descripcion": "...", "urgencia": "alta|media|baja" }}
  ],
  "recomendacion_principal": "La acción más importante que debería tomar Nexum ahora mismo"
}}

DATOS REALES DE LA PLATAFORMA:
{json.dumps(summary, ensure_ascii=False, indent=2)}"""

    client = _anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    clean = text.replace("```json", "").replace("```", "").strip()
    try:
        result = json.loads(clean)
    except Exception:
        # Si el JSON viene cortado, intentar repararlo
        if not clean.endswith("}"):
            clean = clean + '"}}'
        try:
            result = json.loads(clean)
        except Exception:
            raise HTTPException(status_code=500, detail="Error parseando respuesta de Claude")
    return result


# ── AI Memory admin ────────────────────────────────────────────────────────────

@router.get("/memory/{company_id}/entries")
def get_memory_entries(
    company_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todas las entradas de memoria de una empresa con trazabilidad."""
    entries = db.query(MemoryEntry).filter(
        MemoryEntry.company_id == company_id
    ).order_by(MemoryEntry.created_at.desc()).all()

    memory = db.query(BusinessAIMemory).filter(
        BusinessAIMemory.company_id == company_id
    ).first()

    return {
        "entries": [
            {
                "id": e.id,
                "tipo": e.tipo,
                "fuente": e.fuente,
                "autor": e.autor,
                "contenido": e.contenido,
                "categoria": e.categoria,
                "confianza": e.confianza,
                "created_at": e.created_at.isoformat(),
                "snapshot_id": e.snapshot_id,
            }
            for e in entries
        ],
        "total": len(entries),
        "auto_count": sum(1 for e in entries if e.tipo == "auto"),
        "manual_count": sum(1 for e in entries if e.tipo == "manual"),
        "last_auto_update": memory.last_auto_update.isoformat() if memory and memory.last_auto_update else None,
        "context_version": memory.context_version if memory else 0,
        "manual_training": memory.manual_training if memory else "",
        "business_personality": memory.business_personality if memory else "",
        "business_goals": memory.business_goals if memory else "",
    }


@router.get("/memory/{company_id}/download")
def download_memory_txt(
    company_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Devuelve el TXT completo de memoria para descargar."""
    txt = generate_memory_txt(db, company_id)
    return {"txt": txt, "filename": f"memoria_empresa_{company_id}_{datetime.utcnow().strftime('%Y%m%d')}.txt"}


@router.put("/memory/{company_id}")
def admin_update_memory(
    company_id: int,
    body: MemoryUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Admin actualiza la memoria IA de una empresa."""
    from modules.analytics.memory_updater import manual_update
    memory = manual_update(
        db=db,
        company_id=company_id,
        manual_text=body.manual_training,
        personality=body.business_personality,
        goals=body.business_goals,
    )
    return {"message": "Memoria actualizada", "context_version": memory.context_version}


@router.post("/memory/{company_id}/auto-update")
def admin_auto_update_memory(
    company_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Admin dispara actualización automática de memoria para una empresa."""
    memory = auto_update_memory(db, company_id)
    return {
        "message": "Memoria auto-actualizada",
        "auto_update_count": memory.auto_update_count,
    }
