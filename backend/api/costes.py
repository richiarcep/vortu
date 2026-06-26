"""
Centro de Costes - API (SQLAlchemy + modelos Vela)

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
from sqlalchemy import func, extract, and_, or_, desc, asc, text
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, date
from decimal import Decimal
import re
import json
import unicodedata

from core.database import get_db
from core.security import get_current_user, get_tenant_db
from core.pagination import LimitQuery, OffsetQuery
from models.user import User
from models.costs import CostCategory, CostDepartment, CostEntry, CostProvider
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
        except (ValueError, TypeError): pass
    return out


_PROVIDER_SUFFIXES = (
    " sociedad limitada", " sociedad anonima", " s l u", " s a u", " s l", " s a",
    " slu", " sau", " sll", " sl", " sa", " inc", " ltd", " llc", " co",
)

def _normalize_provider(name: str) -> str:
    """Normaliza el nombre de proveedor para deduplicar: sin acentos, minúsculas,
    sin puntuación ni formas societarias ('Repsol S.A.' == 'repsol')."""
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[.,;:]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    changed = True
    while changed:
        changed = False
        for suf in _PROVIDER_SUFFIXES:
            if s.endswith(suf):
                s = s[: -len(suf)].strip()
                changed = True
    return s


def _get_or_create_provider(db, company_id, name, nif=None, iban=None):
    """Devuelve el CostProvider de la empresa para `name`, creándolo si no existe
    (dedup por nombre normalizado). Completa nif/iban si faltaban."""
    if not name or not name.strip():
        return None
    norm = _normalize_provider(name)
    if not norm:
        return None
    prov = db.query(CostProvider).filter(
        CostProvider.company_id == company_id,
        CostProvider.normalized_name == norm,
    ).first()
    if prov:
        if nif and not prov.nif:
            prov.nif = nif
        if iban and not prov.iban:
            prov.iban = iban
        return prov
    prov = CostProvider(
        company_id=company_id, name=name.strip(), normalized_name=norm,
        nif=nif or None, iban=iban or None,
    )
    db.add(prov)
    db.flush()
    return prov


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
    amount: float = Field(gt=0)
    base_imponible: Optional[float] = Field(default=None, ge=0)
    iva_amount: Optional[float] = Field(default=None, ge=0)
    iva_rate: Optional[float] = Field(default=21.0, ge=0, le=100)
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


class ProveedorCreate(BaseModel):
    name: str
    nif: Optional[str] = None
    iban: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_terms: Optional[str] = None


class ProveedorUpdate(BaseModel):
    name: Optional[str] = None
    nif: Optional[str] = None
    iban: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_terms: Optional[str] = None


# ============================================================================
# KPIs DEL HEADER
# ============================================================================

@router.get("/kpis")
def get_kpis(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    company_id = current_user.company_id
    today = date.today()
    mes_inicio, mes_fin = _month_range(today.year, today.month)
    if today.month == 1:
        mes_ant_inicio, mes_ant_fin = _month_range(today.year - 1, 12)
    else:
        mes_ant_inicio, mes_ant_fin = _month_range(today.year, today.month - 1)
    year_inicio = date(today.year, 1, 1)
    year_fin = date(today.year + 1, 1, 1)

    # Gastos LIVE desde contabilidad: débitos en cuentas de gasto del PGC (journal_entries).
    def sum_range(d1, d2):
        r = db.execute(text("""
            SELECT COALESCE(SUM(je.debit), 0), COUNT(*)
            FROM journal_entries je JOIN accounts a ON a.id = je.account_id
            WHERE je.company_id = :cid AND a.account_type = 'expense'
              AND je.date >= :d1 AND je.date < :d2
        """), {"cid": company_id, "d1": str(d1), "d2": str(d2)}).first()
        return float(r[0] or 0), int(r[1] or 0)

    total_mes, count_mes = sum_range(mes_inicio, mes_fin)
    total_mes_ant, _ = sum_range(mes_ant_inicio, mes_ant_fin)
    total_ytd, _ = sum_range(year_inicio, year_fin)
    variacion_pct = ((total_mes - total_mes_ant) / total_mes_ant * 100) if total_mes_ant > 0 else 0.0

    # Top categoría del mes = la cuenta de gasto con mayor débito (nombre del PGC)
    top_cat = db.execute(text("""
        SELECT a.name, SUM(je.debit) AS t
        FROM journal_entries je JOIN accounts a ON a.id = je.account_id
        WHERE je.company_id = :cid AND a.account_type = 'expense'
          AND je.date >= :d1 AND je.date < :d2
        GROUP BY a.id ORDER BY t DESC LIMIT 1
    """), {"cid": company_id, "d1": str(mes_inicio), "d2": str(mes_fin)}).first()
    top_categoria = {"name": top_cat[0], "total": round(float(top_cat[1] or 0), 2)} if top_cat else None

    # Proveedor no es fiable a nivel de asiento individual → lo omitimos en la vista live.
    top_proveedor = None

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
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
    category_id: Optional[str] = None,   # PGC account code (matches agg/categorias)
    department_id: Optional[int] = None,
    provider: Optional[str] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    con_asiento: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = LimitQuery(100),
    offset: int = OffsetQuery(),
    order_by: str = "date_desc",
):
    """Lista de gastos LIVE desde contabilidad (journal_entries = fuente única de
    verdad, igual que los KPIs y la tarta agg/categorias). La categoría es la
    cuenta de gasto del PGC (a.code), por lo que el filtro de la tarta funciona.
    El proveedor/departamento se enriquecen desde cost_entries cuando existe."""
    from sqlalchemy import text as _text
    cid = current_user.company_id
    where = ["je.company_id = :cid", "a.account_type = 'expense'", "je.debit > 0"]
    params = {"cid": cid, "limit": limit, "offset": offset}
    if category_id:
        where.append("a.code = :code"); params["code"] = category_id
    if desde:
        where.append("je.date >= :desde"); params["desde"] = desde
    if hasta:
        where.append("je.date <= :hasta"); params["hasta"] = hasta
    if min_amount is not None:
        where.append("je.debit >= :mina"); params["mina"] = min_amount
    if max_amount is not None:
        where.append("je.debit <= :maxa"); params["maxa"] = max_amount
    if search:
        where.append("(je.description LIKE :s OR a.name LIKE :s)"); params["s"] = f"%{search}%"
    if provider:
        where.append("je.description LIKE :prov"); params["prov"] = f"%{provider}%"

    order = {
        "date_desc": "je.date DESC, je.id DESC", "date_asc": "je.date ASC, je.id ASC",
        "amount_desc": "je.debit DESC", "amount_asc": "je.debit ASC",
    }.get(order_by, "je.date DESC, je.id DESC")
    wsql = " AND ".join(where)

    # con_asiento=False is meaningless here (every journal row IS a posting).
    if con_asiento is False:
        return {"items": [], "total": 0, "limit": limit, "offset": offset}

    total = db.execute(_text(
        f"SELECT COUNT(*) FROM journal_entries je JOIN accounts a ON a.id=je.account_id WHERE {wsql}"
    ), params).scalar() or 0
    rows = db.execute(_text(f"""
        SELECT je.id, je.date, je.description, je.debit, je.reference, a.code, a.name
        FROM journal_entries je JOIN accounts a ON a.id = je.account_id
        WHERE {wsql} ORDER BY {order} LIMIT :limit OFFSET :offset
    """), params).fetchall()

    # Enrich provider from cost_entries (keyed by the journal reference = factura_ref).
    refs = {r[4] for r in rows if r[4]}
    prov_by_ref = {}
    if refs:
        for ce in db.query(CostEntry).filter(
            CostEntry.company_id == cid,
            CostEntry.notes.isnot(None),
        ).all():
            m = _parse_notes(ce.notes)
            if m["factura_ref"] in refs and m["provider"]:
                prov_by_ref[m["factura_ref"]] = m["provider"]

    items = [{
        "id": r[0], "date": str(r[1]) if r[1] else None, "description": r[2],
        "amount": float(r[3] or 0), "reference": r[4],
        "category_id": r[5], "category_name": r[6],
        "provider": prov_by_ref.get(r[4]),
        "department_name": None,
        "tiene_asiento_pgc": True,
    } for r in rows]

    return {"items": items, "total": total, "limit": limit, "offset": offset}


# ============================================================================
# PROVEEDORES (entidad) — definido ANTES de /{gasto_id} para que GET /proveedores
# no quede capturado por la ruta dinámica (que espera un int → daría 422).
# ============================================================================

def _provider_to_dict(p: CostProvider, stats: dict) -> dict:
    s = stats.get(p.id, {"count": 0, "total": 0.0, "last": None})
    return {
        "id": p.id, "name": p.name, "nif": p.nif, "iban": p.iban,
        "email": p.email, "phone": p.phone, "payment_terms": p.payment_terms,
        "inicial": (p.name[0] if p.name else "?").upper(),
        "count": s["count"], "total": round(s["total"], 2), "last": s["last"],
        "es_recurrente": s["count"] >= 3,
    }


def _provider_stats(db, company_id):
    rows = db.query(
        CostEntry.provider_id,
        func.count(CostEntry.id),
        func.coalesce(func.sum(CostEntry.amount), 0),
        func.max(CostEntry.date),
    ).filter(
        CostEntry.company_id == company_id,
        CostEntry.provider_id.isnot(None),
    ).group_by(CostEntry.provider_id).all()
    return {r[0]: {"count": r[1], "total": float(r[2] or 0), "last": r[3].isoformat() if r[3] else None} for r in rows}


@router.get("/proveedores")
def list_proveedores(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    """Lista los proveedores (entidad) con sus estadísticas de gasto."""
    cid = current_user.company_id
    provs = db.query(CostProvider).filter(CostProvider.company_id == cid).order_by(CostProvider.name).all()
    stats = _provider_stats(db, cid)
    items = [_provider_to_dict(p, stats) for p in provs]
    items.sort(key=lambda x: x["total"], reverse=True)
    return {"proveedores": items, "total": len(items)}


@router.post("/proveedores", status_code=201)
def create_proveedor(payload: ProveedorCreate, db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    cid = current_user.company_id
    if not payload.name or not payload.name.strip():
        raise HTTPException(400, "El nombre del proveedor es obligatorio")
    prov = _get_or_create_provider(db, cid, payload.name, payload.nif, payload.iban)
    if payload.email:
        prov.email = payload.email
    if payload.phone:
        prov.phone = payload.phone
    if payload.payment_terms:
        prov.payment_terms = payload.payment_terms
    db.commit()
    db.refresh(prov)
    return _provider_to_dict(prov, _provider_stats(db, cid))


@router.patch("/proveedores/{provider_id}")
def update_proveedor(provider_id: int, payload: ProveedorUpdate, db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    cid = current_user.company_id
    prov = db.query(CostProvider).filter(CostProvider.id == provider_id, CostProvider.company_id == cid).first()
    if not prov:
        raise HTTPException(404, "Proveedor no encontrado")
    if payload.name is not None and payload.name.strip():
        prov.name = payload.name.strip()
        prov.normalized_name = _normalize_provider(payload.name)
    for f in ("nif", "iban", "email", "phone", "payment_terms"):
        v = getattr(payload, f)
        if v is not None:
            setattr(prov, f, v or None)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(409, "Ya existe un proveedor con ese nombre")
    db.refresh(prov)
    return _provider_to_dict(prov, _provider_stats(db, cid))


# ============================================================================
# DETALLE DE UN GASTO
# ============================================================================

@router.get("/{gasto_id}")
def get_gasto(gasto_id: int, db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    """Detalle de un gasto. El id es un journal_entry (la lista es journal-based).
    Devuelve el gasto, su asiento PGC completo (todas las líneas de la transacción),
    el documento origen y el histórico de proveedor (best-effort vía cost_entries)."""
    from sqlalchemy import text
    cid = current_user.company_id

    je = db.execute(text("""
        SELECT je.id, je.transaction_id, je.date, je.description, je.debit, je.reference,
               a.code, a.name
        FROM journal_entries je JOIN accounts a ON a.id = je.account_id
        WHERE je.id = :id AND je.company_id = :cid
    """), {"id": gasto_id, "cid": cid}).fetchone()
    if not je:
        raise HTTPException(404, "Gasto no encontrado")

    txid, ref = je[1], je[5]
    # Linked cost_entry (provider/department metadata), matched by the journal reference.
    ce = None
    if ref:
        for c in db.query(CostEntry).filter(CostEntry.company_id == cid, CostEntry.notes.isnot(None)).all():
            if _parse_notes(c.notes)["factura_ref"] == ref:
                ce = c
                break
    meta = _parse_notes(ce.notes) if ce else {"provider": None, "factura_ref": ref, "iban": None, "nif": None, "doc_id": None}

    gasto = {
        "id": je[0], "description": je[3], "amount": float(je[4] or 0),
        "date": str(je[2]) if je[2] else None, "reference": ref,
        "category_id": je[6], "category_name": je[7],
        "provider": meta["provider"], "department_name": ce.department.name if (ce and ce.department) else None,
        "factura_ref": meta["factura_ref"], "iban": meta["iban"], "nif": meta["nif"],
        "document_id": meta["doc_id"], "tiene_asiento_pgc": True,
    }

    # Asiento PGC completo (todas las líneas de la transacción).
    rows = db.execute(text("""
        SELECT je.id, je.transaction_id, je.date, je.description, je.debit, je.credit,
               a.code, a.name
        FROM journal_entries je LEFT JOIN accounts a ON a.id = je.account_id
        WHERE je.transaction_id = :tx AND je.company_id = :cid
        ORDER BY je.id ASC
    """), {"tx": txid, "cid": cid}).fetchall()
    asiento = [{
        "id": r[0], "transaction_id": r[1],
        "date": r[2].isoformat() if hasattr(r[2], "isoformat") else str(r[2]),
        "concept": r[3], "debit": float(r[4] or 0), "credit": float(r[5] or 0),
        "account_code": r[6], "account_name": r[7],
    } for r in rows]

    # Documento origen
    documento = None
    if meta["doc_id"]:
        doc = db.query(Document).filter(
            Document.id == meta["doc_id"],
            Document.company_id == cid
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
            CostEntry.company_id == cid,
            CostEntry.notes.ilike(f"%Proveedor: {meta['provider']}%"),
        ).order_by(CostEntry.date.desc()).limit(5).all()
        historico = [{
            "id": h.id,
            "description": h.description,
            "amount": float(h.amount or 0),
            "date": h.date.isoformat() if h.date else None,
        } for h in rows]

        year_inicio = date(date.today().year, 1, 1)
        total_ytd = db.query(func.coalesce(func.sum(CostEntry.amount), 0), func.count(CostEntry.id)).filter(
            CostEntry.company_id == cid,
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
def agg_categorias(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    year_inicio = date(date.today().year, 1, 1)
    year_fin = date(date.today().year + 1, 1, 1)
    # LIVE desde contabilidad: agrupa por cuenta de gasto del PGC (= categoría).
    rows = db.execute(text("""
        SELECT a.code, a.name, COUNT(*) AS c, ROUND(SUM(je.debit), 2) AS t
        FROM journal_entries je JOIN accounts a ON a.id = je.account_id
        WHERE je.company_id = :cid AND a.account_type = 'expense'
          AND je.date >= :d1 AND je.date < :d2
        GROUP BY a.id HAVING t > 0 ORDER BY t DESC
    """), {"cid": current_user.company_id, "d1": str(year_inicio), "d2": str(year_fin)}).fetchall()

    _PALETTE = ["#0071E3", "#FF9500", "#34C759", "#AF52DE", "#FF3B30", "#00B4D8", "#FFCC00", "#5856D6"]
    items = [{"category_id": r[0], "name": r[1], "color": _PALETTE[i % len(_PALETTE)],
              "icon": "box", "count": r[2], "total": float(r[3])}
             for i, r in enumerate(rows)]
    items.sort(key=lambda x: x["total"], reverse=True)
    total_global = sum(i["total"] for i in items) or 1
    for i in items:
        i["pct"] = round((i["total"] / total_global) * 100, 1)
        i["total"] = round(i["total"], 2)
    return {"items": items, "total_global": round(total_global, 2)}


@router.get("/agg/proveedores")
def agg_proveedores(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user), limit: int = LimitQuery(50)):
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
def agg_evolucion(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user), meses: int = 6):
    today = date.today()
    items = []
    for i in range(meses - 1, -1, -1):
        y, m = today.year, today.month - i
        while m <= 0:
            m += 12; y -= 1
        inicio, fin = _month_range(y, m)
        total = db.execute(text("""
            SELECT COALESCE(SUM(je.debit), 0)
            FROM journal_entries je JOIN accounts a ON a.id = je.account_id
            WHERE je.company_id = :cid AND a.account_type = 'expense'
              AND je.date >= :d1 AND je.date < :d2
        """), {"cid": current_user.company_id, "d1": str(inicio), "d2": str(fin)}).scalar() or 0
        items.append({"year": y, "month": m, "label": date(y, m, 1).strftime("%b"), "total": round(float(total), 2)})
    return {"items": items}


# ============================================================================
# CATÁLOGOS
# ============================================================================

@router.get("/catalog/categorias")
def get_categorias(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    rows = db.query(CostCategory).filter(CostCategory.company_id == current_user.company_id).order_by(CostCategory.name).all()
    return {"items": [{"id": c.id, "name": c.name, "color": c.color, "icon": c.icon,
                       "pgc_account_code": _pgc_for_category(c)} for c in rows]}


@router.get("/catalog/departamentos")
def get_departamentos(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    rows = db.query(CostDepartment).filter(CostDepartment.company_id == current_user.company_id).order_by(CostDepartment.name).all()
    return {"items": [{"id": d.id, "name": d.name} for d in rows]}


# ============================================================================
# REGISTRAR GASTO MANUAL (crea asiento PGC en journal_entries + accounts)
# ============================================================================

@router.post("/registrar")
def registrar_gasto_manual(payload: GastoManual, db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
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

    # Proveedor como entidad (get-or-create, dedup por nombre normalizado).
    prov = _get_or_create_provider(db, company_id, payload.provider, payload.provider_nif) if payload.provider else None

    # Crear cost_entry
    entry = CostEntry(
        company_id=company_id,
        category_id=payload.category_id,
        department_id=payload.department_id,
        provider_id=prov.id if prov else None,
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

        # Map the chosen CATEGORY to its PGC expense account — the category is the
        # meaningful signal from the UI. Only override when that account actually
        # exists for the company (so a Spanish 62x code doesn't break a non-ES chart).
        if payload.category_id:
            cat = db.query(CostCategory).filter(
                CostCategory.id == payload.category_id,
                CostCategory.company_id == company_id,
            ).first()
            cat_code = _pgc_for_category(cat)
            if cat_code and get_account_id(cat_code):
                cuenta_gasto = cat_code

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
    system = f"""Eres Vera, asistente contable de Vela para España.
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

# Category name → PGC expense account (for backfilling categories created before
# the pgc_account_code column existed).
_PGC_BY_CAT_NAME = {s["name"]: s["pgc_hint"] for s in CATEGORIAS_SEED}


def _pgc_for_category(cat) -> Optional[str]:
    """The PGC expense account a category maps to (stored, or inferred by name)."""
    if cat is None:
        return None
    return cat.pgc_account_code or _PGC_BY_CAT_NAME.get(cat.name)


@router.post("/inicializar-categorias")
def inicializar_categorias(db: Session = Depends(get_tenant_db), current_user: User = Depends(get_current_user)):
    """Crea las 8 categorías típicas y autoclasifica los gastos existentes por palabras clave en notes/description."""
    company_id = current_user.company_id

    # Si ya hay categorías, devolver las que hay (rellenando el PGC que falte).
    existentes = db.query(CostCategory).filter(CostCategory.company_id == company_id).count()
    if existentes > 0:
        rows = db.query(CostCategory).filter(CostCategory.company_id == company_id).all()
        changed = False
        for c in rows:
            if not c.pgc_account_code and _PGC_BY_CAT_NAME.get(c.name):
                c.pgc_account_code = _PGC_BY_CAT_NAME[c.name]
                changed = True
        if changed:
            db.commit()
        return {"ok": True, "ya_inicializadas": True, "items": [{"id": c.id, "name": c.name} for c in rows]}

    creadas = []
    for seed in CATEGORIAS_SEED:
        cat = CostCategory(
            company_id=company_id,
            name=seed["name"],
            color=seed["color"],
            icon=seed["icon"],
            pgc_account_code=seed["pgc_hint"],
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
    db: Session = Depends(get_tenant_db),
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
