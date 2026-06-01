"""
One-off migration: make accounts.code unique PER COMPANY instead of globally.

Before: UNIQUE INDEX ix_accounts_code ON accounts(code)  → blocks a 2nd company
        (or a 2nd country's chart) from using the same code.
After:  non-unique INDEX on code + UNIQUE INDEX on (company_id, code).

Index-only change — no data loss. Idempotent. Safe to run multiple times.
Run: python migrate_accounts_company_unique.py
"""
import sqlite3
from core.config import get_settings

settings = get_settings()
db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")


def main():
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    # Sanity: detect duplicate (company_id, code) that would block the unique index.
    dups = cur.execute(
        "SELECT company_id, code, COUNT(*) c FROM accounts "
        "GROUP BY company_id, code HAVING c > 1"
    ).fetchall()
    if dups:
        print(f"⚠ Aborting: {len(dups)} duplicate (company_id, code) rows exist; resolve first:")
        for r in dups[:10]:
            print("   ", r)
        return

    print("Dropping global-unique index on code (if present)…")
    cur.execute("DROP INDEX IF EXISTS ix_accounts_code")

    print("Creating non-unique index on code…")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_accounts_code ON accounts (code)")

    print("Creating UNIQUE index on (company_id, code)…")
    cur.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_company_code "
        "ON accounts (company_id, code)"
    )

    con.commit()

    print("\nResulting indexes on accounts:")
    for name, sql in cur.execute(
        "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='accounts'"
    ).fetchall():
        print("  ", name, "::", sql)
    con.close()
    print("\n✓ Migration complete.")


if __name__ == "__main__":
    main()
