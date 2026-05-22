from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.analytics import BusinessSnapshot, BusinessAIMemory
from modules.analytics.snapshot_worker import generate_snapshot
from modules.analytics.memory_updater import (
    get_or_create_memory, auto_update_memory,
    manual_update, get_context_for_ai
)
from datetime import date

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class ManualMemoryUpdate(BaseModel):
    manual_training: Optional[str] = None
    business_personality: Optional[str] = None
    business_goals: Optional[str] = None


@router.post("/snapshot/generate")
async def generate_company_snapshot(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera snapshot del mes actual para la empresa."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario sin empresa asignada")

    snapshot = generate_snapshot(db, current_user.company_id)
    if not snapshot:
        raise HTTPException(status_code=500, detail="Error generando snapshot")

    return {
        "message": "Snapshot generado correctamente",
        "snapshot_date": snapshot.snapshot_date.isoformat(),
        "ingresos_mes": snapshot.ingresos_mes,
        "crecimiento_pct": snapshot.crecimiento_ingresos_pct,
        "tendencia": snapshot.label_tendencia,
        "salud_financiera": snapshot.label_salud_financiera,
        "riesgo_negocio": snapshot.label_riesgo_negocio,
    }


@router.get("/snapshots")
def get_snapshots(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Devuelve los últimos N snapshots de la empresa."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario sin empresa")

    snapshots = db.query(BusinessSnapshot).filter(
        BusinessSnapshot.company_id == current_user.company_id
    ).order_by(BusinessSnapshot.snapshot_date.desc()).limit(months).all()

    return {
        "snapshots": [
            {
                "date": s.snapshot_date.isoformat(),
                "ingresos": s.ingresos_mes,
                "resultado_neto": s.resultado_neto,
                "margen_pct": s.margen_neto_pct,
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
            }
            for s in snapshots
        ],
        "total": len(snapshots)
    }


@router.get("/memory")
def get_memory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Devuelve la memoria de IA de la empresa."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario sin empresa")

    memory = get_or_create_memory(db, current_user.company_id)
    return {
        "learned_facts": memory.learned_facts,
        "manual_training": memory.manual_training,
        "business_personality": memory.business_personality,
        "business_goals": memory.business_goals,
        "full_context": memory.full_context,
        "last_auto_update": memory.last_auto_update.isoformat() if memory.last_auto_update else None,
        "last_manual_update": memory.last_manual_update.isoformat() if memory.last_manual_update else None,
        "auto_update_count": memory.auto_update_count,
        "context_version": memory.context_version,
    }


@router.post("/memory/auto-update")
async def trigger_auto_update(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dispara una actualización automática de la memoria IA."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario sin empresa")

    memory = auto_update_memory(db, current_user.company_id)
    return {
        "message": "Memoria actualizada correctamente",
        "auto_update_count": memory.auto_update_count,
        "last_auto_update": memory.last_auto_update.isoformat() if memory.last_auto_update else None,
    }


@router.put("/memory/manual")
def update_manual_memory(
    body: ManualMemoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """El usuario actualiza manualmente la memoria del negocio."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario sin empresa")

    memory = manual_update(
        db=db,
        company_id=current_user.company_id,
        manual_text=body.manual_training,
        personality=body.business_personality,
        goals=body.business_goals,
    )
    return {
        "message": "Memoria manual actualizada",
        "context_version": memory.context_version,
        "last_manual_update": memory.last_manual_update.isoformat() if memory.last_manual_update else None,
    }


@router.get("/memory/context")
def get_ai_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Devuelve el contexto completo que usa la IA."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario sin empresa")

    context = get_context_for_ai(db, current_user.company_id)
    return {"context": context}
