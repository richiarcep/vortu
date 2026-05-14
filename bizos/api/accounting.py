from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import os
import json

from core.database import get_db
from core.security import get_current_user
from models.user import User
from modules.accounting.journal import (
    setup_chart_of_accounts,
    record_transaction,
    get_account_balance
)
from modules.accounting.ledger import (
    get_trial_balance,
    get_general_ledger,
    get_account_summary
)
from modules.accounting.statements import generate_full_report
from modules.accounting.revenue_register import (
    registrar_ingreso,
    registrar_gasto,
    get_registro_periodo,
    get_categorias_disponibles
)
from modules.accounting.reports import (
    generate_pl_report,
    generate_balance_report,
    generate_cashflow_report
)
from modules.accounting.template_generator import generate_daily_register_template
from modules.accounting.ai_reader import read_register_pdf, validate_nexum_document

router = APIRouter(prefix="/api/contabilidad", tags=["Contabilidad"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class IngresoCreate(BaseModel):
    fecha: date
    categoria: str
    descripcion: str
    monto: float
    referencia: Optional[str] = None
    notas: Optional[str] = None


class GastoCreate(BaseModel):
    fecha: date
    categoria: str
    descripcion: str
    monto: float
    referencia: Optional[str] = None
    notas: Optional[str] = None


class PeriodoRequest(BaseModel):
    fecha_inicio: date
    fecha_fin: date


class CompanyProfileUpdate(BaseModel):
    nif: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


# ── Setup ─────────────────────────────────────────────────────────────────────

@router.post("/configurar", status_code=201)
def configurar_contabilidad(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Configura el plan de cuentas para la empresa.
    Se llama automáticamente al registrarse.
    """
    setup_chart_of_accounts(db, current_user.company_id)
    return {
        "mensaje": "Plan de cuentas configurado exitosamente",
        "empresa_id": current_user.company_id
    }


# ── Daily register ────────────────────────────────────────────────────────────

@router.get("/categorias")
def get_categorias(
    current_user: User = Depends(get_current_user)
):
    """Retorna todas las categorías disponibles para ingresos y gastos."""
    return get_categorias_disponibles()


@router.post("/ingresos", status_code=201)
def crear_ingreso(
    data: IngresoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra un ingreso manualmente."""
    try:
        return registrar_ingreso(
            db=db,
            company_id=current_user.company_id,
            fecha=data.fecha,
            categoria=data.categoria,
            descripcion=data.descripcion,
            monto=data.monto,
            referencia=data.referencia,
            notas=data.notas
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/gastos", status_code=201)
def crear_gasto(
    data: GastoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra un gasto manualmente."""
    try:
        return registrar_gasto(
            db=db,
            company_id=current_user.company_id,
            fecha=data.fecha,
            categoria=data.categoria,
            descripcion=data.descripcion,
            monto=data.monto,
            referencia=data.referencia,
            notas=data.notas
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/registro")
def get_registro(
    fecha_inicio: date,
    fecha_fin: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna todos los registros de un período."""
    return get_registro_periodo(
        db=db,
        company_id=current_user.company_id,
        start_date=fecha_inicio,
        end_date=fecha_fin
    )


# ── Template generation ───────────────────────────────────────────────────────
@router.post("/plantilla")
def generar_plantilla(
    fecha: date,
    tipo_negocio: str = "mixto",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera el Cierre de Caja Diario en PDF.
    tipo_negocio: restaurante, tienda, servicios, mixto
    """
    from modules.accounting.revenue_register import generate_cierre_caja

    company = current_user.company
    company_data = {
        "id": current_user.company_id,
        "name": company.name,
        "nif": getattr(company, "nif", "—"),
        "address": getattr(company, "address", "—"),
        "email": company.email,
    }

    logo_path = f"logos/{current_user.company_id}_logo.png"
    if not os.path.exists(logo_path):
        logo_path = None

    filename = generate_cierre_caja(
        company_data=company_data,
        fecha=fecha,
        tipo_negocio=tipo_negocio,
        logo_path=logo_path
    )

    return FileResponse(
        filename,
        media_type="application/pdf",
        filename=f"cierre_caja_{fecha}.pdf"
    )


# ── AI PDF reader ─────────────────────────────────────────────────────────────

@router.post("/leer-pdf")
def leer_pdf_registro(
    file: UploadFile = File(...),
    auto_registrar: bool = Form(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sube un PDF de registro diario y Claude extrae
    todas las transacciones automáticamente.
    Funciona con plantillas Nexum, estados de cuenta
    bancarios y cualquier registro en PDF.
    """
    # Save uploaded file
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/registro_{current_user.company_id}_{file.filename}"

    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    # Send to Claude for reading
    try:
        result = read_register_pdf(
            file_path=file_path,
            db=db,
            company_id=current_user.company_id,
            auto_register=auto_registrar
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando el documento: {str(e)}"
        )


# ── Logo upload ───────────────────────────────────────────────────────────────

@router.post("/logo")
def subir_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Sube el logo de la empresa para incluirlo en
    los documentos y plantillas generadas.
    """
    allowed_types = ["image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten imágenes PNG o JPG"
        )

    os.makedirs("logos", exist_ok=True)
    logo_path = f"logos/{current_user.company_id}_logo.png"

    with open(logo_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    return {
        "mensaje": "Logo subido exitosamente",
        "ruta": logo_path
    }


# ── Financial statements ──────────────────────────────────────────────────────

@router.get("/estados-financieros")
def get_estados_financieros(
    fecha_inicio: date,
    fecha_fin: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera los tres estados financieros completos:
    Estado de Resultados, Balance General y Flujo de Efectivo.
    Se generan automáticamente desde los datos registrados.
    """
    try:
        report = generate_full_report(
            db=db,
            company_id=current_user.company_id,
            start_date=fecha_inicio,
            end_date=fecha_fin
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando estados financieros: {str(e)}"
        )


# ── Ledger & trial balance ────────────────────────────────────────────────────

@router.get("/balance-comprobacion")
def get_balance_comprobacion(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera la balanza de comprobación.
    Total débitos debe igualar total créditos.
    """
    return get_trial_balance(
        db=db,
        company_id=current_user.company_id,
        start_date=fecha_inicio,
        end_date=fecha_fin
    )


@router.get("/libro-mayor")
def get_libro_mayor(
    cuenta: Optional[str] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna el libro mayor completo o de una cuenta específica.
    Muestra cada transacción con saldo acumulado.
    """
    return get_general_ledger(
        db=db,
        company_id=current_user.company_id,
        account_code=cuenta,
        start_date=fecha_inicio,
        end_date=fecha_fin
    )


# ── Document validation ───────────────────────────────────────────────────────

@router.get("/validar-documento/{document_id}")
def validar_documento(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Valida que un documento Nexum escaneado pertenece
    a esta empresa y no ha sido modificado.
    """
    return validate_nexum_document(
        document_id=document_id,
        company_id=current_user.company_id
    )
@router.post("/reporte/estado-resultados")
def reporte_pl(
    fecha_inicio: date,
    fecha_fin: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera el PDF del Estado de Resultados con análisis IA."""
    from modules.accounting.statements import generate_pl_statement
    company = current_user.company
    company_data = {
        "id": current_user.company_id,
        "name": company.name,
        "nif": getattr(company, "nif", "—"),
        "address": getattr(company, "address", "—"),
        "email": company.email,
    }
    pl_data = generate_pl_statement(db, current_user.company_id,
                                     fecha_inicio, fecha_fin)
    filename = generate_pl_report(
        pl_data, company_data,
        {"inicio": str(fecha_inicio), "fin": str(fecha_fin)}
    )
    return FileResponse(filename, media_type="application/pdf",
                        filename=f"estado_resultados_{fecha_inicio}.pdf")


@router.post("/reporte/balance-general")
def reporte_balance(
    fecha: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera el PDF del Balance General con análisis IA."""
    from modules.accounting.statements import generate_balance_sheet
    company = current_user.company
    company_data = {
        "id": current_user.company_id,
        "name": company.name,
        "nif": getattr(company, "nif", "—"),
        "address": getattr(company, "address", "—"),
        "email": company.email,
    }
    balance_data = generate_balance_sheet(db, current_user.company_id, fecha)
    filename = generate_balance_report(balance_data, company_data, str(fecha))
    return FileResponse(filename, media_type="application/pdf",
                        filename=f"balance_general_{fecha}.pdf")


@router.post("/reporte/flujo-efectivo")
def reporte_flujo(
    fecha_inicio: date,
    fecha_fin: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera el PDF del Flujo de Efectivo con análisis IA."""
    from modules.accounting.statements import generate_cash_flow_statement
    company = current_user.company
    company_data = {
        "id": current_user.company_id,
        "name": company.name,
        "nif": getattr(company, "nif", "—"),
        "address": getattr(company, "address", "—"),
        "email": company.email,
    }
    cf_data = generate_cash_flow_statement(db, current_user.company_id,
                                            fecha_inicio, fecha_fin)
    filename = generate_cashflow_report(
        cf_data, company_data,
        {"inicio": str(fecha_inicio), "fin": str(fecha_fin)}
    )
    return FileResponse(filename, media_type="application/pdf",
                        filename=f"flujo_efectivo_{fecha_inicio}.pdf")