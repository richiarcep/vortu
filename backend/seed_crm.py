"""
Seed CRM para Moda Barcelonesa SL (company_id=1)
- 50 contactos realistas españoles (mezcla B2C + algunos B2B)
- 250+ mensajes con sentiment analysis ya procesado por Claude
- 8 entradas de knowledge base
- 5 auto-respuestas
- 1 sentiment report semanal
"""
import sqlite3
import json
import random
from datetime import datetime, timedelta, date

DB = '/Users/eduardofuentes/Desktop/vela/backend/vela.db'
COMPANY_ID = 1

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Limpiar antes de poblar
cur.execute("DELETE FROM messages WHERE company_id = ?", (COMPANY_ID,))
cur.execute("DELETE FROM contacts WHERE company_id = ?", (COMPANY_ID,))
cur.execute("DELETE FROM knowledge_base WHERE company_id = ?", (COMPANY_ID,))
cur.execute("DELETE FROM auto_responses WHERE company_id = ?", (COMPANY_ID,))
cur.execute("DELETE FROM sentiment_reports WHERE company_id = ?", (COMPANY_ID,))
conn.commit()

# ─────────────────────────────────────────────────────────
# 50 CONTACTOS REALISTAS
# ─────────────────────────────────────────────────────────
NOMBRES = [
    "María García López", "Carlos Rodríguez Pérez", "Laura Martínez Sánchez",
    "Javier López Fernández", "Ana Sánchez Gómez", "David Pérez Rodríguez",
    "Carmen González Martín", "Pablo Hernández Jiménez", "Lucía Ruiz Moreno",
    "Sergio Díaz Álvarez", "Elena Muñoz Romero", "Daniel Álvarez Navarro",
    "Sara Romero Torres", "Alejandro Navarro Vázquez", "Marta Torres Ramos",
    "Adrián Vázquez Gil", "Paula Ramos Serrano", "Diego Gil Castro",
    "Andrea Serrano Ortiz", "Marcos Castro Rubio", "Cristina Ortiz Marín",
    "Iván Rubio Núñez", "Patricia Marín Iglesias", "Hugo Núñez Medina",
    "Natalia Iglesias Cortés", "Álvaro Medina Castillo", "Sandra Cortés Garrido",
    "Rubén Castillo Calvo", "Eva Garrido Ortega", "Mario Calvo Herrera",
    "Beatriz Ortega Lozano", "Óscar Herrera Cano", "Raquel Lozano Prieto",
    "Joaquín Cano Reyes", "Silvia Prieto Vega", "Antonio Reyes Crespo",
    "Inés Vega Soto", "Manuel Crespo Pascual", "Verónica Soto Méndez",
    "Boutique Eleganza SL", "Tiendas Aura SL", "Moda Mediterránea SL",
    "Atelier Barcelona SL", "Concept Store Madrid SL",
    "Pilar Méndez Aguilar", "Roberto Pascual Vidal", "Nuria Aguilar Bravo",
    "Fernando Vidal Carmona", "Teresa Bravo Esteban", "Gonzalo Carmona Pardo",
]

EMAILS_DOMAIN = ["gmail.com", "hotmail.com", "yahoo.es", "outlook.es", "icloud.com"]
EMAILS_BIZ = ["empresa.com", "boutique.es", "moda.com"]
PLATAFORMAS = ["email", "whatsapp", "instagram", "facebook", "manual"]
RISK_LEVELS = ["bajo", "bajo", "bajo", "bajo", "medio", "medio", "alto", "critico"]
SENTIMENTS_LAST = ["positive", "positive", "neutral", "neutral", "neutral", "negative", "urgent"]
TRENDS = ["estable", "estable", "estable", "mejorando", "deteriorando"]

contactos_data = []
for i, nombre in enumerate(NOMBRES):
    is_business = "SL" in nombre or "Tiendas" in nombre
    is_vip = i < 8 or is_business  # primeros 8 + todas las empresas

    if is_business:
        nombre_clean = nombre.lower().replace(" sl", "").replace(" ", "")
        email = f"compras@{nombre_clean[:15]}.es"
        platform = "email"
    else:
        first = nombre.split()[0].lower()
        last = nombre.split()[1].lower()
        email = f"{first}.{last}{random.randint(1, 99)}@{random.choice(EMAILS_DOMAIN)}"
        platform = random.choice(PLATAFORMAS)

    phone = f"+34 6{random.randint(10, 99)} {random.randint(100, 999)} {random.randint(100, 999)}"

    # Sentiment score: VIPs y empresas más positivos en general
    if is_vip:
        score = round(random.uniform(7.0, 9.5), 1)
        risk = random.choice(["bajo", "bajo", "bajo", "medio"])
    else:
        score = round(random.uniform(3.5, 8.5), 1)
        risk = random.choice(RISK_LEVELS)

    # Si tiene score bajo, riesgo más alto
    if score < 5:
        risk = random.choice(["alto", "critico"])
    elif score < 6.5:
        risk = random.choice(["medio", "alto"])

    last_sent = random.choice(SENTIMENTS_LAST)
    if score >= 7.5:
        last_sent = random.choice(["positive", "positive", "neutral"])
    elif score < 5:
        last_sent = random.choice(["negative", "urgent"])

    trend = random.choice(TRENDS)
    total_msgs = random.randint(2, 35) if is_vip else random.randint(0, 12)

    # Historial sentiment (últimos 6 puntos)
    history = []
    base_date = datetime.now() - timedelta(days=90)
    base_score = score
    for j in range(6):
        d = base_date + timedelta(days=j * 15)
        variation = random.uniform(-1.5, 1.5)
        s = max(1, min(10, round(base_score + variation, 1)))
        history.append({"date": d.strftime("%Y-%m-%d"), "score": s})

    last_contact = datetime.now() - timedelta(days=random.randint(0, 45))
    created = datetime.now() - timedelta(days=random.randint(30, 730))

    notes = ""
    if is_vip and not is_business:
        notes = random.choice([
            "Cliente fidelizado desde 2024. Prefiere tallas M-L.",
            "VIP. Compras recurrentes. Estilo clásico.",
            "Cliente top. Sensible al precio en rebajas.",
            "",
        ])
    elif is_business:
        notes = "Cliente B2B. Pedidos al por mayor mensuales. Condiciones especiales."

    contactos_data.append((
        COMPANY_ID, nombre, email, phone, platform, 1 if is_vip else 0, notes,
        score, trend, json.dumps(history), risk, last_sent, total_msgs,
        last_contact.isoformat(), created.isoformat()
    ))

cur.executemany("""
    INSERT INTO contacts
    (company_id, name, email, phone, platform, is_vip, notes,
     sentiment_score, sentiment_trend, sentiment_history, risk_level,
     last_sentiment, total_messages, last_contact_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", contactos_data)
conn.commit()
print(f"OK {len(contactos_data)} contactos creados")

# IDs de contactos creados
contact_ids = [r[0] for r in cur.execute(
    "SELECT id FROM contacts WHERE company_id = ? ORDER BY id", (COMPANY_ID,)
).fetchall()]

# ─────────────────────────────────────────────────────────
# 250+ MENSAJES con sentiment ya procesado
# ─────────────────────────────────────────────────────────
MENSAJES_TEMPLATES = {
    "positive": [
        ("Me encanta el último vestido que compré, calidad excelente!", "compliment",
         ["calidad", "vestido"], 0.95, False),
        ("Llegó perfecto y antes de lo esperado, gracias!", "compliment",
         ["envío", "servicio"], 0.92, False),
        ("Vuestra atención al cliente es la mejor que he tenido.", "compliment",
         ["atención"], 0.94, False),
        ("Quiero hacer otro pedido, ¿tenéis la chaqueta beige en talla M?",
         "purchase", ["stock", "producto"], 0.88, False),
        ("La pieza es preciosa, supera mis expectativas.", "compliment",
         ["calidad"], 0.91, False),
    ],
    "neutral": [
        ("¿Cuándo abrís los sábados?", "question", ["horario"], 0.85, False),
        ("¿Hacéis envíos a Andorra?", "question", ["envío"], 0.82, False),
        ("¿Tenéis disponible el modelo del catálogo, ref. 1024?",
         "question", ["stock", "producto"], 0.78, False),
        ("Necesito factura con el NIF de la empresa, gracias.",
         "question", ["facturación"], 0.88, False),
        ("¿Cuál es el plazo de entrega para Barcelona?",
         "question", ["envío", "plazo"], 0.86, False),
    ],
    "negative": [
        ("El pedido llegó tarde y la talla no es la que pedí.",
         "complaint", ["envío", "talla", "error"], 0.91, True),
        ("Llevo 3 días esperando respuesta sobre mi devolución.",
         "complaint", ["devolución", "atención"], 0.93, True),
        ("La calidad del último vestido no es la de siempre, decepcionada.",
         "complaint", ["calidad"], 0.89, True),
        ("Cobrasteis dos veces el pedido, necesito que lo solucionéis.",
         "complaint", ["facturación", "error"], 0.96, True),
    ],
    "urgent": [
        ("URGENTE: el pedido tiene que llegar mañana para una boda, ¿qué solución me dais?",
         "complaint", ["urgente", "envío"], 0.97, True),
        ("Hay un problema grave con mi pedido, llamadme YA por favor.",
         "complaint", ["urgente"], 0.98, True),
        ("Aviso: voy a denunciar el cobro indebido si no responden hoy.",
         "complaint", ["urgente", "facturación"], 0.99, True),
    ],
}

DIRECTIONS = ["inbound"] * 7 + ["outbound"] * 3  # más inbound que outbound
STATUSES_IN = ["pending", "draft_ready", "approved", "auto_sent"]
STATUSES_OUT = ["sent", "approved"]

mensajes_data = []
for cid in contact_ids:
    # Sentiment del contacto
    contact = cur.execute(
        "SELECT sentiment_score, last_sentiment, total_messages, platform FROM contacts WHERE id=?",
        (cid,)
    ).fetchone()
    score, last_sent, total_msg, platform = contact
    n_messages = max(2, min(total_msg, 12))  # 2-12 mensajes por contacto

    for k in range(n_messages):
        # Sentiment distribuido según el perfil del contacto
        if score >= 7.5:
            sentiment = random.choices(["positive", "neutral", "negative"], weights=[6, 3, 1])[0]
        elif score >= 5.5:
            sentiment = random.choices(["positive", "neutral", "negative", "urgent"], weights=[3, 5, 2, 0])[0]
        else:
            sentiment = random.choices(["neutral", "negative", "urgent"], weights=[2, 5, 3])[0]

        template = random.choice(MENSAJES_TEMPLATES[sentiment])
        content, intent, topics, confidence, requires_human = template

        direction = random.choice(DIRECTIONS)
        status = random.choice(STATUSES_IN) if direction == "inbound" else random.choice(STATUSES_OUT)

        urgency = 0
        if sentiment == "urgent":
            urgency = random.randint(8, 10)
        elif sentiment == "negative":
            urgency = random.randint(4, 7)
        elif sentiment == "neutral":
            urgency = random.randint(1, 3)

        ai_draft = None
        if direction == "inbound" and status in ("draft_ready", "approved", "auto_sent"):
            ai_draft = random.choice([
                f"Hola {contact[1] if len(contact) > 1 else ''}, gracias por tu mensaje. {('Sentimos las molestias.' if sentiment in ('negative', 'urgent') else 'Encantados de ayudarte.')} Te respondemos a la mayor brevedad.",
                "Gracias por contactar con Moda Barcelonesa. Estamos revisando tu consulta y te respondemos en menos de 24h.",
                "Buenos días, hemos recibido tu mensaje. Lo derivamos al equipo correspondiente.",
            ])

        msg_date = datetime.now() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
        responded_at = msg_date + timedelta(hours=random.randint(1, 24)) if status in ("approved", "sent", "auto_sent") else None

        mensajes_data.append((
            COMPANY_ID, cid, platform, direction, content, status,
            ai_draft, sentiment, intent, json.dumps(topics), confidence,
            1 if requires_human else 0, urgency,
            responded_at.isoformat() if responded_at else None,
            msg_date.isoformat()
        ))

cur.executemany("""
    INSERT INTO messages
    (company_id, contact_id, platform, direction, content, status,
     ai_draft, ai_sentiment, ai_intent, ai_topics, ai_confidence,
     requires_human, urgency_score, responded_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", mensajes_data)
conn.commit()
print(f"OK {len(mensajes_data)} mensajes creados")

# ─────────────────────────────────────────────────────────
# Knowledge Base
# ─────────────────────────────────────────────────────────
KB = [
    ("Horario de tienda", "Abrimos de lunes a sábado de 10:00 a 21:00. Domingos cerrado.",
     "Información sobre horarios y atención", "faq"),
    ("Política de devoluciones", "Aceptamos devoluciones en 30 días desde la compra con etiqueta intacta y ticket. Reembolso en 5-7 días laborables.",
     "Devoluciones y reembolsos", "policy"),
    ("Envíos nacionales", "Envíos a toda España en 24-48h por mensajería. Gratis a partir de 60€. Coste 4,95€.",
     "Política de envíos", "policy"),
    ("Envíos internacionales", "Enviamos a UE en 3-5 días laborables. Coste según país y peso.",
     "Envíos a Europa", "policy"),
    ("Tallas y guía", "Disponemos de tallas XS, S, M, L y XL. Consulta nuestra guía de tallas en cada producto.",
     "Información de tallas", "general"),
    ("Métodos de pago", "Aceptamos tarjeta, Bizum, PayPal y transferencia. Pago en 3 plazos con Klarna.",
     "Formas de pago", "general"),
    ("Catálogo primavera-verano 2026", "Colección 2026 con tejidos sostenibles. Vestidos, blusas, conjuntos.",
     "Catálogo actual", "product_catalog"),
    ("Programa VIP", "Clientes con más de 500€ al año tienen 10% descuento permanente y eventos exclusivos.",
     "Beneficios VIP", "general"),
]
for title, content, summary, kb_type in KB:
    cur.execute("""
        INSERT INTO knowledge_base (company_id, title, content_summary, full_content, kb_type, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
    """, (COMPANY_ID, title, summary, content, kb_type))
conn.commit()
print(f"OK {len(KB)} entradas de knowledge base")

# ─────────────────────────────────────────────────────────
# Auto-respuestas
# ─────────────────────────────────────────────────────────
AUTO = [
    (["horario", "abierto", "cerrado", "hora"],
     "Hola! Nuestro horario es de lunes a sábado de 10:00 a 21:00. Domingos cerrado. ¿En qué más podemos ayudarte?"),
    (["envío", "envio", "entrega", "plazo"],
     "Los envíos en España son 24-48h. Gratis a partir de 60€ (4,95€ resto). ¿Te puedo ayudar con algo más?"),
    (["devolución", "devolver", "reembolso"],
     "Aceptamos devoluciones en 30 días con ticket. Reembolso en 5-7 días. Inicia desde tu cuenta o respóndenos con el número de pedido."),
    (["talla", "guía"],
     "Tenemos tallas XS, S, M, L y XL. En cada producto encuentras una guía detallada. ¿Buscas alguna prenda en concreto?"),
    (["pago", "pagar", "klarna", "bizum"],
     "Aceptamos tarjeta, Bizum, PayPal, transferencia y Klarna (3 plazos sin intereses)."),
]
for keywords, response in AUTO:
    cur.execute("""
        INSERT INTO auto_responses (company_id, trigger_keywords, response_template, platform, is_active)
        VALUES (?, ?, ?, 'all', 1)
    """, (COMPANY_ID, json.dumps(keywords), response))
conn.commit()
print(f"OK {len(AUTO)} auto-respuestas")

# ─────────────────────────────────────────────────────────
# Sentiment Report semanal
# ─────────────────────────────────────────────────────────
# Calcular stats reales
total_msg = cur.execute("SELECT COUNT(*) FROM messages WHERE company_id=?", (COMPANY_ID,)).fetchone()[0]
pos = cur.execute("SELECT COUNT(*) FROM messages WHERE company_id=? AND ai_sentiment='positive'", (COMPANY_ID,)).fetchone()[0]
neg = cur.execute("SELECT COUNT(*) FROM messages WHERE company_id=? AND ai_sentiment IN ('negative','urgent')", (COMPANY_ID,)).fetchone()[0]
neu = cur.execute("SELECT COUNT(*) FROM messages WHERE company_id=? AND ai_sentiment='neutral'", (COMPANY_ID,)).fetchone()[0]

at_risk = [r[0] for r in cur.execute("""
    SELECT id FROM contacts WHERE company_id=? AND risk_level IN ('alto','critico') LIMIT 5
""", (COMPANY_ID,)).fetchall()]

overall = round((pos * 9 + neu * 5 + neg * 2) / max(total_msg, 1), 1)

cur.execute("""
    INSERT INTO sentiment_reports
    (company_id, week_of, overall_score, clients_at_risk, trending_topics,
     claude_narrative, total_messages, positive_pct, negative_pct, neutral_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
    COMPANY_ID, date.today().isoformat(), overall, json.dumps(at_risk),
    json.dumps(["envío", "calidad", "tallas", "atención"]),
    f"Esta semana hemos procesado {total_msg} mensajes. El sentimiento general es {'positivo' if overall >= 6.5 else 'mixto'} con un {round(pos*100/total_msg)}% positivos. Hay {len(at_risk)} clientes en riesgo que requieren atención prioritaria.",
    total_msg,
    round(pos * 100 / max(total_msg, 1), 1),
    round(neg * 100 / max(total_msg, 1), 1),
    round(neu * 100 / max(total_msg, 1), 1),
))
conn.commit()
print(f"OK sentiment report semanal generado")

# ─────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────
print("\n══════════════════════════════════════════")
print("  SEED CRM COMPLETADO")
print("══════════════════════════════════════════")
print(f"  Contactos      : {cur.execute('SELECT COUNT(*) FROM contacts WHERE company_id=?', (COMPANY_ID,)).fetchone()[0]}")
print(f"  VIPs           : {cur.execute('SELECT COUNT(*) FROM contacts WHERE company_id=? AND is_vip=1', (COMPANY_ID,)).fetchone()[0]}")
print(f"  En riesgo      : {cur.execute('SELECT COUNT(*) FROM contacts WHERE company_id=? AND risk_level IN (\"alto\",\"critico\")', (COMPANY_ID,)).fetchone()[0]}")
print(f"  Mensajes total : {cur.execute('SELECT COUNT(*) FROM messages WHERE company_id=?', (COMPANY_ID,)).fetchone()[0]}")
print(f"   - Positivos   : {pos}")
print(f"   - Neutrales   : {neu}")
print(f"   - Negativos   : {neg}")
print(f"  Knowledge base : {cur.execute('SELECT COUNT(*) FROM knowledge_base WHERE company_id=?', (COMPANY_ID,)).fetchone()[0]}")
print(f"  Auto-respuestas: {cur.execute('SELECT COUNT(*) FROM auto_responses WHERE company_id=?', (COMPANY_ID,)).fetchone()[0]}")
print()

conn.close()
