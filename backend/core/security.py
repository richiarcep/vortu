from datetime import datetime, timedelta, timezone
from typing import Optional
import argon2
import bcrypt as _bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
from core.config import get_settings
from core.database import get_db

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

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


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Dependency — extracts and validates the current logged in user."""
    from models.user import User
    payload = decode_token(token)
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
    if RLS_ENABLED:
        db.execute(text("SELECT set_config('app.current_company_id', :cid, true)"),
                   {"cid": str(getattr(current_user, "company_id", None) or 0)})
    return db


def set_tenant_context(db, company_id):
    """Bind a company to a session OUTSIDE a request (background jobs that loop over
    companies). Issues set_config('app.current_company_id', …, true) on Postgres so
    per-company writes pass RLS WITH CHECK; no-op on SQLite. Pair with worker_session()
    for the cross-tenant enumeration."""
    from core.database import RLS_ENABLED
    if RLS_ENABLED:
        db.execute(text("SELECT set_config('app.current_company_id', :cid, true)"),
                   {"cid": str(company_id or 0)})


def get_admin_user(
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
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    if str(user_id).isdigit():
        user = db.query(User).filter(User.id == int(user_id)).first()
    else:
        user = db.query(User).filter(User.email == str(user_id)).first()
    if user is None or not getattr(user, "is_superadmin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso solo para administradores de plataforma de Vela")
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
