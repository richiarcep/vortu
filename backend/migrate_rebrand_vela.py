"""Migración de rebranding Vela: renombra columnas y tablas con rastro
de 'vortu'/'nexum' a sus equivalentes 'vela'/'network'.

Idempotente: solo renombra si la columna/tabla vieja existe y la nueva no.
Por introspección (no depende de nombres de tabla hardcodeados).

Uso:  .venv/bin/python migrate_rebrand_vela.py [ruta_db]
"""
import sqlite3
import sys
import os

COL_RENAMES = {
    "vortu_product_id": "vela_product_id",
    "nexum_code": "vela_code",
    "meses_en_vortu": "meses_en_vela",
}
TABLE_RENAMES = {
    "vera_nexum_conversations": "vera_network_conversations",
    "vera_nexum_audit": "vera_network_audit",
}


def find_db():
    here = os.path.dirname(os.path.abspath(__file__))
    for name in ("nexum.db", "vela.db"):
        p = os.path.join(here, name)
        if os.path.exists(p):
            return p
    return None


def main():
    db = sys.argv[1] if len(sys.argv) > 1 else find_db()
    if not db or not os.path.exists(db):
        print(f"!! No se encontró la base de datos ({db}).")
        sys.exit(1)
    print(f"Migrando: {db}")
    con = sqlite3.connect(db)
    cur = con.cursor()

    tables = [r[0] for r in cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

    # 1) Renombrar columnas en cualquier tabla que las tenga.
    col_changes = 0
    for t in tables:
        cols = [r[1] for r in cur.execute(f'PRAGMA table_info("{t}")').fetchall()]
        for old, new in COL_RENAMES.items():
            if old in cols and new not in cols:
                cur.execute(f'ALTER TABLE "{t}" RENAME COLUMN "{old}" TO "{new}"')
                print(f"  columna  {t}.{old} -> {new}")
                col_changes += 1

    # 2) Renombrar tablas.
    tbl_changes = 0
    for old, new in TABLE_RENAMES.items():
        if old in tables and new not in tables:
            cur.execute(f'ALTER TABLE "{old}" RENAME TO "{new}"')
            print(f"  tabla    {old} -> {new}")
            tbl_changes += 1

    con.commit()
    con.close()
    print(f"Listo. {col_changes} columnas y {tbl_changes} tablas renombradas.")


if __name__ == "__main__":
    main()
