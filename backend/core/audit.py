"""Security audit log — tamper-evident record of security-relevant events.

Captures the events forensics and compliance need but the app previously dropped:
successful/failed logins, 2FA challenges, account-disabled sign-in attempts,
logout/revocation, privileged admin changes (status/plan/role), data exports and
cross-tenant AI tool calls. Every event records **actor + IP + timestamp** (the
explicit acceptance criterion) plus a hash chain so deletion or reordering of
rows is detectable.

Tamper-evidence: each row stores ``prev_hash`` (the previous row's ``row_hash``)
and ``row_hash = sha256(canonical_fields + prev_hash)``. ``verify_chain`` walks
the table and reports the first break. On Postgres, pair this with a BEFORE
UPDATE/DELETE trigger (see docs/SECURITY.md) for true append-only enforcement;
on SQLite the chain is the tamper-evidence.

Writes are best-effort-but-loud: a failed audit insert is logged at ERROR (so it
reaches Sentry) rather than silently swallowed, but it does not abort the user
action — breaking login because the audit table is unavailable would be a
self-inflicted DoS. Callers that need strict fail-closed semantics can inspect
the boolean return.
"""
import json
import hashlib
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger("vela.audit")


def client_ip(request) -> Optional[str]:
    """First X-Forwarded-For hop when behind a reverse proxy, else peer IP.
    Mirrors core.rate_limit so audit IPs match throttling keys."""
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _canonical(ts, event, actor_user_id, actor_email, target, company_id, ip, detail_json, prev_hash) -> str:
    return "|".join([
        ts, event, str(actor_user_id or ""), actor_email or "", target or "",
        str(company_id or ""), ip or "", detail_json or "", prev_hash,
    ])


def audit_event(
    db: Session,
    event: str,
    *,
    actor_user_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    target: Optional[str] = None,
    company_id: Optional[int] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    detail: Optional[dict] = None,
    request=None,
    commit: bool = True,
) -> bool:
    """Append one security event to the hash-chained audit log.

    Pass ``request`` to auto-capture IP + user-agent. Pass ``commit=False`` to
    enlist the write in the caller's existing transaction (so the audit row and
    the audited action commit atomically). Returns True on success.
    """
    if request is not None:
        ip = ip or client_ip(request)
        user_agent = user_agent or request.headers.get("user-agent")
    detail_json = json.dumps(detail, default=str, sort_keys=True) if detail is not None else None
    ts = datetime.utcnow().isoformat()
    try:
        prev = db.execute(
            text("SELECT row_hash FROM security_audit_log ORDER BY id DESC LIMIT 1")
        ).fetchone()
        prev_hash = (prev[0] if prev and prev[0] else "") or ""
        row_hash = hashlib.sha256(
            _canonical(ts, event, actor_user_id, actor_email, target, company_id, ip, detail_json, prev_hash).encode()
        ).hexdigest()
        db.execute(text("""
            INSERT INTO security_audit_log
                (ts, event, actor_user_id, actor_email, target, company_id,
                 ip, user_agent, detail, prev_hash, row_hash)
            VALUES (:ts, :event, :auid, :aemail, :target, :cid,
                    :ip, :ua, :detail, :prev, :rh)
        """), {
            "ts": ts, "event": event, "auid": actor_user_id, "aemail": actor_email,
            "target": target, "cid": company_id, "ip": ip, "ua": user_agent,
            "detail": detail_json, "prev": prev_hash, "rh": row_hash,
        })
        if commit:
            db.commit()
        return True
    except Exception:
        logger.error("AUDIT WRITE FAILED event=%s actor=%s ip=%s", event, actor_email, ip, exc_info=True)
        try:
            if commit:
                db.rollback()
        except Exception:
            pass
        return False


def verify_chain(db: Session, limit: int = 100000) -> dict:
    """Walk the audit chain and report the first break (tamper-evidence check)."""
    rows = db.execute(text("""
        SELECT id, ts, event, actor_user_id, actor_email, target, company_id,
               ip, detail, prev_hash, row_hash
        FROM security_audit_log ORDER BY id ASC LIMIT :lim
    """), {"lim": limit}).fetchall()
    prev_hash = ""
    for r in rows:
        expected = hashlib.sha256(
            _canonical(r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], prev_hash).encode()
        ).hexdigest()
        if r[9] != prev_hash:
            return {"ok": False, "broken_at_id": r[0], "reason": "prev_hash mismatch"}
        if r[10] != expected:
            return {"ok": False, "broken_at_id": r[0], "reason": "row_hash mismatch (row altered)"}
        prev_hash = r[10]
    return {"ok": True, "rows_verified": len(rows)}
