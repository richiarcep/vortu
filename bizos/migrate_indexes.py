"""
Migración: Añadir índices optimizados a todas las tablas principales.
Ejecutar una sola vez: python migrate_indexes.py
"""
import sys
sys.path.insert(0, '.')
from core.database import engine
from sqlalchemy import text

indexes = [
    # Sales
    "CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date)",
    "CREATE INDEX IF NOT EXISTS idx_sales_company_date ON sales(company_id, sale_date)",
    "CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)",
    "CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)",
    "CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_products_company_active ON products(company_id, is_active)",

    # Contacts & Messages
    "CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_contacts_risk_level ON contacts(risk_level)",
    "CREATE INDEX IF NOT EXISTS idx_contacts_company_risk ON contacts(company_id, risk_level)",
    "CREATE INDEX IF NOT EXISTS idx_messages_company_id ON messages(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)",
    "CREATE INDEX IF NOT EXISTS idx_messages_company_status ON messages(company_id, status)",

    # Projects & Tasks
    "CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)",
    "CREATE INDEX IF NOT EXISTS idx_projects_company_status ON projects(company_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status)",

    # Users & Companies
    "CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",

    # Analytics
    "CREATE INDEX IF NOT EXISTS idx_snapshots_company_date ON business_snapshots(company_id, snapshot_date)",
    "CREATE INDEX IF NOT EXISTS idx_memory_entries_company_id ON memory_entries(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_memory_entries_tipo ON memory_entries(company_id, tipo)",
    "CREATE INDEX IF NOT EXISTS idx_system_prompts_key ON system_prompts(key)",
    "CREATE INDEX IF NOT EXISTS idx_system_prompts_module ON system_prompts(module)",
]

with engine.connect() as conn:
    for idx in indexes:
        try:
            conn.execute(text(idx))
            name = idx.split('idx_')[1].split(' ')[0]
            print(f"✅ idx_{name}")
        except Exception as e:
            print(f"⚠️  {idx[:60]}... — {e}")
    conn.commit()

print("\n✅ Todos los índices creados")
