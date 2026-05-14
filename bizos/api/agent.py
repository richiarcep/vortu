from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user
from models.user import User
from modules.agent.alerts import detect_anomalies, get_ai_alert_analysis
from modules.agent.digest import generate_weekly_digest
from modules.agent.chat import chat_with_agent

router = APIRouter(prefix="/api/agente", tags=["Agente IA"])


class ChatMessage(BaseModel):
    mensaje: str
    historial: Optional[list] = []


@router.get("/alertas")
def get_alertas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alertas = detect_anomalies(db, current_user.company_id)
    analisis = get_ai_alert_analysis(alertas, current_user.company_id)
    return {
        "total_alertas": len(alertas),
        "alertas_alta": len([a for a in alertas if a["severidad"] == "alta"]),
        "alertas_media": len([a for a in alertas if a["severidad"] == "media"]),
        "alertas_baja": len([a for a in alertas if a["severidad"] == "baja"]),
        "alertas": alertas,
        "analisis_ia": analisis
    }


@router.get("/digest")
def get_digest(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return generate_weekly_digest(db, current_user.company_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
def chat(
    data: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return chat_with_agent(
            db=db,
            company_id=current_user.company_id,
            message=data.mensaje,
            conversation_history=data.historial
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resumen")
def get_resumen(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import date, timedelta
    from modules.accounting.journal import get_account_balance

    today = date.today()
    last_30 = today - timedelta(days=30)

    ingresos = float(get_account_balance(
        db, "400", current_user.company_id, last_30, today
    )) + float(get_account_balance(
        db, "410", current_user.company_id, last_30, today
    ))

    gastos = sum(
        float(get_account_balance(
            db, code, current_user.company_id, last_30, today
        ))
        for code in ["500", "510", "520", "530",
                     "540", "550", "560", "570", "590", "595"]
    )

    saldo = float(get_account_balance(
        db, "100", current_user.company_id, None, today
    ))

    alertas = detect_anomalies(db, current_user.company_id)

    return {
        "fecha": str(today),
        "ultimos_30_dias": {
            "ingresos": round(ingresos, 2),
            "gastos": round(gastos, 2),
            "resultado_neto": round(ingresos - gastos, 2),
            "margen": round(
                (ingresos - gastos) / ingresos * 100, 1
            ) if ingresos > 0 else 0
        },
        "saldo_caja_actual": round(saldo, 2),
        "alertas_activas": len(alertas),
        "estado": "saludable" if len(
            [a for a in alertas if a["severidad"] == "alta"]
        ) == 0 else "requiere_atencion"
    }