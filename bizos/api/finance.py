from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta
import json
from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.document import Document
from modules.finance.statements import generate_financial_statements
from modules.finance.invoices import process_invoice
from modules.accounting.journal import get_account_balance
from modules.accounting.statements import (
    generate_pl_statement,
    generate_balance_sheet,
    generate_cash_flow_statement
)
import anthropic
from modules.core.prompt_loader import get_prompt
from core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/finance", tags=["Finanzas"])


# ── Existing endpoints ────────────────────────────────────────────────────────

@router.get("/statements/{document_id}")
def get_financial_statements(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.company_id == current_user.company_id
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if document.file_type not in ["csv", "xlsx", "xls"]:
        raise HTTPException(status_code=400, detail="Se requiere CSV o Excel")
    from services.parsers import parse_file
    parsed_data = parse_file(document.file_path, document.file_type)
    statements = generate_financial_statements(parsed_data)
    return {"document_id": document_id, "filename": document.filename, "statements": statements}


@router.get("/invoice/{document_id}")
def get_invoice_analysis(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.company_id == current_user.company_id
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if document.file_type != "pdf":
        raise HTTPException(status_code=400, detail="Se requiere PDF")
    from services.parsers import parse_file
    parsed_data = parse_file(document.file_path, document.file_type)
    invoice_data = process_invoice(parsed_data)
    return {"document_id": document_id, "filename": document.filename, "invoice": invoice_data}


@router.get("/summary")
def get_finance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = db.query(Document).filter(
        Document.company_id == current_user.company_id,
        Document.module == "finance",
        Document.status == "complete"
    ).all()
    summaries = []
    for doc in documents:
        if doc.ai_result:
            try:
                ai_data = json.loads(doc.ai_result)
                summaries.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "uploaded_at": str(doc.created_at),
                    "summary": ai_data.get("summary", ""),
                    "health_score": ai_data.get("health_score", None),
                    "net_profit": ai_data.get("net_profit", None),
                })
            except json.JSONDecodeError:
                continue
    return {"total_documents": len(documents), "summaries": summaries}


# ── NEW: Ratios financieros ───────────────────────────────────────────────────

@router.get("/ratios")
def get_ratios_financieros(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calcula 8 ratios financieros clave desde los datos contables
    registrados. Combina cálculo matemático real con interpretación IA.
    """
    today = date.today()
    year_start = date(today.year, 1, 1)
    company_id = current_user.company_id

    # ── Pull real accounting data ─────────────────────────────────────────────
    try:
        pl = generate_pl_statement(db, company_id, year_start, today)
        balance = generate_balance_sheet(db, company_id, today)
        cf = generate_cash_flow_statement(db, company_id, year_start, today)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo datos: {str(e)}")

    # ── Calculate ratios mathematically ───────────────────────────────────────
    total_ingresos = pl.get("ingresos", {}).get("total_ingresos", 0) or 0
    total_gastos = pl.get("gastos", {}).get("total_gastos", 0) or 0
    utilidad_neta = pl.get("utilidad_neta", 0) or 0
    ebitda = pl.get("ebitda", 0) or 0

    total_activos = balance.get("activos", {}).get("total_activos", 0) or 0
    total_pasivos = balance.get("pasivos", {}).get("total_pasivos", 0) or 0
    total_patrimonio = balance.get("patrimonio", {}).get("total_patrimonio", 0) or 0

    activos_corrientes = sum(
        v.get("saldo", 0) or 0
        for v in balance.get("activos", {}).get("activos_corrientes", {}).values()
    )
    pasivos_corrientes = sum(
        v.get("saldo", 0) or 0
        for v in balance.get("pasivos", {}).get("pasivos_corrientes", {}).values()
    )

    flujo_operativo = cf.get("actividades_operativas", {}).get("flujo_operativo_neto", 0) or 0

    # Calculate each ratio
    razon_corriente = round(activos_corrientes / pasivos_corrientes, 2) if pasivos_corrientes > 0 else None
    margen_neto = round((utilidad_neta / total_ingresos) * 100, 2) if total_ingresos > 0 else None
    roe = round((utilidad_neta / total_patrimonio) * 100, 2) if total_patrimonio > 0 else None
    ratio_endeudamiento = round(total_pasivos / total_activos, 2) if total_activos > 0 else None
    ebitda_margin = round((ebitda / total_ingresos) * 100, 2) if total_ingresos > 0 else None
    cobertura_gastos = round(total_ingresos / total_gastos, 2) if total_gastos > 0 else None
    deuda_patrimonio = round(total_pasivos / total_patrimonio, 2) if total_patrimonio > 0 else None
    punto_equilibrio = round(total_gastos, 2) if total_gastos > 0 else None

    ratios_calculados = {
        "razon_corriente": razon_corriente,
        "margen_neto": margen_neto,
        "roe": roe,
        "ratio_endeudamiento": ratio_endeudamiento,
        "ebitda_margin": ebitda_margin,
        "cobertura_gastos_fijos": cobertura_gastos,
        "deuda_patrimonio": deuda_patrimonio,
        "punto_equilibrio": punto_equilibrio,
    }

    # ── Ask Claude to interpret each ratio ────────────────────────────────────
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": f"""{get_prompt("finance_ratios")}

RATIOS CALCULADOS:
- Razón Corriente: {razon_corriente or 'Sin datos'}
- Margen de Utilidad Neta: {margen_neto or 'Sin datos'}%
      "interpretacion": "explicación",
      "estado": "bueno|regular|malo",
      "benchmark": "Ideal > 10% — varía por sector"
    }},
    {{
      "nombre": "ROE — Rentabilidad del Patrimonio",
      "formula": "Utilidad neta / Patrimonio × 100",
      "valor": "{roe or 'Sin datos'}%",
      "interpretacion": "explicación",
      "estado": "bueno|regular|malo",
      "benchmark": "Ideal > 15% — retorno para el propietario"
    }},
    {{
      "nombre": "Ratio de Endeudamiento",
      "formula": "Pasivo total / Activo total",
      "valor": "{ratio_endeudamiento or 'Sin datos'}",
      "interpretacion": "explicación",
      "estado": "bueno|regular|malo",
      "benchmark": "Ideal < 0.5 — menor es más seguro"
    }},
    {{
      "nombre": "EBITDA Margin",
      "formula": "EBITDA / Ingresos × 100",
      "valor": "{ebitda_margin or 'Sin datos'}%",
      "interpretacion": "explicación",
      "estado": "bueno|regular|malo",
      "benchmark": "Ideal > 15% — rentabilidad operativa pura"
    }},
    {{
      "nombre": "Cobertura de Gastos Fijos",
      "formula": "Ingresos totales / Total gastos",
      "valor": "{cobertura_gastos or 'Sin datos'}x",
      "interpretacion": "explicación",
      "estado": "bueno|regular|malo",
      "benchmark": "Ideal > 2x — cuántas veces cubres tus gastos"
    }},
    {{
      "nombre": "Deuda sobre Patrimonio",
      "formula": "Pasivo total / Patrimonio neto",
      "valor": "{deuda_patrimonio or 'Sin datos'}",
      "interpretacion": "explicación",
      "estado": "bueno|regular|malo",
      "benchmark": "Ideal < 1 — menos deuda que capital propio"
    }},
    {{
      "nombre": "Punto de Equilibrio",
      "formula": "Total gastos fijos del período",
      "valor": "€{punto_equilibrio or 0:,.0f}",
      "interpretacion": "explicación de cuánto necesita vender el negocio para no perder dinero",
      "estado": "bueno|regular|malo",
      "benchmark": "Referencia: tus gastos totales del período"
    }}
  ],
  "conclusion": "párrafo de 2-3 oraciones resumiendo la salud financiera general basado en estos ratios",
  "accion_prioritaria": "la única acción más importante que debe tomar el negocio ahora mismo"
}}

Datos calculados: {json.dumps(ratios_calculados, default=str)}
Datos financieros completos: 
- Ingresos: €{total_ingresos:,.2f}
- Gastos: €{total_gastos:,.2f}
- Utilidad neta: €{utilidad_neta:,.2f}
- Total activos: €{total_activos:,.2f}
- Total pasivos: €{total_pasivos:,.2f}
- Patrimonio: €{total_patrimonio:,.2f}

Solo el JSON, sin explicaciones adicionales."""
        }]
    )

    try:
        text = message.content[0].text.strip()
        if text.startswith('```'):
            lines = text.split('\n')
            text = '\n'.join(lines[1:-1])
        result = json.loads(text)
        result["datos_calculados"] = ratios_calculados
        result["periodo"] = {"inicio": str(year_start), "fin": str(today)}
        return result
    except Exception as e:
        return {
            "ratios": [],
            "datos_calculados": ratios_calculados,
            "conclusion": "Error al interpretar los ratios.",
            "accion_prioritaria": "Verifica que tengas transacciones registradas en el módulo de contabilidad.",
            "error": str(e)
        }


# ── NEW: Proyecciones IA ──────────────────────────────────────────────────────

class ProyeccionRequest(BaseModel):
    context_document_ids: Optional[list[int]] = []
    meses_historico: Optional[int] = 6


@router.post("/proyecciones")
def get_proyecciones(
    data: ProyeccionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera proyecciones financieras a 3 meses con 3 escenarios.
    Combina datos reales del negocio con contexto económico externo
    aportado por el usuario mediante documentos subidos.
    """
    today = date.today()
    start = today - timedelta(days=data.meses_historico * 30)
    company_id = current_user.company_id

    # ── 1. Get real business data ─────────────────────────────────────────────
    try:
        pl = generate_pl_statement(db, company_id, start, today)
        balance = generate_balance_sheet(db, company_id, today)
        cf = generate_cash_flow_statement(db, company_id, start, today)
    except Exception:
        pl, balance, cf = {}, {}, {}

    business_summary = {
        "periodo_analizado": f"{start} a {today}",
        "ingresos_totales": pl.get("ingresos", {}).get("total_ingresos", 0),
        "gastos_totales": pl.get("gastos", {}).get("total_gastos", 0),
        "utilidad_neta": pl.get("utilidad_neta", 0),
        "margen_utilidad": pl.get("margen_utilidad_porcentaje", 0),
        "ebitda": pl.get("ebitda", 0),
        "saldo_caja": float(get_account_balance(db, "100", company_id, None, today)),
        "flujo_operativo": cf.get("actividades_operativas", {}).get("flujo_operativo_neto", 0),
        "es_rentable": pl.get("es_rentable", False),
    }

    # ── 2. Get context from uploaded documents ────────────────────────────────
    context_text = ""
    if data.context_document_ids:
        for doc_id in data.context_document_ids:
            doc = db.query(Document).filter(
                Document.id == doc_id,
                Document.company_id == company_id
            ).first()
            if doc and doc.ai_result:
                try:
                    ai_data = json.loads(doc.ai_result)
                    context_text += f"\n\nDocumento de contexto ({doc.filename}):\n"
                    context_text += ai_data.get("summary", "") or ai_data.get("raw_analysis", "")
                except Exception:
                    pass

    # ── 3. Generate 3-scenario projections with Claude ────────────────────────
    next_months = []
    for i in range(1, 4):
        m = today.replace(day=1)
        month_num = today.month + i
        year = today.year + (month_num - 1) // 12
        month_num = ((month_num - 1) % 12) + 1
        import calendar
        month_names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        next_months.append(f"{month_names[month_num-1]} {year}")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    _base = get_prompt("finance_projections")
    prompt = f"""{_base}

DATOS REALES DEL NEGOCIO (últimos {data.meses_historico} meses):
{json.dumps(business_summary, default=str, indent=2)}

CONTEXTO ECONÓMICO EXTERNO:
{context_text if context_text else "Sin contexto externo. Usa tu conocimiento de la economía española y europea 2025-2026."}

MESES A PROYECTAR: {', '.join(next_months)}

Devuelve SOLO este JSON:
{{
  "fecha_analisis": "{today}",
  "contexto_economico": "2-3 oraciones sobre el contexto económico actual más relevante para este negocio",
  "escenarios": [
    {{
      "nombre": "Conservador",
      "descripcion": "Continuación de tendencias actuales sin cambios significativos",
      "probabilidad": "40%",
      "color": "amber",
      "supuestos": ["supuesto económico 1", "supuesto 2", "supuesto 3"],
      "meses": [
        {{"mes": "{next_months[0]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}},
        {{"mes": "{next_months[1]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}},
        {{"mes": "{next_months[2]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}}
      ],
      "oportunidades": ["oportunidad específica y accionable"],
      "riesgos": ["riesgo específico con probabilidad"],
      "acciones": ["acción concreta a tomar este mes"]
    }},
    {{
      "nombre": "Optimista",
      "descripcion": "Condiciones favorables — crecimiento por encima de lo esperado",
      "probabilidad": "30%",
      "color": "green",
      "supuestos": ["supuesto positivo 1", "supuesto 2"],
      "meses": [
        {{"mes": "{next_months[0]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}},
        {{"mes": "{next_months[1]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}},
        {{"mes": "{next_months[2]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}}
      ],
      "oportunidades": ["oportunidad concreta emergente del contexto económico"],
      "riesgos": ["riesgo si no se aprovecha la oportunidad"],
      "acciones": ["acción para capturar el escenario optimista"]
    }},
    {{
      "nombre": "Adverso",
      "descripcion": "Condiciones desfavorables — presión de costes y caída de demanda",
      "probabilidad": "30%",
      "color": "red",
      "supuestos": ["factor de riesgo económico 1", "factor 2"],
      "meses": [
        {{"mes": "{next_months[0]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}},
        {{"mes": "{next_months[1]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}},
        {{"mes": "{next_months[2]}", "ingresos": 0, "gastos": 0, "resultado": 0, "cash": 0}}
      ],
      "oportunidades": ["oportunidad incluso en escenario adverso"],
      "riesgos": ["riesgo principal a mitigar urgentemente"],
      "acciones": ["acción defensiva prioritaria"]
    }}
  ],
  "recomendacion_principal": "La acción más importante que debe tomar el negocio ahora mismo considerando los 3 escenarios"
}}

Usa los datos reales del negocio para hacer proyecciones numéricas realistas.
Solo el JSON."""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        text = message.content[0].text.strip()
        if text.startswith('```'):
            lines = text.split('\n')
            text = '\n'.join(lines[1:-1])
        result = json.loads(text)
        result["datos_negocio"] = business_summary
        return result
    except Exception as e:
        return {
            "error": "No se pudieron generar las proyecciones",
            "raw": message.content[0].text,
            "datos_negocio": business_summary
        }