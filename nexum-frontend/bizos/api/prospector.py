"""
Nexum Prospector API — Solo accesible desde el backoffice de Nexum.
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_admin_user
from models.user import User
from models.analytics import ProspectorSearch, ProspectorLead

router = APIRouter(prefix="/api/prospector", tags=["prospector"])


class SearchRequest(BaseModel):
    prompt: str
    location: str = "Madrid"
    max_results: int = 100


class LeadUpdateRequest(BaseModel):
    estado: str  # aprobado | enviado | descartado
    mensaje_generado: Optional[str] = None


def _run_prospector_job(search_id: int, prompt: str, location: str, max_results: int, db_url: str):
    """Job que corre en background — scraping + analisis IA."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        search = db.query(ProspectorSearch).filter(ProspectorSearch.id == search_id).first()
        search.status = "running"
        db.commit()

        # 1. Scraping
        from modules.prospector.scraper import run_prospector
        raw_leads = run_prospector(prompt, location, max_results)

        # 2. AI Analysis
        from modules.prospector.analyzer import analyze_leads
        analyzed_leads = analyze_leads(raw_leads, prompt)

        # 3. Generate messages for top leads
        from modules.prospector.messenger import generate_messages_batch
        final_leads = generate_messages_batch(analyzed_leads)

        # 4. Save to DB
        for lead_data in final_leads:
            lead = ProspectorLead(
                search_id=search_id,
                source=lead_data.get("source", ""),
                nombre=lead_data.get("nombre", ""),
                categoria=lead_data.get("categoria", ""),
                ciudad=lead_data.get("ciudad", ""),
                direccion=lead_data.get("direccion", ""),
                telefono=lead_data.get("telefono", ""),
                website=lead_data.get("website", ""),
                email=lead_data.get("email", ""),
                instagram=lead_data.get("instagram", ""),
                facebook=lead_data.get("facebook", ""),
                linkedin=lead_data.get("linkedin", ""),
                rating=lead_data.get("rating", 0),
                reviews=lead_data.get("reviews", 0),
                descripcion=lead_data.get("descripcion", ""),
                score=lead_data.get("score", 5),
                razon_score=lead_data.get("razon_score", ""),
                canal_recomendado=lead_data.get("canal_recomendado", ""),
                tipo_negocio=lead_data.get("tipo_negocio", ""),
                pain_point=lead_data.get("pain_point", ""),
                contactar=lead_data.get("contactar", True),
                mensaje_generado=lead_data.get("mensaje_generado", ""),
                estado="pendiente",
                lat=lead_data.get("lat"),
                lng=lead_data.get("lng"),
                maps_url=lead_data.get("maps_url", ""),
            )
            db.add(lead)

        search.status = "done"
        search.total_leads = len(final_leads)
        search.leads_contactar = len([l for l in final_leads if l.get("contactar") and l.get("score", 0) >= 6])
        search.completed_at = datetime.utcnow()
        db.commit()
        print(f"✅ Prospector job completado: {len(final_leads)} leads")

    except Exception as e:
        import traceback
        search = db.query(ProspectorSearch).filter(ProspectorSearch.id == search_id).first()
        if search:
            search.status = "error"
            db.commit()
        print(f"❌ Prospector job error: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
    finally:
        db.close()


@router.post("/search")
def start_search(
    body: SearchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Inicia una busqueda de prospectos en background."""
    search = ProspectorSearch(
        prompt=body.prompt,
        location=body.location,
        status="pending",
        created_by=admin.email,
    )
    db.add(search)
    db.commit()
    db.refresh(search)

    from core.config import get_settings
    settings = get_settings()
    db_url = settings.DATABASE_URL

    background_tasks.add_task(
        _run_prospector_job,
        search.id, body.prompt, body.location, body.max_results, db_url
    )

    return {
        "message": "Busqueda iniciada en background",
        "search_id": search.id,
        "status": "pending"
    }


@router.get("/searches")
def list_searches(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todas las busquedas del prospector."""
    searches = db.query(ProspectorSearch).order_by(
        ProspectorSearch.created_at.desc()
    ).limit(50).all()

    return {
        "searches": [
            {
                "id": s.id,
                "prompt": s.prompt,
                "location": s.location,
                "status": s.status,
                "total_leads": s.total_leads,
                "leads_contactar": s.leads_contactar,
                "created_at": s.created_at.isoformat(),
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "created_by": s.created_by,
            }
            for s in searches
        ]
    }


@router.get("/searches/{search_id}/leads")
def get_leads(
    search_id: int,
    min_score: float = 0,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Obtiene los leads de una busqueda con filtros."""
    query = db.query(ProspectorLead).filter(
        ProspectorLead.search_id == search_id,
        ProspectorLead.score >= min_score
    )
    if estado:
        query = query.filter(ProspectorLead.estado == estado)

    leads = query.order_by(ProspectorLead.score.desc()).all()

    return {
        "leads": [
            {
                "id": l.id,
                "source": l.source,
                "nombre": l.nombre,
                "categoria": l.categoria,
                "ciudad": l.ciudad,
                "direccion": l.direccion,
                "telefono": l.telefono,
                "website": l.website,
                "email": l.email,
                "instagram": l.instagram,
                "rating": l.rating,
                "reviews": l.reviews,
                "score": l.score,
                "razon_score": l.razon_score,
                "canal_recomendado": l.canal_recomendado,
                "tipo_negocio": l.tipo_negocio,
                "pain_point": l.pain_point,
                "contactar": l.contactar,
                "mensaje_generado": l.mensaje_generado,
                "estado": l.estado,
                "lat": l.lat,
                "lng": l.lng,
                "maps_url": l.maps_url,
            }
            for l in leads
        ],
        "total": len(leads),
        "por_estado": {
            "pendiente": sum(1 for l in leads if l.estado == "pendiente"),
            "aprobado": sum(1 for l in leads if l.estado == "aprobado"),
            "enviado": sum(1 for l in leads if l.estado == "enviado"),
            "descartado": sum(1 for l in leads if l.estado == "descartado"),
        }
    }


@router.put("/leads/{lead_id}")
def update_lead(
    lead_id: int,
    body: LeadUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Actualiza el estado o mensaje de un lead."""
    lead = db.query(ProspectorLead).filter(ProspectorLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    lead.estado = body.estado
    if body.mensaje_generado is not None:
        lead.mensaje_generado = body.mensaje_generado
    db.commit()

    return {"message": f"Lead actualizado a {body.estado}"}


@router.post("/leads/{lead_id}/regenerate-message")
def regenerate_message(
    lead_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Regenera el mensaje de un lead especifico."""
    lead = db.query(ProspectorLead).filter(ProspectorLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    from modules.prospector.messenger import generate_message
    lead_dict = {
        "nombre": lead.nombre,
        "tipo_negocio": lead.tipo_negocio,
        "categoria": lead.categoria,
        "ciudad": lead.ciudad,
        "rating": lead.rating,
        "reviews": lead.reviews,
        "pain_point": lead.pain_point,
        "canal_recomendado": lead.canal_recomendado,
    }
    nuevo_mensaje = generate_message(lead_dict)
    lead.mensaje_generado = nuevo_mensaje
    db.commit()

    return {"message": "Mensaje regenerado", "mensaje_generado": nuevo_mensaje}


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Estadisticas globales del prospector."""
    total_searches = db.query(ProspectorSearch).count()
    total_leads = db.query(ProspectorLead).count()
    leads_aprobados = db.query(ProspectorLead).filter(ProspectorLead.estado == "aprobado").count()
    leads_enviados = db.query(ProspectorLead).filter(ProspectorLead.estado == "enviado").count()

    from sqlalchemy import func
    avg_score = db.query(func.avg(ProspectorLead.score)).scalar() or 0

    return {
        "total_searches": total_searches,
        "total_leads": total_leads,
        "leads_aprobados": leads_aprobados,
        "leads_enviados": leads_enviados,
        "avg_score": round(float(avg_score), 2),
    }
