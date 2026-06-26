"""Rotating, revocable refresh-token service.

A refresh token is a high-entropy OPAQUE secret (``secrets.token_urlsafe`` — NOT
a JWT, and deliberately NOT derived from SECRET_KEY, so rotating SECRET_KEY can't
invalidate sessions). It is stored only as a sha256 hash. Each token belongs to a
*family*; on use it ROTATES (old marked revoked + replaced_by_jti, a new one
issued in the same family). Presenting an already-rotated (revoked) token is
treated as theft → the whole family is revoked and ``users.token_version`` is
bumped, which also invalidates every outstanding access token via
``get_current_user``.

Concurrent-refresh grace: two browser tabs share one cookie and can race the
rotation; the loser arrives with the just-revoked token. To avoid hard-logging
out a legitimate user on that benign double-submit, a token revoked within
``GRACE_SECONDS`` whose replacement is still active is treated as a race — we
mint a fresh access token but neither rotate again nor revoke the family. Genuine
reuse (older revocation, or a dangling family) still trips the alarm.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import get_settings

settings = get_settings()

GRACE_SECONDS = 10


class RefreshReuseError(Exception):
    """A revoked refresh token was replayed → family revoked, sessions killed."""


class RefreshInvalidError(Exception):
    """Token unknown, expired, or stale (token_version mismatch)."""


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.utcnow()


def _ua_ip(request):
    if request is None:
        return None, None
    fwd = request.headers.get("x-forwarded-for")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else None)
    return ip, request.headers.get("user-agent")


def issue(db: Session, user, request=None, family_id: Optional[str] = None) -> str:
    """Create + persist a refresh token (new family unless one is supplied for
    rotation). Returns the plaintext to put in the cookie."""
    token = secrets.token_urlsafe(48)
    jti = secrets.token_urlsafe(16)
    fam = family_id or secrets.token_urlsafe(16)
    ip, ua = _ua_ip(request)
    now = _now()
    db.execute(text("""
        INSERT INTO refresh_tokens
            (jti, family_id, user_id, token_hash, token_version,
             issued_at, expires_at, revoked, ip, user_agent)
        VALUES (:jti, :fam, :uid, :hash, :tv, :issued, :expires, 0, :ip, :ua)
    """), {
        "jti": jti, "fam": fam, "uid": user.id, "hash": _hash(token),
        "tv": getattr(user, "token_version", 0) or 0,
        "issued": now.isoformat(),
        "expires": (now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
        "ip": ip, "ua": ua,
    })
    db.commit()
    return token


def _revoke_family(db: Session, family_id: str, reason: str) -> None:
    db.execute(text("""
        UPDATE refresh_tokens SET revoked = 1, revoked_reason = :r
        WHERE family_id = :fam AND revoked = 0
    """), {"r": reason, "fam": family_id})


def revoke_all_for_user(db: Session, user_id: int, reason: str = "logout") -> None:
    db.execute(text("""
        UPDATE refresh_tokens SET revoked = 1, revoked_reason = :r
        WHERE user_id = :uid AND revoked = 0
    """), {"r": reason, "uid": user_id})
    db.commit()


def consume(db: Session, presented_token: str, user, request=None) -> Optional[str]:
    """Validate + rotate a presented refresh token.

    Returns the NEW plaintext refresh token to set as the cookie, or None when a
    benign concurrent-refresh race is detected (caller mints a fresh access token
    but should NOT overwrite the cookie). Raises RefreshReuseError (theft → family
    nuked + token_version bumped by the caller) or RefreshInvalidError.
    """
    row = db.execute(text("""
        SELECT jti, family_id, user_id, token_version, expires_at, revoked, revoked_at, replaced_by_jti
        FROM refresh_tokens WHERE token_hash = :h
    """), {"h": _hash(presented_token)}).mappings().first()

    if row is None:
        raise RefreshInvalidError("unknown refresh token")

    now = _now()

    # Already-revoked token presented.
    if row["revoked"]:
        # Benign race? revoked very recently AND its replacement is still live.
        revoked_at = row["revoked_at"]
        replaced = row["replaced_by_jti"]
        within_grace = False
        if revoked_at:
            try:
                within_grace = (now - datetime.fromisoformat(revoked_at)).total_seconds() <= GRACE_SECONDS
            except (ValueError, TypeError):
                within_grace = False
        if within_grace and replaced:
            repl = db.execute(text(
                "SELECT revoked FROM refresh_tokens WHERE jti = :j"
            ), {"j": replaced}).mappings().first()
            if repl is not None and not repl["revoked"]:
                return None  # concurrent-refresh race → caller issues access token only
        # Otherwise: genuine replay of a dead token → theft.
        _revoke_family(db, row["family_id"], "reuse_detected")
        db.commit()
        raise RefreshReuseError("refresh token reuse detected")

    # Expired.
    try:
        if row["expires_at"] and datetime.fromisoformat(row["expires_at"]) < now:
            raise RefreshInvalidError("refresh token expired")
    except (ValueError, TypeError):
        raise RefreshInvalidError("malformed expiry")

    # Stale across a token_version bump (logout / password change / forced sign-out).
    if (row["token_version"] or 0) != (getattr(user, "token_version", 0) or 0):
        _revoke_family(db, row["family_id"], "token_version_stale")
        db.commit()
        raise RefreshInvalidError("refresh token superseded")

    # Valid → rotate: mint the new token first so we can record replaced_by_jti.
    new_token = secrets.token_urlsafe(48)
    new_jti = secrets.token_urlsafe(16)
    ip, ua = _ua_ip(request)
    db.execute(text("""
        INSERT INTO refresh_tokens
            (jti, family_id, user_id, token_hash, token_version,
             issued_at, expires_at, revoked, ip, user_agent)
        VALUES (:jti, :fam, :uid, :hash, :tv, :issued, :expires, 0, :ip, :ua)
    """), {
        "jti": new_jti, "fam": row["family_id"], "uid": user.id, "hash": _hash(new_token),
        "tv": getattr(user, "token_version", 0) or 0,
        "issued": now.isoformat(),
        "expires": (now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).isoformat(),
        "ip": ip, "ua": ua,
    })
    db.execute(text("""
        UPDATE refresh_tokens SET revoked = 1, revoked_at = :now, revoked_reason = 'rotated', replaced_by_jti = :new
        WHERE jti = :old
    """), {"now": now.isoformat(), "new": new_jti, "old": row["jti"]})
    db.commit()
    return new_token
