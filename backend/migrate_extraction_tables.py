"""
Migration: tables for the evidence extraction pipeline (Phase 1).
- doc_fingerprints   : dedupe + per-document memory key
- extraction_runs    : durable record of every /analyze (truth-graph log; backs PENDING_DOCS)
- extraction_feedback: user corrections captured on /confirm (accuracy loop)

Idempotent (CREATE TABLE IF NOT EXISTS). Run: python migrate_extraction_tables.py
"""
import sqlite3
from core.config import get_settings

db_path = get_settings().DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

DDL = [
    """
    CREATE TABLE IF NOT EXISTS doc_fingerprints (
        id INTEGER PRIMARY KEY,
        company_id INTEGER NOT NULL,
        fingerprint TEXT NOT NULL,
        provider_cif TEXT,
        doc_template_slug TEXT,
        times_seen INTEGER DEFAULT 1,
        last_seen_at TEXT,
        layout_signature_json TEXT
    )
    """,
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_fingerprint_company ON doc_fingerprints (company_id, fingerprint)",
    """
    CREATE TABLE IF NOT EXISTS extraction_runs (
        id INTEGER PRIMARY KEY,
        company_id INTEGER NOT NULL,
        temp_id TEXT,
        fingerprint TEXT,
        doc_template_slug TEXT,
        phase_reached TEXT,
        total_cost REAL DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        models_used_json TEXT,
        overall_confidence REAL DEFAULT 0,
        validation_passed INTEGER DEFAULT 0,
        field_results_json TEXT,
        needs_review INTEGER DEFAULT 0,
        created_at TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_extraction_runs_temp ON extraction_runs (temp_id)",
    "CREATE INDEX IF NOT EXISTS ix_extraction_runs_company ON extraction_runs (company_id)",
    """
    CREATE TABLE IF NOT EXISTS extraction_feedback (
        id INTEGER PRIMARY KEY,
        company_id INTEGER NOT NULL,
        document_id INTEGER,
        run_id INTEGER,
        field_key TEXT,
        ai_value TEXT,
        corrected_value TEXT,
        was_correct INTEGER,
        prompt_id INTEGER,
        provider TEXT,
        created_at TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_extraction_feedback_company ON extraction_feedback (company_id)",
    """
    CREATE TABLE IF NOT EXISTS extraction_review_queue (
        id INTEGER PRIMARY KEY,
        company_id INTEGER NOT NULL,
        document_id INTEGER,
        run_id INTEGER,
        doc_template_slug TEXT,
        status TEXT DEFAULT 'pending',
        reason TEXT,
        low_conf_fields_json TEXT,
        created_at TEXT,
        resolved_by INTEGER,
        resolved_at TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_review_queue_company_status ON extraction_review_queue (company_id, status)",
]


def main():
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    for stmt in DDL:
        cur.execute(stmt)
    con.commit()
    tables = [r[0] for r in cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN "
        "('doc_fingerprints','extraction_runs','extraction_feedback','extraction_review_queue')"
    ).fetchall()]
    con.close()
    print("✓ Tables present:", sorted(tables))


if __name__ == "__main__":
    main()
