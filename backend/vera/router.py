"""
Endpoints HTTP de Vera.
Reemplaza /api/agente — todo pasa por aquí ahora.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Literal
from core.database import get_db
from core.security import get_current_user
from core.rate_limit import rate_limit
from models.user import User
from vera.engine import vera_chat, vera_analyze


router = APIRouter(prefix="/api/vera", tags=["Vera IA"])


class ChatRequest(BaseModel):
    mensaje: str
    plan: Literal["base", "plus"] = "base"
    modulo: Optional[str] = None
    historial: Optional[list] = []


class AnalyzeRequest(BaseModel):
    datos: dict
    modulo: str
    plan: Literal["base", "plus"] = "base"


@router.post("/chat", dependencies=[Depends(rate_limit(20, 60, "vera_chat"))])
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Conversación general con Vera.
    Cualquier módulo del frontend usa este endpoint.
    """
    try:
        return vera_chat(
            db=db,
            company_id=current_user.company_id,
            mensaje=data.mensaje,
            plan=data.plan,
            modulo=data.modulo,
            historial=data.historial or [],
        )
    except Exception:
        logging.getLogger("vela.vera").exception("Error en Vera chat")
        raise HTTPException(status_code=500, detail="Error procesando la consulta")


@router.post("/analizar", dependencies=[Depends(rate_limit(20, 60, "vera_analizar"))])
def analizar(
    data: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Análisis estructurado de datos de un módulo.
    Devuelve JSON (no texto).
    """
    try:
        return vera_analyze(
            db=db,
            company_id=current_user.company_id,
            datos=data.datos,
            modulo=data.modulo,
            plan=data.plan,
        )
    except Exception:
        logging.getLogger("vela.vera").exception("Error en Vera analyze")
        raise HTTPException(status_code=500, detail="Error procesando el análisis")


@router.get("/health")
def health():
    """Comprueba que Vera está viva."""
    return {
        "status": "ok",
        "modelo": "claude-sonnet-4-6",
        "modulo": "vera",
    }


