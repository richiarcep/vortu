from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import os
import json
import logging

from core.database import get_db
from core.security import get_current_user
from core.audit import audit_event
from models.user import User
from modules.accounting.journal import (
    setup_chart_of_accounts,
    record_transaction,
    get_account_balance,
    Account,
    JournalEntry,
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
from modules.accounting.ai_reader import read_register_pdf, validate_vela_document

router = APIRouter(prefix="/api/contabilidad", tags=["Contabilidad"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class IngresoCreate(BaseModel):
    fecha: date
    categoria: str
    descripcion: str
    monto: float                       # IVA incluido
    referencia: Optional[str] = None
    notas: Optional[str] = None
    iva_rate: Optional[float] = 21.0   # 0 = sin desglose de IVA


class GastoCreate(BaseModel):
    fecha: date
    categoria: str
    descripcion: str
    monto: float                       # IVA incluido
    referencia: Optional[str] = None
    notas: Optional[str] = None
    iva_rate: Optional[float] = 21.0


class PeriodoRequest(BaseModel):
    fecha_inicio: date
    fecha_fin: date


class CompanyProfileUpdate(BaseModel):
    nif: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class AsientoLinea(BaseModel):
    account_code: str
    debit: float = 0.0
    credit: float = 0.0


class AsientoManual(BaseModel):
    fecha: date
    descripcion: str
    lineas: list[AsientoLinea]
    referencia: Optional[str] = None


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
    country = current_user.company.country if current_user.company else None
    setup_chart_of_accounts(db, current_user.company_id, country)
    return {
        "mensaje": "Plan de cuentas configurado exitosamente",
        "empresa_id": current_user.company_id,
        "country": country,
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
            notas=data.notas,
            iva_rate=data.iva_rate if data.iva_rate is not None else 21.0,
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
            notas=data.notas,
            iva_rate=data.iva_rate if data.iva_rate is not None else 21.0,
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
    request: Request,
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

    audit_event(db, "data_export", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request,
                detail={"resource": "cierre_caja_pdf", "fecha": str(fecha)})
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
    Funciona con plantillas Vela, estados de cuenta
    bancarios y cualquier registro en PDF.
    """
    # Validate type + size before reading the body into memory.
    from core.files import safe_filename, enforce_upload_size, MAX_UPLOAD_MB
    _ALLOWED = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
    if file.content_type not in _ALLOWED:
        raise HTTPException(status_code=415, detail="Formato no soportado. Sube un PDF o una imagen (PNG/JPG).")
    enforce_upload_size(file)
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/registro_{current_user.company_id}_{safe_filename(file.filename)}"

    content = file.file.read()
    # Enforce the cap on the ACTUAL bytes too (file.size can be absent/spoofed).
    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Archivo demasiado grande (máx {MAX_UPLOAD_MB} MB)")
    with open(file_path, "wb") as f:
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
    except Exception:
        logging.getLogger("vela.contabilidad").exception("Error procesando el documento")
        raise HTTPException(status_code=500, detail="Error procesando el documento")


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

    from core.files import enforce_upload_size
    enforce_upload_size(file, max_mb=5)
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
    except Exception:
        logging.getLogger("vela.contabilidad").exception("Error generando estados financieros")
        raise HTTPException(status_code=500, detail="Error generando estados financieros")


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
    max_entries: int = 500,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna el libro mayor completo o de una cuenta específica.
    Muestra cada transacción con saldo acumulado. `max_entries` limita los
    asientos devueltos por cuenta (saldos siempre exactos; ver get_general_ledger).
    """
    return get_general_ledger(
        db=db,
        company_id=current_user.company_id,
        account_code=cuenta,
        start_date=fecha_inicio,
        end_date=fecha_fin,
        max_entries_per_account=max(1, min(max_entries, 2000)),
    )


# ── Plan de cuentas + asiento manual ───────────────────────────────────────────

@router.get("/cuentas")
def get_cuentas(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista el plan de cuentas de la empresa (para selectores de asiento manual)."""
    query = db.query(Account).filter(
        Account.company_id == current_user.company_id,
        Account.is_active == True,
    )
    if q:
        like = f"%{q}%"
        query = query.filter((Account.code.ilike(like)) | (Account.name.ilike(like)))
    cuentas = query.order_by(Account.code).all()
    return {
        "cuentas": [
            {"code": a.code, "name": a.name, "type": a.account_type, "normal_balance": a.normal_balance}
            for a in cuentas
        ]
    }


@router.post("/asiento", status_code=201)
def crear_asiento_manual(
    data: AsientoManual,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea un asiento contable manual libre (N líneas). Valida partida doble
    (debe = haber) y que las cuentas existan; usa el motor record_transaction."""
    if len(data.lineas) < 2:
        raise HTTPException(status_code=400, detail="Un asiento necesita al menos 2 líneas (debe y haber)")

    entries = []
    for ln in data.lineas:
        debit = round(float(ln.debit or 0), 2)
        credit = round(float(ln.credit or 0), 2)
        if debit < 0 or credit < 0:
            raise HTTPException(status_code=400, detail="Importes negativos no permitidos")
        if (debit > 0) == (credit > 0):
            raise HTTPException(
                status_code=400,
                detail=f"Cada línea debe tener importe SOLO en debe o SOLO en haber (cuenta {ln.account_code})",
            )
        entries.append({"account_code": ln.account_code, "debit": debit, "credit": credit})

    total_debit = round(sum(e["debit"] for e in entries), 2)
    total_credit = round(sum(e["credit"] for e in entries), 2)
    if total_debit != total_credit:
        raise HTTPException(
            status_code=400,
            detail=f"El asiento no cuadra: debe {total_debit} ≠ haber {total_credit}",
        )
    if total_debit == 0:
        raise HTTPException(status_code=400, detail="El asiento no puede ser por importe cero")

    try:
        result = record_transaction(
            db=db,
            company_id=current_user.company_id,
            date=data.fecha,
            description=data.descripcion,
            entries=entries,
            module_source="manual",
            reference=data.referencia,
        )
    except ValueError as e:
        # p.ej. cuenta inexistente o descuadre detectado por el motor
        raise HTTPException(status_code=400, detail=str(e))
    return result


# ── Libros de IVA / borrador modelo 303 ─────────────────────────────────────────

@router.get("/iva")
def get_iva(
    fecha_inicio: date,
    fecha_fin: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumen de IVA del periodo (libros de repercutido/soportado) y borrador del
    resultado del modelo 303. Usa las cuentas PGC 477 (IVA repercutido) y 472 (IVA
    soportado). Si la empresa no usa el plan español, devuelve ceros."""
    cid = current_user.company_id

    def _net(code: str, normal: str) -> float:
        acc = db.query(Account).filter(Account.code == code, Account.company_id == cid).first()
        if not acc:
            return 0.0
        row = db.query(
            func.coalesce(func.sum(JournalEntry.debit), 0),
            func.coalesce(func.sum(JournalEntry.credit), 0),
        ).filter(
            JournalEntry.account_id == acc.id,
            JournalEntry.company_id == cid,
            JournalEntry.date >= fecha_inicio,
            JournalEntry.date <= fecha_fin,
        ).one()
        debit, credit = float(row[0]), float(row[1])
        return round(credit - debit, 2) if normal == "credit" else round(debit - credit, 2)

    repercutido = _net("477", "credit")   # IVA cobrado en ventas
    soportado   = _net("472", "debit")    # IVA pagado en compras/gastos
    resultado   = round(repercutido - soportado, 2)

    return {
        "periodo": {"inicio": str(fecha_inicio), "fin": str(fecha_fin)},
        "iva_repercutido": repercutido,
        "iva_soportado": soportado,
        "resultado": resultado,                 # >0 a ingresar, <0 a compensar
        "resultado_tipo": "a_ingresar" if resultado > 0 else ("a_compensar" if resultado < 0 else "cero"),
        # Borrador modelo 303 (casillas principales de cuota).
        "modelo_303": {
            "casilla_27_cuota_devengada": repercutido,
            "casilla_45_cuota_deducible": soportado,
            "casilla_71_resultado": resultado,
        },
        "nota": "Borrador orientativo. Las bases imponibles y casillas detalladas requieren la configuración fiscal completa.",
    }


# ── Document validation ───────────────────────────────────────────────────────

@router.get("/validar-documento/{document_id}")
def validar_documento(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Valida que un documento Vela escaneado pertenece
    a esta empresa y no ha sido modificado.
    """
    return validate_vela_document(
        document_id=document_id,
        company_id=current_user.company_id
    )
@router.post("/reporte/estado-resultados")
def reporte_pl(
    fecha_inicio: date,
    fecha_fin: date,
    request: Request,
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
    audit_event(db, "data_export", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request,
                detail={"resource": "estado_resultados_pdf", "inicio": str(fecha_inicio), "fin": str(fecha_fin)})
    return FileResponse(filename, media_type="application/pdf",
                        filename=f"estado_resultados_{fecha_inicio}.pdf")


@router.post("/reporte/balance-general")
def reporte_balance(
    fecha: date,
    request: Request,
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
    audit_event(db, "data_export", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request,
                detail={"resource": "balance_general_pdf", "fecha": str(fecha)})
    return FileResponse(filename, media_type="application/pdf",
                        filename=f"balance_general_{fecha}.pdf")


@router.post("/reporte/flujo-efectivo")
def reporte_flujo(
    fecha_inicio: date,
    fecha_fin: date,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera el PDF del Flujo de Efectivo con análisis IA."""
    from modules.accounting.statements import generate_full_report_from_registro, generate_cash_flow_statement
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
    audit_event(db, "data_export", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request,
                detail={"resource": "flujo_efectivo_pdf", "inicio": str(fecha_inicio), "fin": str(fecha_fin)})
    return FileResponse(filename, media_type="application/pdf",
                        filename=f"flujo_efectivo_{fecha_inicio}.pdf")
# ── Financial Snapshots ───────────────────────────────────────────────────────
import json as _json
from datetime import datetime as _dt

@router.get("/snapshot")
def get_snapshot(
    period: str = "month",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text
    from datetime import date, timedelta
    today = date.today()

    # Periodos NATURALES (correcto para contabilidad/fiscal: cierre mensual, IVA, etc.)
    if period == "month":
        inicio = today.replace(day=1)
        label = f"Mes actual — {today.strftime('%B %Y')}"
    elif period == "quarter":
        q_start_month = ((today.month - 1) // 3) * 3 + 1
        inicio = today.replace(month=q_start_month, day=1)
        label = f"Trimestre actual"
    elif period == "semester":
        inicio = today.replace(month=1 if today.month <= 6 else 7, day=1)
        label = f"Semestre actual"
    elif period == "year":
        inicio = today.replace(month=1, day=1)
        label = f"Año {today.year}"
    # Ventanas rodantes (compat; el dashboard usa estas, contabilidad usa las naturales)
    elif period == "30d":
        inicio = today - timedelta(days=30)
        label = "Últimos 30 días"
    elif period == "90d":
        inicio = today - timedelta(days=90)
        label = "Últimos 90 días"
    else:
        inicio = today.replace(day=1)
        label = f"Mes actual — {today.strftime('%B %Y')}"

    # Check cache — estos periodos están EN CURSO (mes/trimestre/año actual), así que el
    # caché solo es válido si se generó HOY y cubre hasta hoy. Si es de un día anterior
    # (o de cuando aún no había datos), se descarta y se recalcula en vivo.
    cached = db.execute(text("""
        SELECT data_json, generated_at, fecha_fin FROM financial_snapshots
        WHERE company_id=:cid AND period_label=:label
        ORDER BY id DESC LIMIT 1
    """), {"cid": current_user.company_id, "label": label}).fetchone()

    if cached:
        _gen = str(cached[1] or "")
        _fin = str(cached[2] or "")
        if _fin == str(today) and _gen.startswith(str(today)):
            return {"cached": True, "label": label, "data": _json.loads(cached[0]), "generated_at": cached[1]}
        # Caché obsoleto → borrar y recalcular en vivo
        db.execute(text("DELETE FROM financial_snapshots WHERE company_id=:cid AND period_label=:label"),
                   {"cid": current_user.company_id, "label": label})
        db.commit()

    # Generate fresh
    try:
        from modules.accounting.statements import generate_pl_statement, generate_balance_sheet, generate_cash_flow_statement, calculate_health_score
        pl = generate_pl_statement(db, current_user.company_id, inicio, today)
        bal = generate_balance_sheet(db, current_user.company_id, today)
        cf = generate_cash_flow_statement(db, current_user.company_id, inicio, today)
        try:
            health = calculate_health_score(pl, bal, cf)
        except Exception as e:
            logging.getLogger(__name__).warning("calculate_health_score falló: %s", e)
            health = {"puntaje": 0, "calificacion": "Sin datos", "factores": []}
        report = {
            "estado_de_resultados": pl,
            "balance_general": bal,
            "flujo_de_efectivo": cf,
            "puntaje_salud_financiera": health,
            "periodo": {"inicio": str(inicio), "fin": str(today)}
        }
        data_str = _json.dumps(report, default=str)
        db.execute(text("""
            INSERT INTO financial_snapshots (company_id, period_label, fecha_inicio, fecha_fin, data_json, generated_at)
            VALUES (:cid, :label, :inicio, :fin, :data, :now)
        """), {"cid": current_user.company_id, "label": label, "inicio": str(inicio), "fin": str(today), "data": data_str, "now": _dt.now().isoformat()})
        db.commit()
        return {"cached": False, "label": label, "data": report, "generated_at": _dt.now().isoformat()}
    except Exception:
        logging.getLogger("vela.contabilidad").exception("Error generando reporte")
        raise HTTPException(status_code=500, detail="Error generando el reporte")

@router.delete("/snapshot/{period}")
def clear_snapshot(
    period: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text
    from datetime import date
    today = date.today()
    labels = {"month":f"Mes actual — {today.strftime('%B %Y')}","quarter":"Trimestre actual","semester":"Semestre actual","year":f"Año {today.year}","30d":"Últimos 30 días","90d":"Últimos 90 días"}
    label = labels.get(period, f"Mes actual — {today.strftime('%B %Y')}")
    db.execute(text("DELETE FROM financial_snapshots WHERE company_id=:cid AND period_label=:label"), {"cid": current_user.company_id, "label": label})
    db.commit()
    return {"deleted": True}
