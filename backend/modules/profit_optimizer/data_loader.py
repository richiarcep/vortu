from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.sales import Product, Sale, SaleItem
from models.profit_optimizer import CommercialLine, OptimizerProduct, OptimizerInputs

try:
    from dateutil.relativedelta import relativedelta
except ImportError:
    from datetime import timedelta
    class relativedelta:
        def __init__(self, months=0, days=0):
            self.months = months
            self.days = days
        def __rsub__(self, other):
            import calendar
            y, m = other.year, other.month - self.months
            while m <= 0:
                m += 12; y -= 1
            while m > 12:
                m -= 12; y += 1
            d = min(other.day, calendar.monthrange(y, m)[1])
            return other.replace(year=y, month=m, day=d)

try:
    from models.marketing import MarketingCampaign
    HAS_MARKETING = True
except ImportError:
    HAS_MARKETING = False


def _month_range(ref_date, months_ago):
    from dateutil.relativedelta import relativedelta as rd
    start = (ref_date - rd(months=months_ago)).replace(day=1)
    end   = (start + rd(months=1)).replace(day=1)
    from datetime import timedelta
    end = end - timedelta(days=1)
    return start, end


def get_monthly_revenue(db, company_id, line_id, n_months=8):
    line = db.query(CommercialLine).filter(
        CommercialLine.id == line_id,
        CommercialLine.company_id == company_id,
    ).first()
    if not line:
        return []

    prods = db.query(OptimizerProduct).filter(
        OptimizerProduct.line_id == line_id,
        OptimizerProduct.company_id == company_id,
        OptimizerProduct.is_active == True,
    ).all()
    vortu_ids = [p.vortu_product_id for p in prods if p.vortu_product_id]

    today = date.today()
    result = []
    for i in range(n_months - 1, -1, -1):
        start, end = _month_range(today, i)
        label = start.strftime("%Y-%m")
        if vortu_ids:
            revenue = db.query(func.sum(SaleItem.line_total)).join(Sale).filter(
                SaleItem.company_id == company_id,
                SaleItem.product_id.in_(vortu_ids),
                Sale.sale_date >= start,
                Sale.sale_date <= end,
            ).scalar() or 0.0
        else:
            revenue = 0.0
        result.append({"month": label, "revenue": round(float(revenue), 2)})
    return result


def get_monthly_marketing_spend(db, company_id, line_name, n_months=8):
    today = date.today()
    result = []
    for i in range(n_months - 1, -1, -1):
        start, end = _month_range(today, i)
        label = start.strftime("%Y-%m")
        spend = 0.0
        if HAS_MARKETING:
            try:
                spend = db.execute(__import__('sqlalchemy').text("""
                    SELECT COALESCE(SUM(budget_total), 0)
                    FROM marketing_campaigns
                    WHERE user_id IN (SELECT id FROM users WHERE company_id=:cid)
                    AND objective LIKE :obj
                    AND start_date >= :start AND start_date <= :end
                """), {
                    "cid": company_id,
                    "obj": "%" + line_name.lower().replace(" ", "_") + "%",
                    "start": str(start),
                    "end": str(end),
                }).scalar() or 0.0
            except Exception:
                spend = 0.0
        result.append({"month": label, "spend": round(float(spend), 2)})
    return result


def get_product_price_quantity_history(db, company_id, vortu_product_id, n_months=8):
    product = db.query(Product).filter(
        Product.id == vortu_product_id,
        Product.company_id == company_id,
    ).first()
    if not product:
        return []

    today = date.today()
    result = []
    for i in range(n_months - 1, -1, -1):
        start, end = _month_range(today, i)
        label = start.strftime("%Y-%m")
        items = db.query(SaleItem).join(Sale).filter(
            SaleItem.company_id == company_id,
            SaleItem.product_id == vortu_product_id,
            Sale.sale_date >= start,
            Sale.sale_date <= end,
        ).all()
        qty   = sum(i.quantity for i in items)
        price = float(product.sale_price) if product.sale_price else 0.0
        result.append({"month": label, "price": price, "qty": qty})
    return result


def get_product_supply_limit(db, company_id, vortu_product_id):
    product = db.query(Product).filter(
        Product.id == vortu_product_id,
        Product.company_id == company_id,
    ).first()
    return int(product.stock_quantity or 0) if product else 0


def load_line_data(db, company_id, line_id, n_months=8):
    line = db.query(CommercialLine).filter(
        CommercialLine.id == line_id,
        CommercialLine.company_id == company_id,
    ).first()
    if not line:
        return {}

    revenue_history  = get_monthly_revenue(db, company_id, line_id, n_months)
    marketing_history= get_monthly_marketing_spend(db, company_id, line.name, n_months)
    rev_values = [r["revenue"] for r in revenue_history]
    mkt_values = [m["spend"]   for m in marketing_history]
    A0 = max((mkt_values[-1]*0.5 + mkt_values[-2]*0.3 + mkt_values[-3]*0.2) if len(mkt_values)>=3 else 1.0, 1.0)

    optimizer_products = db.query(OptimizerProduct).filter(
        OptimizerProduct.line_id == line_id,
        OptimizerProduct.company_id == company_id,
        OptimizerProduct.is_active == True,
    ).order_by(OptimizerProduct.id).all()

    products_data = []
    for p in optimizer_products:
        qty_history = []
        if p.vortu_product_id:
            qty_history  = get_product_price_quantity_history(db, company_id, p.vortu_product_id, n_months)
            supply_limit = get_product_supply_limit(db, company_id, p.vortu_product_id)
        else:
            supply_limit = p.supply_limit
        products_data.append({
            "id": p.id, "name": p.name, "price": p.selling_price,
            "unit_cost": p.unit_cost, "unit_labour": p.unit_labour,
            "unit_material": p.unit_material, "unit_logistics": p.unit_logistics,
            "implied_margin": p.implied_margin, "supply_limit": supply_limit,
            "demand_p0": p.demand_p0, "demand_q0": p.demand_q0, "demand_eps": p.demand_eps,
            "qty_history": qty_history,
            "erp_history": {
                "labour":    [p.labour_cost_m3,    p.labour_cost_m2,    p.labour_cost_m1],
                "material":  [p.material_cost_m3,  p.material_cost_m2,  p.material_cost_m1],
                "logistics": [p.logistics_cost_m3, p.logistics_cost_m2, p.logistics_cost_m1],
            },
        })

    return {
        "line_id": line.id, "line_name": line.name, "company_id": company_id,
        "margin_rate": line.margin_rate, "seasonality": line.seasonality,
        "revenue_history": rev_values, "marketing_history": mkt_values,
        "A0": A0, "months": [r["month"] for r in revenue_history],
        "products": products_data,
    }


def load_optimizer_inputs(db, company_id, period_label):
    inputs = db.query(OptimizerInputs).filter(
        OptimizerInputs.company_id == company_id,
        OptimizerInputs.period_label == period_label,
    ).first()
    if inputs:
        return {
            "fixed_costs": inputs.fixed_costs, "total_budget": inputs.total_budget,
            "vacation_factor": inputs.vacation_factor, "vacation_month": inputs.vacation_month,
        }
    return {"fixed_costs": 5000.0, "total_budget": 45000.0, "vacation_factor": 1.0, "vacation_month": False}
