"""
vela_db_discovery.py
─────────────────────
Read-only inspection of the Vela database (SQLite or PostgreSQL).
Run from the bizos/ folder:

    python vela_db_discovery.py

Saves a full report to vela_db_report.json when done.
"""

import os
import sys
import json
from datetime import datetime

try:
    from sqlalchemy import create_engine, text, inspect
    from tabulate import tabulate
except ImportError:
    print("Run: pip install sqlalchemy tabulate psycopg2-binary")
    sys.exit(1)


# ─── Connection ───────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vela.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_SQLITE = DATABASE_URL.startswith("sqlite")
SCHEMA    = None if IS_SQLITE else "public"


# ─── What modules the Profit Optimizer cares about ───────────────────────────

MODULES = {
    "ventas":       ["sale","venta","order","pedido","tpv","ticket","revenue","ingreso"],
    "contabilidad": ["account","conta","asiento","entry","journal","ledger","gasto","ingreso"],
    "marketing":    ["marketing","campaign","campana","spend","ad","anuncio","channel"],
    "finanzas":     ["finance","finanz","kpi","ratio","projection","budget","presupuesto"],
    "rrhh":         ["employee","empleado","payroll","nomina","staff","hr","labour","labor"],
    "productos":    ["product","producto","sku","catalog","price","precio","cost","coste","item"],
    "clientes":     ["client","cliente","customer","contact","contacto"],
    "proyectos":    ["project","proyecto","task","tarea"],
    "documentos":   ["document","documento","file","archivo","pdf"],
}


# ─── Colours ──────────────────────────────────────────────────────────────────

GR = "\033[92m"
YL = "\033[93m"
RD = "\033[91m"
CY = "\033[96m"
BD = "\033[1m"
EN = "\033[0m"

def h1(t):   print(f"\n{BD}{'='*65}\n  {t}\n{'='*65}{EN}")
def h2(t):   print(f"\n{CY}{BD}  -- {t}{EN}")
def ok(t):   print(f"  {GR}[OK]{EN}  {t}")
def warn(t): print(f"  {YL}[!!]{EN}  {t}")
def info(t): print(f"  {CY}[->]{EN}  {t}")
def err(t):  print(f"  {RD}[XX]{EN}  {t}")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def classify_table(name):
    n = name.lower()
    found = [m for m, kws in MODULES.items() if any(k in n for k in kws)]
    return found or ["other"]


def classify_column(col_name, col_type):
    n = str(col_name).lower()
    flags = []
    if any(k in n for k in ["revenue","ingreso","venta","amount","importe","total","price","precio"]):
        flags.append("REVENUE")
    if any(k in n for k in ["cost","coste","gasto","labour","labor","material","logistic"]):
        flags.append("COST")
    if any(k in n for k in ["quantity","qty","units","cantidad","stock"]):
        flags.append("QUANTITY")
    if any(k in n for k in ["date","fecha","period","month","mes","year","created","updated"]):
        flags.append("TIME")
    if any(k in n for k in ["marketing","spend","campaign","channel","ad_"]):
        flags.append("MARKETING")
    if any(k in n for k in ["product","producto","sku","line","category","categoria","item"]):
        flags.append("PRODUCT")
    return ", ".join(flags)


def safe_count(conn, table):
    try:
        return conn.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
    except Exception:
        return "?"


def safe_sample(conn, table, col):
    try:
        rows = conn.execute(
            text(f'SELECT DISTINCT "{col}" FROM "{table}" WHERE "{col}" IS NOT NULL LIMIT 4')
        ).fetchall()
        return ", ".join(str(r[0]) for r in rows) or "—"
    except Exception:
        return "—"


# ─── Main ─────────────────────────────────────────────────────────────────────

def run():
    h1("VELA DATABASE DISCOVERY")
    print(f"  Time    : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  DB type : {'SQLite' if IS_SQLITE else 'PostgreSQL'}")
    print(f"  Mode    : READ-ONLY — nothing will be modified")
    print(f"  Purpose : Plan Profit Optimizer integration with Vela\n")

    # Connect
    try:
        kwargs = {"check_same_thread": False} if IS_SQLITE else {}
        engine = create_engine(DATABASE_URL, connect_args=kwargs)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        ok("Database connection successful")
    except Exception as e:
        err(f"Could not connect: {e}")
        sys.exit(1)

    inspector  = inspect(engine)
    all_tables = inspector.get_table_names(schema=SCHEMA)
    info(f"Tables found: {len(all_tables)}")

    # ── 1. Full table inventory ───────────────────────────────────────────────
    h1("1. ALL TABLES")

    summary = []
    with engine.connect() as conn:
        for t in sorted(all_tables):
            mods = classify_table(t)
            rows = safe_count(conn, t)
            summary.append({"table": t, "rows": rows, "modules": ", ".join(mods)})

    print(tabulate(
        [[s["table"], s["rows"], s["modules"]] for s in summary],
        headers=["Table", "Rows", "Likely module(s)"],
        tablefmt="rounded_outline"
    ))

    # ── 2. Module grouping ────────────────────────────────────────────────────
    h1("2. TABLES BY MODULE")

    module_tables = {m: [] for m in list(MODULES.keys()) + ["other"]}
    for s in summary:
        for m in s["modules"].split(", "):
            m = m.strip()
            if m in module_tables:
                module_tables[m].append(s["table"])

    for mod, tables in module_tables.items():
        if tables:
            ok(f"{mod.upper():18s}  {len(tables)} table(s): {', '.join(tables)}")
        else:
            warn(f"{mod.upper():18s}  no tables found")

    # ── 3. Column detail ─────────────────────────────────────────────────────
    h1("3. COLUMN DETAIL — TABLES RELEVANT TO PROFIT OPTIMIZER")

    relevant_modules = ["ventas","contabilidad","marketing","finanzas","rrhh","productos"]
    relevant_tables  = {t for m in relevant_modules for t in module_tables.get(m, [])}

    col_report = {}

    with engine.connect() as conn:
        for table in sorted(relevant_tables):
            h2(f"Table: {table}")

            try:
                columns = inspector.get_columns(table, schema=SCHEMA)
            except Exception as e:
                warn(f"Could not inspect {table}: {e}")
                continue

            try:
                fks = inspector.get_foreign_keys(table, schema=SCHEMA)
            except Exception:
                fks = []

            flags_found = {k: False for k in [
                "has_revenue","has_cost","has_quantity","has_time","has_product","has_marketing"
            ]}

            rows = []
            for col in columns:
                flag   = classify_column(col["name"], col["type"])
                sample = safe_sample(conn, table, col["name"]) if flag else ""
                rows.append([
                    col["name"],
                    str(col["type"]),
                    "YES" if col.get("nullable") else "NO",
                    flag,
                    sample[:50],
                ])
                for f in ["REVENUE","COST","QUANTITY","TIME","PRODUCT","MARKETING"]:
                    if f in flag:
                        flags_found[f"has_{f.lower()}"] = True

            print(tabulate(
                rows,
                headers=["Column","Type","Nullable","Relevant to optimizer","Sample values"],
                tablefmt="rounded_outline"
            ))

            if fks:
                fk_str = " | ".join(
                    f"{fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}"
                    for fk in fks
                )
                info(f"Foreign keys: {fk_str}")

            col_report[table] = {
                "columns": [c["name"] for c in columns],
                **flags_found
            }

    # ── 4. Gap analysis ───────────────────────────────────────────────────────
    h1("4. GAP ANALYSIS — WHAT THE PROFIT OPTIMIZER NEEDS")

    NEEDS = [
        ("Revenue by commercial line per month",              ["has_revenue","has_time"],             "ventas / contabilidad"),
        ("Marketing spend by line per month",                 ["has_marketing","has_time"],            "marketing"),
        ("Unit cost per product (labour+material+logistics)", ["has_cost","has_product"],              "contabilidad / productos"),
        ("Selling price per SKU",                             ["has_revenue","has_product"],           "ventas / productos"),
        ("Units sold per product per month",                  ["has_quantity","has_time"],             "ventas"),
        ("Stock / supply limit per product",                  ["has_quantity","has_product"],          "ventas / productos"),
        ("ERP cost history — 3 months rolling",              ["has_cost","has_time"],                 "contabilidad"),
        ("Fulfilment budget per line (from line optimiser)",  ["has_cost"],                            "finanzas / manual entry"),
        ("Capacity multipliers rho (labour,inv,logistics)",   ["has_cost","has_time","has_quantity"],  "contabilidad / rrhh"),
    ]

    gap_rows = []
    for desc, flags, source in NEEDS:
        found = [t for t, d in col_report.items() if all(d.get(f, False) for f in flags)]
        if found:
            status_display = f"{GR}[OK]{EN} Found in: {', '.join(found)}"
            status_plain   = f"[OK] Found in: {', '.join(found)}"
        else:
            status_display = f"{YL}[!!]{EN} Not found — needs manual entry or new table"
            status_plain   = "[!!] Not found — needs manual entry or new table"
        gap_rows.append((desc, source, status_display, status_plain))

    print(tabulate(
        [[d, s, st] for d, s, st, _ in gap_rows],
        headers=["Data needed by model", "Expected source", "Status"],
        tablefmt="rounded_outline"
    ))

    # ── 5. Foreign key map ────────────────────────────────────────────────────
    h1("5. RELATIONSHIPS BETWEEN RELEVANT TABLES")

    rel_rows = []
    for table in sorted(relevant_tables):
        try:
            for fk in inspector.get_foreign_keys(table, schema=SCHEMA):
                rel_rows.append([table, str(fk["constrained_columns"]),
                                 fk["referred_table"], str(fk["referred_columns"])])
        except Exception:
            pass

    if rel_rows:
        print(tabulate(rel_rows,
                       headers=["From table","Column(s)","To table","Column(s)"],
                       tablefmt="rounded_outline"))
    else:
        warn("No foreign key relationships found among relevant tables.")

    # ── 6. Save JSON ──────────────────────────────────────────────────────────
    h1("6. SAVING REPORT")

    report = {
        "generated_at":   datetime.now().isoformat(),
        "db_type":        "sqlite" if IS_SQLITE else "postgresql",
        "total_tables":   len(all_tables),
        "all_tables":     sorted(all_tables),
        "module_mapping": {m: t for m, t in module_tables.items()},
        "column_detail":  col_report,
        "gap_analysis":   [
            {"need": d, "source": s, "status": sp}
            for d, s, _, sp in gap_rows
        ],
    }

    path = "vela_db_report.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    ok(f"Report saved to: {path}")

    # ── 7. Summary ────────────────────────────────────────────────────────────
    h1("7. SUMMARY")

    ok_count   = sum(1 for *_, sp in gap_rows if "[OK]"  in sp)
    miss_count = sum(1 for *_, sp in gap_rows if "[!!]" in sp)

    print(f"\n  Data points the model needs  : {len(gap_rows)}")
    print(f"  {GR}Already in Vela{EN}             : {ok_count}")
    print(f"  {YL}Missing / needs new solution{EN} : {miss_count}\n")

    if miss_count == 0:
        ok("All data exists. Integration can read from existing tables directly.")
    elif miss_count <= 3:
        warn(f"{miss_count} items missing. Small additions needed — a few new columns or manual entry fields.")
    else:
        warn(f"{miss_count} items missing. A new profit_optimizer_inputs table will be needed.")

    print(f"\n  {BD}Next step:{EN} Paste the terminal output or send vela_db_report.json")
    print(f"  We will use it to design the exact integration architecture.\n")


if __name__ == "__main__":
    run()
