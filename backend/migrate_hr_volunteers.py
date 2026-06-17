"""
Migration: añade campos de voluntarios/temporales a la tabla `employees`.

create_all NO altera tablas existentes, así que estas columnas se añaden aquí.
Idempotente: comprueba PRAGMA table_info antes de cada ALTER. Run: python migrate_hr_volunteers.py
"""
import sqlite3
from core.config import get_settings

db_path = get_settings().DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

# (columna, definición SQL para ADD COLUMN)
NEW_COLUMNS = [
    ("employee_type", "TEXT NOT NULL DEFAULT 'permanente'"),
    ("start_date", "DATE"),
    ("end_date", "DATE"),
    ("availability", "TEXT"),
    ("skills", "TEXT"),
]


def main():
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    existing = {row[1] for row in cur.execute("PRAGMA table_info(employees)").fetchall()}
    added = []
    for col, ddl in NEW_COLUMNS:
        if col in existing:
            continue
        cur.execute(f"ALTER TABLE employees ADD COLUMN {col} {ddl}")
        added.append(col)

    con.commit()
    final_cols = {row[1] for row in cur.execute("PRAGMA table_info(employees)").fetchall()}
    con.close()

    print("✓ Columnas añadidas:", added or "(ninguna, ya existían)")
    missing = [c for c, _ in NEW_COLUMNS if c not in final_cols]
    if missing:
        print("✗ FALTAN columnas:", missing)
    else:
        print("✓ employees tiene los 5 campos de voluntario/temporal.")


if __name__ == "__main__":
    main()
