"""
seed_demo_sv.py  —  Comercial San Salvador SA de CV
Empresa salvadorena de distribucion de productos de oficina y tecnologia.
Run: python seed_demo_sv.py
"""
import os, sys, random, math
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexum.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine  = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)
db      = Session()
random.seed(503)

def rnd(lo, hi):  return round(random.uniform(lo, hi), 2)
def ri(lo, hi):   return random.randint(lo, hi)
def rc(items):    return random.choice(items)
def now():        return datetime.utcnow()

def months_range(n=24):
    today = date.today()
    return [(today - relativedelta(months=i), i) for i in range(n-1, -1, -1)]

def season_factor(month_num):
    """Pico en Mar, Ago (vacacion agostina SV), Nov-Dic (cierre)."""
    return 1.0 + 0.22 * math.sin(2 * math.pi * (month_num - 2) / 12)

def growth_factor(t, rate=0.009):
    return 1.0 + rate * t

# En SV moneda es USD. Precios realistas en dolares.
LINE_CFG = {
    "Papeleria":    {"base": 4200,  "eta": 0.07, "mkt_base": 280, "season": 1.05, "margin": 0.38},
    "Tecnologia":   {"base": 7600,  "eta": 0.11, "mkt_base": 560, "season": 1.00, "margin": 0.28},
    "Mobiliario":   {"base": 3300,  "eta": 0.09, "mkt_base": 230, "season": 0.95, "margin": 0.42},
    "Consumibles":  {"base": 2400,  "eta": 0.06, "mkt_base": 140, "season": 1.10, "margin": 0.55},
}

COMPANY_NAME = "Comercial San Salvador SA de CV"
COMPANY_EMAIL = "contacto@comercialsansalvador.sv"
LOGIN_EMAIL = "demo@comercialsansalvador.sv"
EMAIL_DOM = "comercialsansalvador.sv"

print("\n" + "="*60)
print("  VORTU SEED SV — " + COMPANY_NAME)
print("="*60 + "\n")

# 1. Limpiar datos previos
print("[0/12] Limpiando datos previos...")
existing = db.execute(text("SELECT id FROM companies WHERE name=:n"),{"n":COMPANY_NAME}).fetchone()
if existing:
    CID = existing[0]
    for tbl in [
        "profit_optimizer_runs","profit_optimizer_inputs",
        "profit_optimizer_products","profit_optimizer_lines",
        "sale_items","sales","cost_entries","cost_departments",
        "cost_categories","registro_diario","marketing_campaigns",
        "messages","contacts","employee_feedback","employees",
        "tasks","project_expenses","projects","documents",
        "products","business_snapshots","business_ai_memory",
        "accounts","journal_entries","transactions",
    ]:
        try:
            db.execute(text(f"DELETE FROM {tbl} WHERE company_id={CID}"))
        except Exception:
            try:
                db.execute(text(f"DELETE FROM {tbl} WHERE user_id IN (SELECT id FROM users WHERE company_id={CID})"))
            except Exception:
                pass
    db.execute(text(f"DELETE FROM users WHERE company_id={CID}"))
    db.execute(text(f"DELETE FROM companies WHERE id={CID}"))
    db.commit()
    print("  datos previos eliminados")

# 2. Company + User
print("\n[1/12] Empresa + usuario...")
db.execute(text("""
    INSERT INTO companies (name,email,country,created_at)
    VALUES (:name,:email,'SV',:now)
"""),{"name":COMPANY_NAME,"email":COMPANY_EMAIL,"now":now()})
db.commit()
CID = db.execute(text("SELECT id FROM companies WHERE name=:n"),{"n":COMPANY_NAME}).fetchone()[0]

sys.path.insert(0, os.getcwd())
try:
    from core.security import hash_password
    hashed = hash_password("demo1234")
except Exception:
    import bcrypt
    hashed = bcrypt.hashpw(b"demo1234", bcrypt.gensalt()).decode()

db.execute(text("""
    INSERT INTO users (email,hashed_password,full_name,is_active,is_admin,company_id,created_at)
    VALUES (:email,:pwd,'Carlos Alberto Mejia Portillo',1,1,:cid,:now)
"""),{"email":LOGIN_EMAIL,"pwd":hashed,"cid":CID,"now":now()})
db.commit()
UID = db.execute(text("SELECT id FROM users WHERE email=:e"),{"e":LOGIN_EMAIL}).fetchone()[0]
print(f"  company_id={CID}  user_id={UID}")
print(f"  login: {LOGIN_EMAIL} / demo1234")

# 3. Productos (precios en USD, IVA 13%)
print("\n[2/12] Productos...")
PRODUCTS = [
    # Papeleria
    ("Resma Papel Carta 500h",       "Papeleria",   6.50,  3.10, 13, 500, 80, 2.1),
    ("Resma Papel Oficio 500h",      "Papeleria",   7.20,  3.45, 13, 450, 70, 2.1),
    ("Folder Manila c/100",          "Papeleria",   11.00, 5.00, 13, 300, 50, 1.8),
    ("Cuaderno profesional 100h",    "Papeleria",   2.75,  1.10, 13, 600, 100,1.9),
    ("Boligrafo Azul c/12",          "Papeleria",   3.80,  1.40, 13, 800, 150,1.6),
    ("Cinta adhesiva c/10",          "Papeleria",   5.20,  2.00, 13, 400, 60, 1.7),
    ("Engrapadora metalica",         "Papeleria",   9.50,  4.10, 13, 200, 30, 2.3),
    ("Tijeras oficina 21cm",         "Papeleria",   3.60,  1.45, 13, 250, 40, 1.8),
    # Tecnologia
    ("Laptop HP 15 Core i5",         "Tecnologia",  720.00, 530.00, 13, 60, 8, 3.5),
    ("Monitor LG 24 Full HD",        "Tecnologia",  185.00, 132.00, 13, 80, 10, 3.2),
    ("Teclado inalambrico Logitech", "Tecnologia",  33.00,  18.50, 13, 150, 20, 2.4),
    ("Mouse inalambrico",            "Tecnologia",  18.50,  9.80,  13, 200, 30, 2.2),
    ("Webcam HD 1080p",              "Tecnologia",  45.00,  24.80, 13, 100, 15, 2.8),
    ("Auriculares con microfono",    "Tecnologia",  37.50,  20.60, 13, 120, 18, 2.6),
    ("Hub USB-C 7 puertos",          "Tecnologia",  24.00,  12.60, 13, 180, 25, 2.3),
    ("Impresora HP LaserJet",        "Tecnologia",  260.00, 185.00, 13, 40, 5, 3.8),
    # Mobiliario
    ("Silla ejecutiva ergonomica",   "Mobiliario",  220.00, 121.00, 13, 50, 6, 4.2),
    ("Escritorio melamina 120cm",    "Mobiliario",  160.00, 86.00,  13, 40, 5, 4.0),
    ("Librero 5 entrepanos",         "Mobiliario",  104.00, 55.00,  13, 60, 8, 3.5),
    ("Archivero 4 cajones",          "Mobiliario",  127.00, 69.00,  13, 45, 6, 3.8),
    ("Mesa de juntas 8 personas",    "Mobiliario",  490.00, 288.00, 13, 20, 3, 5.2),
    ("Silla de visita tapizada",     "Mobiliario",  56.00,  30.00,  13, 80, 10, 3.2),
    # Consumibles
    ("Toner HP 85A Negro",           "Consumibles", 39.00,  16.70, 13, 200, 30, 2.5),
    ("Toner Canon 328",              "Consumibles", 35.60,  15.20, 13, 180, 25, 2.4),
    ("Cartucho Epson T664 Negro",    "Consumibles", 11.20,  4.30,  13, 300, 50, 2.1),
    ("Cartucho Epson T664 Color",    "Consumibles", 12.10,  4.70,  13, 280, 45, 2.2),
    ("Papel fotografico A4 c/20",    "Consumibles", 8.30,   3.15,  13, 250, 40, 1.9),
    ("Limpiador pantallas c/50",     "Consumibles", 5.45,   2.00,  13, 350, 60, 1.7),
]

product_ids = {}
for name,line,price,cost,iva,stock,thresh,eps in PRODUCTS:
    db.execute(text("""
        INSERT INTO products
        (company_id,name,category,sale_price,cost_price,iva_rate,
         stock_quantity,low_stock_threshold,is_active,created_at,updated_at)
        VALUES (:cid,:name,:cat,:sale,:cost,:iva,:stock,:thresh,1,:now,:now)
    """),{"cid":CID,"name":name,"cat":line,"sale":price,"cost":cost,
          "iva":iva,"stock":stock,"thresh":thresh,"now":now()})
    db.commit()
    product_ids[name] = db.execute(text(
        "SELECT id FROM products WHERE name=:n AND company_id=:cid"
    ),{"n":name,"cid":CID}).fetchone()[0]
print(f"  {len(product_ids)} productos creados")

# 4. Ventas realistas 24 meses
print("\n[3/12] Ventas 24 meses con estacionalidad...")
PAYMENT_METHODS = ["efectivo","tarjeta","transferencia","cheque"]

monthly_mkt = {}
for t_idx,(month_date,months_ago) in enumerate(months_range(24)):
    for line_name,cfg in LINE_CFG.items():
        mkt = cfg["mkt_base"] * growth_factor(t_idx,0.007) * (1+random.uniform(-0.08,0.08))
        monthly_mkt[(t_idx,line_name)] = round(mkt,2)

line_products = {}
for name,line,price,cost,iva,stock,thresh,eps in PRODUCTS:
    line_products.setdefault(line, []).append((name,price,cost,iva,eps))

total_sales = 0
total_revenue = 0.0

for t_idx,(month_date,months_ago) in enumerate(months_range(24)):
    m  = month_date.month
    sf = season_factor(m)
    gf = growth_factor(t_idx)

    for line_name,cfg in LINE_CFG.items():
        mkt_spend  = monthly_mkt[(t_idx,line_name)]
        mkt_effect = 1 + cfg["eta"] * math.log(1 + mkt_spend/cfg["mkt_base"])
        prods = line_products[line_name]
        sale_days = sorted(random.sample(range(1,29), min(20,28)))

        prod_rev_targets = {}
        for pname,pprice,pcost,piva,peps in prods:
            price_mult = (0.92 if m in [1,8] else 1.07 if m in [11,12] else 1.0)*(1+random.uniform(-0.02,0.02))
            prod_rev_targets[pname] = {"price":round(pprice*price_mult,2),"iva":piva}

        for day in sale_days:
            try:
                sale_date = month_date.replace(day=day)
            except ValueError:
                continue
            if sale_date > date.today():
                continue

            n_transactions = ri(1, int(3*sf))
            for _ in range(n_transactions):
                payment = rc(PAYMENT_METHODS)
                n_items = ri(1,3)
                selected = random.sample(prods, min(n_items,len(prods)))
                subtotal=0.0; iva_amount=0.0; items_data=[]

                for pname,pprice,pcost,piva,peps in selected:
                    price = prod_rev_targets[pname]["price"]
                    qty   = ri(1,5)
                    iva   = round(price*qty*piva/(100+piva),2)
                    line_total = round(price*qty,2)
                    subtotal   += line_total - iva
                    iva_amount += iva
                    items_data.append((product_ids[pname],qty,price,piva,line_total))
                    total_revenue += line_total

                subtotal   = round(subtotal,2)
                iva_amount = round(iva_amount,2)
                total      = round(subtotal+iva_amount,2)

                db.execute(text("""
                    INSERT INTO sales
                    (company_id,sale_date,sale_time,payment_method,
                     subtotal,iva_amount,total,created_at)
                    VALUES (:cid,:date,:time,:pay,:sub,:iva,:tot,:now)
                """),{"cid":CID,"date":sale_date,
                      "time":f"{ri(8,19):02d}:{ri(0,59):02d}:00",
                      "pay":payment,"sub":subtotal,"iva":iva_amount,
                      "tot":total,"now":now()})
                db.commit()
                sid = db.execute(text(
                    "SELECT id FROM sales WHERE company_id=:cid ORDER BY id DESC LIMIT 1"
                ),{"cid":CID}).fetchone()[0]

                for pid,qty,price,iva_rate,line_total in items_data:
                    db.execute(text("""
                        INSERT INTO sale_items
                        (sale_id,product_id,company_id,quantity,
                         unit_price,iva_rate,line_total,created_at)
                        VALUES (:sid,:pid,:cid,:qty,:price,:iva,:line,:now)
                    """),{"sid":sid,"pid":pid,"cid":CID,"qty":qty,
                          "price":price,"iva":iva_rate,"line":line_total,"now":now()})
                db.commit()
                total_sales += 1

print(f"  {total_sales} ventas / USD ${total_revenue:,.0f} revenue total")

# 5. Campanas de marketing
print("\n[4/12] Campanas de marketing...")
camp_count = 0
for t_idx,(month_date,months_ago) in enumerate(months_range(24)):
    if months_ago == 0:
        continue
    for line_name,cfg in LINE_CFG.items():
        mkt_spend = monthly_mkt[(t_idx,line_name)]
        camp_name = f"{line_name} — {month_date.strftime('%b %Y')}"
        ex = db.execute(text(
            "SELECT id FROM marketing_campaigns WHERE name=:n AND user_id=:uid"
        ),{"n":camp_name,"uid":UID}).fetchone()
        if ex:
            camp_count += 1
            continue
        start  = month_date.replace(day=1)
        end    = (start + relativedelta(months=1)) - timedelta(days=1)
        status = "completed" if months_ago > 1 else "active"
        db.execute(text("""
            INSERT INTO marketing_campaigns
            (user_id,name,objective,status,budget_total,budget_daily,
             start_date,end_date,platforms,created_at,updated_at)
            VALUES (:uid,:name,:obj,:status,:btot,:bdaily,:start,:end,:plat,:now,:now)
        """),{"uid":UID,"name":camp_name,"obj":f"ventas_{line_name.lower()}",
              "status":status,"btot":mkt_spend,"bdaily":round(mkt_spend/28,2),
              "start":start,"end":end,
              "plat":'["google","meta","linkedin"]',"now":now()})
        camp_count += 1
db.commit()
print(f"  {camp_count} campanas creadas")

# 6. Empleados (salarios USD, contexto SV: ISSS/AFP)
print("\n[5/12] Empleados...")
EMPLOYEES = [
    ("Carlos Alberto Mejia Portillo", "Direccion",    "Director General",       2800),
    ("Ana Cecilia Rodriguez Flores",  "Ventas",       "Gerente de Ventas",      1650),
    ("Jose Mauricio Campos Lopez",    "Ventas",       "Ejecutivo de Ventas",    900),
    ("Wendy Beatriz Alvarado Diaz",   "Ventas",       "Ejecutiva de Ventas",    900),
    ("Oscar Armando Henriquez Mejia", "Almacen",      "Jefe de Almacen",        850),
    ("Karla Patricia Guevara Cruz",   "Almacen",      "Auxiliar de Almacen",    420),
    ("Roberto Carlos Najera Pena",    "Marketing",    "Coordinador Marketing",  1100),
    ("Sandra Lorena Martinez Reyes",  "Contabilidad", "Contadora General",      1250),
    ("Edwin Alexander Sosa Ramirez",  "Compras",      "Jefe de Compras",        1000),
    ("Gloria Esperanza Cruz Molina",  "RRHH",         "Responsable RRHH",       950),
]
employee_ids = []
for name,dept,pos,sal in EMPLOYEES:
    db.execute(text("""
        INSERT INTO employees
        (full_name,email,department,position,gross_salary,is_active,company_id,created_at)
        VALUES (:name,:email,:dept,:pos,:sal,1,:cid,:now)
    """),{"name":name,
          "email":name.lower().replace(" ",".")+"@"+EMAIL_DOM,
          "dept":dept,"pos":pos,"sal":sal,"cid":CID,"now":now()})
    db.commit()
    employee_ids.append(db.execute(text(
        "SELECT id FROM employees WHERE full_name=:n AND company_id=:cid"
    ),{"n":name,"cid":CID}).fetchone()[0])

feedback_texts = {
    "positivo": ["Muy buen ambiente este mes","El equipo trabaja muy bien","Estoy satisfecho con los resultados","Las ventas han superado la meta"],
    "neutro":   ["La carga de trabajo es razonable","Todo en orden este periodo","Sin novedades relevantes"],
    "negativo": ["Necesitamos mas personal en almacen","La comunicacion entre areas puede mejorar","Ha sido un mes muy demandante"],
}
for eid in employee_ids:
    for _ in range(ri(4,8)):
        sent = rc(["positivo","positivo","neutro","negativo"])
        db.execute(text("""
            INSERT INTO employee_feedback
            (employee_id,content,sentiment,sentiment_score,created_at)
            VALUES (:eid,:content,:sent,:score,:now)
        """),{"eid":eid,"content":rc(feedback_texts[sent]),"sent":sent,
              "score":{"positivo":rnd(0.65,0.95),"neutro":rnd(0.40,0.65),"negativo":rnd(0.10,0.40)}[sent],
              "now":now()-timedelta(days=ri(0,180))})
db.commit()
print(f"  {len(employee_ids)} empleados + feedback creados")

# 7. Clientes salvadorenos
print("\n[6/12] Clientes + mensajes...")
CUSTOMERS = [
    ("Grupo Comercial Cuscatlan",      "compras@gccuscatlan.sv",     "+50322500001","email",     True),
    ("Corporacion Pipil SA de CV",     "adquisiciones@pipil.sv",     "+50322500002","email",     True),
    ("Bufete Juridico Melendez",       "admin@bufetemelendez.sv",    "+50322500003","whatsapp",  False),
    ("Hospital de Diagnostico SS",     "suministros@hdiagnostico.sv","+50322500004","email",     True),
    ("Constructora Salvadorena SA",    "compras@construsal.sv",      "+50322500005","email",     True),
    ("Universidad Centroamericana",    "adquisiciones@uca.edu.sv",   "+50322500006","email",     False),
    ("Restaurantes Pollo Campestre",   "operaciones@campestre.sv",   "+50322500007","whatsapp",  False),
    ("Farmacias UNO El Salvador",      "compras@farmaciasuno.sv",    "+50322500008","email",     True),
    ("Agencia Creativa La Ceiba",      "hola@laceiba.sv",            "+50322500009","instagram", False),
    ("Transportes del Pacifico SV",    "logistica@transpacsv.sv",    "+50322500010","email",     False),
]
contact_ids = []
msg_templates = [
    "Tienen disponibilidad de laptops HP para entrega inmediata?",
    "Necesitamos cotizacion para 50 sillas ergonomicas",
    "Cual es el tiempo de entrega en San Salvador?",
    "Cuando tienen el proximo lote de toner HP?",
    "Muy satisfechos con la ultima entrega, gracias",
    "Podemos negociar credito a 30 dias?",
    "Requerimos comprobante de credito fiscal (CCF)",
    "Tienen catalogo 2026 actualizado?",
]
for name,email,phone,platform,is_vip in CUSTOMERS:
    db.execute(text("""
        INSERT INTO contacts
        (company_id,name,email,phone,platform,is_vip,
         sentiment_score,risk_level,total_messages,created_at,updated_at)
        VALUES (:cid,:name,:email,:phone,:plat,:vip,:sent,:risk,:msgs,:now,:now)
    """),{"cid":CID,"name":name,"email":email,"phone":phone,"plat":platform,
          "vip":1 if is_vip else 0,"sent":rnd(0.55,0.92),
          "risk":rc(["low","low","medium"]),"msgs":ri(8,40),"now":now()})
    db.commit()
    cid_c = db.execute(text(
        "SELECT id FROM contacts WHERE email=:e AND company_id=:cid"
    ),{"e":email,"cid":CID}).fetchone()[0]
    contact_ids.append(cid_c)
    for _ in range(ri(5,15)):
        db.execute(text("""
            INSERT INTO messages
            (company_id,contact_id,platform,direction,content,
             status,ai_sentiment,requires_human,created_at)
            VALUES (:cid,:con,:plat,:dir,:content,:status,:sent,0,:now)
        """),{"cid":CID,"con":cid_c,"plat":platform,
              "dir":rc(["inbound","outbound"]),
              "content":rc(msg_templates),
              "status":rc(["sent","read","pending"]),
              "sent":rc(["positivo","positivo","neutro"]),
              "now":now()-timedelta(days=ri(0,90))})
db.commit()
print(f"  {len(contact_ids)} clientes + mensajes creados")

# 8. Proyectos
print("\n[7/12] Proyectos...")
PROJECTS = [
    ("Equipamiento Corporacion Pipil 2025", "Corporacion Pipil SA de CV",   "active",    7800, 65),
    ("Implementacion ERP Hospital Diagnostico","Hospital de Diagnostico SS","active",    3900, 40),
    ("Renovacion Oficinas Grupo Cuscatlan", "Grupo Comercial Cuscatlan",    "completed",11000,100),
    ("Expansion Bodega San Salvador",       "interno",                      "active",    5000, 30),
    ("Catalogo Digital 2026",              "interno",                      "planning",  1600, 10),
    ("Auditoria Inventario Q1 2026",       "interno",                      "completed",  720,100),
]
for name,client,status,budget,pct in PROJECTS:
    start = date.today()-timedelta(days=ri(30,150))
    db.execute(text("""
        INSERT INTO projects
        (company_id,name,client_name,status,start_date,deadline,
         budget,completion_percentage,health_score,created_at,updated_at)
        VALUES (:cid,:name,:client,:status,:start,:dead,
                :budget,:pct,:health,:now,:now)
    """),{"cid":CID,"name":name,"client":client,"status":status,
          "start":start,"dead":start+timedelta(days=90),"budget":budget,
          "pct":pct,"health":rnd(0.65,0.95),"now":now()})
db.commit()
print(f"  {len(PROJECTS)} proyectos creados")

# 9. Costos mensuales (USD)
print("\n[8/12] Entradas de costos...")
CATS = [
    ("Nominas",    "#3B82F6","users"),
    ("Renta",      "#8B5CF6","building"),
    ("Marketing",  "#EC4899","megaphone"),
    ("Logistica",  "#F59E0B","truck"),
    ("Suministros","#10B981","zap"),
    ("Tecnologia", "#6366F1","cpu"),
    ("Compras",    "#EF4444","shopping-cart"),
]
cat_ids = {}
for name,color,icon in CATS:
    db.execute(text("INSERT INTO cost_categories (company_id,name,color,icon,created_at) VALUES (:cid,:name,:color,:icon,:now)"),
               {"cid":CID,"name":name,"color":color,"icon":icon,"now":now()})
    db.commit()
    cat_ids[name] = db.execute(text(
        "SELECT id FROM cost_categories WHERE name=:n AND company_id=:cid"
    ),{"n":name,"cid":CID}).fetchone()[0]

DEPTS = ["Ventas","Almacen","Marketing","Administracion","Compras"]
dept_ids = {}
for dept in DEPTS:
    db.execute(text("INSERT INTO cost_departments (company_id,name,created_at) VALUES (:cid,:name,:now)"),
               {"cid":CID,"name":dept,"now":now()})
    db.commit()
    dept_ids[dept] = db.execute(text(
        "SELECT id FROM cost_departments WHERE name=:n AND company_id=:cid"
    ),{"n":dept,"cid":CID}).fetchone()[0]

cost_count = 0
for t_idx,(month_date,months_ago) in enumerate(months_range(24)):
    gf = growth_factor(t_idx,0.005)
    try:
        d5 = month_date.replace(day=5)
    except:
        continue
    if d5 > date.today():
        continue
    total_mkt = sum(monthly_mkt[(t_idx,ln)] for ln in LINE_CFG)
    entries = [
        ("Nominas",    "Administracion","Planilla personal del mes",          round(11790*gf)),
        ("Renta",      "Administracion","Renta bodega y oficinas San Salvador",1800),
        ("Marketing",  "Marketing",     "Publicidad digital total",            round(total_mkt)),
        ("Logistica",  "Almacen",       "Fletes y mensajeria",                 round(rnd(700,1300)*gf)),
        ("Suministros","Administracion","Electricidad agua telefono",          round(rnd(320,520)*gf)),
        ("Tecnologia", "Administracion","Licencias software y servicios cloud",round(rnd(380,560)*gf)),
        ("Compras",    "Compras",       "Compra mercaderia a proveedores",     round(rnd(7500,13000)*gf)),
    ]
    for cat_name,dept_name,desc,amount in entries:
        db.execute(text("""
            INSERT INTO cost_entries
            (company_id,category_id,department_id,description,amount,date,created_at)
            VALUES (:cid,:cat,:dept,:desc,:amount,:date,:now)
        """),{"cid":CID,"cat":cat_ids[cat_name],"dept":dept_ids[dept_name],
              "desc":desc,"amount":amount,"date":d5,"now":now()})
        cost_count += 1
db.commit()
print(f"  {cost_count} entradas de costos creadas")

# 10. Contabilidad (registro_diario) — codigos NIIF SV
print("\n[9/12] Asientos contables (registro_diario)...")
acc_count = 0
for t_idx,(month_date,months_ago) in enumerate(months_range(24)):
    gf = growth_factor(t_idx)
    sf = season_factor(month_date.month)
    for day in [5,10,15,20,25]:
        try:
            d = month_date.replace(day=day)
        except:
            continue
        if d > date.today():
            continue
        monthly_rev = sum(LINE_CFG[ln]["base"]*sf*gf for ln in LINE_CFG)
        db.execute(text("""
            INSERT INTO registro_diario
            (fecha,tipo,categoria,descripcion,monto,cuenta_contable,company_id,creado_en)
            VALUES (:fecha,'ingreso','Ventas','Ventas del periodo',:monto,'4101',:cid,:now)
        """),{"fecha":d,"monto":round(monthly_rev/5),"cid":CID,"now":now()})
        db.execute(text("""
            INSERT INTO registro_diario
            (fecha,tipo,categoria,descripcion,monto,cuenta_contable,company_id,creado_en)
            VALUES (:fecha,'gasto',:cat,:desc,:monto,:cuenta,:cid,:now)
        """),{"fecha":d,
              "cat":rc(["Compras","Servicios","Personal"]),
              "desc":rc(["Compra mercaderia","Honorarios externos","Planilla"]),
              "monto":round(rnd(1400,4600)*gf),
              "cuenta":rc(["5101","6210","6201"]),
              "cid":CID,"now":now()})
        acc_count += 2
db.commit()
print(f"  {acc_count} entradas en registro_diario creadas")

# 11. Plan de cuentas NIIF SV + asientos doble entrada
print("\n[10/12] Plan de cuentas NIIF El Salvador + asientos doble entrada...")
try:
    from modules.accounting.sv.charts_sv import NIIF_SV_ACCOUNTS, get_entry_accounts_sv
    from modules.accounting.journal import record_transaction, Account
    from core.database import SessionLocal
    from sqlalchemy import text as txt

    db2 = SessionLocal()
    db2.execute(txt("DELETE FROM accounts WHERE company_id=:c"),{"c":CID})
    db2.execute(txt("DELETE FROM journal_entries WHERE company_id=:c"),{"c":CID})
    db2.execute(txt("DELETE FROM transactions WHERE company_id=:c"),{"c":CID})
    db2.commit()

    # LECCION APRENDIDA: is_active=True explicito (no None) o los queries devuelven 0 cuentas
    for acc in NIIF_SV_ACCOUNTS:
        db2.add(Account(
            code=acc["code"], name=acc["name"],
            account_type=acc["type"], normal_balance=acc["normal"],
            is_active=True,
            company_id=CID
        ))
    db2.commit()
    n_acc = db2.execute(txt("SELECT COUNT(*) FROM accounts WHERE company_id=:c"),{"c":CID}).fetchone()[0]
    print(f"  {n_acc} cuentas NIIF cargadas (is_active=True)")

    # Asientos desde registro_diario
    rows = db2.execute(txt(
        "SELECT fecha,tipo,categoria,descripcion,monto FROM registro_diario WHERE company_id=:c ORDER BY fecha"
    ),{"c":CID}).fetchall()

    from datetime import date as ddate
    okc = skip = 0
    total_ing = 0.0
    total_gas = 0.0
    for fecha,tipo,cat,desc,monto in rows:
        debe_code, haber_code = get_entry_accounts_sv(tipo, cat)
        if isinstance(fecha,str):
            try: fecha = ddate.fromisoformat(fecha[:10])
            except: skip+=1; continue
        try:
            record_transaction(
                db=db2, company_id=CID, date=fecha,
                description=desc or f"{tipo} {cat}",
                entries=[
                    {"account_code":debe_code,  "debit":float(monto),"credit":0},
                    {"account_code":haber_code, "debit":0,"credit":float(monto)},
                ],
                module_source="seed_sv", reference="SEED-SV"
            )
            okc += 1
            if tipo == "ingreso": total_ing += float(monto)
            else:                 total_gas += float(monto)
        except Exception:
            skip += 1
    print(f"  {okc} asientos generados ({okc*2} lineas journal_entries), omitidos: {skip}")

    # LECCION APRENDIDA: asiento de apertura de capital fundacional.
    # Con el modelo de asientos (ingreso->Clientes/Ventas, gasto->Costo/Proveedores)
    # el balance YA cuadra solo: activo=ingresos, pasivo=gastos, util=ingresos-gastos.
    # PERO sin patrimonio fundacional el balance es contablemente pobre (Capital Social=0).
    # Inyectamos un capital fundacional FIJO: Bancos (1103, asset) contra Capital Social
    # (3101, equity). Como suma lo mismo a ambos lados de la ecuacion, el balance SIGUE
    # cuadrando y ademas queda realista (efectivo en banco + patrimonio).
    CAPITAL_FUNDACIONAL = 35000.00
    record_transaction(
        db=db2, company_id=CID, date=ddate(date.today().year-2,1,1),
        description="Aporte inicial de capital (apertura)",
        entries=[
            {"account_code":"1103", "debit":CAPITAL_FUNDACIONAL,"credit":0},   # Bancos
            {"account_code":"3101", "debit":0,"credit":CAPITAL_FUNDACIONAL},   # Capital Social
        ],
        module_source="seed_sv", reference="SEED-SV-APERTURA"
    )
    print(f"  Asiento de apertura: 1103/3101 ${CAPITAL_FUNDACIONAL:,.2f} (Bancos / Capital Social)")

    # Verificacion final de cuadre
    saldos2 = {}
    for tp in ("asset","liability","equity","income","expense"):
        r = db2.execute(txt("""
            SELECT ROUND(SUM(je.debit),2) d, ROUND(SUM(je.credit),2) h
            FROM journal_entries je JOIN accounts a ON je.account_id=a.id
            WHERE a.company_id=:c AND je.company_id=:c AND a.account_type=:t
        """),{"c":CID,"t":tp}).fetchone()
        saldos2[tp] = ((r[0] or 0), (r[1] or 0))
    A  = saldos2["asset"][0]     - saldos2["asset"][1]
    P  = saldos2["liability"][1] - saldos2["liability"][0]
    PA = saldos2["equity"][1]    - saldos2["equity"][0]
    I  = saldos2["income"][1]    - saldos2["income"][0]
    G  = saldos2["expense"][0]   - saldos2["expense"][1]
    U  = I - G
    print(f"  CUADRE: Activo {A:,.2f} = Pasivo {P:,.2f} + Patrim {PA:,.2f} + Util {U:,.2f} = {P+PA+U:,.2f}")
    print(f"  {'  >> BALANCE CUADRA OK' if abs(A-(P+PA+U))<0.5 else '  >> ATENCION: NO CUADRA'}")
    db2.close()
except Exception as e:
    import traceback
    print(f"  (!) Plan de cuentas omitido: {e}")
    traceback.print_exc()

# 12. Optimizer
print("\n[11/12] Optimizer lines + productos...")
line_ids = {}
for line_name,cfg in LINE_CFG.items():
    db.execute(text("""
        INSERT INTO profit_optimizer_lines
        (company_id,name,description,margin_rate,seasonality,is_active,created_at,updated_at)
        VALUES (:cid,:name,:desc,:margin,:season,1,:now,:now)
    """),{"cid":CID,"name":line_name,"desc":f"Linea {line_name}",
          "margin":cfg["margin"],"season":cfg["season"],"now":now()})
    db.commit()
    line_ids[line_name] = db.execute(text(
        "SELECT id FROM profit_optimizer_lines WHERE name=:n AND company_id=:cid"
    ),{"n":line_name,"cid":CID}).fetchone()[0]

opt_count = 0
for name,line,price,cost,iva,stock,thresh,eps in PRODUCTS:
    if line not in line_ids: continue
    lid = line_ids[line]
    pid = product_ids[name]
    db.execute(text("""
        INSERT INTO profit_optimizer_products
        (company_id,line_id,vortu_product_id,name,selling_price,
         labour_cost_m3,labour_cost_m2,labour_cost_m1,
         material_cost_m3,material_cost_m2,material_cost_m1,
         logistics_cost_m3,logistics_cost_m2,logistics_cost_m1,
         supply_limit,demand_p0,demand_q0,demand_eps,
         is_active,created_at,updated_at)
        VALUES (:cid,:lid,:pid,:name,:price,
                :lm3,:lm2,:lm1,:mm3,:mm2,:mm1,:gm3,:gm2,:gm1,
                :supply,:p0,:q0,:eps,1,:now,:now)
    """),{"cid":CID,"lid":lid,"pid":pid,"name":name,"price":price,
          "lm3":round(cost*0.08,2),"lm2":round(cost*0.09,2),"lm1":round(cost*0.09,2),
          "mm3":round(cost*0.65,2),"mm2":round(cost*0.67,2),"mm1":round(cost*0.68,2),
          "gm3":round(cost*0.05,2),"gm2":round(cost*0.05,2),"gm1":round(cost*0.06,2),
          "supply":stock,"p0":price,"q0":float(stock*0.6),"eps":eps,"now":now()})
    opt_count += 1
db.commit()
print(f"  {opt_count} productos optimizer creados")

period = date.today().strftime("%Y-%m")
db.execute(text("""
    INSERT INTO profit_optimizer_inputs
    (company_id,period_label,planning_date,fixed_costs,total_budget,
     vacation_factor,vacation_month,created_at,updated_at)
    VALUES (:cid,:period,:pdate,3000.0,30000.0,1.0,0,:now,:now)
"""),{"cid":CID,"period":period,"pdate":date.today(),"now":now()})
db.commit()

# Resumen
print("\n[12/12] Listo!\n")
print("="*60)
print("  SEED SV COMPLETO — " + COMPANY_NAME)
print("="*60)
print(f"  Company id : {CID}")
print(f"  Login      : {LOGIN_EMAIL} / demo1234")
print(f"  Productos  : {len(product_ids)} (4 lineas)")
print(f"  Ventas     : {total_sales} / USD ${total_revenue:,.0f}")
print(f"  Pais       : SV — NIIF para PYMES / IVA 13% / ISR 30% / CCF")
print("="*60 + "\n")
