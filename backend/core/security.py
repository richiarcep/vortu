import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import argon2
import bcrypt as _bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
from core.config import get_settings
from core.database import get_db

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _superadmin_emails() -> set:
    """Lowercased SUPERADMIN_EMAILS allowlist (env, comma-separated). The platform
    operator set — these accounts are super-admins without a DB column, and are
    NEVER a valid impersonation target."""
    return {e.strip().lower() for e in os.getenv("SUPERADMIN_EMAILS", "").split(",") if e.strip()}


def _is_platform_admin(user) -> bool:
    """True if the user is a Vela PLATFORM operator: is_superadmin column OR email in
    the SUPERADMIN_EMAILS allowlist. (NOT is_admin — that is company-level.)"""
    if user is None:
        return False
    return bool(getattr(user, "is_superadmin", False)) or (user.email or "").lower() in _superadmin_emails()

# Argon2id is the primary password-hashing scheme (OWASP-recommended). Legacy
# bcrypt hashes ($2a/$2b/$2y) still verify and are transparently upgraded to
# argon2 on the user's next successful login (see needs_rehash + api/auth.py).
#
# We deliberately call argon2-cffi and the bcrypt library DIRECTLY rather than
# routing through passlib: passlib 1.7.4 is unmaintained and its bcrypt backend
# raises against bcrypt >= 5.0 ("module 'bcrypt' has no attribute '__about__'"
# → ValueError on the 72-byte check), which would lock out every existing
# bcrypt-hashed user. Talking to the libraries directly is both correct and one
# fewer fragile dependency.
_argon2_hasher = argon2.PasswordHasher()  # sensible OWASP-aligned defaults


def hash_password(plain: str) -> str:
    """Turns a plain password into a secure Argon2id hash."""
    return _argon2_hasher.hash(plain)


def _is_bcrypt_hash(hashed: str) -> bool:
    return hashed.startswith(("$2a$", "$2b$", "$2y$"))


def verify_password(plain: str, hashed: str) -> bool:
    """Checks if a plain password matches its hash (argon2id or legacy bcrypt)."""
    if not hashed:
        return False
    try:
        if _is_bcrypt_hash(hashed):
            # bcrypt only considers the first 72 bytes; bcrypt >= 5 raises on
            # longer input instead of silently truncating, so truncate here to
            # match how the hash was originally produced.
            return _bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
        return _argon2_hasher.verify(hashed, plain)
    except Exception:
        return False


def needs_rehash(hashed: str) -> bool:
    """True if the stored hash should be re-hashed to current argon2id params
    (legacy bcrypt → argon2, or outdated argon2 cost parameters)."""
    if not hashed:
        return False
    try:
        if _is_bcrypt_hash(hashed):
            return True
        return _argon2_hasher.check_needs_rehash(hashed)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT token with an expiry + issued-at time."""
    payload = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": expire, "iat": now})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Validates a JWT token and returns its payload."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _twofa_remember_secret() -> str:
    """Secreto DERIVADO (distinto de SECRET_KEY) para firmar el token de
    'recordar 2FA por dispositivo'. Al firmarse con otro secreto, ese token NO
    puede usarse como access token aunque se extraiga la cookie."""
    import hashlib
    return hashlib.sha256((settings.SECRET_KEY + "::2fa-remember-v1").encode()).hexdigest()


def make_2fa_remember_token(user_id: int, days: int = 15) -> str:
    """Token firmado que va en la cookie HttpOnly por-dispositivo tras verificar 2FA."""
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "typ": "2fa_remember", "iat": now,
               "exp": now + timedelta(days=days)}
    return jwt.encode(payload, _twofa_remember_secret(), algorithm=settings.ALGORITHM)


def verify_2fa_remember_token(token: str, user_id: int) -> bool:
    """True solo si la cookie de dispositivo es válida, no expirada, y de ESTE usuario."""
    if not token:
        return False
    try:
        payload = jwt.decode(token, _twofa_remember_secret(), algorithms=[settings.ALGORITHM])
    except JWTError:
        return False
    return payload.get("typ") == "2fa_remember" and str(payload.get("sub")) == str(user_id)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Dependency — extracts and validates the current logged in user."""
    from models.user import User
    payload = decode_token(token)
    # A 2FA *challenge* token (minted pre-TOTP at login with requires_2fa=True, no
    # tv/plan_id) must NOT authorize any protected route — it is only valid at POST
    # /api/2fa/verify-login (which decodes it directly). Rejecting it here closes the
    # bypass where the 5-min temp token was accepted as a full session on every router.
    if payload.get("requires_2fa") is True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Second factor required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # ── IMPERSONATION BRANCH ──────────────────────────────────────────────────
    # An impersonation access token carries act_as (target id) + imp (admin id). It
    # is minted SHORT (15 min) by /api/admin/impersonate and lets a platform admin
    # act *as* a target user (RLS/company_id then "just work" off target.company_id).
    # This branch runs BEFORE the normal load so an impersonation token is never
    # mistaken for a plain session, and it re-verifies BOTH ends on every request so
    # the grant dies the instant the admin is demoted/logged-out or the session is
    # revoked/ended/expired. A normal (non-impersonated) token has no act_as/imp →
    # falls through untouched.
    if payload.get("act_as") is not None or payload.get("imp") is not None:
        return _load_impersonated_user(payload, db)
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    if str(user_id).isdigit():
        user = db.query(User).filter(User.id == int(user_id)).first()
    else:
        user = db.query(User).filter(User.email == str(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    # Reject disabled accounts — a deactivated user's outstanding token must stop working.
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is disabled")
    # Server-side revocation: the token carries the user's token_version at mint time;
    # bumping User.token_version (logout / password change / forced sign-out) invalidates
    # every previously-issued token. Tokens minted before this feature have no "tv" → 0.
    if payload.get("tv", 0) != (getattr(user, "token_version", 0) or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
    return user


def _load_impersonated_user(payload: dict, db: Session):
    """Resolve + RE-VERIFY an impersonation token into the target User, attaching the
    impersonation context (_impersonator_id/_email, _act_as, _readonly, _imp_jti).

    Every check is re-run on EVERY request (not just at mint) so the grant is live:
      (a) the impersonation_session row must exist and be neither revoked, ended,
          nor expired (read on a BYPASSRLS worker session — the row is platform data);
      (b) the impersonator must STILL be an active platform admin at this token_version
          (kills the session the instant the admin is demoted / logged out / rotated);
      (c) the target loads by sub with the usual token_version check; and
      (d) the target is re-asserted to NOT be a superadmin / allowlisted operator
          (defence in depth — privilege escalation via impersonation is impossible).
    """
    from models.user import User
    from core.database import worker_session

    imp_jti = payload.get("imp_jti")
    imp_id = payload.get("imp")
    act_as = payload.get("act_as")
    if not imp_jti or imp_id is None or act_as is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid impersonation token")

    # (a) Session row — must be live. Read cross-tenant on the BYPASSRLS worker session.
    wdb = worker_session()
    try:
        row = wdb.execute(text(
            "SELECT revoked_at, ended_at, expires_at, admin_user_id, target_user_id "
            "FROM impersonation_session WHERE jti = :jti"
        ), {"jti": imp_jti}).fetchone()
    finally:
        wdb.close()
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impersonation session not found")
    revoked_at, ended_at, expires_at = row[0], row[1], row[2]
    if revoked_at or ended_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impersonation session ended")
    if expires_at:
        try:
            if datetime.fromisoformat(str(expires_at)) <= datetime.utcnow():
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impersonation session expired")
        except HTTPException:
            raise
        except (ValueError, TypeError):
            # Unparseable expiry → fail-closed (the 15-min JWT exp already bounds it).
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impersonation session expired")

    # (b) Impersonator — must STILL be an active platform admin at the minted token_version.
    impersonator = db.query(User).filter(User.id == int(imp_id)).first()
    if (impersonator is None or not getattr(impersonator, "is_active", True)
            or not _is_platform_admin(impersonator)
            or payload.get("imp_tv", 0) != (getattr(impersonator, "token_version", 0) or 0)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impersonation revoked")

    # (c) Target — load by sub, keep the normal token_version check.
    sub = payload.get("sub")
    if str(sub).isdigit():
        target = db.query(User).filter(User.id == int(sub)).first()
    else:
        target = db.query(User).filter(User.email == str(sub)).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not getattr(target, "is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is disabled")
    if payload.get("tv", 0) != (getattr(target, "token_version", 0) or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    # (d) Re-assert the target is NOT a platform operator — escalation is impossible.
    if _is_platform_admin(target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot impersonate a platform admin")

    # (e) Attach impersonation context. RLS/company_id then key off target.company_id.
    target._impersonator_id = impersonator.id
    target._impersonator_email = impersonator.email
    target._act_as = target.id
    target._readonly = bool(payload.get("imp_ro", True))
    target._imp_jti = imp_jti
    return target


def get_actor(current_user):
    """Re-attribution helper for audit: returns the (id, email) of the REAL actor.

    Under impersonation the meaningful actor is the platform admin, not the target —
    so audit rows are attributed to whoever actually performed the action. Returns
    (impersonator_id, impersonator_email) when the user is impersonated, else the
    user's own (id, email)."""
    imp_id = getattr(current_user, "_impersonator_id", None)
    if imp_id is not None:
        return imp_id, getattr(current_user, "_impersonator_email", None)
    return current_user.id, current_user.email


def block_impersonation(current_user=Depends(get_current_user)):
    """Dependency: REFUSE entirely under impersonation (any mode), even write-mode.

    For the few actions that must never be performable while "acting as" a customer
    regardless of mode — mutating roles/admin flags/security-critical settings. This
    is belt-and-suspenders: such endpoints often gate on `is_admin`, which the TARGET
    user may legitimately have, so the read-only write-block alone wouldn't catch a
    write-mode impersonation. 403s the moment `_act_as` is set on the resolved user."""
    if getattr(current_user, "_act_as", None) is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción no está permitida durante una sesión de soporte (impersonación).",
        )
    return current_user


def block_impersonated_writes(request: Request, current_user=Depends(get_current_user)):
    """Dependency: in a READ-ONLY impersonation session, reject any state-changing
    method (anything but GET/HEAD/OPTIONS) with 403. Wire onto tenant routers so a
    platform admin acting as a customer in the default 'read' mode physically cannot
    mutate that customer's data. No-op for normal sessions and for 'write'-mode
    impersonation."""
    if getattr(current_user, "_readonly", False) and request.method not in ("GET", "HEAD", "OPTIONS"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta es una sesión de soporte en modo solo lectura; no puede modificar datos.",
        )
    return current_user

def get_tenant_db(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Tenant-scoped DB session: binds the caller's company_id to the Postgres
    session so RLS policies enforce isolation below the app layer.

    Issues ``SELECT set_config('app.current_company_id', cid, true)`` — ``true``
    = transaction-local (SET LOCAL semantics under autocommit=False), so it never
    leaks across pooled connections. NO-OP on SQLite/dev (RLS doesn't exist there;
    app-layer company_id filters remain the isolation mechanism). Use on tenant
    routers; keep get_db for pre-tenant (login/register/webhook) and legitimately
    cross-tenant (superadmin backoffice) endpoints.
    """
    from core.database import RLS_ENABLED
    cid = getattr(current_user, "company_id", None) or 0
    # Stash on the session so the after_begin listener re-applies the GUC on every
    # transaction (so it survives an in-request commit; set_config is txn-local).
    db.info["tenant_company_id"] = cid
    if RLS_ENABLED:
        db.execute(text("SELECT set_config('app.current_company_id', :cid, true)"),
                   {"cid": str(cid)})
    return db


def set_tenant_context(db, company_id):
    """Bind a company to a session OUTSIDE a request (background jobs that loop over
    companies). Issues set_config('app.current_company_id', …, true) on Postgres so
    per-company writes pass RLS WITH CHECK; no-op on SQLite. Pair with worker_session()
    for the cross-tenant enumeration."""
    from core.database import RLS_ENABLED
    db.info["tenant_company_id"] = company_id or 0   # survive commits (see _reapply_tenant_guc)
    if RLS_ENABLED:
        db.execute(text("SELECT set_config('app.current_company_id', :cid, true)"),
                   {"cid": str(company_id or 0)})


def get_admin_db():
    """DB session for the superadmin backoffice — cross-tenant BY DESIGN. Uses the
    BYPASSRLS worker connection (reads every tenant, writes any tenant); the
    RLS-bound app role (vela_app) would otherwise return 0 rows across the whole
    backoffice. No behavioural change on dev/non-RLS (worker_session falls back to
    the normal SessionLocal)."""
    from core.database import worker_session
    db = worker_session()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_admin_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Dependency — only allows Vela PLATFORM admins (superadmins).

    This gates the cross-tenant backoffice (/api/admin/*, prospector, extraction
    review, routing/pipeline/prompt/template config). It must check
    ``is_superadmin``, NOT ``is_admin``: every company's first user is created with
    ``is_admin=True`` (they are the admin *of their own company*), so checking
    ``is_admin`` here would make every customer a platform superadmin. Company-level
    admin actions should check ``current_user.is_admin`` inline, scoped to the
    caller's own ``company_id``.
    """
    from models.user import User
    payload = decode_token(token)
    # A 2FA *challenge* token (minted pre-TOTP at login with requires_2fa=True, no
    # tv/plan_id) must NOT authorize any protected route — it is only valid at POST
    # /api/2fa/verify-login (which decodes it directly). Rejecting it here closes the
    # bypass where the 5-min temp token was accepted as a full session on every router.
    if payload.get("requires_2fa") is True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Second factor required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    if str(user_id).isdigit():
        user = db.query(User).filter(User.id == int(user_id)).first()
    else:
        user = db.query(User).filter(User.email == str(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    # Revocación de sesión: el token debe llevar el token_version vigente del
    # usuario. Logout / cambio de contraseña / enrolar 2FA lo incrementan, dejando
    # revocado cualquier token anterior. get_admin_user hace su PROPIO decode (no
    # pasa por get_current_user), y antes NO comprobaba esto → el back-office
    # aceptaba tokens ya revocados. Mismo chequeo que get_current_user.
    if payload.get("tv", 0) != (getattr(user, "token_version", 0) or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked",
                            headers={"WWW-Authenticate": "Bearer"})
    # Super-admin = columna is_superadmin O email en la allowlist por env
    # (SUPERADMIN_EMAILS, separados por coma): concede acceso de operador de
    # plataforma sin escribir en la DB. Esta es la ÚNICA puerta al back-office.
    if not _is_platform_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso solo para administradores de plataforma de Vela")
    # An impersonation token must NEVER unlock the platform back-office: even though
    # the impersonator is a real admin, the resolved `sub`/user here is the TARGET.
    # get_admin_user does its own decode (it doesn't route through get_current_user),
    # so reject any token that carries impersonation claims outright.
    if payload.get("act_as") is not None or payload.get("imp") is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No disponible durante una sesión de impersonación")
    # 2FA periódico del back-office: cada BACKOFFICE_2FA_DAYS días (0 = desactivado,
    # kill-switch por env) se exige un step-up TOTP para ENTRAR. Solo aplica a admins
    # con 2FA enrolada (no bloquea a quien no la tiene). Las rutas /2fa-status y
    # /2fa-stepup se eximen para que el propio step-up sea alcanzable con el gate activo.
    days = getattr(settings, "BACKOFFICE_2FA_DAYS", 15) or 0
    path = request.url.path if request is not None else ""
    if days > 0 and not (path.endswith("/2fa-stepup") or path.endswith("/2fa-status")):
        try:
            row = db.execute(text("SELECT totp_secret, last_backoffice_2fa FROM users WHERE id = :id"),
                             {"id": user.id}).first()
        except Exception:
            # Si la columna aún no existe o la lectura falla, NO bloquees el back-office
            # (fail-open evita un lock-out total). Limpia la txn envenenada.
            db.rollback()
            row = None
        if row and row[0]:  # solo si tiene 2FA enrolada
            last = row[1]
            stale = True
            if last:
                try:
                    stale = (datetime.utcnow() - datetime.fromisoformat(str(last))) > timedelta(days=days)
                except Exception:
                    stale = True
            if stale:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail={"reason": "backoffice_2fa_required"})
    return user


def require_module(module_key: str):
    """Dependency factory — gates a router/endpoint by the caller's PLAN modules.

    Server-side enforcement of plan entitlement (the frontend sidebar/guard is
    UX-only). During the beta phase (and for superadmins) get_subscription_status
    returns the full module set, so nothing is blocked until the phase flips to
    paid. Attach to module-specific routers via include_router(dependencies=[...]).
    Do NOT attach to dashboard-aggregation endpoints (e.g. /agente/resumen).
    """
    def _dep(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        from models.user import User
        from modules.billing.stripe_service import get_subscription_status
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        uid = int(user_id) if str(user_id).isdigit() else None
        user = (db.query(User).filter(User.id == uid).first() if uid is not None
                else db.query(User).filter(User.email == str(user_id)).first())
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        try:
            status_info = get_subscription_status(db, user.id)
            allowed = status_info.get("modules") or []
        except Exception:
            allowed = []  # fail-closed on the gate, but only for gated routers
        if module_key not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Tu plan no incluye este módulo. Mejora tu plan para acceder.")
        return user
    return _dep
