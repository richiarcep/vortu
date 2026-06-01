"""
Vera Quota API — endpoint para el frontend del cliente.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User
from vera.quota_manager import get_quota_status

router = APIRouter(prefix="/api/vera/quota", tags=["Vera Quota"])


@router.get("/status")
def quota_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Estado de cuota de la empresa del usuario.
    Usado por el frontend cliente para mostrar barra de progreso y badge.
    """
    if not user.company_id:
        return {"error": "Usuario sin empresa asignada"}
    return get_quota_status(db, user.company_id)
