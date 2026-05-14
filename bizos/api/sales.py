from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from core.database import get_db
from services.graph.sync import sync_sale, sync_product
from core.security import get_current_user
from models.user import User
from models.sales import Product, Sale, SaleItem
from modules.sales.qr_generator import (
    generate_nexum_qr_svg, generate_nexum_code, generate_label_svg
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
    items:          list[SaleItemIn]
    payment_method: Optional[str] = "efectivo"
    notes:          Optional[str] = None


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
        "nexum_code":          p.nexum_code,
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
        "id":             s.id,
        "sale_date":      str(s.sale_date),
        "sale_time":      s.sale_time,
        "payment_method": s.payment_method,
        "subtotal":       s.subtotal,
        "iva_amount":     s.iva_amount,
        "total":          s.total,
        "notes":          s.notes,
        "items": [
            {
                "product_id":   i.product_id,
                "product_name": i.product.name if i.product else "—",
                "quantity":     i.quantity,
                "unit_price":   i.unit_price,
                "iva_rate":     i.iva_rate,
                "line_total":   i.line_total,
            }
            for i in s.items
        ],
        "created_at": str(s.created_at),
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

    # Generate Nexum code after getting the ID
    product.nexum_code = generate_nexum_code(current_user.company_id, product.id)
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
    Looks up a product by barcode OR nexum_code.
    Called instantly when the scanner reads a code.
    """
    product = db.query(Product).filter(
        Product.company_id == current_user.company_id,
        Product.is_active == True,
    ).filter(
        (Product.barcode == code) | (Product.nexum_code == code)
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

    svg = generate_nexum_qr_svg(
        nexum_code=product.nexum_code or f"NX-{product_id}",
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
    filename  = f"etiqueta_{product.nexum_code or product_id}.pdf"
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

    now = datetime.now()
    sale = Sale(
        company_id=current_user.company_id,
        sale_date=now.date(),
        sale_time=now.strftime("%H:%M"),
        payment_method=data.payment_method or "efectivo",
        notes=data.notes,
        subtotal=0.0,
        iva_amount=0.0,
        total=0.0,
    )
    db.add(sale)
    db.flush()

    subtotal = 0.0
    iva_total = 0.0

    for item_in in data.items:
        product = db.query(Product).filter(
            Product.id == item_in.product_id,
            Product.company_id == current_user.company_id,
            Product.is_active == True,
        ).first()

        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item_in.product_id} no encontrado")

        qty        = item_in.quantity
        unit_price = product.sale_price
        iva_rate   = product.iva_rate
        line_base  = unit_price * qty
        line_iva   = line_base * (iva_rate / 100)
        line_total = line_base + line_iva

        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            company_id=current_user.company_id,
            quantity=qty,
            unit_price=unit_price,
            iva_rate=iva_rate,
            line_total=round(line_total, 2),
        )
        db.add(sale_item)

        subtotal  += line_base
        iva_total += line_iva

        # Deduct stock
        product.stock_quantity = max(0, (product.stock_quantity or 0) - qty)

    sale.subtotal   = round(subtotal, 2)
    sale.iva_amount = round(iva_total, 2)
    sale.total      = round(subtotal + iva_total, 2)

    db.commit()
    db.refresh(sale)
    return serialize_sale(sale)


@router.get("/historial")
def get_sales_history(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
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
                "nexum_code": p.nexum_code,
            }
            for p in products
        ]
    }