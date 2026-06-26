"""Retry queue for failed AEAT remittance (VERIFACTU mode, §3.4).

If a remittance fails (AEAT down / timeout), the registro is already hashed and
chained — it is NOT lost. It goes here and is retried periodically; on every
resend after a failure the record carries Incidencia='S'. No fixed maximum
deadline — retry until accepted.

Backoff is stored as an absolute next_retry_at so it survives restarts and works
without Redis (a DB-backed queue, driven by the existing APScheduler). When
REDIS_URL is configured a faster queue can be layered on; the DB table remains the
durable source of truth.
"""
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from .aeat_client import submit, AeatRemisionError
from .config import get_config
from .eventos import log_evento

_BACKOFF_MIN = [1, 5, 15, 60, 240]  # minutes; last value repeats


def enqueue(db: Session, company_id: int, registro_id: int, error: str) -> None:
    """Add (or refresh) a registro in the retry queue and mark it as incidencia."""
    now = datetime.utcnow()
    db.execute(text("""
        INSERT INTO verifactu_retry_queue (company_id, registro_id, intentos, last_error, next_retry_at, estado, created_at)
        VALUES (:c, :r, 1, :e, :nxt, 'pendiente', :now)
    """), {"c": company_id, "r": registro_id, "e": (error or "")[:500],
           "nxt": (now + timedelta(minutes=_BACKOFF_MIN[0])).isoformat(), "now": now.isoformat()})
    db.execute(text("UPDATE verifactu_registro SET estado='incidencia', incidencia='S' WHERE id=:r"),
               {"r": registro_id})
    log_evento(db, company_id, "remision_incidencia", registro_id=registro_id, detalle=(error or "")[:200], commit=False)
    db.commit()


def process_pending(db: Session, limit: int = 50) -> dict:
    """Retry due queue items. Called by the scheduler. Returns a small summary."""
    now = datetime.utcnow()
    due = db.execute(text("""
        SELECT id, company_id, registro_id, intentos FROM verifactu_retry_queue
        WHERE estado='pendiente' AND (next_retry_at IS NULL OR next_retry_at <= :now)
        ORDER BY id ASC LIMIT :lim
    """), {"now": now.isoformat(), "lim": limit}).mappings().all()

    accepted, failed = 0, 0
    for item in due:
        reg = db.execute(text("SELECT * FROM verifactu_registro WHERE id=:r"),
                         {"r": item["registro_id"]}).mappings().first()
        if not reg:
            db.execute(text("UPDATE verifactu_retry_queue SET estado='cancelado' WHERE id=:i"), {"i": item["id"]})
            continue
        cfg = get_config(db, item["company_id"])
        try:
            result = submit(dict(reg), environment=cfg.get("environment", "SANDBOX"),
                            cert_ref=cfg.get("cert_ref"), incidencia=True)  # resend → Incidencia='S'
            db.execute(text("""
                UPDATE verifactu_registro SET estado=:e, aeat_csv=:csv, incidencia=:inc WHERE id=:r
            """), {"e": result["estado"], "csv": result.get("csv"), "inc": result.get("incidencia", "S"),
                   "r": item["registro_id"]})
            db.execute(text("UPDATE verifactu_retry_queue SET estado='resuelto' WHERE id=:i"), {"i": item["id"]})
            log_evento(db, item["company_id"], "remision_reintento_ok", registro_id=item["registro_id"], commit=False)
            accepted += 1
        except AeatRemisionError as e:
            intentos = (item["intentos"] or 0) + 1
            backoff = _BACKOFF_MIN[min(intentos, len(_BACKOFF_MIN)) - 1]
            db.execute(text("""
                UPDATE verifactu_retry_queue SET intentos=:n, last_error=:e, next_retry_at=:nxt WHERE id=:i
            """), {"n": intentos, "e": str(e)[:500],
                   "nxt": (now + timedelta(minutes=backoff)).isoformat(), "i": item["id"]})
            failed += 1
    db.commit()
    return {"due": len(due), "accepted": accepted, "still_failing": failed}
