import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from pathlib import Path
from core.files import enforce_upload_size
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from core.database import get_db
from core.security import hash_password, verify_password, create_access_token, get_tenant_db, set_tenant_context, get_current_user, block_impersonation
from core.rate_limit import rate_limit, account_throttle
from core.audit import audit_event
from core import refresh as refresh_service
from core.cookies import set_refresh_cookie, clear_refresh_cookie, REFRESH_COOKIE_NAME
from models.user import User, Company

logger = logging.getLogger("vera.auth")

# Email-verification token lifetime. The plaintext token goes in the verify link;
# only its sha256 is stored, so a DB leak can't be replayed into a verification.
VERIFICATION_TTL_HOURS = 24


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _send_verification_email(db: Session, user: User) -> bool:
    """Mint a single-use email-verification token for `user`, persist its hash
    (invalidating any prior unused token for the same purpose), and email the
    plaintext link. Best-effort: a mailer failure is logged, never raised — the
    caller's flow (register/resend) must not 500 because email is down."""
    from core.config import get_settings
    settings = get_settings()

    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=VERIFICATION_TTL_HOURS)
    # Invalidate any prior unused email-verify token so only the newest link works.
    db.execute(text(
        "UPDATE verification_tokens SET used_at = :now "
        "WHERE user_id = :uid AND purpose = 'email_verify' AND used_at IS NULL"
    ), {"now": now.isoformat(), "uid": user.id})
    db.execute(text(
        "INSERT INTO verification_tokens (user_id, token_hash, purpose, expires_at, used_at, created_at) "
        "VALUES (:uid, :th, 'email_verify', :exp, NULL, :now)"
    ), {"uid": user.id, "th": _hash_token(token), "exp": expires_at.isoformat(), "now": now.isoformat()})
    db.commit()

    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    html = f"""
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#111">Verifica tu correo</h2>
          <p>Hola{(' ' + user.full_name) if user.full_name else ''}, confirma tu dirección de correo
             para activar tu cuenta de Vela.</p>
          <p style="margin:28px 0">
            <a href="{verify_url}"
               style="background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">
               Verificar correo</a>
          </p>
          <p style="color:#666;font-size:13px">O copia este enlace:<br>{verify_url}</p>
          <p style="color:#999;font-size:12px">El enlace caduca en {VERIFICATION_TTL_HOURS} horas.</p>
        </div>
    """
    try:
        from core.mailer import send_system_email
        sent = send_system_email(user.email, "Verifica tu correo · Vela", html)
    except Exception as e:
        logger.warning("Verification email send raised for user %s: %s", user.id, e)
        sent = False
    if not sent:
        logger.warning("Verification email NOT sent for user %s (mailer unavailable/unconfigured)", user.id)
    return sent

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Contraseñas obviamente débiles que nunca deben permitirse (lista mínima; el
# mínimo de longitud cubre el resto). Ampliable con una comprobación HIBP.
_COMMON_PASSWORDS = {
    "password", "password1", "12345678", "123456789", "1234567890",
    "qwerty123", "11111111", "00000000", "contraseña", "iloveyou",
    "admin123", "welcome1", "velademo",
}


def check_password_policy(pw: str) -> None:
    """Server-side password strength gate (raises ValueError → 422 vía Pydantic).
    Mínimo 8 caracteres, no una contraseña trivialmente común, algo de variedad.
    Antes NO había validación en el servidor: el >=8 vivía solo en el navegador y
    se saltaba con un POST directo (se podía registrar la contraseña "1")."""
    if not pw or len(pw) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres")
    if len(pw) > 200:
        raise ValueError("La contraseña es demasiado larga (máx. 200)")
    if pw.lower() in _COMMON_PASSWORDS:
        raise ValueError("Esa contraseña es demasiado común, elige otra")
    if len(set(pw)) < 4:
        raise ValueError("La contraseña es demasiado simple")


# ── Request / Response schemas ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    company_name: str
    country: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _password_policy(cls, v):
        check_password_policy(v)
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    is_superadmin: bool = False   # operador de plataforma (col is_superadmin o allowlist por env)
    country: Optional[str] = None
    # Moneda derivada del país de la empresa (get_country_info) — para que el
    # frontend formatee el dinero del negocio en la moneda de cada país.
    currency: Optional[str] = None      # EUR | MXN | USD | …
    symbol: Optional[str] = None        # € | $ | S/
    locale: Optional[str] = None        # es-ES | es-MX | es-SV …

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=201,
             dependencies=[Depends(rate_limit(5, 300, "register"))])
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new company and its first admin user."""

    # Check email not already taken (users is not RLS'd → fine on the request session).
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Provisioning a brand-new tenant can't satisfy the companies/id RLS policy: the
    # new id isn't known before INSERT and the GUC is unset pre-tenant, so the WITH
    # CHECK would reject the companies INSERT (and the chart-of-accounts rows). Do it
    # on the BYPASSRLS worker session. No-op difference on dev/non-RLS.
    from core.database import worker_session
    wdb = worker_session()
    try:
        # Create the company
        company = Company(name=data.company_name, email=data.email, country=data.country)
        wdb.add(company)
        wdb.flush()  # get company.id without committing

        # Create the user
        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            is_admin=True,
            company_id=company.id
        )
        wdb.add(user)
        wdb.flush()
        # A self-service signup starts UNVERIFIED: the login gate (see login()) blocks
        # sign-in until the emailed link is clicked. `email_verified` is a raw column
        # (not on the ORM model) → set it explicitly via SQL. Provisioned accounts
        # (invited team members, test accounts, superadmins) are created verified
        # elsewhere; this self-service path is always email_verified=False.
        from models.billing import Subscription, License
        sub = Subscription(user_id=user.id, plan_id="starter", status="none", fase="beta", license_paid=False)
        lic = License(user_id=user.id, plan_id="starter", status="pending", amount_paid=0)
        wdb.add(sub)
        wdb.add(lic)
        wdb.commit()
        wdb.refresh(user)
        wdb.refresh(company)

        # Mark the self-service signup UNVERIFIED in a SEPARATE txn, so a missing
        # email_verified column (staging before the schema migration) can't poison or
        # roll back the just-committed account. The login gate is also guarded.
        try:
            wdb.execute(text("UPDATE users SET email_verified = FALSE WHERE id = :uid"), {"uid": user.id})
            wdb.commit()
        except Exception:
            wdb.rollback()

        # Send the verification email (best-effort; never blocks registration).
        try:
            _send_verification_email(wdb, user)
        except Exception as e:
            wdb.rollback()   # un-poison the txn (e.g. verification_tokens not migrated yet)
            logger.warning("Could not send verification email for user %s: %s", user.id, e)

        result = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "country": company.country,
        }

        # If the country is already known at registration, seed its chart of accounts.
        # (Otherwise it's seeded later in set_country once the user picks a country.)
        if company.country:
            try:
                set_tenant_context(wdb, company.id)
                from modules.accounting.journal import setup_chart_of_accounts
                setup_chart_of_accounts(wdb, company.id, company.country)
                wdb.commit()
            except Exception as e:
                logger.warning("Could not seed chart of accounts for company %s (%s): %s",
                               company.id, company.country, e)
        return result
    finally:
        wdb.close()


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(8, 60, "login"))],
)
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password, returns a JWT token."""

    # Per-account throttle (IP-independent): blunts credential stuffing that
    # rotates source IPs against one account. The IP-keyed rate_limit dependency
    # above handles the per-source dimension.
    account_throttle(form_data.username, max_calls=10, window_seconds=300, scope="login-acct", request=request)

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        # Record failures even when the user doesn't exist (key credential-stuffing
        # signal), keyed to the submitted email.
        audit_event(db, "login_failure", actor_user_id=(user.id if user else None),
                    actor_email=form_data.username, request=request,
                    detail={"reason": "bad_credentials", "user_exists": user is not None})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        audit_event(db, "account_disabled", actor_user_id=user.id,
                    actor_email=user.email, company_id=user.company_id, request=request)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    # ── EMAIL-VERIFICATION LOGIN GATE (server-side, the key fix) ────────────────
    # Credentials are correct, but a self-service account that hasn't confirmed its
    # email cannot sign in. Read the raw `email_verified` column (not on the ORM
    # model). Existing accounts were backfilled to TRUE in ensure_runtime_schema, so
    # this never locks out anyone who predates the column. `IS NOT TRUE` treats NULL
    # as unverified (fail-closed). Provisioned/invited/test accounts are created
    # verified, so they pass straight through.
    try:
        _ev = db.execute(text("SELECT email_verified FROM users WHERE id = :uid"),
                         {"uid": user.id}).scalar()
    except Exception as _gate_err:
        # Distinguish "column not migrated yet" (legacy/pre-DDL → treat as verified so
        # login isn't bricked; the gate self-activates after the migration) from ANY
        # OTHER db error (lock, poisoned txn, transient connection), which must FAIL
        # CLOSED — a security gate that waves everyone through on any error is not a
        # gate (security review finding, 2026-06). db.rollback() un-poisons the txn.
        db.rollback()
        _msg = str(_gate_err).lower()
        _missing_column = "email_verified" in _msg and (
            "no such column" in _msg or "does not exist" in _msg
            or "undefinedcolumn" in type(_gate_err).__name__.lower()
        )
        if _missing_column:
            _ev = True
        else:
            logger.error("email_verified gate read failed; failing closed: %s", _gate_err)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No se pudo verificar tu cuenta ahora mismo; inténtalo de nuevo.",
            )
    if _ev is not True and _ev not in (1, "1", "t", "true", "TRUE"):
        audit_event(db, "login_unverified_email", actor_user_id=user.id,
                    actor_email=user.email, company_id=user.company_id, request=request)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verifica tu email antes de iniciar sesión",
        )

    # Transparently upgrade legacy bcrypt hashes to argon2 on successful login.
    from core.security import needs_rehash, hash_password
    if needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(form_data.password)
        db.commit()

    # Update last login
    from datetime import datetime, timedelta
    user.last_login = datetime.utcnow().isoformat()
    db.commit()

    # Check 2FA
    if getattr(user, 'totp_enabled', False) and user.totp_enabled:
        now = datetime.utcnow()
        skip_2fa = False
        if getattr(user, 'last_2fa_verified', None):
            try:
                last_v = datetime.fromisoformat(user.last_2fa_verified)
                if (now - last_v).days < 15:
                    skip_2fa = True
            except (ValueError, TypeError) as e:
                # Malformed stored timestamp: log it but stay fail-secure
                # (skip_2fa remains False, so 2FA is still required).
                logger.warning("Could not parse last_2fa_verified for user %s: %s", user.id, e)
        if not skip_2fa:
            temp_token = create_access_token(data={"sub": str(user.id), "is_admin": user.is_admin, "requires_2fa": True}, expires_delta=timedelta(minutes=5))
            audit_event(db, "login_2fa_challenge", actor_user_id=user.id,
                        actor_email=user.email, company_id=user.company_id, request=request)
            return {"access_token": temp_token, "token_type": "bearer", "requires_2fa": True}

    # Get user plan
    from models.billing import Subscription
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    plan_id = sub.plan_id if sub else "starter"
    token = create_access_token(data={"sub": str(user.id), "is_admin": user.is_admin, "plan_id": plan_id,
                                       "name": user.full_name, "tv": getattr(user, "token_version", 0) or 0})
    # Issue a rotating refresh token in an HttpOnly cookie (prod) ALONGSIDE the
    # body access token (which the bearer/localStorage dev flow keeps using).
    _rt = refresh_service.issue(db, user, request=request)
    set_refresh_cookie(response, _rt, request=request)
    audit_event(db, "login_success", actor_user_id=user.id, actor_email=user.email,
                company_id=user.company_id, request=request, detail={"twofa": False})
    return {"access_token": token, "token_type": "bearer", "requires_2fa": False}


@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(30, 60, "refresh"))],
)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Exchange the HttpOnly refresh cookie for a fresh short access token,
    rotating the refresh token. Detects reuse of a revoked token (theft) and
    kills the whole token family + every access token for that user."""
    presented = request.cookies.get(REFRESH_COOKIE_NAME)
    if not presented:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    # Resolve the owning user from the (still-valid) token row before validating,
    # so we can compare token_version and bump it on reuse.
    import hashlib
    row = db.execute(text(
        "SELECT user_id FROM refresh_tokens WHERE token_hash = :h"
    ), {"h": hashlib.sha256(presented.encode()).hexdigest()}).first()
    if not row:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == row[0]).first()
    if not user or not user.is_active:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    try:
        new_rt = refresh_service.consume(db, presented, user, request=request)
    except refresh_service.RefreshReuseError:
        # Theft: family already revoked inside consume(); also bump token_version
        # to invalidate every access token, and force a clean re-login.
        user.token_version = (getattr(user, "token_version", 0) or 0) + 1
        db.commit()
        clear_refresh_cookie(response)
        audit_event(db, "refresh_reuse_detected", actor_user_id=user.id, actor_email=user.email,
                    company_id=user.company_id, request=request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked, please log in again")
    except refresh_service.RefreshInvalidError:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or invalid")

    if new_rt is not None:
        set_refresh_cookie(response, new_rt, request=request)  # rotated
    # (new_rt is None on a benign concurrent-refresh race → keep the existing cookie)

    from models.billing import Subscription
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    plan_id = sub.plan_id if sub else "starter"
    token = create_access_token(data={"sub": str(user.id), "is_admin": user.is_admin, "plan_id": plan_id,
                                       "name": user.full_name, "tv": getattr(user, "token_version", 0) or 0})
    audit_event(db, "refresh_success", actor_user_id=user.id, actor_email=user.email,
                company_id=user.company_id, request=request)
    return {"access_token": token, "token_type": "bearer", "requires_2fa": False}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db),
           current_user: User = Depends(__import__('core.security', fromlist=['get_current_user']).get_current_user)):
    """Server-side logout: bump token_version so EVERY outstanding access token
    stops validating, revoke all refresh tokens, and clear the cookie."""
    current_user.token_version = (getattr(current_user, "token_version", 0) or 0) + 1
    db.commit()
    refresh_service.revoke_all_for_user(db, current_user.id, reason="logout")
    clear_refresh_cookie(response)
    audit_event(db, "logout", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db),
           token: str = Depends(__import__('fastapi').security.OAuth2PasswordBearer(tokenUrl="/api/auth/login"))):
    """Returns the currently logged in user."""
    from core.security import get_current_user
    user = get_current_user(token=token, db=db)
    # Bind the tenant so the RLS'd companies row (user.company) loads under RLS;
    # otherwise user.company is None and country comes back null.
    set_tenant_context(db, user.company_id)
    from country.registry import get_country_info
    import os as _os
    country = user.company.country if user.company else None
    info = get_country_info(country) if country else None
    _allow = {e.strip().lower() for e in _os.getenv("SUPERADMIN_EMAILS", "").split(",") if e.strip()}
    _is_super = bool(getattr(user, "is_superadmin", False)) or (user.email or "").lower() in _allow
    try:
        _avatar = db.execute(text("SELECT avatar_url FROM users WHERE id = :id"), {"id": user.id}).scalar()
    except Exception:
        db.rollback()
        _avatar = None
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": _avatar,
        "is_admin": user.is_admin,
        "is_superadmin": _is_super,
        "country": country,
        "currency": (info or {}).get("currency"),
        "symbol": (info or {}).get("symbol"),
        "locale": (info or {}).get("language"),
    }


# ── Profile avatar (upload + serve) ──────────────────────────────────────────
_AVATAR_DIR = Path("uploads/avatars")
_AVATAR_EXT = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
               "image/webp": "webp", "image/gif": "gif"}
_AVATAR_MAX_MB = 3


@router.post("/avatar", dependencies=[Depends(block_impersonation)])
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload the current user's profile photo (JPG/PNG/WEBP/GIF, ≤3 MB). Saved as
    uploads/avatars/<id>.<ext>; avatar_url is set to the public serve endpoint.
    block_impersonation: a support session must not change a customer's avatar."""
    ext = _AVATAR_EXT.get((file.content_type or "").lower())
    if not ext:
        raise HTTPException(status_code=415, detail="Formato no soportado (usa JPG, PNG, WEBP o GIF)")
    enforce_upload_size(file, max_mb=_AVATAR_MAX_MB)
    content = file.file.read(_AVATAR_MAX_MB * 1024 * 1024 + 1)
    if len(content) > _AVATAR_MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Imagen demasiado grande (máx {_AVATAR_MAX_MB} MB)")
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    _AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    # Drop any previous avatar (possibly a different extension) for this user.
    for old in _AVATAR_DIR.glob(f"{current_user.id}.*"):
        try:
            old.unlink()
        except OSError:
            pass
    (_AVATAR_DIR / f"{current_user.id}.{ext}").write_bytes(content)
    url = f"/api/auth/avatar/{current_user.id}"
    try:
        db.execute(text("UPDATE users SET avatar_url = :u WHERE id = :id"),
                   {"u": url, "id": current_user.id})
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el avatar (falta la columna avatar_url; corre la migración).",
        )
    audit_event(db, "avatar_updated", actor_user_id=current_user.id,
                actor_email=current_user.email, company_id=current_user.company_id)
    return {"avatar_url": url}


@router.get("/avatar/{user_id}")
def get_avatar(user_id: int):
    """Serve a user's avatar image. Public on purpose — avatars are non-sensitive
    display data and an <img src> can't carry the bearer token."""
    for f in _AVATAR_DIR.glob(f"{user_id}.*"):
        return FileResponse(str(f))
    raise HTTPException(status_code=404, detail="Sin avatar")


@router.post("/set-country")
def set_country(
    data: dict,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(__import__('core.security', fromlist=['get_current_user']).get_current_user)
):
    """Fija el país de la empresa. Solo se puede hacer una vez (Opción A)."""
    country = data.get("country")
    if not country:
        raise HTTPException(status_code=400, detail="País requerido")
    if len(country) != 2:
        raise HTTPException(status_code=400, detail="Código de país inválido (ISO alfa-2)")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if company.country:
        raise HTTPException(status_code=400, detail="El país ya está configurado y no puede cambiarse")
    company.country = country.upper()
    db.commit()
    # Seed the country's official chart of accounts now that the country is known.
    try:
        from modules.accounting.journal import setup_chart_of_accounts
        setup_chart_of_accounts(db, company.id, company.country)
    except Exception as e:
        logger.warning("Could not seed chart of accounts for company %s (%s): %s",
                       company.id, company.country, e)
    return {
        "mensaje": f"País configurado: {company.country}",
        "country": company.country,
        "company_id": company.id,
    }


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _password_policy(cls, v):
        check_password_policy(v)
        return v


@router.post("/change-password",
             dependencies=[Depends(rate_limit(5, 300, "change-password")), Depends(block_impersonation)])
def change_password(
    data: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # block_impersonation: changing the password (and bumping token_version below) is
    # security-critical — a support session must never be able to take over an account.
    """Cambia la contraseña del usuario autenticado: verifica la actual, valida la
    nueva (misma política), re-hashea, y bumpea token_version + revoca los refresh
    tokens para cerrar todas las sesiones existentes. Antes este flujo NO existía
    (el botón de ajustes solo mostraba un toast)."""
    if not verify_password(data.current_password, current_user.hashed_password):
        audit_event(db, "password_change_failed", actor_user_id=current_user.id,
                    actor_email=current_user.email, company_id=current_user.company_id, request=request)
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    if data.new_password == data.current_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser distinta de la actual")
    current_user.hashed_password = hash_password(data.new_password)
    # Invalida todos los access tokens vivos (tv) y revoca los refresh tokens.
    current_user.token_version = (getattr(current_user, "token_version", 0) or 0) + 1
    # Reset the 15-day 2FA-skip window: a password change must force a fresh TOTP on
    # the next login, so a leaked password can't ride an existing skip window into a
    # full session (security review finding, 2026-06).
    current_user.last_2fa_verified = None
    db.commit()
    try:
        refresh_service.revoke_all_for_user(db, current_user.id, reason="password_change")
    except Exception as e:
        logger.warning("revoke refresh tokens on password change failed: %s", e)
    audit_event(db, "password_changed", actor_user_id=current_user.id,
                actor_email=current_user.email, company_id=current_user.company_id, request=request)
    return {"ok": True, "mensaje": "Contraseña actualizada. Vuelve a iniciar sesión."}


# ── Email verification ──────────────────────────────────────────────────────────

class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/verify-email", dependencies=[Depends(rate_limit(10, 300, "verify-email"))])
def verify_email(data: VerifyEmailRequest, request: Request, db: Session = Depends(get_db)):
    """Consume an email-verification token: hash the plaintext, find the matching
    unused + unexpired row, mark the user verified and the token used. Single-use —
    a token works exactly once, and only before it expires."""
    token = (data.token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token requerido")
    th = _hash_token(token)
    now = datetime.utcnow()
    row = db.execute(text(
        "SELECT id, user_id, expires_at, used_at FROM verification_tokens "
        "WHERE token_hash = :th AND purpose = 'email_verify'"
    ), {"th": th}).fetchone()
    if row is None or row[3] is not None:
        # Unknown OR already-used token. Don't distinguish (avoids token-probing).
        raise HTTPException(status_code=400, detail="Enlace de verificación inválido o ya utilizado")
    # Expiry check (stored ISO string).
    try:
        if row[2] and datetime.fromisoformat(str(row[2])) <= now:
            raise HTTPException(status_code=400, detail="El enlace de verificación ha caducado")
    except HTTPException:
        raise
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="El enlace de verificación ha caducado")

    user = db.query(User).filter(User.id == row[1]).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    db.execute(text("UPDATE users SET email_verified = TRUE WHERE id = :uid"), {"uid": user.id})
    db.execute(text("UPDATE verification_tokens SET used_at = :now WHERE id = :rid"),
               {"now": now.isoformat(), "rid": row[0]})
    db.commit()
    audit_event(db, "email_verified", actor_user_id=user.id, actor_email=user.email,
                company_id=user.company_id, request=request)
    return {"ok": True, "verified": True, "mensaje": "Correo verificado. Ya puedes iniciar sesión."}


class ResendVerificationRequest(BaseModel):
    email: EmailStr


@router.post("/resend-verification", dependencies=[Depends(rate_limit(3, 3600, "resend-verification"))])
def resend_verification(data: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)):
    """Re-send the verification email (rate-limited ~3/hour). Mints a fresh token,
    invalidating any prior one. Always returns a generic OK — it never reveals
    whether the email exists or is already verified (account-enumeration safe)."""
    generic = {"ok": True, "mensaje": "Si la cuenta existe y no está verificada, te enviamos un nuevo enlace."}
    # Per-account throttle on top of the IP limiter: blunts using resend to spam a
    # specific address from many IPs.
    account_throttle(data.email, max_calls=3, window_seconds=3600, scope="resend-verif-acct", request=request)

    user = db.query(User).filter(User.email == data.email).first()
    if user is None:
        return generic
    ev = db.execute(text("SELECT email_verified FROM users WHERE id = :uid"), {"uid": user.id}).scalar()
    if ev is True or ev in (1, "1", "t", "true", "TRUE"):
        # Already verified — nothing to do, but don't disclose that.
        return generic
    try:
        _send_verification_email(db, user)
    except Exception as e:
        logger.warning("resend-verification send failed for user %s: %s", user.id, e)
    audit_event(db, "verification_resent", actor_user_id=user.id, actor_email=user.email,
                company_id=user.company_id, request=request)
    return generic
