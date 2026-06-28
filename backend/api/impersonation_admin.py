"""Scoped, audited admin impersonation — "act as a customer" for support.

A Vela PLATFORM admin (is_superadmin / SUPERADMIN_EMAILS) can mint a SHORT-LIVED
(15-min) token that lets them act *as* a target user so RLS/company_id naturally
scope every query to that customer's tenant. The grant is:

  • behind get_admin_user (the ONLY back-office gate) + get_admin_db (BYPASSRLS);
  • step-up authenticated — a FRESH TOTP code is required at mint (the admin's
    standing session is not enough to start impersonating someone);
  • read-only by DEFAULT (block_impersonated_writes rejects mutations);
  • refused outright against superadmins, allowlisted operators, self, inactive
    accounts, and — unless allow_real_user=true — non-test (real) customer accounts;
  • recorded in impersonation_session (revocable/endable server-side) and the
    tamper-evident security audit log (start + stop).

The minted token is returned in the BODY ONLY — never a cookie, never a refresh
token — so it can't silently persist or be refreshed into a long-lived session.
"""
import logging
import secrets
from datetime import datetime, timedelta

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.security import (
    get_admin_user,
    get_admin_db,
    create_access_token,
    _is_platform_admin,
    _superadmin_emails,
)
from core.rate_limit import rate_limit
from core.audit import audit_event, client_ip
from models.user import User

logger = logging.getLogger("vela.impersonation")

router = APIRouter(prefix="/api/admin/impersonate", tags=["Admin · Impersonation"])

IMPERSONATION_TTL_MINUTES = 15
IMPERSONATION_TTL_SECONDS = IMPERSONATION_TTL_MINUTES * 60


class ImpersonateRequest(BaseModel):
    reason: str
    totp_code: str = ""
    mode: str = "read"
    allow_real_user: bool = False

    @field_validator("reason")
    @classmethod
    def _reason_required(cls, v: str) -> str:
        # Mandatory justification — an un-justified impersonation must be impossible
        # (422 if empty/whitespace). It is recorded on the session row + audit log.
        if not v or not v.strip():
            raise ValueError("Se requiere un motivo para la impersonación")
        return v.strip()

    @field_validator("mode")
    @classmethod
    def _mode_valid(cls, v: str) -> str:
        v = (v or "read").strip().lower()
        if v not in ("read", "write"):
            raise ValueError("mode debe ser 'read' o 'write'")
        return v


@router.post("/stop")
def stop_impersonation(
    request: Request,
    db: Session = Depends(get_admin_db),
):
    """End the caller's OWN impersonation session (sets ended_at). Decodes the bearer
    token directly: the caller presents an impersonation token (so get_admin_user
    would 403 it), so we resolve imp_jti / imp from the token and close that row.

    Defined BEFORE the /{user_id} route so the literal /stop path always wins over the
    int path-parameter match."""
    from core.security import decode_token
    # Extract the bearer manually (this endpoint accepts an impersonation token, which
    # get_admin_user / get_current_user would reject or transform).
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
    token = auth.split(" ", 1)[1].strip()
    payload = decode_token(token)
    imp_jti = payload.get("imp_jti")
    imp_id = payload.get("imp")
    if not imp_jti or imp_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay sesión de impersonación activa")

    row = db.execute(text(
        "SELECT admin_user_id, target_user_id, company_id, ended_at "
        "FROM impersonation_session WHERE jti = :jti"
    ), {"jti": imp_jti}).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
    # The token's imp claim must own this row — you can only stop your OWN session.
    if int(row[0]) != int(imp_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puede cerrar esta sesión")

    if row[3] is None:  # not already ended → set ended_at
        db.execute(text("UPDATE impersonation_session SET ended_at = :now WHERE jti = :jti"),
                   {"now": datetime.utcnow().isoformat(), "jti": imp_jti})
        db.commit()

    admin = db.query(User).filter(User.id == int(imp_id)).first()
    audit_event(db, "impersonation_end",
                actor_user_id=int(imp_id),
                actor_email=(admin.email if admin else payload.get("imp_email")),
                target=f"user:{row[1]}", company_id=row[2], request=request,
                detail={"jti": imp_jti})
    return {"ok": True, "ended": True}


@router.post("/{user_id}", dependencies=[Depends(rate_limit(10, 300, "impersonate"))])
def start_impersonation(
    user_id: int,
    body: ImpersonateRequest,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_admin_db),
):
    """Mint a 15-min impersonation token for `user_id`. Requires a fresh TOTP code
    (2FA step-up). Read-only by default; write requires mode='write'. Real (non-test)
    customers require allow_real_user=true. Returns the access token in the BODY ONLY."""

    # ── 2FA step-up: a fresh TOTP code, verified against the admin's own secret ──
    # Impersonation is a privileged, audited action — the admin's standing session is
    # not sufficient. Absent secret OR bad/absent code → 403 (never reveal which).
    secret = getattr(admin, "totp_secret", None)
    if not secret or not body.totp_code or not pyotp.TOTP(secret).verify(body.totp_code.strip(), valid_window=1):
        audit_event(db, "impersonation_denied", actor_user_id=admin.id, actor_email=admin.email,
                    target=f"user:{user_id}", request=request,
                    detail={"reason": "totp_failed"})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Código 2FA inválido o ausente; se requiere verificación reciente.")

    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    # ── HARD REFUSALS (403) ─────────────────────────────────────────────────────
    # Privilege boundaries that must hold no matter what the body says:
    #   · never impersonate a superadmin / allowlisted operator (escalation),
    #   · never impersonate yourself,
    #   · never impersonate a disabled account, and
    #   · in the default 'read' posture, never touch a REAL (non-test) customer
    #     unless the caller explicitly sets allow_real_user=true.
    def _refuse(why: str):
        audit_event(db, "impersonation_denied", actor_user_id=admin.id, actor_email=admin.email,
                    target=f"user:{target.id}", company_id=target.company_id, request=request,
                    detail={"reason": why, "target_email": target.email})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Impersonación no permitida para este usuario.")

    if bool(getattr(target, "is_superadmin", False)) or (target.email or "").lower() in _superadmin_emails():
        _refuse("target_is_platform_admin")
    if target.id == admin.id:
        _refuse("self")
    if not getattr(target, "is_active", True):
        _refuse("target_inactive")
    if not bool(getattr(target, "is_test_account", False)) and body.allow_real_user is not True:
        _refuse("real_user_requires_allow_real_user")

    # ── Mint the session row + the short token ──────────────────────────────────
    jti = secrets.token_urlsafe(24)
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=IMPERSONATION_TTL_MINUTES)
    readonly = body.mode != "write"

    db.execute(text("""
        INSERT INTO impersonation_session
            (jti, admin_user_id, target_user_id, company_id, reason, mode,
             issued_at, expires_at, revoked_at, ended_at, ip, user_agent)
        VALUES
            (:jti, :admin_id, :target_id, :company_id, :reason, :mode,
             :issued_at, :expires_at, NULL, NULL, :ip, :ua)
    """), {
        "jti": jti,
        "admin_id": admin.id,
        "target_id": target.id,
        "company_id": target.company_id,
        "reason": body.reason,
        "mode": body.mode,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "ip": client_ip(request),
        "ua": request.headers.get("user-agent"),
    })
    db.commit()

    token = create_access_token(
        data={
            "sub": str(target.id),
            "tv": getattr(target, "token_version", 0) or 0,
            "act_as": target.id,
            "imp": admin.id,
            "imp_email": admin.email,
            "imp_tv": getattr(admin, "token_version", 0) or 0,
            "imp_jti": jti,
            "imp_ro": readonly,
        },
        expires_delta=timedelta(minutes=IMPERSONATION_TTL_MINUTES),
    )

    audit_event(db, "impersonation_start", actor_user_id=admin.id, actor_email=admin.email,
                target=f"user:{target.id}", company_id=target.company_id, request=request,
                detail={"reason": body.reason, "mode": body.mode, "target_email": target.email})

    # BODY ONLY — no Set-Cookie, no refresh token. The token cannot be refreshed.
    return {
        "access_token": token,
        "expires_in": IMPERSONATION_TTL_SECONDS,
        "act_as": target.id,
        "mode": body.mode,
    }
