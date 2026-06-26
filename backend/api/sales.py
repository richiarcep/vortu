from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from core.database import get_db
from services.graph.sync import sync_sale, sync_product
from core.security import get_current_user, get_tenant_db
from core.pagination import LimitQuery, OffsetQuery
from models.user import User
from models.sales import Product, Sale, SaleItem, SaleRefund, SaleRefundItem
from modules.sales.qr_generator import (
    generate_vela_qr_svg, generate_vela_code, generate_label_svg
)
from modules.sales.reports import (
    get_product_stats, get_sales_dashboard, get_daily_report
)

router = APIRouter(prefix="/api/ventas", tags=["Ventas"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name:                str
    description:         Optional[str]   = None
    category:            Optional[str]   = None
    barcode:             Optional[str]   = None
    sale_price:          float
    cost_price:          Optional[float] = 0.0
    iva_rate:            Optional[float] = 21.0
    stock_quantity:      Optional[int]   = 0
    low_stock_threshold: Optional[int]   = 5

class ProductUpdate(BaseModel):
    name:                Optional[str]   = None
    description:         Optional[str]   = None
    category:            Optional[str]   = None
    barcode:             Optional[str]   = None
    sale_price:          Optional[float] = None
    cost_price:          Optional[float] = None
    iva_rate:            Optional[float] = None
    stock_quantity:      Optional[int]   = None
    low_stock_threshold: Optional[int]   = None
    is_active:           Optional[bool]  = None

class SaleItemIn(BaseModel):
    product_id: int
    quantity:   int = 1

class SaleCreate(BaseModel):
    items:           list[SaleItemIn]
    payment_method:  Optional[str]  = "efectivo"
    notes:           Optional[str]  = None
    # Clave única del cliente para evitar ventas duplicadas (doble clic / reintento).
    idempotency_key: Optional[str]  = None
    # Permitir vender por debajo de stock (deja stock negativo visible). Por defecto
    # se bloquea la sobreventa.
    allow_oversell:  Optional[bool] = False

class RefundItemIn(BaseModel):
    sale_item_id: int
    quantity:     int

class RefundCreate(BaseModel):
    # Si items es None/vacío → devolución TOTAL de lo que quede por devolver.
    items:           Optional[list[RefundItemIn]] = None
    reason:          Optional[str]  = None
    restock:         Optional[bool] = True
    payment_method:  Optional[str]  = None   # por defecto, el de la venta original
    idempotency_key: Optional[str]  = None
    # Postear la nota de crédito en contabilidad (best-effort). Por defecto OFF para
    # mantener simetría con las ventas, que hoy tampoco postean asiento.
    post_accounting: Optional[bool] = False


# ── Helpers ───────────────────────────────────────────────────────────────────

def serialize_product(p: Product) -> dict:
    price_with_iva = round(p.sale_price * (1 + p.iva_rate / 100), 2)
    margin = 0.0
    if p.cost_price and p.sale_price > 0:
        margin = round(((p.sale_price - p.cost_price) / p.sale_price) * 100, 1)
    return {
        "id":                  p.id,
        "name":                p.name,
        "description":         p.description,
        "category":            p.category,
        "barcode":             p.barcode,
        "vela_code":          p.vela_code,
        "sale_price":          p.sale_price,
        "sale_price_with_iva": price_with_iva,
        "cost_price":          p.cost_price,
        "iva_rate":            p.iva_rate,
        "margin_pct":          margin,
        "stock_quantity":      p.stock_quantity,
        "low_stock_threshold": p.low_stock_threshold,
        "is_active":           p.is_active,
        "created_at":          str(p.created_at),
    }


def serialize_sale(s: Sale) -> dict:
    return {
        "id":              s.id,
        "sale_date":       str(s.sale_date),
        "sale_time":       s.sale_time,
        "payment_method":  s.payment_method,
        "subtotal":        s.subtotal,
        "iva_amount":      s.iva_amount,
        "total":           s.total,
        "notes":           s.notes,
        "status":          getattr(s, "status", None) or "completed",
        "refunded_amount": getattr(s, "refunded_amount", 0.0) or 0.0,
        "items": [
            {
                "id":                  i.id,
                "product_id":          i.product_id,
                "product_name":        i.product.name if i.product else "—",
                "quantity":            i.quantity,
                "refunded_quantity":   getattr(i, "refunded_quantity", 0) or 0,
                "returnable_quantity": i.quantity - (getattr(i, "refunded_quantity", 0) or 0),
                "unit_price":          i.unit_price,
                "iva_rate":            i.iva_rate,
                "line_total":          i.line_total,
            }
            for i in s.items
        ],
        "created_at": str(s.created_at),
    }


def serialize_refund(r: SaleRefund) -> dict:
    return {
        "id":                 r.id,
        "sale_id":            r.sale_id,
        "refund_date":        str(r.refund_date),
        "subtotal":           r.subtotal,
        "iva_amount":         r.iva_amount,
        "total":              r.total,
        "reason":             r.reason,
        "payment_method":     r.payment_method,
        "restocked":          r.restocked,
        "credit_note_number": r.credit_note_number,
        "transaction_id":     r.transaction_id,
        "items": [
            {
                "sale_item_id": it.sale_item_id,
                "product_id":   it.product_id,
                "quantity":     it.quantity,
                "unit_price":   it.unit_price,
                "iva_rate":     it.iva_rate,
                "line_total":   it.line_total,
            }
            for it in r.items
        ],
        "created_at": str(r.created_at),
    }


# ── Products ──────────────────────────────────────────────────────────────────

@router.post("/productos", status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = Product(
        company_id=current_user.company_id,
        name=data.name,
        description=data.description,
        category=data.category,
        barcode=data.barcode,
        sale_price=data.sale_price,
        cost_price=data.cost_price or 0.0,
        iva_rate=data.iva_rate or 21.0,
        stock_quantity=data.stock_quantity or 0,
        low_stock_threshold=data.low_stock_threshold or 5,
    )
    db.add(product)
    db.flush()

    # Generate Vela code after getting the ID
    product.vela_code = generate_vela_code(current_user.company_id, product.id)
    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.get("/productos")
def list_products(
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(
        Product.company_id == current_user.company_id,
        Product.is_active == True,
    )
    if category:
        query = query.filter(Product.category == category)
    if low_stock:
        query = query.filter(Product.stock_quantity <= Product.low_stock_threshold)

    products = query.order_by(Product.name).all()

    result = []
    for p in products:
        stats = get_product_stats(db, p.id, current_user.company_id)
        serialized = serialize_product(p)
        serialized.update({
            "total_units_sold":  stats.get("total_units_sold", 0),
            "total_revenue":     stats.get("total_revenue", 0),
            "month_units_sold":  stats.get("month_units_sold", 0),
            "month_revenue":     stats.get("month_revenue", 0),
            "last_sale_date":    stats.get("last_sale_date"),
            "stock_status":      stats.get("stock_status", "ok"),
        })
        result.append(serialized)

    return {"total": len(result), "products": result}


@router.get("/productos/buscar/{code}")
def find_product(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Looks up a product by barcode OR vela_code.
    Called instantly when the scanner reads a code.
    """
    product = db.query(Product).filter(
        Product.company_id == current_user.company_id,
        Product.is_active == True,
    ).filter(
        (Product.barcode == code) | (Product.vela_code == code)
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return {
        **serialize_product(product),
        "price_with_iva": round(product.sale_price * (1 + product.iva_rate / 100), 2),
    }


@router.get("/productos/{product_id}")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    stats = get_product_stats(db, product_id, current_user.company_id)
    return {**serialize_product(product), **stats}


@router.put("/productos/{product_id}")
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for field, value in data.dict(exclude_none=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.get("/productos/{product_id}/qr")
def get_product_qr(
    product_id: int,
    size: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the NaviLens-style SVG QR code for a product."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    svg = generate_vela_qr_svg(
        vela_code=product.vela_code or f"NX-{product_id}",
        product_name=product.name,
        size=size,
    )
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/productos/{product_id}/etiqueta")
def get_product_label_pdf(
    product_id: int,
    copies: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns a printable PDF label for a product."""
    from modules.sales.label import generate_product_label_pdf
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    pdf_bytes = generate_product_label_pdf(db, product, copies=copies)
    filename  = f"etiqueta_{product.vela_code or product_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ── Sales ─────────────────────────────────────────────────────────────────────

@router.post("/venta", status_code=201)
def create_sale(
    data: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a complete sale with all items.
    Automatically deducts stock and calculates totals.
    """
    if not data.items:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un producto")

    cid = current_user.company_id

    # Idempotencia: si la clave ya se usó, devolvemos la venta existente en lugar de
    # crear un duplicado (protege contra doble clic / reintento de red).
    if data.idempotency_key:
        existing = db.query(Sale).filter(
            Sale.company_id == cid,
            Sale.idempotency_key == data.idempotency_key,
        ).first()
        if existing:
            return serialize_sale(existing)

    now = datetime.now()
    sale = Sale(
        company_id=cid,
        sale_date=now.date(),
        sale_time=now.strftime("%H:%M"),
        payment_method=data.payment_method or "efectivo",
        notes=data.notes,
        subtotal=0.0,
        iva_amount=0.0,
        total=0.0,
        status="completed",
        idempotency_key=data.idempotency_key,
    )
    db.add(sale)

    subtotal = 0.0
    iva_total = 0.0

    for item_in in data.items:
        qty = item_in.quantity
        if qty <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor que cero")

        product = db.query(Product).filter(
            Product.id == item_in.product_id,
            Product.company_id == cid,
            Product.is_active == True,
        ).first()

        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item_in.product_id} no encontrado")

        unit_price = product.sale_price
        iva_rate   = product.iva_rate
        line_base  = unit_price * qty
        line_iva   = line_base * (iva_rate / 100)
        line_total = line_base + line_iva

        # Vía relación (sin sale_id explícito): el INSERT se difiere al único
        # commit final, de modo que un choque de idempotencia se captura abajo.
        sale.items.append(SaleItem(
            product_id=product.id,
            company_id=cid,
            quantity=qty,
            unit_price=unit_price,
            iva_rate=iva_rate,
            line_total=round(line_total, 2),
        ))

        subtotal  += line_base
        iva_total += line_iva

        # Descuento de stock ATÓMICO (UPDATE condicional en SQL, no read-modify-write
        # en Python → sin condición de carrera). Si no se permite sobreventa y no hay
        # stock suficiente, la fila no se actualiza (rowcount 0) → 409.
        if data.allow_oversell:
            db.query(Product).filter(
                Product.id == product.id,
                Product.company_id == cid,
            ).update(
                {Product.stock_quantity: Product.stock_quantity - qty},
                synchronize_session=False,
            )
        else:
            updated = db.query(Product).filter(
                Product.id == product.id,
                Product.company_id == cid,
                Product.stock_quantity >= qty,
            ).update(
                {Product.stock_quantity: Product.stock_quantity - qty},
                synchronize_session=False,
            )
            if updated == 0:
                # Relee el stock REAL para el mensaje (el objeto ORM puede estar
                # desfasado tras updates atómicos previos del mismo producto o por
                # concurrencia).
                avail = db.query(Product.stock_quantity).filter(
                    Product.id == product.id, Product.company_id == cid
                ).scalar()
                raise HTTPException(
                    status_code=409,
                    detail=(f"Stock insuficiente para «{product.name}» "
                            f"(disponible: {avail or 0}, solicitado: {qty})"),
                )

    sale.subtotal   = round(subtotal, 2)
    sale.iva_amount = round(iva_total, 2)
    sale.total      = round(subtotal + iva_total, 2)

    try:
        db.commit()
    except (IntegrityError, OperationalError):
        # Carrera de idempotencia (otra petición con la misma clave ganó) o lock de
        # SQLite. Devolvemos la venta ya creada en vez de duplicar.
        db.rollback()
        if data.idempotency_key:
            existing = db.query(Sale).filter(
                Sale.company_id == cid,
                Sale.idempotency_key == data.idempotency_key,
            ).first()
            if existing:
                return serialize_sale(existing)
        raise HTTPException(status_code=409, detail="No se pudo registrar la venta (conflicto). Reinténtalo.")

    db.refresh(sale)

    # Sincronización con el grafo Neo4j: best-effort, NUNCA debe tumbar la venta
    # (ya está confirmada). Si Neo4j está caído, se ignora.
    try:
        sync_sale(sale.id, cid, sale.total, str(sale.sale_date), sale.payment_method)
    except Exception:
        pass

    return serialize_sale(sale)


@router.get("/venta/{sale_id}")
def get_sale_detail(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detalle de una venta, incluyendo cuántas unidades quedan por devolver."""
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == current_user.company_id,
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    out = serialize_sale(sale)
    out["refunds"] = [serialize_refund(r) for r in sale.refunds]
    return out


def _build_credit_note_entries(db: Session, company_id: int, refund: SaleRefund) -> Optional[str]:
    """Añade los apuntes de la nota de crédito (asiento inverso de la venta) a la
    sesión SIN hacer commit, de modo que se confirmen en el MISMO commit que la
    devolución (atómico: o ambos o ninguno). Best-effort: si la empresa no tiene las
    cuentas genéricas (100/400) o algo falla, devuelve None sin tocar la sesión y la
    devolución sigue siendo válida. Devuelve el transaction_id si se crearon."""
    try:
        import uuid
        from modules.accounting.journal import Account, JournalEntry, Transaction
        accts = {
            code: db.query(Account).filter(
                Account.code == code, Account.company_id == company_id
            ).first()
            for code in ("400", "100")
        }
        if not all(accts.values()):
            return None  # la empresa no usa el plan genérico → se omite (best-effort)

        txid = str(uuid.uuid4())[:8].upper()
        desc = f"Nota de crédito {refund.credit_note_number} (devolución venta #{refund.sale_id})"
        total = Decimal(str(refund.total))
        for code, debit, credit in (("400", total, Decimal("0")), ("100", Decimal("0"), total)):
            db.add(JournalEntry(
                transaction_id=txid, account_id=accts[code].id, date=refund.refund_date,
                description=desc, debit=debit, credit=credit,
                reference=refund.credit_note_number, module_source="ventas_devolucion",
                company_id=company_id,
            ))
        db.add(Transaction(
            transaction_id=txid, date=refund.refund_date, description=desc,
            total_amount=total, module_source="ventas_devolucion", is_balanced=True,
            company_id=company_id,
        ))
        return txid
    except Exception:
        return None


@router.post("/venta/{sale_id}/devolucion", status_code=201)
def refund_sale(
    sale_id: int,
    data: RefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra una devolución / nota de crédito (total o parcial) sobre una venta.
    Repone stock (atómico), marca las unidades devueltas y deja la venta en estado
    'partially_refunded' o 'refunded'. Idempotente vía idempotency_key."""
    cid = current_user.company_id

    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.company_id == cid).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    # Idempotencia (acotada a ESTA venta): misma clave sobre la misma venta →
    # devolución ya creada (no duplica). Acotar a sale_id evita que una clave
    # reutilizada en otra venta devuelva la devolución equivocada.
    if data.idempotency_key:
        existing = db.query(SaleRefund).filter(
            SaleRefund.company_id == cid,
            SaleRefund.sale_id == sale.id,
            SaleRefund.idempotency_key == data.idempotency_key,
        ).first()
        if existing:
            return serialize_refund(existing)

    items_by_id = {it.id: it for it in sale.items}

    # Si no se especifican líneas → devolución TOTAL de lo que quede por devolver.
    requested = data.items
    if not requested:
        requested = [
            RefundItemIn(sale_item_id=it.id, quantity=it.quantity - (it.refunded_quantity or 0))
            for it in sale.items
            if (it.quantity - (it.refunded_quantity or 0)) > 0
        ]
    if not requested:
        raise HTTPException(status_code=400, detail="No quedan unidades por devolver en esta venta")

    # Consolida líneas repetidas del mismo sale_item en una sola (suma cantidades),
    # para que la validación no use estado ORM obsoleto dentro del mismo request.
    _merged = {}
    for ri in requested:
        _merged[ri.sale_item_id] = _merged.get(ri.sale_item_id, 0) + ri.quantity
    requested = [RefundItemIn(sale_item_id=k, quantity=v) for k, v in _merged.items()]

    seq = db.query(SaleRefund).filter(
        SaleRefund.sale_id == sale.id, SaleRefund.company_id == cid
    ).count() + 1

    refund = SaleRefund(
        company_id=cid,
        sale_id=sale.id,
        refund_date=date.today(),
        reason=data.reason,
        payment_method=data.payment_method or sale.payment_method,
        restocked=bool(data.restock),
        credit_note_number=f"NC-{sale.id}-{seq}",
        idempotency_key=data.idempotency_key,
        created_by=current_user.id,
        subtotal=0.0, iva_amount=0.0, total=0.0,
    )
    db.add(refund)

    r_sub = 0.0
    r_iva = 0.0
    for ri in requested:
        if ri.quantity <= 0:
            raise HTTPException(status_code=400, detail="La cantidad a devolver debe ser mayor que cero")
        si = items_by_id.get(ri.sale_item_id)
        if not si:
            raise HTTPException(status_code=404, detail=f"La línea {ri.sale_item_id} no pertenece a esta venta")
        already = si.refunded_quantity or 0
        remaining = si.quantity - already
        if ri.quantity > remaining:
            name = si.product.name if si.product else f"producto {si.product_id}"
            raise HTTPException(
                status_code=400,
                detail=f"No puedes devolver {ri.quantity} de «{name}»: solo quedan {remaining} por devolver",
            )

        line_base  = si.unit_price * ri.quantity
        line_iva   = line_base * (si.iva_rate / 100)
        line_total = line_base + line_iva

        # Avance ATÓMICO y condicional de las unidades devueltas: el UPDATE solo
        # afecta a la fila si refunded_quantity + qty <= quantity. Si dos devoluciones
        # concurrentes compiten por la misma línea, una falla (rowcount 0) → 409, en
        # vez de un read-modify-write en Python que permitiría sobre-devolución.
        updated = db.query(SaleItem).filter(
            SaleItem.id == si.id,
            SaleItem.company_id == cid,
            func.coalesce(SaleItem.refunded_quantity, 0) + ri.quantity <= SaleItem.quantity,
        ).update(
            {SaleItem.refunded_quantity: func.coalesce(SaleItem.refunded_quantity, 0) + ri.quantity},
            synchronize_session=False,
        )
        if updated == 0:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Esas unidades ya fueron devueltas por otra operación; recarga la venta",
            )

        refund.items.append(SaleRefundItem(
            sale_item_id=si.id,
            product_id=si.product_id,
            company_id=cid,
            quantity=ri.quantity,
            unit_price=si.unit_price,
            iva_rate=si.iva_rate,
            line_total=round(line_total, 2),
        ))
        r_sub += line_base
        r_iva += line_iva

        # Reposición de stock ATÓMICA (UPDATE en SQL).
        if data.restock:
            db.query(Product).filter(
                Product.id == si.product_id,
                Product.company_id == cid,
            ).update(
                {Product.stock_quantity: Product.stock_quantity + ri.quantity},
                synchronize_session=False,
            )

    refund.subtotal   = round(r_sub, 2)
    refund.iva_amount = round(r_iva, 2)
    refund.total      = round(r_sub + r_iva, 2)

    # ¿Queda algo por devolver? Se calcula con un agregado en BD que YA refleja los
    # UPDATE atómicos de refunded_quantity de este request (misma transacción), no con
    # el estado ORM en memoria (obsoleto tras synchronize_session=False).
    remaining = db.query(
        func.coalesce(func.sum(SaleItem.quantity - SaleItem.refunded_quantity), 0)
    ).filter(SaleItem.sale_id == sale.id, SaleItem.company_id == cid).scalar()
    fully = (remaining or 0) <= 0

    # Actualiza agregado y estado de la venta de forma ATÓMICA. Si la devolución es
    # total, fija refunded_amount = total exacto (evita deriva de céntimos en float).
    if fully:
        db.query(Sale).filter(Sale.id == sale.id, Sale.company_id == cid).update(
            {Sale.refunded_amount: Sale.total, Sale.status: "refunded"},
            synchronize_session=False,
        )
    else:
        db.query(Sale).filter(Sale.id == sale.id, Sale.company_id == cid).update(
            {Sale.refunded_amount: func.coalesce(Sale.refunded_amount, 0) + refund.total,
             Sale.status: "partially_refunded"},
            synchronize_session=False,
        )

    # Nota de crédito en contabilidad (best-effort, opt-in): se añade a la MISMA
    # transacción para que devolución + asiento se confirmen juntos (o ninguno).
    if data.post_accounting:
        txid = _build_credit_note_entries(db, cid, refund)
        if txid:
            refund.transaction_id = txid

    try:
        db.commit()
    except (IntegrityError, OperationalError):
        # Choque de idempotencia, de nº de nota de crédito o lock de SQLite.
        db.rollback()
        if data.idempotency_key:
            existing = db.query(SaleRefund).filter(
                SaleRefund.company_id == cid,
                SaleRefund.sale_id == sale.id,
                SaleRefund.idempotency_key == data.idempotency_key,
            ).first()
            if existing:
                return serialize_refund(existing)
        raise HTTPException(status_code=409, detail="No se pudo registrar la devolución (conflicto). Reinténtalo.")

    db.refresh(refund)
    return serialize_refund(refund)


@router.get("/devoluciones")
def list_refunds(
    limit: int = LimitQuery(50),
    offset: int = OffsetQuery(),
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SaleRefund).filter(
        SaleRefund.company_id == current_user.company_id
    ).order_by(SaleRefund.created_at.desc())
    return {
        "total": q.count(),
        "refunds": [serialize_refund(r) for r in q.offset(offset).limit(limit).all()],
    }


@router.get("/historial")
def get_sales_history(
    limit: int = LimitQuery(50),
    offset: int = OffsetQuery(),
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
):
    sales = db.query(Sale).filter(
        Sale.company_id == current_user.company_id
    ).order_by(Sale.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": db.query(Sale).filter(Sale.company_id == current_user.company_id).count(),
        "sales": [serialize_sale(s) for s in sales],
    }


@router.get("/resumen")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_sales_dashboard(db, current_user.company_id)


@router.get("/reporte/dia")
def get_daily_sales_report(
    fecha: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report_date = date.fromisoformat(fecha) if fecha else date.today()
    return get_daily_report(db, current_user.company_id, report_date)


@router.get("/alertas/stock")
def get_stock_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    products = db.query(Product).filter(
        Product.company_id == current_user.company_id,
        Product.is_active == True,
        Product.stock_quantity <= Product.low_stock_threshold,
    ).all()

    return {
        "total": len(products),
        "alerts": [
            {
                "id":        p.id,
                "name":      p.name,
                "stock":     p.stock_quantity,
                "threshold": p.low_stock_threshold,
                "vela_code": p.vela_code,
            }
            for p in products
        ]
    }