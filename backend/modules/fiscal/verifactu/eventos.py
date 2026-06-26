"""Veri*Factu registro de eventos — append-only, hash-chained event log.

The regulation requires logging system events (record generation, anulación,
export, integrity verification, software start, detected anomalies). Each event
is chained by huella exactly like the registro, so the event log is itself
tamper-evident. Append-only (no UPDATE/DELETE code path; Postgres trigger).
"""
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from .hashing import huella
from . import canonical as C


def _last_evento_huella(db: Session, company_id: int) -> str:
    row = db.execute(text("""
        SELECT huella FROM verifactu_eventos WHERE company_id = :cid ORDER BY id DESC LIMIT 1
    """), {"cid": company_id}).first()
    return (row[0] if row else "") or ""


def log_evento(db: Session, company_id: int, evento: str, registro_id=None,
               detalle: str = "", commit: bool = True) -> None:
    ts = datetime.utcnow().isoformat()
    prev = _last_evento_huella(db, company_id)
    h = huella(C.canonical_evento(evento=evento, registro_id=registro_id,
                                  detalle=detalle, ts=ts, huella_anterior=prev))
    db.execute(text("""
        INSERT INTO verifactu_eventos (company_id, evento, registro_id, detalle, huella, huella_anterior, ts)
        VALUES (:cid, :ev, :rid, :det, :h, :prev, :ts)
    """), {"cid": company_id, "ev": evento, "rid": registro_id, "det": detalle,
           "h": h, "prev": prev, "ts": ts})
    if commit:
        db.commit()
