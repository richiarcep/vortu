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
    period: str = "30d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import date, timedelta
    from sqlalchemy import text

    today = date.today()
    days_map = {"7d": 7, "30d": 30, "90d": 90, "year": 365}
    days = days_map.get(period, 30)
    since = today - timedelta(days=days)
    cid = current_user.company_id

    INGRESOS_PREFIXES = ['70']
    GASTOS_PREFIXES = ['60', '62', '63', '64', '65', '66', '67', '68', '69']
    CAJA_PREFIXES = ['57']

    def sum_by_prefixes(prefixes, mode, since_d, until_d):
        like_clauses = " OR ".join([f"a.code LIKE '{p}%'" for p in prefixes])
        q = f"""
            SELECT
                COALESCE(SUM(je.debit), 0) as deb,
                COALESCE(SUM(je.credit), 0) as cre
            FROM journal_entries je
            JOIN accounts a ON je.account_id = a.id
            WHERE ({like_clauses})
              AND je.company_id = :cid
              AND je.date >= :since
              AND je.date <= :until
        """
        r = db.execute(text(q), {"cid": cid, "since": since_d, "until": until_d}).first()
        deb, cre = float(r[0] or 0), float(r[1] or 0)
        return (cre - deb) if mode == "credit" else (deb - cre)

    try:
        ingresos = sum_by_prefixes(INGRESOS_PREFIXES, "credit", since, today)
        gastos = sum_by_prefixes(GASTOS_PREFIXES, "debit", since, today)
        saldo = sum_by_prefixes(CAJA_PREFIXES, "debit", date(2000, 1, 1), today)
    except Exception as e:
        print(f"ERROR resumen: {e}")
        ingresos = gastos = saldo = 0

    empleados = 0
    try:
        empleados = int(db.execute(text(
            "SELECT COUNT(*) FROM employees WHERE company_id=:cid AND is_active=1"
        ), {"cid": cid}).scalar() or 0)
    except Exception:
        pass

    alertas = detect_anomalies(db, cid)
    resultado = ingresos - gastos
    margen = round(resultado / ingresos * 100, 1) if ingresos > 0 else 0

    data = {
        "ingresos": round(ingresos, 2),
        "gastos": round(gastos, 2),
        "resultado_neto": round(resultado, 2),
        "margen": margen
    }

    return {
        "fecha": str(today),
        "period": period,
        "days": days,
        "ultimos_30_dias": data,
        "saldo_caja_actual": round(saldo, 2),
        "alertas_activas": len(alertas),
        "empleados": empleados,
        "estado": "saludable" if len([a for a in alertas if a["severidad"] == "alta"]) == 0 else "requiere_atencion"
    }
