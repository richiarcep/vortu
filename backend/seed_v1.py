"""
seed_v1.py — Moda Barcelonesa SL (España)

Datos realistas para una PYME española de moda:
- 24 meses de operaciones
- ~70.000 asientos contables con partida doble
- Plan General Contable RD 1514/2007 cargado
- IVA 21% / IRPF / SS según normativa
- Estacionalidad (rebajas enero/julio, campañas Nov-Dic)

Run: python seed_v1.py
"""
import os, sys, random, math
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.getcwd())
from country.es import CHART_OF_ACCOUNTS, TAX_RULES

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexum.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)
db = Session()
random.seed(42)

NOW = datetime.utcnow()
TODAY = date.today()
START = TODAY - timedelta(days=730)
IVA = Decimal("0.21")

print("\n" + "="*60)
print("  VORTU SEED v1 — Moda Barcelonesa SL (España, 24 meses)")
print("="*60 + "\n")

print("[1/6] Limpiando empresa anterior...")
existing = db.execute(text(
    "SELECT id FROM companies WHERE name='Moda Barcelonesa SL'"
)).fetchone()
if existing:
    CID = existing[0]
    for tbl in [
        "journal_entries", "accounts", "registro_diario",
        "sale_items", "sales", "products",
        "cost_entries", "cost_departments", "cost_categories",
        "messages", "contacts", "employee_feedback", "employees",
        "tasks", "project_expenses", "projects", "documents",
        "business_snapshots", "business_ai_memory",
        "marketing_campaigns", "marketing_campaign_metrics",
        "marketing_company_analyses", "marketing_platform_credentials",
        "profit_optimizer_runs", "profit_optimizer_inputs",
        "profit_optimizer_products", "profit_optimizer_lines",
    ]:
        try:
            db.execute(text(f"DELETE FROM {tbl} WHERE company_id=:cid"), {"cid": CID})
        except Exception:
            pass
    try:
        db.execute(text("DELETE FROM users WHERE company_id=:cid"), {"cid": CID})
    except Exception:
        pass
    db.execute(text("DELETE FROM companies WHERE id=:cid"), {"cid": CID})
    db.commit()
    print(f"  ✓ Empresa anterior eliminada")

print("\n[2/6] Creando empresa y usuario...")
db.execute(text(
    "INSERT INTO companies (name, email, country, created_at) "
    "VALUES ('Moda Barcelonesa SL', 'info@modabarcelonesa.es', 'es', :now)"
), {"now": NOW})
db.commit()
CID = db.execute(text(
    "SELECT id FROM companies WHERE name='Moda Barcelonesa SL'"
)).fetchone()[0]

try:
    from core.security import hash_password
    hashed = hash_password("demo1234")
except Exception:
    import bcrypt
    hashed = bcrypt.hashpw(b"demo1234", bcrypt.gensalt()).decode()

db.execute(text("""
    INSERT INTO users (email, hashed_password, full_name, is_active, is_admin, role, company_id, created_at)
    VALUES ('demo@modabarcelonesa.es', :pwd, 'Eduardo Garcia', 1, 1, 'admin', :cid, :now)
"""), {"pwd": hashed, "cid": CID, "now": NOW})
db.commit()
print(f"  ✓ Empresa creada (id={CID}) · usuario demo@modabarcelonesa.es / demo1234")

print("\n[3/6] Cargando Plan General Contable español (RD 1514/2007)...")
for cuenta in CHART_OF_ACCOUNTS:
    db.execute(text("""
        INSERT INTO accounts (code, name, account_type, normal_balance, is_active, company_id, created_at)
        VALUES (:code, :name, :type, :normal, 1, :cid, :now)
    """), {
        "code": cuenta["code"],
        "name": cuenta["name"],
        "type": cuenta["type"],
        "normal": cuenta["normal"],
        "cid": CID,
        "now": NOW,
    })
db.commit()
print(f"  ✓ {len(CHART_OF_ACCOUNTS)} cuentas cargadas")

acc_map = {}
for r in db.execute(text(
    "SELECT id, code FROM accounts WHERE company_id=:cid"
), {"cid": CID}):
    acc_map[r[1]] = r[0]

print("\n[4/6] Generando productos y empleados base...")
PRODUCTOS = [
    ("Camiseta básica blanca",   8.50,  22.90),
    ("Camiseta básica negra",    8.50,  22.90),
    ("Vaqueros slim azul",      24.00,  69.90),
    ("Vaqueros mom fit",        24.00,  69.90),
    ("Vestido midi floral",     32.00,  89.00),
    ("Blazer gris premium",     58.00, 159.00),
    ("Abrigo lana negro",       95.00, 249.00),
    ("Camisa lino blanca",      18.00,  49.90),
    ("Falda plisada",           22.00,  64.00),
    ("Jersey punto crudo",      28.00,  79.00),
    ("Bolso piel marrón",       45.00, 129.00),
    ("Zapatillas blancas",      38.00, 109.00),
    ("Botines piel negros",     52.00, 159.00),
    ("Cinturón cuero",          12.00,  34.90),
    ("Pañuelo seda estampado",   9.00,  29.00),
]

for nombre, coste, precio in PRODUCTOS:
    try:
        db.execute(text("""
            INSERT INTO products (name, sku, price, cost, stock, is_active, company_id, created_at)
            VALUES (:name, :sku, :price, :cost, :stock, 1, :cid, :now)
        """), {
            "name": nombre,
            "sku": f"MB-{random.randint(1000,9999)}",
            "price": precio,
            "cost": coste,
            "stock": random.randint(20, 200),
            "cid": CID,
            "now": NOW,
        })
    except Exception:
        pass

EMPLEADOS = [
    ("María García López",  "Encargada tienda",   1850),
    ("Carlos Rodríguez",    "Vendedor",            1450),
    ("Sofía Martínez",      "Vendedora",           1450),
    ("Ana Fernández",       "Diseñadora",          2100),
    ("Juan López",          "Mozo almacén",        1380),
]
for nombre, puesto, salario in EMPLEADOS:
    try:
        db.execute(text("""
            INSERT INTO employees (name, position, salary, hire_date, is_active, company_id, created_at)
            VALUES (:n, :p, :s, :h, 1, :cid, :now)
        """), {
            "n": nombre, "p": puesto, "s": salario,
            "h": START - timedelta(days=random.randint(30, 800)),
            "cid": CID, "now": NOW,
        })
    except Exception:
        pass
db.commit()
print(f"  ✓ {len(PRODUCTOS)} productos · {len(EMPLEADOS)} empleados")

print("\n[5/6] Generando asientos contables (24 meses)...")

JE_BATCH = []
TX_COUNTER = [0]

def add_je(tx_id, account_code, debit, credit, fecha, desc, ref=""):
    if account_code not in acc_map:
        return
    JE_BATCH.append({
        "tx": tx_id,
        "acc": acc_map[account_code],
        "date": fecha,
        "desc": desc,
        "debit": float(debit),
        "credit": float(credit),
        "ref": ref,
        "src": "seed_v1",
        "cid": CID,
        "now": NOW,
    })

def flush_je():
    if not JE_BATCH:
        return
    db.execute(text("""
        INSERT INTO journal_entries
        (transaction_id, account_id, date, description, debit, credit, reference, module_source, company_id, created_at)
        VALUES (:tx, :acc, :date, :desc, :debit, :credit, :ref, :src, :cid, :now)
    """), JE_BATCH)
    db.commit()
    JE_BATCH.clear()

def next_tx():
    TX_COUNTER[0] += 1
    return f"TX{TX_COUNTER[0]:08d}"

def season(d):
    m = d.month
    if m in (11, 12): return 1.6
    if m in (1, 7):   return 1.4
    if m in (6, 9):   return 1.1
    if m in (8,):     return 0.6
    return 1.0

print("  Generando ventas (asientos partida doble)...")
total_ventas = 0
d = START
while d <= TODAY:
    if d.weekday() == 6:
        n = random.randint(8, 15)
    else:
        n = random.randint(20, 45)
    n = int(n * season(d))
    for _ in range(n):
        nombre, coste, precio = random.choice(PRODUCTOS)
        cantidad = 1 if random.random() < 0.8 else random.randint(2, 3)
        base = Decimal(str(precio)) * cantidad
        iva_importe = (base * IVA).quantize(Decimal("0.01"))
        total = base + iva_importe
        coste_total = Decimal(str(coste)) * cantidad

        tx = next_tx()
        add_je(tx, "430", total, 0, d, f"Venta: {nombre}", "FAC-V")
        add_je(tx, "700", 0, base, d, f"Venta: {nombre}", "FAC-V")
        add_je(tx, "477", 0, iva_importe, d, "IVA repercutido 21%", "FAC-V")

        if random.random() < 0.7:
            tx2 = next_tx()
            add_je(tx2, "570" if random.random() < 0.4 else "572", total, 0, d, "Cobro venta", "COBRO")
            add_je(tx2, "430", 0, total, d, "Cobro venta", "COBRO")

        tx3 = next_tx()
        add_je(tx3, "600", coste_total, 0, d, f"Coste mercancía: {nombre}", "COSTE")
        add_je(tx3, "300", 0, coste_total, d, f"Salida inventario: {nombre}", "COSTE")

        total_ventas += 1

        if len(JE_BATCH) >= 2000:
            flush_je()
            print(f"    día {d}: {total_ventas} ventas · {TX_COUNTER[0]} transacciones")
    d += timedelta(days=1)
flush_je()
print(f"  ✓ {total_ventas} ventas registradas")

print("  Generando compras a proveedores...")
PROVEEDORES = [
    ("Textiles Bonastre SL",   "ESB12345678", "tejidos"),
    ("Confecciones Manresa",   "ESB23456789", "ropa"),
    ("Calzados del Vallés",    "ESB34567890", "zapatos"),
    ("Accesorios Barcelona",   "ESB45678901", "accesorios"),
    ("Importaciones Garreta",  "ESB56789012", "varios"),
]
d = START
total_compras = 0
while d <= TODAY:
    if random.random() < 0.55:
        prov = random.choice(PROVEEDORES)
        base = Decimal(str(random.uniform(800, 4500))).quantize(Decimal("0.01"))
        iva_imp = (base * IVA).quantize(Decimal("0.01"))
        total = base + iva_imp

        tx = next_tx()
        add_je(tx, "600", base, 0, d, f"Compra mercancía a {prov[0]}", "FAC-C")
        add_je(tx, "472", iva_imp, 0, d, "IVA soportado 21%", "FAC-C")
        add_je(tx, "400", 0, total, d, f"Proveedor: {prov[0]}", "FAC-C")

        if random.random() < 0.85:
            pago_d = d + timedelta(days=random.randint(15, 60))
            if pago_d <= TODAY:
                tx2 = next_tx()
                add_je(tx2, "400", total, 0, pago_d, f"Pago a {prov[0]}", "PAGO")
                add_je(tx2, "572", 0, total, pago_d, f"Pago a {prov[0]}", "PAGO")
        total_compras += 1
    d += timedelta(days=1)
    if len(JE_BATCH) >= 2000:
        flush_je()
flush_je()
print(f"  ✓ {total_compras} compras registradas")

print("  Generando nóminas mensuales...")
total_nominas = 0
d = START.replace(day=28)
while d <= TODAY:
    salario_bruto_total = Decimal("0")
    for nombre, puesto, salario in EMPLEADOS:
        salario_bruto_total += Decimal(str(salario))

    irpf = (salario_bruto_total * Decimal("0.15")).quantize(Decimal("0.01"))
    ss_trabajador = (salario_bruto_total * Decimal("0.0635")).quantize(Decimal("0.01"))
    ss_empresa = (salario_bruto_total * Decimal("0.298")).quantize(Decimal("0.01"))
    neto = salario_bruto_total - irpf - ss_trabajador

    tx = next_tx()
    add_je(tx, "640", salario_bruto_total, 0, d, "Sueldos y salarios", "NOM")
    add_je(tx, "642", ss_empresa, 0, d, "Seguridad Social a cargo empresa", "NOM")
    add_je(tx, "475", 0, irpf, d, "HP acreedora retenciones IRPF", "NOM")
    add_je(tx, "476", 0, ss_trabajador + ss_empresa, d, "SS acreedora", "NOM")
    add_je(tx, "465", 0, neto, d, "Remuneraciones pendientes pago", "NOM")

    pago_d = d + timedelta(days=2)
    if pago_d <= TODAY:
        tx2 = next_tx()
        add_je(tx2, "465", neto, 0, pago_d, "Pago nómina", "PAGO-NOM")
        add_je(tx2, "572", 0, neto, pago_d, "Pago nómina", "PAGO-NOM")

    total_nominas += 1
    if d.month == 12:
        d = d.replace(year=d.year + 1, month=1)
    else:
        d = d.replace(month=d.month + 1)
flush_je()
print(f"  ✓ {total_nominas} nóminas mensuales")

print("  Generando gastos fijos (alquiler, luz, internet, agua)...")
GASTOS_FIJOS = [
    ("621", "Alquiler local Barcelona", 2400, IVA),
    ("628", "Electricidad Endesa",       380, IVA),
    ("629", "Internet y teléfono",       115, IVA),
    ("628", "Agua",                       95, IVA),
    ("629", "Limpieza local",            280, IVA),
]
total_fijos = 0
d = START.replace(day=5)
while d <= TODAY:
    for cuenta, desc, importe, iva in GASTOS_FIJOS:
        base = Decimal(str(importe))
        iva_imp = (base * iva).quantize(Decimal("0.01"))
        total = base + iva_imp

        tx = next_tx()
        add_je(tx, cuenta, base, 0, d, desc, "GAS-FIJO")
        add_je(tx, "472", iva_imp, 0, d, "IVA soportado", "GAS-FIJO")
        add_je(tx, "572", 0, total, d, desc, "GAS-FIJO")
        total_fijos += 1

    if d.month == 12:
        d = d.replace(year=d.year + 1, month=1)
    else:
        d = d.replace(month=d.month + 1)
flush_je()
print(f"  ✓ {total_fijos} gastos fijos registrados")

print("  Generando marketing (irregular)...")
total_mkt = 0
d = START
while d <= TODAY:
    if random.random() < 0.18:
        base = Decimal(str(random.uniform(150, 1200))).quantize(Decimal("0.01"))
        iva_imp = (base * IVA).quantize(Decimal("0.01"))
        total = base + iva_imp
        plataforma = random.choice(["Meta Ads", "Google Ads", "Instagram", "TikTok Ads", "Influencer"])

        tx = next_tx()
        add_je(tx, "627", base, 0, d, f"Publicidad: {plataforma}", "MKT")
        add_je(tx, "472", iva_imp, 0, d, "IVA soportado", "MKT")
        add_je(tx, "572", 0, total, d, f"Pago: {plataforma}", "MKT")
        total_mkt += 1
    d += timedelta(days=1)
    if len(JE_BATCH) >= 2000:
        flush_je()
flush_je()
print(f"  ✓ {total_mkt} gastos marketing")

print("\n[6/6] Verificando partida doble...")
totales = db.execute(text(
    "SELECT SUM(debit), SUM(credit), COUNT(*) FROM journal_entries WHERE company_id=:cid"
), {"cid": CID}).fetchone()

total_debit = float(totales[0] or 0)
total_credit = float(totales[1] or 0)
total_asientos = totales[2]
diff = abs(total_debit - total_credit)

print(f"  Total asientos:    {total_asientos:,}")
print(f"  Suma DEBE:         €{total_debit:>15,.2f}")
print(f"  Suma HABER:        €{total_credit:>15,.2f}")
print(f"  Diferencia:        €{diff:>15,.2f}")

if diff < 1:
    print(f"\n  ✓ PARTIDA DOBLE CUADRADA")
else:
    print(f"\n  ⚠ Hay desbalance — revisar")

print()
print("="*60)
print("  SEED v1 COMPLETO")
print("="*60)
print(f"  Login:    demo@modabarcelonesa.es / demo1234")
print(f"  Empresa:  Moda Barcelonesa SL (España)")
print(f"  Asientos: {total_asientos:,}")
print(f"  Periodo:  {START} → {TODAY}")
print()
