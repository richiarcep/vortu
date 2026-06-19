"""
Migración HR + Seed completo para Moda Barcelonesa SL
- 20 empleados realistas españoles
- Tablas nuevas: vacations, contracts
- Seed: 60 feedbacks, 15 vacaciones, 20 contratos, 40 nóminas
"""
import sqlite3
import random
from datetime import datetime, timedelta, date

DB = '/Users/eduardofuentes/Desktop/vela/backend/vela.db'
COMPANY_ID = 1

conn = sqlite3.connect(DB)
cur = conn.cursor()

# ═══════════════════════════════════════════════════════
# 1. MIGRACIÓN: tablas nuevas
# ═══════════════════════════════════════════════════════

cur.execute("""
CREATE TABLE IF NOT EXISTS vacations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL,
    vacation_type VARCHAR(30) DEFAULT 'vacation',  -- vacation | sick | personal | parental
    status VARCHAR(20) DEFAULT 'pending',           -- pending | approved | rejected
    notes TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER,
    approved_at DATETIME,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    contract_type VARCHAR(30) NOT NULL,  -- indefinido | temporal | practicas | becario | autonomo
    start_date DATE NOT NULL,
    end_date DATE,                       -- NULL si indefinido
    working_hours INTEGER DEFAULT 40,
    salary_gross FLOAT NOT NULL,
    document_url VARCHAR(500),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS payslips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    gross_amount FLOAT NOT NULL,
    net_amount FLOAT NOT NULL,
    irpf FLOAT NOT NULL,
    ss_employee FLOAT NOT NULL,
    ss_company FLOAT NOT NULL,
    extras FLOAT DEFAULT 0,
    document_url VARCHAR(500),
    paid_at DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
)
""")

conn.commit()
print("OK Tablas vacations, contracts, payslips creadas")

# Limpiar tablas existentes
cur.execute("DELETE FROM employee_feedback WHERE employee_id IN (SELECT id FROM employees WHERE company_id=?)", (COMPANY_ID,))
cur.execute("DELETE FROM vacations WHERE company_id=?", (COMPANY_ID,))
cur.execute("DELETE FROM contracts WHERE company_id=?", (COMPANY_ID,))
cur.execute("DELETE FROM payslips WHERE company_id=?", (COMPANY_ID,))
cur.execute("DELETE FROM employees WHERE company_id=?", (COMPANY_ID,))
conn.commit()

# ═══════════════════════════════════════════════════════
# 2. EMPLEADOS (20)
# ═══════════════════════════════════════════════════════

EMPLEADOS = [
    # Diseño (4)
    ("Núria Vidal Castro", "diseno", "Directora de diseño", 48000, "indefinido", 2022),
    ("Marc Puig Roca", "diseno", "Diseñador senior", 36000, "indefinido", 2023),
    ("Anna Martínez Bosch", "diseno", "Diseñadora junior", 24000, "temporal", 2025),
    ("Joan Estrada Mas", "diseno", "Patronista", 32000, "indefinido", 2024),

    # Ventas (5)
    ("Cristina Pons Vila", "ventas", "Responsable tienda", 32000, "indefinido", 2021),
    ("Laura Soler Riera", "ventas", "Vendedora senior", 22000, "indefinido", 2022),
    ("Marta Camps Solé", "ventas", "Vendedora", 19500, "temporal", 2024),
    ("Pol Ferrer Bonet", "ventas", "Vendedor", 19500, "indefinido", 2023),
    ("Júlia Roca Pi", "ventas", "Cajera/Vendedora", 18000, "practicas", 2025),

    # Almacén (3)
    ("Sergi Llull Costa", "almacen", "Jefe de almacén", 28000, "indefinido", 2020),
    ("Pablo Ribas Font", "almacen", "Mozo de almacén", 18500, "indefinido", 2023),
    ("Adrián Mas Vilanova", "almacen", "Mozo de almacén", 18500, "temporal", 2025),

    # Marketing (3)
    ("Helena Pujol Bertran", "marketing", "Directora marketing", 42000, "indefinido", 2022),
    ("Andreu Vives Trias", "marketing", "Community manager", 26000, "indefinido", 2024),
    ("Clara Bayer Llopis", "marketing", "Especialista SEO/SEM", 30000, "indefinido", 2023),

    # Admin / Finanzas (3)
    ("Eduard Serrano Vila", "admin", "Director financiero", 52000, "indefinido", 2019),
    ("Sandra Cabanes Mir", "admin", "Contable", 28000, "indefinido", 2021),
    ("Roger Padró Tena", "admin", "Administrativo RH", 24000, "indefinido", 2023),

    # Tecnología / E-commerce (2)
    ("Jordi Mateu Bru", "tecnologia", "Responsable e-commerce", 38000, "indefinido", 2022),
    ("Mireia Sala Coll", "tecnologia", "Atención al cliente online", 20000, "temporal", 2024),
]

employee_ids = []
for nombre, dpto, puesto, salario, contract_type, year_join in EMPLEADOS:
    parts = nombre.lower().split()
    email = f"{parts[0]}.{parts[1]}@modabarcelonesa.es"
    cur.execute("""
        INSERT INTO employees (full_name, email, department, position, gross_salary, is_active, company_id, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    """, (nombre, email, dpto, puesto, salario, COMPANY_ID,
          datetime(year_join, random.randint(1, 12), random.randint(1, 28)).isoformat()))
    employee_ids.append((cur.lastrowid, nombre, dpto, salario, contract_type, year_join))

conn.commit()
print(f"OK {len(EMPLEADOS)} empleados creados")

# ═══════════════════════════════════════════════════════
# 3. CONTRATOS (1 por empleado)
# ═══════════════════════════════════════════════════════

for emp_id, nombre, dpto, salario, c_type, year_join in employee_ids:
    start_date = date(year_join, random.randint(1, 12), random.randint(1, 28))
    end_date = None
    if c_type in ("temporal", "practicas"):
        end_date = start_date + timedelta(days=random.choice([180, 365, 540]))
    elif c_type == "becario":
        end_date = start_date + timedelta(days=180)

    hours = 40 if c_type != "practicas" else random.choice([20, 30, 40])

    cur.execute("""
        INSERT INTO contracts (employee_id, company_id, contract_type, start_date, end_date, working_hours, salary_gross, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    """, (emp_id, COMPANY_ID, c_type, start_date.isoformat(),
          end_date.isoformat() if end_date else None, hours, salario))

conn.commit()
print(f"OK {len(employee_ids)} contratos creados")

# ═══════════════════════════════════════════════════════
# 4. NÓMINAS (últimos 2 meses por empleado = 40)
# ═══════════════════════════════════════════════════════

current_date = datetime.now()
for emp_id, nombre, dpto, salario, c_type, _ in employee_ids:
    monthly_gross = round(salario / 14, 2)  # 14 pagas en España
    irpf_rate = 0.10 if salario < 22000 else 0.15 if salario < 35000 else 0.22 if salario < 50000 else 0.27
    ss_rate_emp = 0.0635  # ~6.35% trabajador
    ss_rate_comp = 0.298  # ~29.8% empresa

    for months_back in range(2):
        period = current_date - timedelta(days=30 * (months_back + 1))
        irpf = round(monthly_gross * irpf_rate, 2)
        ss_emp = round(monthly_gross * ss_rate_emp, 2)
        ss_comp = round(monthly_gross * ss_rate_comp, 2)
        net = round(monthly_gross - irpf - ss_emp, 2)
        paid = period.replace(day=28) if period.month == period.month else period

        cur.execute("""
            INSERT INTO payslips (employee_id, company_id, period_month, period_year,
                gross_amount, net_amount, irpf, ss_employee, ss_company, paid_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (emp_id, COMPANY_ID, period.month, period.year,
              monthly_gross, net, irpf, ss_emp, ss_comp, paid.date().isoformat()))

conn.commit()
print(f"OK {len(employee_ids) * 2} nóminas creadas")

# ═══════════════════════════════════════════════════════
# 5. VACACIONES (15 entries)
# ═══════════════════════════════════════════════════════

VACATION_TYPES = ["vacation", "vacation", "vacation", "sick", "personal"]
STATUSES = ["approved", "approved", "approved", "pending", "rejected"]

vacation_count = 0
for emp_id, nombre, dpto, salario, c_type, _ in employee_ids[:18]:
    # Vacaciones pasadas (verano 2025)
    if random.random() < 0.7:
        start = date(2025, random.choice([7, 8]), random.randint(1, 20))
        days = random.choice([7, 10, 14, 15])
        end = start + timedelta(days=days)
        cur.execute("""
            INSERT INTO vacations (employee_id, company_id, start_date, end_date, days,
                vacation_type, status, approved_at)
            VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)
        """, (emp_id, COMPANY_ID, start.isoformat(), end.isoformat(), days,
              'vacation', (start - timedelta(days=15)).isoformat()))
        vacation_count += 1

    # Vacaciones futuras (próximos 3 meses)
    if random.random() < 0.4:
        days_ahead = random.randint(7, 90)
        start = date.today() + timedelta(days=days_ahead)
        days = random.choice([3, 5, 7, 14])
        end = start + timedelta(days=days)
        status = random.choices(["approved", "pending"], weights=[3, 1])[0]
        cur.execute("""
            INSERT INTO vacations (employee_id, company_id, start_date, end_date, days,
                vacation_type, status, approved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (emp_id, COMPANY_ID, start.isoformat(), end.isoformat(), days,
              random.choice(VACATION_TYPES), status,
              date.today().isoformat() if status == 'approved' else None))
        vacation_count += 1

# Algunas bajas por enfermedad recientes
for emp_id, nombre, dpto, salario, c_type, _ in random.sample(employee_ids, 3):
    start = date.today() - timedelta(days=random.randint(0, 14))
    days = random.choice([2, 3, 5])
    end = start + timedelta(days=days)
    cur.execute("""
        INSERT INTO vacations (employee_id, company_id, start_date, end_date, days,
            vacation_type, status, approved_at)
        VALUES (?, ?, ?, ?, ?, 'sick', 'approved', ?)
    """, (emp_id, COMPANY_ID, start.isoformat(), end.isoformat(), days, start.isoformat()))
    vacation_count += 1

conn.commit()
print(f"OK {vacation_count} vacaciones/bajas creadas")

# ═══════════════════════════════════════════════════════
# 6. FEEDBACK (60 entries con sentiment)
# ═══════════════════════════════════════════════════════

FEEDBACK_POS = [
    "Excelente trabajo este mes. Cerró 3 ventas importantes.",
    "Muy buen ambiente con el equipo. Aporta soluciones constantemente.",
    "Iniciativa propia en optimización del proceso. Felicidades.",
    "Cliente VIP elogió su atención personalizada.",
    "Cumple objetivos consistentemente. Considerar bonus.",
    "Gran capacidad de adaptación a la nueva colección.",
    "Ha formado a 2 compañeros nuevos con éxito.",
]
FEEDBACK_NEU = [
    "Cumple sus objetivos. Sin destacar.",
    "Trabajo constante pero sin grandes resultados este mes.",
    "Asistencia perfecta. Performance estándar.",
    "Necesita formación adicional en CRM.",
    "Buen empleado, pero podría tomar más iniciativa.",
]
FEEDBACK_NEG = [
    "3 retrasos esta semana. Hablar para entender causa.",
    "Conflicto con compañero del almacén. Mediar.",
    "No alcanzó objetivos de venta del mes (-15%).",
    "Quejas de 2 clientes por trato poco amable.",
    "Resistencia al cambio del nuevo sistema. Apoyar.",
    "Ha solicitado reducción de jornada — investigar causa.",
    "Bajo nivel de energía en las últimas semanas. Posible burnout.",
]

# Algunos empleados tienen perfil "en riesgo" (feedback predominantemente negativo)
EMPLEADOS_RIESGO = random.sample(employee_ids, 3)
EMPLEADOS_DESTACADOS = random.sample([e for e in employee_ids if e not in EMPLEADOS_RIESGO], 4)

feedback_count = 0
for emp_id, nombre, dpto, salario, c_type, _ in employee_ids:
    if (emp_id, nombre, dpto, salario, c_type, _) in EMPLEADOS_RIESGO:
        n_feedback = random.randint(4, 7)
        weights = [1, 3, 6]  # más negativo
    elif (emp_id, nombre, dpto, salario, c_type, _) in EMPLEADOS_DESTACADOS:
        n_feedback = random.randint(3, 6)
        weights = [7, 2, 1]  # más positivo
    else:
        n_feedback = random.randint(2, 5)
        weights = [4, 4, 2]  # equilibrado

    for _ in range(n_feedback):
        sentiment = random.choices(['positive', 'neutral', 'negative'], weights=weights)[0]
        templates = {'positive': FEEDBACK_POS, 'neutral': FEEDBACK_NEU, 'negative': FEEDBACK_NEG}[sentiment]
        content = random.choice(templates)
        created = datetime.now() - timedelta(days=random.randint(1, 180))

        cur.execute("""
            INSERT INTO employee_feedback
            (employee_id, content, sentiment, created_at)
            VALUES (?, ?, ?, ?)
        """, (emp_id, content, sentiment, created.isoformat()))
        feedback_count += 1

conn.commit()
print(f"OK {feedback_count} feedbacks creados ({len(EMPLEADOS_RIESGO)} empleados en riesgo, {len(EMPLEADOS_DESTACADOS)} destacados)")

# ═══════════════════════════════════════════════════════
# RESUMEN
# ═══════════════════════════════════════════════════════
print("\n══════════════════════════════════════════")
print("  SEED HR COMPLETADO - Moda Barcelonesa SL")
print("══════════════════════════════════════════")
total_salary = cur.execute(
    "SELECT SUM(gross_salary) FROM employees WHERE company_id=? AND is_active=1",
    (COMPANY_ID,)
).fetchone()[0]
print(f"  Empleados activos : {len(employee_ids)}")
print(f"  Coste salarial    : {total_salary:,.0f} €/año")
print(f"  Coste mensual     : {total_salary/12:,.0f} €")
print()
deptos = cur.execute("""
    SELECT department, COUNT(*), SUM(gross_salary)
    FROM employees WHERE company_id=? AND is_active=1
    GROUP BY department
""", (COMPANY_ID,)).fetchall()
for d, n, s in deptos:
    print(f"   {d:14s} : {n} personas · {s:,.0f} €")
print()
print(f"  Contratos         : {cur.execute('SELECT COUNT(*) FROM contracts WHERE company_id=?', (COMPANY_ID,)).fetchone()[0]}")
print(f"  Nóminas           : {cur.execute('SELECT COUNT(*) FROM payslips WHERE company_id=?', (COMPANY_ID,)).fetchone()[0]}")
print(f"  Vacaciones        : {cur.execute('SELECT COUNT(*) FROM vacations WHERE company_id=?', (COMPANY_ID,)).fetchone()[0]}")
print(f"  Feedbacks         : {feedback_count}")
print()

# Detectar contratos que vencen pronto (alertas para Vera)
expiring = cur.execute("""
    SELECT e.full_name, c.end_date
    FROM contracts c JOIN employees e ON c.employee_id = e.id
    WHERE c.company_id=? AND c.end_date IS NOT NULL
    AND date(c.end_date) BETWEEN date('now') AND date('now', '+60 days')
""", (COMPANY_ID,)).fetchall()
print(f"  ⚠ Contratos que vencen en 60 días: {len(expiring)}")
for n, d in expiring:
    print(f"     - {n}: {d}")
print()

conn.close()
