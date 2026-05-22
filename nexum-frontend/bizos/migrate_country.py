"""
Migración: Añadir columna 'country' a la tabla companies.
Jurisdicción fiscal por empresa (Opción A: país fijo al alta).
Ejecutar una sola vez: python3 migrate_country.py
"""
import sys
sys.path.insert(0, '.')
from core.database import engine
from sqlalchemy import text

def column_exists(conn, table, column):
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)

def run():
    with engine.begin() as conn:
        if column_exists(conn, "companies", "country"):
            print("✓ La columna 'country' ya existe. Nada que hacer.")
            return
        conn.execute(text("ALTER TABLE companies ADD COLUMN country VARCHAR"))
        print("✓ Columna 'country' añadida a 'companies'.")

if __name__ == "__main__":
    run()
