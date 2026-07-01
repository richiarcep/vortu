"""
setup_db.py — Orquestador de base de datos Vela
=================================================
Reconstruye SIEMPRE la misma base de datos desde cero, en orden:
  1. Backup del vela.db actual (por seguridad)
  2. Borra vela.db
  3. Crea todas las tablas (create_tables de la app)
  4. Aplica migración: columna country en companies
  5. Corre seed_demo.py (datos núcleo: ventas, contabilidad, etc.)
  6. Fija country='ES' en la empresa demo (Moda Barcelonesa)
  7. Siembra Grupo 3: tasks, time_entries, project_expenses, marketing_campaign_metrics

Uso:  python3 setup_db.py
"""
import os, sys, shutil, subprocess, random
from datetime import date, datetime, timedelta

sys.path.insert(0, '.')
DB = "vela.db"


def confirm():
    print("\n" + "="*60)
    print("  setup_db.py — RECONSTRUIR BASE DE DATOS DESDE CERO")
    print("="*60)
    print(f"  Esto BORRARA '{DB}' y lo reconstruira completo.")
    print("  Se hara un backup automatico antes de borrar.")
    print("="*60)
    r = input("  Escribe SI (mayusculas) para continuar: ").strip()
    if r != "SI":
        print("  Cancelado. No se toco nada.\n")
        sys.exit(0)


def backup_and_wipe():
    if os.path.exists(DB):
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        bak = f"{DB}.backup_{stamp}"
        shutil.copy(DB, bak)
        print(f"✓ Backup: {bak}")
        os.remove(DB)
        print(f"✓ {DB} borrado")
    else:
        print(f"• {DB} no existia, se creara nuevo")


def create_tables():
    # Importar main trae TODOS los modelos registrados en Base (igual que al arrancar la app),
    # asegurando que create_all cree todas las tablas, no solo las de los modelos sueltos.
    import importlib
    import main  # noqa: F401  (efecto secundario: registra todos los modelos)
    from core.database import create_tables as ct
    ct()
    print("✓ Tablas creadas (todos los modelos)")


def migrate_country():
    from core.database import engine
    from sqlalchemy import text
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(companies)")).fetchall()
        if not any(r[1] == "country" for r in rows):
            conn.execute(text("ALTER TABLE companies ADD COLUMN country VARCHAR"))
            print("✓ Migracion: columna 'country' anadida")
        else:
            print("• Columna 'country' ya existia")


def create_raw_tables():
    """Crea las 7 tablas que la app usa con SQL crudo y que ningun modelo
    registra en Base. Sin esto, la semilla falla al insertar en ellas."""
    from core.database import engine
    from sqlalchemy import text
    DDL = [
        """CREATE TABLE IF NOT EXISTS config_fiscal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL UNIQUE,
            pais TEXT DEFAULT 'SV',
            nombre_comercial TEXT, nombre_legal TEXT, nit TEXT, nrc TEXT,
            giro TEXT, actividad_economica TEXT,
            tipo_contribuyente TEXT DEFAULT 'mediano',
            departamento TEXT, municipio TEXT, direccion TEXT, telefono TEXT,
            email_fiscal TEXT,
            ambiente TEXT DEFAULT 'pruebas', serie_dte TEXT DEFAULT 'A',
            siguiente_numero INTEGER DEFAULT 1, iva_porcentaje REAL DEFAULT 0.13,
            tiene_certificado INTEGER DEFAULT 0, certificado_path TEXT,
            certificado_password TEXT,
            api_key TEXT, api_secret TEXT, token_actual TEXT, token_expiry TEXT,
            wizard_completado INTEGER DEFAULT 0, wizard_paso INTEGER DEFAULT 1,
            activo INTEGER DEFAULT 0,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS dte_contingencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL, tipo TEXT DEFAULT 'falla_api',
            inicio TEXT NOT NULL, fin TEXT, motivo TEXT,
            dte_ids TEXT DEFAULT '[]', resuelto INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS dte_emitidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL, tipo_dte TEXT NOT NULL,
            codigo_tipo TEXT NOT NULL, numero_control TEXT NOT NULL,
            codigo_generacion TEXT NOT NULL, sello_recepcion TEXT,
            emisor_nit TEXT, emisor_nrc TEXT, emisor_nombre TEXT,
            receptor_tipo TEXT DEFAULT 'consumidor_final', receptor_nombre TEXT,
            receptor_nit TEXT, receptor_nrc TEXT, receptor_email TEXT,
            receptor_direccion TEXT,
            subtotal REAL DEFAULT 0, descuento REAL DEFAULT 0, iva REAL DEFAULT 0,
            total REAL DEFAULT 0,
            estado TEXT DEFAULT 'borrador', ambiente TEXT DEFAULT 'pruebas',
            fecha_emision TEXT NOT NULL, fecha_envio TEXT, fecha_aceptacion TEXT,
            json_dte TEXT, json_respuesta TEXT, pdf_path TEXT,
            sale_id INTEGER, invalidado INTEGER DEFAULT 0, motivo_invalidacion TEXT,
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS dte_recibidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL, tipo_dte TEXT, numero_control TEXT,
            codigo_generacion TEXT,
            proveedor_nit TEXT, proveedor_nrc TEXT, proveedor_nombre TEXT,
            subtotal REAL DEFAULT 0, iva REAL DEFAULT 0, total REAL DEFAULT 0,
            concepto TEXT,
            estado TEXT DEFAULT 'recibido', fecha_emision TEXT,
            fecha_recepcion TEXT NOT NULL, registrado_contabilidad INTEGER DEFAULT 0,
            json_dte TEXT, documento_id INTEGER, created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS financial_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL, period_label TEXT NOT NULL,
            fecha_inicio TEXT NOT NULL, fecha_fin TEXT NOT NULL,
            data_json TEXT NOT NULL, generated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS proyecciones_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL, context_ids TEXT DEFAULT '[]',
            data_json TEXT NOT NULL, generated_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS registro_diario (
            id INTEGER NOT NULL, fecha DATE NOT NULL, tipo VARCHAR NOT NULL,
            categoria VARCHAR NOT NULL, descripcion VARCHAR NOT NULL,
            monto NUMERIC(15, 2) NOT NULL, referencia VARCHAR,
            cuenta_contable VARCHAR, notas TEXT, company_id INTEGER NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            FOREIGN KEY(company_id) REFERENCES companies (id)
        )""",
    ]
    with engine.begin() as conn:
        for ddl in DDL:
            conn.execute(text(ddl))
    print("\u2713 Tablas SQL crudo creadas (7 fantasma)")


def run_seed():
    print("\n--- Ejecutando seed_demo.py ---")
    res = subprocess.run([sys.executable, "seed_demo.py"], capture_output=True, text=True)
    if res.returncode != 0:
        print("✗ Error en seed_demo.py:")
        print(res.stdout[-2000:])
        print(res.stderr[-2000:])
        sys.exit(1)
    print(res.stdout[-600:])
    print("--- seed_demo.py OK ---\n")


def set_demo_country():
    from core.database import engine
    from sqlalchemy import text
    with engine.begin() as conn:
        # Moda Barcelonesa es la empresa con ese nombre; le ponemos ES
        conn.execute(text(
            "UPDATE companies SET country='ES' WHERE name LIKE '%Moda Barcelonesa%'"))
        row = conn.execute(text(
            "SELECT id, name, country FROM companies WHERE name LIKE '%Moda Barcelonesa%'")).fetchone()
        if row:
            print(f"✓ Pais fijado: empresa id={row[0]} ({row[1]}) -> {row[2]}")
        else:
            print("• No se encontro 'Moda Barcelonesa' para fijar pais")


def seed_group3():
    """Siembra tasks, time_entries, project_expenses, marketing_campaign_metrics
    para la empresa demo (Moda Barcelonesa), de forma coherente con sus
    proyectos, empleados y campanas ya creados por seed_demo.py."""
    from core.database import engine
    from sqlalchemy import text
    random.seed(42)

    with engine.begin() as conn:
        # Localizar la empresa demo y sus dependencias dinamicamente
        comp = conn.execute(text(
            "SELECT id FROM companies WHERE name LIKE '%Moda Barcelonesa%'")).fetchone()
        if not comp:
            print("• Sin empresa demo, se omite Grupo 3")
            return
        cid = comp[0]

        projects = conn.execute(text(
            "SELECT id, name, status, start_date, deadline, budget, completion_percentage "
            "FROM projects WHERE company_id=:c"), {"c": cid}).fetchall()
        emps = [r[0] for r in conn.execute(text(
            "SELECT id FROM employees WHERE company_id=:c"), {"c": cid}).fetchall()]
        camps = conn.execute(text(
            "SELECT id, budget_total, start_date, end_date, platforms FROM marketing_campaigns "
            "WHERE user_id IN (SELECT id FROM users WHERE company_id=:c)"), {"c": cid}).fetchall()

        now = datetime.utcnow().isoformat()
        TASK_TITLES = [
            "Definir alcance", "Diseno inicial", "Revision con cliente",
            "Implementacion", "Pruebas QA", "Ajustes finales",
            "Entrega y documentacion", "Reunion de seguimiento",
        ]
        STATUSES = ["todo", "in_progress", "done"]
        PRIORITIES = ["low", "medium", "high"]
        EXP_CATS = ["Materiales", "Software", "Subcontratacion", "Viajes", "Otros"]

        n_tasks = n_time = n_exp = n_metrics = 0

        # ── Tasks + time_entries + project_expenses por proyecto ──
        for p in projects:
            pid, pname, pstatus, pstart, pdeadline, pbudget, pcompletion = p
            try:
                d_start = date.fromisoformat(str(pstart)[:10]) if pstart else date.today() - timedelta(days=60)
            except Exception:
                d_start = date.today() - timedelta(days=60)

            # Numero de tareas segun avance del proyecto
            ntask = random.randint(4, 8)
            done_ratio = (pcompletion or 0) / 100.0
            for i in range(ntask):
                done = (i / ntask) < done_ratio
                status = "done" if done else random.choice(["todo", "in_progress"])
                est = round(random.uniform(4, 24), 1)
                act = round(est * random.uniform(0.8, 1.2), 1) if done else (
                      round(est * random.uniform(0.2, 0.7), 1) if status == "in_progress" else 0.0)
                due = d_start + timedelta(days=random.randint(5, 80))
                assigned = random.choice(emps) if emps else None
                res = conn.execute(text(
                    "INSERT INTO tasks (project_id, company_id, title, description, status, priority, "
                    "assigned_to, due_date, estimated_hours, actual_hours, created_at, updated_at) "
                    "VALUES (:pid,:cid,:title,:desc,:status,:prio,:assigned,:due,:est,:act,:now,:now) RETURNING id"),
                    {"pid": pid, "cid": cid, "title": f"{random.choice(TASK_TITLES)} — {pname[:30]}",
                     "desc": "Tarea generada para demo.", "status": status,
                     "prio": random.choice(PRIORITIES), "assigned": assigned,
                     "due": due.isoformat(), "est": est, "act": act, "now": now})
                tid = res.scalar()  # Postgres: lastrowid no existe; RETURNING id
                n_tasks += 1

                # time_entries para tareas con horas reales
                if act and act > 0 and emps:
                    horas_rest = act
                    while horas_rest > 0.5:
                        h = round(min(horas_rest, random.uniform(1, 6)), 1)
                        horas_rest -= h
                        emp = random.choice(emps)
                        dia = d_start + timedelta(days=random.randint(0, 70))
                        costo = round(h * random.uniform(18, 35), 2)
                        conn.execute(text(
                            "INSERT INTO time_entries (task_id, company_id, employee_id, hours, date, "
                            "description, cost, created_at) "
                            "VALUES (:t,:c,:e,:h,:d,:desc,:cost,:now)"),
                            {"t": tid, "c": cid, "e": emp, "h": h, "d": dia.isoformat(),
                             "desc": "Horas imputadas (demo).", "cost": costo, "now": now})
                        n_time += 1

            # project_expenses: 2-5 gastos por proyecto, sin pasarse del presupuesto
            nexp = random.randint(2, 5)
            tope = (pbudget or 5000) * 0.4
            for _ in range(nexp):
                amount = round(random.uniform(80, tope / nexp), 2)
                dia = d_start + timedelta(days=random.randint(0, 70))
                conn.execute(text(
                    "INSERT INTO project_expenses (project_id, company_id, description, amount, date, "
                    "category, created_at) VALUES (:p,:c,:desc,:amt,:d,:cat,:now)"),
                    {"p": pid, "c": cid, "desc": f"Gasto {random.choice(EXP_CATS).lower()}",
                     "amt": amount, "d": dia.isoformat(),
                     "cat": random.choice(EXP_CATS), "now": now})
                n_exp += 1

        # ── marketing_campaign_metrics: una fila por campana/plataforma ──
        import json
        for c in camps:
            camp_id, budget, c_start, c_end, platforms = c
            try:
                plats = json.loads(platforms) if platforms else ["google"]
            except Exception:
                plats = ["google"]
            budget = budget or 500
            for plat in plats:
                spend = round(budget / len(plats) * random.uniform(0.85, 1.0), 2)
                impressions = random.randint(8000, 60000)
                clicks = int(impressions * random.uniform(0.01, 0.05))
                ctr = round(clicks / impressions * 100, 2) if impressions else 0
                conversions = int(clicks * random.uniform(0.02, 0.08))
                conv_rate = round(conversions / clicks * 100, 2) if clicks else 0
                cpc = round(spend / clicks, 2) if clicks else 0
                cpa = round(spend / conversions, 2) if conversions else 0
                # ingreso estimado para ROAS (ticket medio ~45€)
                revenue = conversions * random.uniform(35, 60)
                roas = round(revenue / spend, 2) if spend else 0
                conn.execute(text(
                    "INSERT INTO marketing_campaign_metrics (campaign_id, platform, date, impressions, "
                    "clicks, ctr, spend, conversions, conversion_rate, cpc, cpa, roas, fetched_at) "
                    "VALUES (:cid,:plat,:date,:imp,:clk,:ctr,:spend,:conv,:cr,:cpc,:cpa,:roas,:now)"),
                    {"cid": camp_id, "plat": plat, "date": str(c_end)[:10] if c_end else "",
                     "imp": impressions, "clk": clicks, "ctr": ctr, "spend": spend,
                     "conv": conversions, "cr": conv_rate, "cpc": cpc, "cpa": cpa,
                     "roas": roas, "now": now})
                n_metrics += 1

        print(f"✓ Grupo 3 sembrado:")
        print(f"   - tasks: {n_tasks}")
        print(f"   - time_entries: {n_time}")
        print(f"   - project_expenses: {n_exp}")
        print(f"   - marketing_campaign_metrics: {n_metrics}")


def seed_accounting_entries():
    """Crea el plan de cuentas PGC español y genera asientos de partida doble
    a partir de registro_diario. Lee el country de la empresa y carga el
    plan correspondiente. Hoy soporta ES; otros paises se añaden en charts_XX.py"""
    import sys
    sys.path.insert(0, '.')
    from core.database import SessionLocal
    from sqlalchemy import text
    from modules.accounting.journal import record_transaction
    from modules.accounting.charts_es import PGC_ES_ACCOUNTS, get_entry_accounts
    from datetime import date as ddate
    from models.user import User

    db = SessionLocal()
    try:
        comp = db.execute(text(
            "SELECT id, country FROM companies WHERE name LIKE '%Moda Barcelonesa%'")).fetchone()
        if not comp:
            print("• Sin empresa demo, se omite fase contable")
            return
        cid, country = comp[0], comp[1]

        # Seleccionar plan de cuentas segun country
        if country == "ES":
            accounts = PGC_ES_ACCOUNTS
            get_accounts = get_entry_accounts
            plan_name = "PGC Espana (RD 1514/2007)"
        else:
            print(f"• Pais {country} sin plan de cuentas implementado, se omite")
            return

        # 1) Limpiar cuentas previas de esta empresa
        db.execute(text("DELETE FROM accounts WHERE company_id=:c"), {"c": cid})
        db.execute(text("DELETE FROM journal_entries WHERE company_id=:c"), {"c": cid})
        db.execute(text("DELETE FROM transactions WHERE company_id=:c"), {"c": cid})
        db.commit()

        # 2) Crear plan de cuentas
        from modules.accounting.journal import Account
        for acc in accounts:
            db.add(Account(
                code=acc["code"], name=acc["name"],
                account_type=acc["type"], normal_balance=acc["normal"],
                company_id=cid
            ))
        db.commit()
        n_accounts = db.execute(text(
            "SELECT COUNT(*) FROM accounts WHERE company_id=:c"), {"c": cid}).fetchone()[0]
        print(f"✓ Plan de cuentas cargado: {n_accounts} cuentas ({plan_name})")

        # 3) Generar asientos desde registro_diario
        rows = db.execute(text(
            "SELECT fecha, tipo, categoria, descripcion, monto "
            "FROM registro_diario WHERE company_id=:c ORDER BY fecha"), {"c": cid}).fetchall()

        ok = skip = 0
        for row in rows:
            fecha, tipo, cat, desc, monto = row
            debe_code, haber_code = get_accounts(tipo, cat)
            if isinstance(fecha, str):
                try: fecha = ddate.fromisoformat(fecha[:10])
                except Exception: skip += 1; continue
            try:
                record_transaction(
                    db=db, company_id=cid, date=fecha,
                    description=desc or f"{tipo} {cat}",
                    entries=[
                        {"account_code": debe_code,  "debit": float(monto), "credit": 0},
                        {"account_code": haber_code, "debit": 0, "credit": float(monto)},
                    ],
                    module_source="seed", reference="SEED-DEMO"
                )
                ok += 1
            except Exception as e:
                skip += 1

        print(f"✓ Asientos contables generados: {ok} transacciones ({ok*2} lineas journal_entries)")
        if skip:
            print(f"  Omitidos: {skip}")
    finally:
        db.close()


def main():
    confirm()
    backup_and_wipe()
    create_tables()
    migrate_country()
    create_raw_tables()
    run_seed()
    set_demo_country()
    seed_group3()
    seed_accounting_entries()
    print("\n" + "="*60)
    print("  ✓ BASE DE DATOS RECONSTRUIDA AL 100%")
    print("  Login demo: demo@modabarcelonesa.es / demo1234")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
