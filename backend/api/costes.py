"""
Centro de Costes - API (SQLAlchemy + modelos Vortu)

Conecta:
- cost_entries (gastos)
- journal_entries (asientos PGC, vinculados por reference parseado de las notas)
- documents (factura PDF origen, vinculado por "Doc ID: N" en las notas)
- accounts (PGC para joins de código y nombre de cuenta)

Las facturas registradas por el módulo Documentos guardan en notes:
"Proveedor: X | Factura: REF | IBAN: ... | Doc ID: N"
Y journal_entries con module_source='documentos' y reference=número de factura.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, desc, asc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, date
from decimal import Decimal
import re
import json

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.costs import CostCategory, CostDepartment, CostEntry
from models.document import Document
from country.registry import get_entry_accounts

router = APIRouter(prefix="/api/costes", tags=["costes"])


# ============================================================================
# HELPERS
# ============================================================================

def _parse_notes(notes: Optional[str]) -> dict:
    """
    Extrae proveedor, factura, IBAN, NIF, Doc ID del campo notes embebido.
    Formato típico: "Proveedor: X | Factura: Y | IBAN: Z | Doc ID: N"
    """
    out = {"provider": None, "factura_ref": None, "iban": None, "nif": None, "doc_id": None}
    if not notes:
        return out
    m = re.search(r"Proveedor:\s*([^|]+?)(?=\s*\||$)", notes)
    if m: out["provider"] = m.group(1).strip()
    m = re.search(r"Factura:\s*([^|]+?)(?=\s*\||$)", notes)
    if m: out["factura_ref"] = m.group(1).strip()
    m = re.search(r"IBAN:\s*([^|]+?)(?=\s*\||$)", notes)
    if m: out["iban"] = m.group(1).strip()
    m = re.search(r"NIF:\s*([^|]+?)(?=\s*\||$)", notes)
    if m: out["nif"] = m.group(1).strip()
    m = re.search(r"Doc\s*ID:\s*(\d+)", notes)
    if m:
        try: out["doc_id"] = int(m.group(1))
        except: pass
    return out


def _entry_to_dict(e: CostEntry, db: Session = None) -> dict:
    """Serializa un CostEntry + datos parseados de notas + flag asiento PGC."""
    meta = _parse_notes(e.notes)
    d = {
        "id": e.id,
        "description": e.description,
        "amount": float(e.amount or 0),
        "date": e.date.isoformat() if e.date else None,
        "notes": e.notes,
        "category_id": e.category_id,
        "department_id": e.department_id,
        "category_name": e.category.name if e.category else None,
        "department_name": e.department.name if e.department else None,
        "provider": meta["provider"],
        "factura_ref": meta["factura_ref"],
        "iban": meta["iban"],
        "nif": meta["nif"],
        "document_id": meta["doc_id"],
        "tiene_asiento_pgc": False,
    }
    # Marcar si tiene asiento PGC (busca por reference = factura_ref)
    if db and meta["factura_ref"]:
        from sqlalchemy import text
        count = db.execute(
            text("SELECT COUNT(*) FROM journal_entries WHERE reference = :ref AND company_id = :cid"),
            {"ref": meta["factura_ref"], "cid": e.company_id}
        ).scalar() or 0
        d["tiene_asiento_pgc"] = count > 0
    return d


def _month_range(year: int, month: int):
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


# ============================================================================
# MODELOS PYDANTIC
# ============================================================================

class GastoManual(BaseModel):
    description: str
    amount: float
    base_imponible: Optional[float] = None
    iva_amount: Optional[float] = None
    iva_rate: Optional[float] = 21.0
    date: str  # YYYY-MM-DD
    category_id: Optional[int] = None
    department_id: Optional[int] = None
    provider: Optional[str] = None
    provider_nif: Optional[str] = None
    payment_method: Optional[str] = "transferencia"
    notes: Optional[str] = None
    crear_asiento: bool = True
    pgc_cuenta_gasto: Optional[str] = "629"


class GastoVeraRequest(BaseModel):
    descripcion_libre: str


# ============================================================================
# KPIs DEL HEADER
# ============================================================================

@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company_id = current_user.company_id
    today = date.today()
    mes_inicio, mes_fin = _month_range(today.year, today.month)
    if today.month == 1:
        mes_ant_inicio, mes_ant_fin = _month_range(today.year - 1, 12)
    else:
        mes_ant_inicio, mes_ant_fin = _month_range(today.year, today.month - 1)
    year_inicio = date(today.year, 1, 1)
    year_fin = date(today.year + 1, 1, 1)

    def sum_range(d1, d2):
        r = db.query(func.coalesce(func.sum(CostEntry.amount), 0), func.count(CostEntry.id)).filter(
            CostEntry.company_id == company_id,
            CostEntry.date >= d1, CostEntry.date < d2
        ).first()
        return float(r[0] or 0), int(r[1] or 0)

    total_mes, count_mes = sum_range(mes_inicio, mes_fin)
    total_mes_ant, _ = sum_range(mes_ant_inicio, mes_ant_fin)
    total_ytd, _ = sum_range(year_inicio, year_fin)
    variacion_pct = ((total_mes - total_mes_ant) / total_mes_ant * 100) if total_mes_ant > 0 else 0.0

    # Top categoría del mes
    top_cat = db.query(CostCategory.name, func.sum(CostEntry.amount).label("t")).join(
        CostCategory, CostCategory.id == CostEntry.category_id
    ).filter(
        CostEntry.company_id == company_id,
        CostEntry.date >= mes_inicio, CostEntry.date < mes_fin
    ).group_by(CostCategory.id).order_by(desc("t")).first()

    top_categoria = {"name": top_cat[0], "total": float(top_cat[1] or 0)} if top_cat else None

    # Top proveedor del mes (parseado de notes)
    entries_mes = db.query(CostEntry).filter(
        CostEntry.company_id == company_id,
        CostEntry.date >= mes_inicio, CostEntry.date < mes_fin
    ).all()
    prov_totals = {}
    for e in entries_mes:
        prov = _parse_notes(e.notes)["provider"]
        if prov:
            prov_totals[prov] = prov_totals.get(prov, 0) + float(e.amount or 0)
    top_proveedor = None
    if prov_totals:
        name, total = max(prov_totals.items(), key=lambda x: x[1])
        top_proveedor = {"name": name, "total": round(total, 2)}

    return {
        "total_mes": round(total_mes, 2),
        "count_mes": count_mes,
        "total_mes_anterior": round(total_mes_ant, 2),
        "variacion_pct": round(variacion_pct, 1),
        "total_ytd": round(total_ytd, 2),
        "pendiente_pago": 0.0,
        "top_categoria": top_categoria,
        "top_proveedor": top_proveedor,
        "mes_label": today.strftime("%B %Y"),
    }


# ============================================================================
# LISTA DE GASTOS (con filtros)
# ============================================================================

@router.get("/list")
def list_gastos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    category_id: Optional[int] = None,
    department_id: Optional[int] = None,
    provider: Optional[str] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    con_asiento: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    order_by: str = "date_desc",
):
    q = db.query(CostEntry).filter(CostEntry.company_id == current_user.company_id)

    if category_id is not None:
        q = q.filter(CostEntry.category_id == category_id)
    if department_id is not None:
        q = q.filter(CostEntry.department_id == department_id)
    if desde:
        q = q.filter(CostEntry.date >= datetime.fromisoformat(desde))
    if hasta:
        q = q.filter(CostEntry.date <= datetime.fromisoformat(hasta))
    if min_amount is not None:
        q = q.filter(CostEntry.amount >= min_amount)
    if max_amount is not None:
        q = q.filter(CostEntry.amount <= max_amount)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(CostEntry.description.ilike(like), CostEntry.notes.ilike(like)))
    if provider:
        q = q.filter(CostEntry.notes.ilike(f"%Proveedor: {provider}%"))

    order_map = {
        "date_desc": CostEntry.date.desc(),
        "date_asc": CostEntry.date.asc(),
        "amount_desc": CostEntry.amount.desc(),
        "amount_asc": CostEntry.amount.asc(),
    }
    q = q.order_by(order_map.get(order_by, CostEntry.date.desc()))

    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    items = [_entry_to_dict(e, db) for e in rows]

    # Filtro post-serialización (con_asiento se basa en notes parseadas)
    if con_asiento is True:
        items = [i for i in items if i["tiene_asiento_pgc"]]
    elif con_asiento is False:
        items = [i for i in items if not i["tiene_asiento_pgc"]]

    return {"items": items, "total": total, "limit": limit, "offset": offset}


# ============================================================================
# DETALLE DE UN GASTO
# ============================================================================

@router.get("/{gasto_id}")
def get_gasto(gasto_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    e = db.query(CostEntry).filter(
        CostEntry.id == gasto_id,
        CostEntry.company_id == current_user.company_id
    ).first()
    if not e:
        raise HTTPException(404, "Gasto no encontrado")

    gasto = _entry_to_dict(e, db)
    meta = _parse_notes(e.notes)

    # Asiento PGC (JOIN journal_entries con accounts por reference)
    asiento = []
    if meta["factura_ref"]:
        from sqlalchemy import text
        rows = db.execute(text("""
            SELECT je.id, je.transaction_id, je.date, je.description, je.debit, je.credit,
                   a.code as account_code, a.name as account_name
            FROM journal_entries je
            LEFT JOIN accounts a ON a.id = je.account_id
            WHERE je.reference = :ref AND je.company_id = :cid
            ORDER BY je.id ASC
        """), {"ref": meta["factura_ref"], "cid": current_user.company_id}).fetchall()
        asiento = [{
            "id": r[0],
            "transaction_id": r[1],
            "date": r[2].isoformat() if hasattr(r[2], "isoformat") else str(r[2]),
            "concept": r[3],
            "debit": float(r[4] or 0),
            "credit": float(r[5] or 0),
            "account_code": r[6],
            "account_name": r[7],
        } for r in rows]

    # Documento origen
    documento = None
    if meta["doc_id"]:
        doc = db.query(Document).filter(
            Document.id == meta["doc_id"],
            Document.company_id == current_user.company_id
        ).first()
        if doc:
            documento = {
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "file_path": doc.file_path,
                "module": doc.module,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }

    # Histórico mismo proveedor (los últimos 5 + total YTD)
    historico = []
    if meta["provider"]:
        rows = db.query(CostEntry).filter(
            CostEntry.company_id == current_user.company_id,
            CostEntry.notes.ilike(f"%Proveedor: {meta['provider']}%"),
            CostEntry.id != e.id
        ).order_by(CostEntry.date.desc()).limit(5).all()
        historico = [{
            "id": h.id,
            "description": h.description,
            "amount": float(h.amount or 0),
            "date": h.date.isoformat() if h.date else None,
        } for h in rows]

        year_inicio = date(date.today().year, 1, 1)
        total_ytd = db.query(func.coalesce(func.sum(CostEntry.amount), 0), func.count(CostEntry.id)).filter(
            CostEntry.company_id == current_user.company_id,
            CostEntry.notes.ilike(f"%Proveedor: {meta['provider']}%"),
            CostEntry.date >= year_inicio
        ).first()
        gasto["proveedor_total_ytd"] = float(total_ytd[0] or 0)
        gasto["proveedor_count_ytd"] = int(total_ytd[1] or 0)

    # Calcular base imponible / IVA estimados desde el asiento si existe
    if asiento:
        debe_iva = sum(l["debit"] for l in asiento if l["account_code"] and l["account_code"].startswith("472"))
        debe_gasto = sum(l["debit"] for l in asiento if l["account_code"] and l["account_code"].startswith("6"))
        if debe_iva > 0 or debe_gasto > 0:
            gasto["base_imponible"] = round(debe_gasto, 2)
            gasto["iva_amount"] = round(debe_iva, 2)
            gasto["iva_rate"] = round((debe_iva / debe_gasto * 100), 1) if debe_gasto else 0

    return {"gasto": gasto, "asiento_pgc": asiento, "documento_origen": documento, "historico_proveedor": historico}


# ============================================================================
# AGREGADOS
# ============================================================================

@router.get("/agg/categorias")
def agg_categorias(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    year_inicio = date(date.today().year, 1, 1)
    year_fin = date(date.today().year + 1, 1, 1)
    rows = db.query(
        CostCategory.id, CostCategory.name, CostCategory.color, CostCategory.icon,
        func.count(CostEntry.id), func.coalesce(func.sum(CostEntry.amount), 0)
    ).outerjoin(CostEntry, and_(
        CostEntry.category_id == CostCategory.id,
        CostEntry.company_id == current_user.company_id,
        CostEntry.date >= year_inicio, CostEntry.date < year_fin
    )).filter(CostCategory.company_id == current_user.company_id).group_by(CostCategory.id).all()

    # Añadir "Sin categoría" (entries con category_id NULL)
    sin_cat = db.query(func.count(CostEntry.id), func.coalesce(func.sum(CostEntry.amount), 0)).filter(
        CostEntry.company_id == current_user.company_id,
        CostEntry.category_id.is_(None),
        CostEntry.date >= year_inicio, CostEntry.date < year_fin
    ).first()

    items = [{"category_id": r[0], "name": r[1], "color": r[2], "icon": r[3], "count": r[4], "total": float(r[5])} for r in rows]
    if sin_cat and sin_cat[0] > 0:
        items.append({"category_id": None, "name": "Sin categoría", "color": "#86868B", "icon": "box", "count": sin_cat[0], "total": float(sin_cat[1])})

    items = [i for i in items if i["count"] > 0]
    items.sort(key=lambda x: x["total"], reverse=True)
    total_global = sum(i["total"] for i in items) or 1
    for i in items:
        i["pct"] = round((i["total"] / total_global) * 100, 1)
        i["total"] = round(i["total"], 2)
    return {"items": items, "total_global": round(total_global, 2)}


@router.get("/agg/proveedores")
def agg_proveedores(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), limit: int = 50):
    """Agrega por proveedor parseando notes (en memoria, ya que es VARCHAR)."""
    year_inicio = date(date.today().year, 1, 1)
    entries = db.query(CostEntry).filter(
        CostEntry.company_id == current_user.company_id,
        CostEntry.date >= year_inicio
    ).all()

    aggregated = {}
    for e in entries:
        prov = _parse_notes(e.notes)["provider"]
        if not prov:
            continue
        if prov not in aggregated:
            aggregated[prov] = {"name": prov, "count": 0, "total": 0.0, "ultimo_gasto": None, "primer_gasto": None}
        a = aggregated[prov]
        a["count"] += 1
        a["total"] += float(e.amount or 0)
        d = e.date.date() if hasattr(e.date, "date") else e.date
        d_iso = d.isoformat() if d else None
        if d_iso:
            if not a["ultimo_gasto"] or d_iso > a["ultimo_gasto"]:
                a["ultimo_gasto"] = d_iso
            if not a["primer_gasto"] or d_iso < a["primer_gasto"]:
                a["primer_gasto"] = d_iso

    items = list(aggregated.values())
    items.sort(key=lambda x: x["total"], reverse=True)
    for i in items[:limit]:
        i["total"] = round(i["total"], 2)
        i["es_recurrente"] = i["count"] >= 3
        i["inicial"] = (i["name"][0] if i["name"] else "?").upper()
    return {"items": items[:limit]}


@router.get("/agg/evolucion")
def agg_evolucion(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), meses: int = 6):
    today = date.today()
    items = []
    for i in range(meses - 1, -1, -1):
        y, m = today.year, today.month - i
        while m <= 0:
            m += 12; y -= 1
        inicio, fin = _month_range(y, m)
        total = db.query(func.coalesce(func.sum(CostEntry.amount), 0)).filter(
            CostEntry.company_id == current_user.company_id,
            CostEntry.date >= inicio, CostEntry.date < fin
        ).scalar() or 0
        items.append({"year": y, "month": m, "label": date(y, m, 1).strftime("%b"), "total": round(float(total), 2)})
    return {"items": items}


# ============================================================================
# CATÁLOGOS
# ============================================================================

@router.get("/catalog/categorias")
def get_categorias(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(CostCategory).filter(CostCategory.company_id == current_user.company_id).order_by(CostCategory.name).all()
    return {"items": [{"id": c.id, "name": c.name, "color": c.color, "icon": c.icon} for c in rows]}


@router.get("/catalog/departamentos")
def get_departamentos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(CostDepartment).filter(CostDepartment.company_id == current_user.company_id).order_by(CostDepartment.name).all()
    return {"items": [{"id": d.id, "name": d.name} for d in rows]}


# ============================================================================
# REGISTRAR GASTO MANUAL (crea asiento PGC en journal_entries + accounts)
# ============================================================================

@router.post("/registrar")
def registrar_gasto_manual(payload: GastoManual, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company_id = current_user.company_id

    # Calcular base/IVA si no vienen
    base = payload.base_imponible
    iva = payload.iva_amount
    if base is None and iva is None and payload.iva_rate is not None:
        base = round(payload.amount / (1 + payload.iva_rate / 100), 2)
        iva = round(payload.amount - base, 2)

    # Generar referencia tipo "MAN000XXX"
    from sqlalchemy import text
    existing = db.execute(
        text("SELECT COUNT(*) FROM journal_entries WHERE reference LIKE 'MAN%' AND company_id = :cid"),
        {"cid": company_id}
    ).scalar() or 0
    factura_ref = f"MAN{existing + 1:06d}"
    transaction_id = factura_ref

    # Construir notas con el mismo formato que Documentos para que el preview funcione
    notes_parts = []
    if payload.provider:
        notes_parts.append(f"Proveedor: {payload.provider}")
    notes_parts.append(f"Factura: {factura_ref}")
    if payload.provider_nif:
        notes_parts.append(f"NIF: {payload.provider_nif}")
    if payload.notes:
        notes_parts.append(payload.notes)

    fecha_dt = datetime.fromisoformat(payload.date)

    # Crear cost_entry
    entry = CostEntry(
        company_id=company_id,
        category_id=payload.category_id,
        department_id=payload.department_id,
        description=payload.description,
        amount=payload.amount,
        date=fecha_dt,
        notes=" | ".join(notes_parts),
    )
    db.add(entry)
    db.flush()

    # Crear asiento PGC si procede
    if payload.crear_asiento and base is not None:
        # Country-aware account resolution (no hardcoded Spanish PGC codes).
        country = (current_user.company.country if current_user.company else None) or "es"
        try:
            default_gasto, default_acreedor = get_entry_accounts(country, "gasto", "Otro")
        except Exception:
            default_gasto, default_acreedor = ("629", "400")  # ES fallback
        cuenta_gasto = payload.pgc_cuenta_gasto or default_gasto
        cuenta_acreedor = default_acreedor

        # Resolver account_id por código dentro de la empresa
        def get_account_id(code):
            r = db.execute(
                text("SELECT id FROM accounts WHERE code = :c AND company_id = :cid LIMIT 1"),
                {"c": code, "cid": company_id}
            ).first()
            return r[0] if r else None

        acc_gasto = get_account_id(cuenta_gasto)
        acc_acreedor = get_account_id(cuenta_acreedor)

        # IVA soportado/acreditable/crédito fiscal: localizar la cuenta del país por nombre
        # en el catálogo ya sembrado de la empresa (funciona para ES 472, MX IVA acreditable,
        # IGV PE, crédito fiscal CL/SV, etc.) sin asumir un código fijo.
        acc_iva = None
        if iva and iva > 0:
            r = db.execute(text(
                "SELECT id FROM accounts WHERE company_id = :cid AND account_type = 'asset' "
                "AND (lower(name) LIKE '%iva%' OR lower(name) LIKE '%igv%') "
                "AND (lower(name) LIKE '%soport%' OR lower(name) LIKE '%acredit%' "
                "     OR lower(name) LIKE '%crédito fiscal%' OR lower(name) LIKE '%credito fiscal%' "
                "     OR lower(name) LIKE '%descontable%') LIMIT 1"
            ), {"cid": company_id}).first()
            acc_iva = r[0] if r else None

        if not (acc_gasto and acc_acreedor):
            db.rollback()
            raise HTTPException(400, f"Cuentas {cuenta_gasto} o {cuenta_acreedor} no existen para esta empresa ({country})")

        concepto = f"{payload.provider or 'Gasto manual'} - {payload.description[:80]}"

        # Línea 1: DEBE cuenta de gasto
        db.execute(text("""
            INSERT INTO journal_entries (transaction_id, account_id, date, description, debit, credit, reference, module_source, company_id)
            VALUES (:tx, :aid, :d, :desc, :deb, 0, :ref, 'manual', :cid)
        """), {"tx": transaction_id, "aid": acc_gasto, "d": fecha_dt.date(), "desc": concepto, "deb": base, "ref": factura_ref, "cid": company_id})

        # Línea 2: DEBE 472 IVA
        if acc_iva and iva and iva > 0:
            db.execute(text("""
                INSERT INTO journal_entries (transaction_id, account_id, date, description, debit, credit, reference, module_source, company_id)
                VALUES (:tx, :aid, :d, :desc, :deb, 0, :ref, 'manual', :cid)
            """), {"tx": transaction_id, "aid": acc_iva, "d": fecha_dt.date(),
                   "desc": f"IVA soportado {payload.iva_rate}% - {factura_ref}",
                   "deb": iva, "ref": factura_ref, "cid": company_id})

        # Línea 3: HABER acreedor
        db.execute(text("""
            INSERT INTO journal_entries (transaction_id, account_id, date, description, debit, credit, reference, module_source, company_id)
            VALUES (:tx, :aid, :d, :desc, 0, :cre, :ref, 'manual', :cid)
        """), {"tx": transaction_id, "aid": acc_acreedor, "d": fecha_dt.date(),
               "desc": f"Acreedor: {payload.provider or 'Manual'}",
               "cre": payload.amount, "ref": factura_ref, "cid": company_id})

    db.commit()
    return {"ok": True, "gasto_id": entry.id, "transaction_id": transaction_id, "factura_ref": factura_ref}


# ============================================================================
# VERA: parsear gasto desde texto libre (opcional, falla silenciosamente si no hay LLM)
# ============================================================================

@router.post("/vera-parse")
async def vera_parse_gasto(payload: GastoVeraRequest, current_user: User = Depends(get_current_user)):
    try:
        from services.llm.router import ask_llm
    except ImportError:
        try:
            from services.llm_router import ask_llm
        except ImportError:
            return {"ok": False, "error": "Vera no disponible. Usa modo manual."}

    today_iso = date.today().isoformat()
    yesterday_iso = (date.today() - timedelta(days=1)).isoformat()
    system = f"""Eres Vera, asistente contable de Vortu para España.
Convierte la descripción del usuario en un JSON con campos:
description, amount (con IVA), iva_rate (21|10|4|0), date (YYYY-MM-DD),
provider, payment_method, pgc_cuenta_gasto (600|621|622|623|624|625|626|627|628|629).
Hoy es {today_iso}. Ayer es {yesterday_iso}.
PGC: 627=Publicidad 621=Alquiler 628=Suministros 624=Transportes
625=Seguros 626=Bancarios 623=Profesionales 629=Otros.
Devuelve SOLO JSON, sin markdown."""
    try:
        respuesta = await ask_llm(system_prompt=system, user_prompt=payload.descripcion_libre, model_preference="fast")
        clean = respuesta.strip().replace("```json", "").replace("```", "").strip()
        return {"ok": True, "parsed": json.loads(clean)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ============================================================================
# SEED DE CATEGORÍAS TÍPICAS (8 categorías españolas)
# ============================================================================

CATEGORIAS_SEED = [
    {"name": "Marketing y publicidad", "color": "#FF9500", "icon": "megaphone", "pgc_hint": "627"},
    {"name": "Software y SaaS",        "color": "#5856D6", "icon": "code",      "pgc_hint": "629"},
    {"name": "Alquiler y oficina",     "color": "#34C759", "icon": "building",  "pgc_hint": "621"},
    {"name": "Suministros",            "color": "#FFCC00", "icon": "bolt",      "pgc_hint": "628"},
    {"name": "Profesionales externos", "color": "#0071E3", "icon": "users",     "pgc_hint": "623"},
    {"name": "Transporte y viajes",    "color": "#00B4D8", "icon": "truck",     "pgc_hint": "624"},
    {"name": "Servicios bancarios",    "color": "#6E6E73", "icon": "card",      "pgc_hint": "626"},
    {"name": "Otros gastos",           "color": "#86868B", "icon": "box",       "pgc_hint": "629"},
]


@router.post("/inicializar-categorias")
def inicializar_categorias(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Crea las 8 categorías típicas y autoclasifica los gastos existentes por palabras clave en notes/description."""
    company_id = current_user.company_id

    # Si ya hay categorías, devolver las que hay
    existentes = db.query(CostCategory).filter(CostCategory.company_id == company_id).count()
    if existentes > 0:
        rows = db.query(CostCategory).filter(CostCategory.company_id == company_id).all()
        return {"ok": True, "ya_inicializadas": True, "items": [{"id": c.id, "name": c.name} for c in rows]}

    creadas = []
    for seed in CATEGORIAS_SEED:
        cat = CostCategory(
            company_id=company_id,
            name=seed["name"],
            color=seed["color"],
            icon=seed["icon"],
        )
        db.add(cat)
        db.flush()
        creadas.append({"id": cat.id, "name": cat.name, "pgc_hint": seed["pgc_hint"]})

    # Autoclasificar gastos existentes por palabras clave
    KEYWORDS = {
        "Marketing y publicidad":  ["mailchimp", "publicidad", "ads", "facebook ads", "google ads", "marketing", "instagram", "tiktok"],
        "Software y SaaS":         ["saas", "suscripción", "subscription", "software", "licencia", "notion", "slack", "figma", "github", "adobe", "microsoft", "google workspace", "zoom"],
        "Alquiler y oficina":      ["alquiler", "renta", "oficina", "coworking", "wework"],
        "Suministros":             ["luz", "agua", "gas", "internet", "endesa", "iberdrola", "movistar", "vodafone", "orange", "naturgy"],
        "Profesionales externos":  ["abogado", "gestor", "asesor", "consultor", "freelance", "notario", "auditor"],
        "Transporte y viajes":     ["gasolina", "uber", "taxi", "cabify", "renfe", "ave", "vueling", "iberia", "ryanair", "hotel", "booking", "airbnb"],
        "Servicios bancarios":     ["banco", "comisión", "santander", "bbva", "caixabank", "sabadell", "stripe", "paypal"],
    }

    gastos = db.query(CostEntry).filter(
        CostEntry.company_id == company_id,
        CostEntry.category_id.is_(None)
    ).all()

    cat_by_name = {c["name"]: c["id"] for c in creadas}
    otros_id = cat_by_name.get("Otros gastos")
    clasificados = 0

    for g in gastos:
        texto = f"{g.description or ''} {g.notes or ''}".lower()
        cat_id = None
        for nombre_cat, kws in KEYWORDS.items():
            if any(kw in texto for kw in kws):
                cat_id = cat_by_name.get(nombre_cat)
                break
        if not cat_id:
            cat_id = otros_id
        if cat_id:
            g.category_id = cat_id
            clasificados += 1

    db.commit()
    return {"ok": True, "creadas": len(creadas), "gastos_clasificados": clasificados, "items": creadas}


# ============================================================================
# DETALLE DE UN PROVEEDOR (compras + documentos)
# ============================================================================

@router.get("/p/detail")
def proveedor_detail(
    nombre: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve todas las compras de un proveedor + total YTD + evolución mensual."""
    company_id = current_user.company_id

    entries = db.query(CostEntry).filter(
        CostEntry.company_id == company_id,
        CostEntry.notes.ilike(f"%Proveedor: {nombre}%")
    ).order_by(CostEntry.date.desc()).all()

    compras = []
    total_ytd = 0.0
    year_actual = date.today().year

    for e in entries:
        meta = _parse_notes(e.notes)
        d = e.date.date() if hasattr(e.date, "date") else e.date
        if d and d.year == year_actual:
            total_ytd += float(e.amount or 0)
        compras.append({
            "id": e.id,
            "description": e.description,
            "amount": float(e.amount or 0),
            "date": d.isoformat() if d else None,
            "factura_ref": meta["factura_ref"],
            "document_id": meta["doc_id"],
            "category_id": e.category_id,
            "category_name": e.category.name if e.category else None,
        })

    # Evolución mensual del proveedor (últimos 12 meses)
    meses = {}
    for c in compras:
        if not c["date"]:
            continue
        ym = c["date"][:7]  # "2026-05"
        meses[ym] = meses.get(ym, 0) + c["amount"]

    today = date.today()
    evolucion = []
    for i in range(11, -1, -1):
        y, m = today.year, today.month - i
        while m <= 0: m += 12; y -= 1
        key = f"{y:04d}-{m:02d}"
        evolucion.append({
            "label": date(y, m, 1).strftime("%b"),
            "total": round(meses.get(key, 0), 2),
        })

    return {
        "nombre": nombre,
        "total_ytd": round(total_ytd, 2),
        "count_ytd": len([c for c in compras if c["date"] and c["date"][:4] == str(year_actual)]),
        "total_historico": round(sum(c["amount"] for c in compras), 2),
        "count_historico": len(compras),
        "compras": compras,
        "evolucion": evolucion,
    }
