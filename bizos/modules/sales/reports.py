from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import Counter
from models.sales import Product, Sale, SaleItem


def get_product_stats(db: Session, product_id: int, company_id: int) -> dict:
    """
    Returns full sales stats for a single product.
    Used in the product catalog view.
    """
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == company_id
    ).first()

    if not product:
        return {}

    today = date.today()
    month_start = date(today.year, today.month, 1)

    # All time sales
    all_items = db.query(SaleItem).filter(
        SaleItem.product_id == product_id,
        SaleItem.company_id == company_id
    ).all()

    # This month
    month_items = db.query(SaleItem).join(Sale).filter(
        SaleItem.product_id == product_id,
        SaleItem.company_id == company_id,
        Sale.sale_date >= month_start,
    ).all()

    # Last sale
    last_sale_item = db.query(SaleItem).join(Sale).filter(
        SaleItem.product_id == product_id,
        SaleItem.company_id == company_id,
    ).order_by(Sale.sale_date.desc(), Sale.created_at.desc()).first()

    total_units       = sum(i.quantity for i in all_items)
    total_revenue     = sum(i.line_total for i in all_items)
    total_cost        = (product.cost_price or 0) * total_units
    total_profit      = total_revenue - total_cost
    margin_pct        = round((total_profit / total_revenue * 100), 1) if total_revenue > 0 else 0

    month_units       = sum(i.quantity for i in month_items)
    month_revenue     = sum(i.line_total for i in month_items)

    last_sale_date    = None
    if last_sale_item and last_sale_item.sale:
        last_sale_date = str(last_sale_item.sale.sale_date)

    # Stock status
    stock = product.stock_quantity or 0
    threshold = product.low_stock_threshold or 5
    if stock <= 0:
        stock_status = "sin_stock"
    elif stock <= threshold:
        stock_status = "bajo"
    else:
        stock_status = "ok"

    return {
        "product_id":      product.id,
        "name":            product.name,
        "category":        product.category,
        "nexum_code":      product.nexum_code,
        "barcode":         product.barcode,
        "sale_price":      product.sale_price,
        "cost_price":      product.cost_price,
        "iva_rate":        product.iva_rate,
        "margin_pct":      margin_pct,
        "stock_quantity":  stock,
        "stock_status":    stock_status,
        "low_stock_threshold": threshold,
        "total_units_sold":    total_units,
        "total_revenue":       round(total_revenue, 2),
        "total_profit":        round(total_profit, 2),
        "month_units_sold":    month_units,
        "month_revenue":       round(month_revenue, 2),
        "last_sale_date":      last_sale_date,
    }


def get_sales_dashboard(db: Session, company_id: int) -> dict:
    """
    Main dashboard stats for the ventas module.
    Returns today, week, month aggregates + best sellers.
    """
    today      = date.today()
    week_start = today - timedelta(days=7)
    month_start = date(today.year, today.month, 1)

    def get_period_stats(start_date, end_date=None):
        query = db.query(Sale).filter(
            Sale.company_id == company_id,
            Sale.sale_date >= start_date,
        )
        if end_date:
            query = query.filter(Sale.sale_date <= end_date)
        sales = query.all()
        return {
            "total_sales":   len(sales),
            "total_revenue": round(sum(s.total for s in sales), 2),
            "total_iva":     round(sum(s.iva_amount for s in sales), 2),
        }

    today_stats = get_period_stats(today, today)
    week_stats  = get_period_stats(week_start)
    month_stats = get_period_stats(month_start)

    # Best sellers this month
    month_items = db.query(SaleItem).join(Sale).filter(
        SaleItem.company_id == company_id,
        Sale.sale_date >= month_start,
    ).all()

    product_sales = {}
    for item in month_items:
        pid = item.product_id
        if pid not in product_sales:
            product_sales[pid] = {"units": 0, "revenue": 0.0}
        product_sales[pid]["units"]   += item.quantity
        product_sales[pid]["revenue"] += item.line_total

    best_sellers = []
    for pid, stats in sorted(product_sales.items(), key=lambda x: x[1]["units"], reverse=True)[:5]:
        product = db.query(Product).filter(Product.id == pid).first()
        if product:
            best_sellers.append({
                "product_id":   pid,
                "name":         product.name,
                "units_sold":   stats["units"],
                "revenue":      round(stats["revenue"], 2),
                "nexum_code":   product.nexum_code,
            })

    # Low stock alerts
    low_stock = db.query(Product).filter(
        Product.company_id == company_id,
        Product.is_active == True,
        Product.stock_quantity <= Product.low_stock_threshold,
    ).all()

    low_stock_list = [
        {
            "id":       p.id,
            "name":     p.name,
            "stock":    p.stock_quantity,
            "threshold": p.low_stock_threshold,
        }
        for p in low_stock
    ]

    # Revenue by day for the last 14 days
    daily_revenue = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        day_sales = db.query(Sale).filter(
            Sale.company_id == company_id,
            Sale.sale_date == day,
        ).all()
        daily_revenue.append({
            "date":    str(day),
            "label":  day.strftime("%d %b"),
            "revenue": round(sum(s.total for s in day_sales), 2),
            "sales":   len(day_sales),
        })

    # Payment method breakdown
    all_sales = db.query(Sale).filter(
        Sale.company_id == company_id,
        Sale.sale_date >= month_start,
    ).all()
    payment_breakdown = dict(Counter(s.payment_method for s in all_sales))

    return {
        "today":              today_stats,
        "week":               week_stats,
        "month":              month_stats,
        "best_sellers":       best_sellers,
        "low_stock_alerts":   low_stock_list,
        "daily_revenue":      daily_revenue,
        "payment_breakdown":  payment_breakdown,
        "total_products":     db.query(Product).filter(Product.company_id == company_id, Product.is_active == True).count(),
    }


def get_daily_report(db: Session, company_id: int, report_date: date = None) -> dict:
    """
    Generates a daily sales report for a specific date.
    This feeds directly into the Cierre de Caja.
    """
    if not report_date:
        report_date = date.today()

    sales = db.query(Sale).filter(
        Sale.company_id == company_id,
        Sale.sale_date == report_date,
    ).all()

    items_all = []
    for sale in sales:
        items_all.extend(sale.items)

    total_revenue = sum(s.total for s in sales)
    total_iva     = sum(s.iva_amount for s in sales)
    total_subtotal = sum(s.subtotal for s in sales)

    # Breakdown by payment method
    by_payment = {}
    for sale in sales:
        pm = sale.payment_method
        if pm not in by_payment:
            by_payment[pm] = {"count": 0, "total": 0.0}
        by_payment[pm]["count"] += 1
        by_payment[pm]["total"] = round(by_payment[pm]["total"] + sale.total, 2)

    # Breakdown by IVA rate
    by_iva = {}
    for item in items_all:
        rate = str(int(item.iva_rate)) + "%"
        if rate not in by_iva:
            by_iva[rate] = {"base": 0.0, "iva": 0.0, "total": 0.0}
        base = item.line_total / (1 + item.iva_rate / 100)
        iva  = item.line_total - base
        by_iva[rate]["base"]  = round(by_iva[rate]["base"] + base, 2)
        by_iva[rate]["iva"]   = round(by_iva[rate]["iva"] + iva, 2)
        by_iva[rate]["total"] = round(by_iva[rate]["total"] + item.line_total, 2)

    # Top products today
    product_totals = {}
    for item in items_all:
        pid = item.product_id
        if pid not in product_totals:
            product_totals[pid] = {"units": 0, "revenue": 0.0, "name": ""}
        product_totals[pid]["units"]   += item.quantity
        product_totals[pid]["revenue"] += item.line_total
        if item.product:
            product_totals[pid]["name"] = item.product.name

    top_products = sorted(
        [{"product_id": k, **v, "revenue": round(v["revenue"], 2)}
         for k, v in product_totals.items()],
        key=lambda x: x["revenue"], reverse=True
    )[:10]

    return {
        "date":            str(report_date),
        "total_sales":     len(sales),
        "total_revenue":   round(total_revenue, 2),
        "total_subtotal":  round(total_subtotal, 2),
        "total_iva":       round(total_iva, 2),
        "by_payment":      by_payment,
        "by_iva":          by_iva,
        "top_products":    top_products,
        "sales": [
            {
                "id":             s.id,
                "time":           s.sale_time,
                "payment_method": s.payment_method,
                "total":          s.total,
                "items_count":    len(s.items),
            }
            for s in sorted(sales, key=lambda x: x.created_at, reverse=True)
        ]
    }
