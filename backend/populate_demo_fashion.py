"""Seed the staging demo companies (9=ES, 10=MX, 11=SV) as an established fashion
business with ~2.5 years of LEDGER-FIRST accounting — the same business in each
country, each with ITS OWN chart of accounts (asientos contables propios).

Modeled on "Moda Barcelonesa SL" (the reference): monthly compras+pagos a
proveedores, alquiler, suministros, publicidad, otros servicios, nóminas completas
(devengo Dr sueldos+SS empresa / Cr sueldos a pagar + SS acreedora, y su pago), y
ventas (retail al contado + alguna venta a crédito con su cobro). Plus consistent
operational records (catalog, clients, sales rows).

Run INSIDE the staging app container (so it writes to POSTGRES, not local sqlite):
    docker compose -f docker-compose.staging.yml cp populate_demo_fashion.py app:/tmp/seed.py
    docker compose -f docker-compose.staging.yml exec -T app python /tmp/seed.py

Uses worker_session (BYPASSRLS) to write across the 3 tenants. record_transaction
balances + resolves account codes→ids + commits per asiento.
"""
import datetime
import random

from core.database import worker_session
from modules.accounting.journal import record_transaction
from models.sales import Product, Sale, SaleItem
from models.customer import Contact
from sqlalchemy import text

# Register ALL ORM tables in Base.metadata so FK targets (companies, users, accounts…)
# resolve before any flush triggers SQLAlchemy's table sort.
import models.user, models.customer, models.sales, models.costs, models.billing  # noqa: F401,E401
import models.document, models.project, models.marketing, models.analytics  # noqa: F401,E401
import models.prompt, models.workgroup, models.profit_optimizer  # noqa: F401,E401

random.seed(2026)

# (company_id, country, monthly_revenue_base in local currency)
COMPANIES = [(9, "es", 11000.0), (10, "mx", 210000.0), (11, "sv", 9000.0)]

# Verified account codes per country + VAT rate + social charges.
# social = list of (expense_account, liability_account, rate_over_gross).
ACCT = {
    "es": dict(iva=0.21, bancos="572", caja="570", clientes="430", proveedores="400",
               capital="100", ventas="700", iva_rep="477", iva_sop="472", compras="600",
               alquiler="621", suministros="628", publicidad="627", servicios="629",
               prof="623", sueldos="640", sueldos_pagar="465",
               social=[("642", "476", 0.30)]),
    "mx": dict(iva=0.16, bancos="102.01", caja="101.01", clientes="105.01", proveedores="201.01",
               capital="301.01", ventas="401.01", iva_rep="213.01", iva_sop="113.01", compras="502.01",
               alquiler="603.01", suministros="608.01", publicidad="604.01", servicios="602.02",
               prof="602.01", sueldos="601.01", sueldos_pagar="204.01",
               social=[("601.05", "218.01", 0.25)]),
    "sv": dict(iva=0.13, bancos="110103", caja="110101", clientes="110201", proveedores="210101",
               capital="310101", ventas="410101", iva_rep="210301", iva_sop="110401", compras="510201",
               alquiler="530110", suministros="530108", publicidad="520106", servicios="530106",
               prof="530106", sueldos="530101", sueldos_pagar="210501",
               social=[("530102", "210502", 0.075), ("530103", "210503", 0.0775)]),
}

CATALOG = {
    "es": [
        ("Camiseta básica algodón", "Camisetas", 12.95, 4.80), ("Camiseta estampada", "Camisetas", 16.95, 6.20),
        ("Vestido midi flores", "Vestidos", 39.95, 15.50), ("Vestido lino", "Vestidos", 49.95, 19.00),
        ("Pantalón chino", "Pantalones", 34.95, 13.50), ("Vaqueros slim", "Pantalones", 45.95, 18.00),
        ("Falda plisada", "Faldas", 27.95, 10.50), ("Camisa lino", "Camisas", 32.95, 12.00),
        ("Blazer entallado", "Chaquetas", 69.95, 27.00), ("Abrigo lana", "Abrigos", 119.95, 48.00),
        ("Jersey punto", "Punto", 29.95, 11.00), ("Sudadera capucha", "Punto", 35.95, 13.50),
        ("Zapatillas piel", "Calzado", 75.00, 30.00), ("Botines ante", "Calzado", 89.95, 36.00),
        ("Bolso bandolera", "Accesorios", 49.95, 18.00), ("Cinturón cuero", "Accesorios", 19.95, 6.50),
        ("Bufanda lana", "Accesorios", 15.95, 5.00), ("Gafas de sol", "Accesorios", 24.95, 8.00),
        ("Pañuelo seda", "Accesorios", 22.95, 7.50), ("Gorro punto", "Accesorios", 14.95, 4.50),
    ],
    "mx": [
        ("Playera básica algodón", "Playeras", 249.0, 95.0), ("Playera estampada", "Playeras", 319.0, 120.0),
        ("Vestido midi", "Vestidos", 799.0, 310.0), ("Vestido lino", "Vestidos", 999.0, 380.0),
        ("Pantalón chino", "Pantalones", 699.0, 270.0), ("Jeans slim", "Pantalones", 919.0, 360.0),
        ("Falda plisada", "Faldas", 559.0, 210.0), ("Camisa lino", "Camisas", 659.0, 240.0),
        ("Blazer", "Chamarras", 1399.0, 540.0), ("Abrigo lana", "Abrigos", 2399.0, 960.0),
        ("Suéter punto", "Punto", 599.0, 220.0), ("Sudadera", "Punto", 719.0, 270.0),
        ("Tenis piel", "Calzado", 1499.0, 600.0), ("Botines", "Calzado", 1799.0, 720.0),
        ("Bolsa cruzada", "Accesorios", 999.0, 360.0), ("Cinturón piel", "Accesorios", 399.0, 130.0),
        ("Bufanda", "Accesorios", 319.0, 100.0), ("Lentes de sol", "Accesorios", 499.0, 160.0),
    ],
    "sv": [
        ("Camiseta básica", "Camisetas", 14.95, 5.50), ("Camiseta estampada", "Camisetas", 18.95, 7.00),
        ("Vestido midi", "Vestidos", 44.95, 17.00), ("Vestido lino", "Vestidos", 54.95, 21.00),
        ("Pantalón chino", "Pantalones", 38.95, 15.00), ("Jeans slim", "Pantalones", 49.95, 20.00),
        ("Falda plisada", "Faldas", 29.95, 11.50), ("Camisa lino", "Camisas", 35.95, 13.50),
        ("Blazer", "Chaquetas", 74.95, 29.00), ("Abrigo ligero", "Abrigos", 99.95, 40.00),
        ("Suéter punto", "Punto", 32.95, 12.50), ("Sudadera", "Punto", 39.95, 15.00),
        ("Zapatillas", "Calzado", 79.95, 32.00), ("Botines", "Calzado", 94.95, 38.00),
        ("Bolso", "Accesorios", 54.95, 20.00), ("Cinturón", "Accesorios", 21.95, 7.00),
    ],
}

CLIENTES = [
    "Boutique La Pasarela", "Tienda Eva Moda", "Multimarca Centro", "El Rincón Chic",
    "Distribuciones Textil Norte", "Moda & Co.", "Atelier Carmen", "Showroom Diagonal",
    "Concept Store 21", "Mayorista TextilSur", "Cliente mostrador", "Venta online",
    "Galería de Moda", "Trendy Shop", "La Boutique del Barrio", "Estilo Urbano",
    "Comercial Aurora", "Bazar Fashion", "Punto de Moda", "Casa Textil",
]

# Seasonality: rebajas ene/jul, vacaciones feb/ago, Black Friday nov, Navidad dic.
SEASON = {1: 1.40, 2: 0.70, 3: 0.85, 4: 1.00, 5: 1.05, 6: 1.15,
          7: 1.50, 8: 0.60, 9: 1.00, 10: 1.05, 11: 1.35, 12: 1.70}


def months(start, end):
    y, m = start
    while (y, m) <= end:
        yield y, m
        m = 1 if m == 12 else m + 1
        y = y + 1 if m == 1 else y


def split_iva(total, iva):
    base = round(total / (1 + iva), 2)
    return base, round(total - base, 2)


def seed_company(db, cid, cc, base_rev):
    A = ACCT[cc]
    iva = A["iva"]
    errs, stats = {}, dict(asientos=0, sales=0, ingresos=0.0)

    def post(d, desc, entries, ref=None):
        try:
            record_transaction(db, cid, d, desc, entries, module_source="seed_ledger", reference=ref)
            stats["asientos"] += 1
            return True
        except Exception as e:
            errs[str(e)[:70]] = errs.get(str(e)[:70], 0) + 1
            return False

    def gasto(d, expense_acc, base, desc, ref):
        """Dr gasto(base) + Dr IVA soportado(cuota) / Cr bancos(total)."""
        cuota = round(base * iva, 2)
        total = round(base + cuota, 2)
        post(d, desc, [{"account_code": expense_acc, "debit": base, "credit": 0},
                       {"account_code": A["iva_sop"], "debit": cuota, "credit": 0},
                       {"account_code": A["bancos"], "debit": 0, "credit": total}], ref)

    # ── wipe prior demo data (KEEP the chart of accounts) ──
    for t in ("sale_refund_items", "sale_refunds", "sale_items", "sales", "contacts",
              "journal_entries", "transactions", "cost_entries", "products"):
        db.execute(text(f"DELETE FROM {t} WHERE company_id=:c"), {"c": cid})
    db.commit()

    # ── catalog + clients ──
    prods = []
    for name, cat, sp, cp in CATALOG[cc]:
        p = Product(company_id=cid, name=name, category=cat, sale_price=sp, cost_price=cp,
                    iva_rate=round(iva * 100, 2), stock_quantity=random.randint(8, 80), is_active=True)
        db.add(p)
        prods.append(p)
    db.commit()
    for p in prods:
        db.refresh(p)
    for i, nm in enumerate(CLIENTES):
        db.add(Contact(company_id=cid, name=nm, email=f"cliente{i+1}@{cc}-demo.com",
                       phone="+10000000000", platform="manual", is_vip=(i % 6 == 0)))
    db.commit()

    # ── opening capital (Dr bancos / Cr capital) ──
    cap = round(base_rev * 4, 2)
    post(datetime.date(2024, 1, 1), "Aportación de capital social (apertura)",
         [{"account_code": A["bancos"], "debit": cap, "credit": 0},
          {"account_code": A["capital"], "debit": 0, "credit": cap}], ref="APERTURA")

    growth = 1.0
    prev_compra = 0.0          # proveedores a pagar el mes siguiente
    pending_ar = []            # [(due_year, due_month, importe)] cobros de ventas a crédito

    for y, m in months((2024, 1), (2026, 6)):
        growth *= 1.012        # ~1.2%/mes
        monthly = base_rev * SEASON[m] * growth

        # ── pago a proveedores del mes anterior ──
        if prev_compra > 0:
            post(datetime.date(y, m, 4), "Pago a proveedores",
                 [{"account_code": A["proveedores"], "debit": prev_compra, "credit": 0},
                  {"account_code": A["bancos"], "debit": 0, "credit": prev_compra}],
                 ref=f"PAGO-{y}{m:02d}")

        # ── cobro de ventas a crédito que vencen este mes ──
        for (yy, mm, imp) in [x for x in pending_ar if x[0] == y and x[1] == m]:
            post(datetime.date(y, m, 12), "Cobro de cliente",
                 [{"account_code": A["bancos"], "debit": imp, "credit": 0},
                  {"account_code": A["clientes"], "debit": 0, "credit": imp}],
                 ref=f"COBRO-{y}{m:02d}")
        pending_ar = [x for x in pending_ar if not (x[0] == y and x[1] == m)]

        # ── ventas: días de venta = filas operativas + asiento de ingreso ──
        sdays = sorted(random.sample(range(2, 28), random.randint(8, 12)))
        for di, day in enumerate(sdays):
            d = datetime.date(y, m, day)
            target = monthly / len(sdays) * random.uniform(0.85, 1.15)
            day_total, tickets = 0.0, 0
            while day_total < target and tickets < 14:     # tickets hasta ~ el objetivo del día
                items, sub, ivat = [], 0.0, 0.0
                for _ in range(random.randint(1, 6)):
                    p = random.choice(prods)
                    q = random.randint(1, 3)
                    line = round(p.sale_price * q, 2)
                    items.append((p, q, line))
                    sub += round(line / (1 + iva), 2)
                    ivat += round(line - line / (1 + iva), 2)
                tot = round(sub + ivat, 2)
                sale = Sale(company_id=cid, sale_date=d, sale_time="12:00",
                            payment_method=random.choice(["efectivo", "tarjeta", "tarjeta"]),
                            subtotal=round(sub, 2), iva_amount=round(ivat, 2), total=tot,
                            status="completed", created_at=datetime.datetime(y, m, day, 12, 0))
                db.add(sale)
                db.flush()
                for p, q, line in items:
                    db.add(SaleItem(sale_id=sale.id, product_id=p.id, company_id=cid, quantity=q,
                                    unit_price=p.sale_price, iva_rate=round(iva * 100, 2), line_total=line))
                day_total += tot
                stats["sales"] += 1
                tickets += 1
            day_total = round(day_total, 2)
            base, cuota = split_iva(day_total, iva)
            wholesale = (di == 0 and random.random() < 0.5)   # ~1 venta a crédito/mes
            debit_acc = A["clientes"] if wholesale else A["bancos"]
            if post(d, ("Venta a crédito (mayorista)" if wholesale else f"Ventas tienda {d.isoformat()}"),
                    [{"account_code": debit_acc, "debit": day_total, "credit": 0},
                     {"account_code": A["ventas"], "debit": 0, "credit": base},
                     {"account_code": A["iva_rep"], "debit": 0, "credit": cuota}],
                    ref=f"VTA-{y}{m:02d}-{day:02d}"):
                stats["ingresos"] += base
                if wholesale:
                    nm_, ny_ = (m + 1, y) if m < 12 else (1, y + 1)
                    pending_ar.append((ny_, nm_, day_total))
        db.commit()

        # ── compras de mercancía (textil) → proveedores ──
        compra_base = round(monthly * 0.42, 2)
        compra_iva = round(compra_base * iva, 2)
        compra_total = round(compra_base + compra_iva, 2)
        post(datetime.date(y, m, 5), "Compra de mercancía (proveedor textil)",
             [{"account_code": A["compras"], "debit": compra_base, "credit": 0},
              {"account_code": A["iva_sop"], "debit": compra_iva, "credit": 0},
              {"account_code": A["proveedores"], "debit": 0, "credit": compra_total}],
             ref=f"COMPRA-{y}{m:02d}")
        prev_compra = compra_total

        # ── gastos operativos mensuales (con IVA soportado, pagados por banco) ──
        gasto(datetime.date(y, m, 6), A["alquiler"], round(base_rev * 0.11, 2), "Alquiler del local", f"ALQ-{y}{m:02d}")
        gasto(datetime.date(y, m, 7), A["suministros"], round(base_rev * 0.02, 2), "Suministros (luz/agua/internet)", f"SUM-{y}{m:02d}")
        gasto(datetime.date(y, m, 10), A["publicidad"], round(monthly * 0.045, 2), "Campaña de publicidad y RR.SS.", f"PUB-{y}{m:02d}")
        gasto(datetime.date(y, m, 20), A["publicidad"], round(monthly * 0.015, 2), "Material punto de venta y catálogo", f"PUB2-{y}{m:02d}")
        gasto(datetime.date(y, m, 15), A["prof"], round(base_rev * 0.015, 2), "Servicios profesionales (gestoría)", f"PRF-{y}{m:02d}")
        gasto(datetime.date(y, m, 18), A["servicios"], round(base_rev * 0.012, 2), "Otros servicios (mantenimiento/limpieza)", f"SRV-{y}{m:02d}")

        # ── nóminas: devengo (Dr sueldos + Dr SS empresa / Cr sueldos a pagar + Cr SS acreedora) + pago ──
        gross = round(base_rev * 0.15, 2)
        social = [(exp, lia, round(gross * rate, 2)) for (exp, lia, rate) in A["social"]]
        social_tot = round(sum(s[2] for s in social), 2)
        deveng = [{"account_code": A["sueldos"], "debit": gross, "credit": 0}]
        deveng += [{"account_code": exp, "debit": amt, "credit": 0} for (exp, lia, amt) in social]
        deveng += [{"account_code": A["sueldos_pagar"], "debit": 0, "credit": gross}]
        deveng += [{"account_code": lia, "debit": 0, "credit": amt} for (exp, lia, amt) in social]
        post(datetime.date(y, m, 28), "Nóminas del personal — devengo", deveng, ref=f"NOM-{y}{m:02d}")
        pago = [{"account_code": A["sueldos_pagar"], "debit": gross, "credit": 0}]
        pago += [{"account_code": lia, "debit": amt, "credit": 0} for (exp, lia, amt) in social]
        pago += [{"account_code": A["bancos"], "debit": 0, "credit": round(gross + social_tot, 2)}]
        post(datetime.date(y, m, 28), "Pago de nóminas y Seguridad Social", pago, ref=f"NOMPG-{y}{m:02d}")
        db.commit()

    db.commit()
    return stats, errs


def main():
    db = worker_session()
    try:
        for cid, cc, base_rev in COMPANIES:
            stats, errs = seed_company(db, cid, cc, base_rev)
            line = (f"company {cid} ({cc.upper()}): {stats['asientos']} asientos · "
                    f"{stats['sales']} ventas · ingresos≈{stats['ingresos']:,.0f}")
            if errs:
                line += f"  ⚠ {errs}"
            print(line)
    finally:
        db.close()
    print("DONE")


if __name__ == "__main__":
    main()
