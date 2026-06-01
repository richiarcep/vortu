"""
Seed: 8 proyectos realistas para Moda Barcelonesa SL (company_id=1)
+ ~50 tareas asignadas a empleados existentes
"""
import sqlite3
from datetime import datetime, date, timedelta
import random
import json

random.seed(42)
DB = '/Users/eduardofuentes/Desktop/vortu/backend/nexum.db'
COMPANY_ID = 1

conn = sqlite3.connect(DB)
c = conn.cursor()

# Limpiar
c.execute("DELETE FROM tasks WHERE company_id=?", (COMPANY_ID,))
c.execute("DELETE FROM project_expenses WHERE project_id IN (SELECT id FROM projects WHERE company_id=?)", (COMPANY_ID,))
c.execute("DELETE FROM projects WHERE company_id=?", (COMPANY_ID,))

# Obtener empleados
c.execute("SELECT id, full_name, department FROM employees WHERE company_id=?", (COMPANY_ID,))
employees = c.fetchall()
print(f"Empleados disponibles: {len(employees)}")

# Por departamento
def emp_by_dept(dept):
    return [e for e in employees if e[2] == dept]

today = date.today()

# ─────────────────────────────────────────────
# PROYECTOS
# ─────────────────────────────────────────────
PROJECTS = [
    {
        "name": "Lanzamiento web v3.0",
        "description": "Rediseño completo de la web e-commerce con nuevo checkout, mejor performance y diseño mobile-first.",
        "client_name": "Interno",
        "status": "active",
        "start_date": today - timedelta(days=45),
        "deadline": today + timedelta(days=20),
        "budget": 18000,
        "health_score": 72,
        "completion_percentage": 65,
        "last_ai_analysis": "El proyecto avanza según lo previsto pero hay riesgo en el módulo de pagos. Recomiendo asignar más recursos a Tecnología las próximas 2 semanas.",
        "priority_dept": "tecnologia",
    },
    {
        "name": "Black Friday 2026",
        "description": "Campaña integral de Black Friday: pricing strategy, landing pages, email marketing, ads, atención al cliente reforzada.",
        "client_name": "Interno",
        "status": "active",
        "start_date": today - timedelta(days=15),
        "deadline": today + timedelta(days=35),
        "budget": 25000,
        "health_score": 88,
        "completion_percentage": 35,
        "last_ai_analysis": "Excelente arranque. Los copies aprobados están alineados con el tono Vortu. Próximo riesgo: bottleneck en diseño de assets.",
        "priority_dept": "marketing",
    },
    {
        "name": "Apertura tienda Madrid",
        "description": "Apertura física en Calle Serrano. Incluye búsqueda local, contratos, mobiliario, contratación, plan marketing local.",
        "client_name": "Interno",
        "status": "active",
        "start_date": today - timedelta(days=80),
        "deadline": today + timedelta(days=10),
        "budget": 85000,
        "health_score": 45,
        "completion_percentage": 78,
        "last_ai_analysis": "URGENTE: Riesgo alto. Faltan permisos municipales y la contratación va con 3 semanas de retraso. Considera retrasar apertura o pedir ayuda externa.",
        "priority_dept": "admin",
    },
    {
        "name": "Colección Primavera 2026",
        "description": "Diseño, prototipado y producción de 24 nuevas referencias para la temporada Primavera-Verano.",
        "client_name": "Interno",
        "status": "active",
        "start_date": today - timedelta(days=60),
        "deadline": today + timedelta(days=45),
        "budget": 32000,
        "health_score": 81,
        "completion_percentage": 55,
        "last_ai_analysis": "Diseño va bien. Importante: verificar timing con proveedores asiáticos antes de cerrar muestras finales.",
        "priority_dept": "diseno",
    },
    {
        "name": "Auditoría LOPD/GDPR",
        "description": "Auditoría completa de protección de datos: contratos clientes, formularios web, política de cookies, DPO externo.",
        "client_name": "Bufete García & Asociados",
        "status": "active",
        "start_date": today - timedelta(days=20),
        "deadline": today + timedelta(days=15),
        "budget": 4500,
        "health_score": 92,
        "completion_percentage": 70,
        "last_ai_analysis": "Sin riesgos. La consultora externa cumple plazos. Solo falta firmar contrato del DPO antes del cierre.",
        "priority_dept": "admin",
    },
    {
        "name": "Programa fidelización VIP",
        "description": "Crear sistema de niveles, puntos canjeables, eventos exclusivos y app móvil para clientes VIP (top 13).",
        "client_name": "Interno",
        "status": "active",
        "start_date": today - timedelta(days=10),
        "deadline": today + timedelta(days=75),
        "budget": 12000,
        "health_score": 78,
        "completion_percentage": 20,
        "last_ai_analysis": "Recién iniciado. Las 13 cuentas VIP están identificadas. Próximo paso: encuesta para definir beneficios deseados.",
        "priority_dept": "ventas",
    },
    {
        "name": "Migración ERP a Vortu",
        "description": "Migración completa de Holded a Vortu: facturación, contabilidad, CRM, RRHH, integración con TPV de tienda.",
        "client_name": "Interno",
        "status": "completed",
        "start_date": today - timedelta(days=120),
        "deadline": today - timedelta(days=15),
        "budget": 8000,
        "health_score": 95,
        "completion_percentage": 100,
        "last_ai_analysis": "Proyecto completado con éxito. Migración limpia, equipo formado, datos íntegros.",
        "priority_dept": "tecnologia",
    },
    {
        "name": "Rebranding logo 2026",
        "description": "Actualización del logo, paleta de colores y materiales corporativos para alinear con nuevo posicionamiento premium.",
        "client_name": "Estudio Brandlab",
        "status": "paused",
        "start_date": today - timedelta(days=40),
        "deadline": today + timedelta(days=60),
        "budget": 6500,
        "health_score": 60,
        "completion_percentage": 30,
        "last_ai_analysis": "Pausado a la espera de validación de dirección sobre 3 propuestas finales. Recomendado retomar en 1 semana.",
        "priority_dept": "diseno",
    },
]

# Insertar proyectos
project_ids = []
for p in PROJECTS:
    c.execute("""
        INSERT INTO projects (company_id, name, description, client_name, status,
                              start_date, deadline, budget, health_score, completion_percentage,
                              last_ai_analysis, last_analyzed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        COMPANY_ID, p['name'], p['description'], p['client_name'], p['status'],
        p['start_date'], p['deadline'], p['budget'], p['health_score'], p['completion_percentage'],
        p['last_ai_analysis'], datetime.now(), datetime.now(), datetime.now(),
    ))
    pid = c.lastrowid
    project_ids.append((pid, p))
    print(f"  ✓ Proyecto: {p['name']} (health: {p['health_score']}, completion: {p['completion_percentage']}%)")

# ─────────────────────────────────────────────
# TAREAS por proyecto
# ─────────────────────────────────────────────
TASK_TEMPLATES = {
    "Lanzamiento web v3.0": [
        ("Diseño wireframes mobile", "Diseñar todos los wireframes para versión móvil", "done", "high", 16),
        ("Diseño visual desktop", "Aplicar identidad visual a wireframes desktop", "done", "high", 24),
        ("Setup Next.js 16 + Tailwind", "Configurar proyecto base con stack nuevo", "done", "high", 8),
        ("Migración productos a nueva BD", "Migrar 15 productos con sus variantes e imágenes", "done", "medium", 12),
        ("Integración pasarela de pago", "Integrar Stripe + Bizum + transferencia", "in_progress", "urgent", 20),
        ("Optimización Core Web Vitals", "LCP < 2.5s, CLS < 0.1, FID < 100ms", "in_progress", "high", 16),
        ("QA cross-browser", "Testing en Chrome/Safari/Firefox/Edge", "todo", "medium", 12),
        ("Setup analytics GA4 + Hotjar", "Configurar tracking completo", "todo", "low", 6),
        ("Deploy producción", "Migración DNS y deploy final", "todo", "urgent", 4),
    ],
    "Black Friday 2026": [
        ("Definir descuentos por categoría", "Estrategia de pricing por producto", "done", "high", 8),
        ("Diseño landing principal", "Landing hero + 6 secciones", "in_progress", "high", 16),
        ("Diseño 10 banners ads", "Para Google, Meta e Instagram", "in_progress", "medium", 20),
        ("Copies email campaign x5", "Secuencia de 5 emails con Vera", "todo", "medium", 8),
        ("Setup Google Ads campañas", "5 campañas con A/B test", "todo", "high", 12),
        ("Setup Meta Ads campañas", "3 campañas + retargeting", "todo", "high", 10),
        ("Briefing atención al cliente", "Formación equipo en políticas BF", "todo", "medium", 4),
        ("Análisis post-Black Friday", "Métricas y aprendizajes", "todo", "low", 6),
    ],
    "Apertura tienda Madrid": [
        ("Búsqueda local óptimo", "Visitar 15 locales en Serrano/Goya", "done", "urgent", 40),
        ("Negociación alquiler", "Firma contrato a 5 años", "done", "urgent", 12),
        ("Permisos licencia apertura", "Tramitación ayuntamiento", "in_progress", "urgent", 24),
        ("Diseño interior tienda", "Layout, mobiliario, iluminación", "in_progress", "high", 32),
        ("Contratación 3 vendedores", "Selección + onboarding", "todo", "urgent", 20),
        ("Stock inicial tienda", "Reparto desde almacén central", "todo", "high", 16),
        ("Plan marketing inauguración", "Evento, prensa, influencers", "todo", "high", 24),
        ("Setup TPV + Vortu integración", "Hardware + software", "todo", "high", 8),
    ],
    "Colección Primavera 2026": [
        ("Investigación tendencias SS26", "Trend reports + competidores", "done", "medium", 16),
        ("Sketches 24 referencias", "Bocetos de toda la colección", "done", "high", 40),
        ("Prototipos 24 piezas", "Confección de muestras", "in_progress", "high", 80),
        ("Sesión fotos catálogo", "Producción foto en estudio", "todo", "medium", 16),
        ("Brief proveedores asia", "Specs técnicas para producción", "todo", "high", 12),
        ("Definir pricing y márgenes", "Análisis costos + competencia", "todo", "high", 8),
    ],
    "Auditoría LOPD/GDPR": [
        ("Auditoría formularios web", "Revisión todos los formularios", "done", "high", 8),
        ("Actualización política privacidad", "Nuevo documento legal", "done", "medium", 6),
        ("Banner cookies actualizado", "Banner conforme normativa 2026", "in_progress", "high", 4),
        ("Contratación DPO externo", "Selección y firma contrato", "todo", "urgent", 8),
        ("Formación equipo en LOPD", "Workshop 2h para todo el equipo", "todo", "medium", 4),
    ],
    "Programa fidelización VIP": [
        ("Identificar clientes VIP top 13", "Análisis LTV + frecuencia", "done", "high", 4),
        ("Diseño niveles del programa", "3 tiers con beneficios", "in_progress", "medium", 8),
        ("Encuesta beneficios deseados", "Entrevistas con los 13 VIPs", "todo", "high", 12),
        ("Spec técnica app móvil", "Documentar features y flows", "todo", "medium", 16),
        ("Diseño visual programa", "Material gráfico + UI app", "todo", "low", 20),
    ],
    "Migración ERP a Vortu": [
        ("Export datos Holded", "Exportar facturas, clientes, productos", "done", "high", 8),
        ("Import a Vortu", "Importación con mapeo de campos", "done", "high", 12),
        ("Validación integridad datos", "QA exhaustivo de datos migrados", "done", "high", 16),
        ("Formación equipo", "4 sesiones de 2h al equipo", "done", "medium", 8),
        ("Cierre cuenta Holded", "Cancelación servicio antiguo", "done", "low", 2),
    ],
    "Rebranding logo 2026": [
        ("Brief al estudio externo", "Documento con dirección creativa", "done", "high", 6),
        ("Recibir 3 propuestas", "Evaluación con dirección", "done", "high", 4),
        ("Decisión final logo", "PAUSADO - esperando dirección", "todo", "medium", 2),
        ("Manual de marca", "Guía de uso + variantes", "todo", "medium", 16),
        ("Aplicación a materiales", "Tarjetas, packaging, web", "todo", "low", 24),
    ],
}

total_tasks = 0
for pid, p in project_ids:
    tasks = TASK_TEMPLATES.get(p['name'], [])
    dept_emps = emp_by_dept(p['priority_dept']) or employees

    for title, desc, status, priority, est_h in tasks:
        # Asignar a empleado random del depto prioritario
        assigned_id = random.choice(dept_emps)[0] if dept_emps else None

        # Fecha vencimiento basada en deadline del proyecto
        if status == 'done':
            due = p['deadline'] - timedelta(days=random.randint(20, 60))
            actual_h = est_h * random.uniform(0.85, 1.2)
        elif status == 'in_progress':
            due = today + timedelta(days=random.randint(3, 15))
            actual_h = est_h * random.uniform(0.3, 0.7)
        else:
            due = today + timedelta(days=random.randint(5, 30))
            actual_h = 0

        c.execute("""
            INSERT INTO tasks (project_id, company_id, title, description, status, priority,
                               assigned_to, due_date, estimated_hours, actual_hours,
                               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pid, COMPANY_ID, title, desc, status, priority,
            assigned_id, due, est_h, round(actual_h, 1),
            datetime.now() - timedelta(days=random.randint(1, 60)),
            datetime.now(),
        ))
        total_tasks += 1

# ─────────────────────────────────────────────
# GASTOS de proyectos
# ─────────────────────────────────────────────
EXPENSES = [
    (1, "Hosting nuevo servidor", 480),
    (1, "Licencias herramientas dev", 320),
    (2, "Producción fotográfica BF", 2400),
    (2, "Influencer marketing", 1800),
    (3, "Alquiler local 2 meses", 8400),
    (3, "Mobiliario inicial", 12500),
    (3, "Permisos municipales", 1200),
    (4, "Muestras telas", 2800),
    (5, "Consultoría legal externa", 1500),
    (6, "Plataforma app móvil", 600),
    (7, "Consultoría migración", 1800),
    (8, "Anticipo estudio", 1500),
]

for pid_idx, concept, amount in EXPENSES:
    if pid_idx <= len(project_ids):
        pid = project_ids[pid_idx - 1][0]
        c.execute(
            "INSERT INTO project_expenses (project_id, company_id, description, amount, date, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                pid, COMPANY_ID, concept, amount,
                today - timedelta(days=random.randint(10, 60)),
                'general',
                datetime.now(),
            )
        )

conn.commit()

# Verificar
c.execute("SELECT COUNT(*) FROM projects WHERE company_id=?", (COMPANY_ID,))
n_proj = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM tasks WHERE company_id=?", (COMPANY_ID,))
n_tasks = c.fetchone()[0]
c.execute("SELECT AVG(health_score), AVG(completion_percentage) FROM projects WHERE company_id=? AND status='active'", (COMPANY_ID,))
avg_h, avg_c = c.fetchone()
c.execute("SELECT COUNT(*) FROM projects WHERE company_id=? AND health_score < 60 AND status='active'", (COMPANY_ID,))
n_risk = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM tasks WHERE company_id=? AND status != 'done' AND due_date < ?", (COMPANY_ID, today))
n_overdue = c.fetchone()[0]

conn.close()

print(f"\n✅ SEED COMPLETO:")
print(f"   {n_proj} proyectos")
print(f"   {n_tasks} tareas")
print(f"   Health promedio (activos): {avg_h:.1f}")
print(f"   Completion promedio (activos): {avg_c:.1f}%")
print(f"   Proyectos en riesgo: {n_risk}")
print(f"   Tareas vencidas: {n_overdue}")
print(f"\nLISTO. Refresca /proyectos para verlo.")
