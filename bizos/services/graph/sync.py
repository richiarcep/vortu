"""
Sincronización PostgreSQL → Neo4j.
"""
from .neo4j_store import graph_store


def sync_company(company_id: int, name: str, email: str, sector: str = None):
    graph_store.run("""
        MERGE (c:Company {pg_id: $pg_id})
        SET c.name = $name, c.email = $email, c.sector = $sector, c.updated_at = datetime()
    """, pg_id=company_id, name=name, email=email, sector=sector)


def sync_user(user_id: int, company_id: int, email: str, full_name: str):
    graph_store.run("""
        MERGE (u:User {pg_id: $pg_id})
        SET u.email = $email, u.full_name = $full_name, u.updated_at = datetime()
        WITH u
        MATCH (c:Company {pg_id: $company_id})
        MERGE (u)-[:BELONGS_TO]->(c)
    """, pg_id=user_id, company_id=company_id, email=email, full_name=full_name)


def sync_sale(sale_id: int, company_id: int, total: float, sale_date: str, payment_method: str):
    graph_store.run("""
        MERGE (s:Sale {pg_id: $pg_id})
        SET s.total = $total, s.sale_date = $sale_date, s.payment_method = $payment_method, s.updated_at = datetime()
        WITH s
        MATCH (c:Company {pg_id: $company_id})
        MERGE (s)-[:BELONGS_TO]->(c)
    """, pg_id=sale_id, company_id=company_id, total=total, sale_date=sale_date, payment_method=payment_method)


def sync_sale_product(sale_id: int, product_id: int, quantity: int, price: float):
    graph_store.run("""
        MATCH (s:Sale {pg_id: $sale_id})
        MATCH (p:Product {pg_id: $product_id})
        MERGE (s)-[r:INCLUDES]->(p)
        SET r.quantity = $quantity, r.price = $price
    """, sale_id=sale_id, product_id=product_id, quantity=quantity, price=price)


def sync_product(product_id: int, company_id: int, name: str, price: float, stock: int, category: str = None):
    graph_store.run("""
        MERGE (p:Product {pg_id: $pg_id})
        SET p.name = $name, p.price = $price, p.stock = $stock, p.category = $category, p.updated_at = datetime()
        WITH p
        MATCH (c:Company {pg_id: $company_id})
        MERGE (p)-[:BELONGS_TO]->(c)
    """, pg_id=product_id, company_id=company_id, name=name, price=price, stock=stock, category=category)


def sync_contact(contact_id: int, company_id: int, name: str, sentiment_score: float, risk_level: str):
    graph_store.run("""
        MERGE (c:Contact {pg_id: $pg_id})
        SET c.name = $name, c.sentiment_score = $sentiment_score, c.risk_level = $risk_level, c.updated_at = datetime()
        WITH c
        MATCH (comp:Company {pg_id: $company_id})
        MERGE (c)-[:CLIENT_OF]->(comp)
    """, pg_id=contact_id, company_id=company_id, name=name, sentiment_score=sentiment_score, risk_level=risk_level)


def sync_project(project_id: int, company_id: int, name: str, health_score: float, status: str, budget: float):
    graph_store.run("""
        MERGE (p:Project {pg_id: $pg_id})
        SET p.name = $name, p.health_score = $health_score, p.status = $status, p.budget = $budget, p.updated_at = datetime()
        WITH p
        MATCH (c:Company {pg_id: $company_id})
        MERGE (p)-[:BELONGS_TO]->(c)
    """, pg_id=project_id, company_id=company_id, name=name, health_score=health_score, status=status, budget=budget)


def sync_task(task_id: int, project_id: int, company_id: int, title: str, status: str):
    graph_store.run("""
        MERGE (t:Task {pg_id: $pg_id})
        SET t.title = $title, t.status = $status, t.updated_at = datetime()
        WITH t
        MATCH (p:Project {pg_id: $project_id})
        MERGE (t)-[:PART_OF]->(p)
    """, pg_id=task_id, project_id=project_id, company_id=company_id, title=title, status=status)


def sync_task_assignment(task_id: int, employee_id: int):
    graph_store.run("""
        MATCH (t:Task {pg_id: $task_id})
        MATCH (e:Employee {pg_id: $employee_id})
        MERGE (e)-[:ASSIGNED_TO]->(t)
    """, task_id=task_id, employee_id=employee_id)


def sync_employee(employee_id: int, company_id: int, name: str, position: str, salary: float):
    graph_store.run("""
        MERGE (e:Employee {pg_id: $pg_id})
        SET e.name = $name, e.position = $position, e.salary = $salary, e.updated_at = datetime()
        WITH e
        MATCH (c:Company {pg_id: $company_id})
        MERGE (e)-[:WORKS_AT]->(c)
    """, pg_id=employee_id, company_id=company_id, name=name, position=position, salary=salary)


def sync_snapshot(snapshot_id: int, company_id: int, date: str, ingresos: float,
                  resultado_neto: float, health_score: float, tendencia: str, riesgo: str):
    graph_store.run("""
        MERGE (s:Snapshot {pg_id: $pg_id})
        SET s.snapshot_date = $date, s.ingresos = $ingresos, s.resultado_neto = $resultado_neto,
            s.health_score = $health_score, s.tendencia = $tendencia, s.riesgo = $riesgo, s.updated_at = datetime()
        WITH s
        MATCH (c:Company {pg_id: $company_id})
        MERGE (s)-[:SNAPSHOT_OF]->(c)
    """, pg_id=snapshot_id, company_id=company_id, date=date, ingresos=ingresos,
        resultado_neto=resultado_neto, health_score=health_score, tendencia=tendencia, riesgo=riesgo)


def migrate_all_to_graph(db):
    from models.user import User, Company
    from models.sales import Sale, Product, SaleItem
    from models.customer import Contact
    from models.project import Project, Task
    from models.analytics import BusinessSnapshot

    stats = {}

    companies = db.query(Company).all()
    for c in companies:
        sync_company(c.id, c.name, c.email)
    stats['companies'] = len(companies)

    users = db.query(User).all()
    for u in users:
        if u.company_id:
            sync_user(u.id, u.company_id, u.email, u.full_name)
    stats['users'] = len(users)

    products = db.query(Product).all()
    for p in products:
        sync_product(p.id, p.company_id, p.name, p.sale_price, p.stock_quantity, p.category)
    stats['products'] = len(products)

    sales = db.query(Sale).all()
    for s in sales:
        sync_sale(s.id, s.company_id, s.total, str(s.sale_date), s.payment_method)
    stats['sales'] = len(sales)

    try:
        items = db.query(SaleItem).all()
        for item in items:
            try:
                sync_sale_product(item.sale_id, item.product_id, item.quantity, item.unit_price)
            except:
                pass
        stats['sale_items'] = len(items)
    except:
        stats['sale_items'] = 0

    contacts = db.query(Contact).all()
    for c in contacts:
        sync_contact(c.id, c.company_id, c.name, c.sentiment_score, c.risk_level)
    stats['contacts'] = len(contacts)

    projects = db.query(Project).all()
    for p in projects:
        sync_project(p.id, p.company_id, p.name, p.health_score, p.status, p.budget)
    stats['projects'] = len(projects)

    tasks = db.query(Task).all()
    for t in tasks:
        sync_task(t.id, t.project_id, t.company_id, t.title, t.status)
        if t.assigned_to:
            try:
                sync_task_assignment(t.id, t.assigned_to)
            except:
                pass
    stats['tasks'] = len(tasks)

    snapshots = db.query(BusinessSnapshot).all()
    for s in snapshots:
        sync_snapshot(
            s.id, s.company_id, str(s.snapshot_date),
            s.ingresos_mes, s.resultado_neto,
            s.health_score_avg or 0,
            s.label_tendencia or 'estable',
            s.label_riesgo_negocio or 'bajo'
        )
    stats['snapshots'] = len(snapshots)

    return stats
