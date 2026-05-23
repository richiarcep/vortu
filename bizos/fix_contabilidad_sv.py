"""
fix_contabilidad_sv.py — Carga SOLO la contabilidad NIIF para la empresa SV ya creada.
Usa SQL directo (evita el problema de FK del ORM). Run: python3 fix_contabilidad_sv.py
"""
import os, uuid
from datetime import date, datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexum.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine  = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
db = sessionmaker(bind=engine)()
def now(): return datetime.utcnow()

COMPANY_NAME = "Comercial San Salvador SA de CV"
row = db.execute(text("SELECT id FROM companies WHERE name=:n"),{"n":COMPANY_NAME}).fetchone()
if not row:
    print(f"ERROR: no existe la empresa '{COMPANY_NAME}'. Corre primero seed_demo_sv.py")
    raise SystemExit(1)
CID = row[0]
print(f"Empresa encontrada: company_id={CID}")

from modules.accounting.sv.charts_sv import NIIF_SV_ACCOUNTS, get_entry_accounts_sv
from datetime import date as ddate

# Limpiar contabilidad previa
db.execute(text("DELETE FROM accounts WHERE company_id=:c"),{"c":CID})
db.execute(text("DELETE FROM journal_entries WHERE company_id=:c"),{"c":CID})
db.execute(text("DELETE FROM transactions WHERE company_id=:c"),{"c":CID})
db.commit()

# Cuentas (is_active=1 explicito)
for acc in NIIF_SV_ACCOUNTS:
    db.execute(text("""
        INSERT INTO accounts (code,name,account_type,normal_balance,is_active,company_id,created_at)
        VALUES (:code,:name,:atype,:normal,1,:cid,:now)
    """),{"code":acc["code"],"name":acc["name"],"atype":acc["type"],
          "normal":acc["normal"],"cid":CID,"now":now()})
db.commit()
n_acc = db.execute(text("SELECT COUNT(*) FROM accounts WHERE company_id=:c"),{"c":CID}).fetchone()[0]
print(f"  {n_acc} cuentas NIIF cargadas (is_active=1)")

acc_map = {r[0]: r[1] for r in db.execute(
    text("SELECT code,id FROM accounts WHERE company_id=:c"),{"c":CID}).fetchall()}

def asiento_sql(fecha, descripcion, debe_code, haber_code, monto, ref="SEED-SV"):
    if debe_code not in acc_map or haber_code not in acc_map:
        return False
    tid = str(uuid.uuid4())[:8].upper()
    monto = round(float(monto), 2)
    db.execute(text("""
        INSERT INTO journal_entries
        (transaction_id,account_id,date,description,debit,credit,reference,module_source,company_id,created_at)
        VALUES (:tid,:aid,:date,:desc,:debit,0,:ref,'seed_sv',:cid,:now)
    """),{"tid":tid,"aid":acc_map[debe_code],"date":fecha,"desc":descripcion,
          "debit":monto,"ref":ref,"cid":CID,"now":now()})
    db.execute(text("""
        INSERT INTO journal_entries
        (transaction_id,account_id,date,description,debit,credit,reference,module_source,company_id,created_at)
        VALUES (:tid,:aid,:date,:desc,0,:credit,:ref,'seed_sv',:cid,:now)
    """),{"tid":tid,"aid":acc_map[haber_code],"date":fecha,"desc":descripcion,
          "credit":monto,"ref":ref,"cid":CID,"now":now()})
    db.execute(text("""
        INSERT INTO transactions
        (transaction_id,date,description,total_amount,module_source,is_balanced,company_id,created_at)
        VALUES (:tid,:date,:desc,:total,'seed_sv',1,:cid,:now)
    """),{"tid":tid,"date":fecha,"desc":descripcion,"total":monto,"cid":CID,"now":now()})
    return True

rows = db.execute(text(
    "SELECT fecha,tipo,categoria,descripcion,monto FROM registro_diario WHERE company_id=:c ORDER BY fecha"
),{"c":CID}).fetchall()

okc = skip = 0
for fecha,tipo,cat,desc,monto in rows:
    debe_code, haber_code = get_entry_accounts_sv(tipo, cat)
    if isinstance(fecha,str):
        try: fecha = ddate.fromisoformat(fecha[:10])
        except: skip+=1; continue
    if asiento_sql(fecha, desc or f"{tipo} {cat}", debe_code, haber_code, monto):
        okc += 1
    else:
        skip += 1
db.commit()
print(f"  {okc} asientos generados ({okc*2} lineas), omitidos: {skip}")

# Asiento de apertura de capital
CAPITAL_FUNDACIONAL = 35000.00
asiento_sql(ddate(date.today().year-2,1,1), "Aporte inicial de capital (apertura)",
            "1103", "3101", CAPITAL_FUNDACIONAL, ref="SEED-SV-APERTURA")
db.commit()
print(f"  Asiento de apertura: 1103/3101 ${CAPITAL_FUNDACIONAL:,.2f} (Bancos / Capital Social)")

# Borrar snapshots para forzar recalculo
try:
    db.execute(text("DELETE FROM business_snapshots WHERE company_id=:c"),{"c":CID})
    db.commit()
    print("  Snapshots borrados (se recalculan al abrir)")
except Exception: pass

# Verificacion de cuadre
saldos = {}
for tp in ("asset","liability","equity","income","expense"):
    r = db.execute(text("""
        SELECT ROUND(SUM(je.debit),2) d, ROUND(SUM(je.credit),2) h
        FROM journal_entries je JOIN accounts a ON je.account_id=a.id
        WHERE a.company_id=:c AND je.company_id=:c AND a.account_type=:t
    """),{"c":CID,"t":tp}).fetchone()
    saldos[tp] = ((r[0] or 0),(r[1] or 0))
A=saldos["asset"][0]-saldos["asset"][1]
P=saldos["liability"][1]-saldos["liability"][0]
PA=saldos["equity"][1]-saldos["equity"][0]
I=saldos["income"][1]-saldos["income"][0]
G=saldos["expense"][0]-saldos["expense"][1]
U=I-G
print(f"\n  CUADRE: Activo {A:,.2f} = Pasivo {P:,.2f} + Patrim {PA:,.2f} + Util {U:,.2f} = {P+PA+U:,.2f}")
print(f"  {'>> BALANCE CUADRA OK' if abs(A-(P+PA+U))<0.5 else '>> ATENCION: NO CUADRA'}")
db.close()
