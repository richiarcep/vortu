import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from core.database import get_db
from core.security import hash_password, verify_password, create_access_token
from core.rate_limit import rate_limit
from core.audit import audit_event
from models.user import User, Company

logger = logging.getLogger("vera.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Request / Response schemas ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    company_name: str
    country: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    country: Optional[str] = None

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new company and its first admin user."""

    # Check email not already taken
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create the company
    company = Company(name=data.company_name, email=data.email, country=data.country)
    db.add(company)
    db.flush()  # get company.id without committing

    # Create the user
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        is_admin=True,
        company_id=company.id
    )
    db.add(user)
    db.flush()
    from models.billing import Subscription, License
    sub = Subscription(user_id=user.id, plan_id="starter", status="none", fase="beta", license_paid=False)
    lic = License(user_id=user.id, plan_id="starter", status="pending", amount_paid=0)
    db.add(sub)
    db.add(lic)
    db.commit()
    db.refresh(user)

    # If the country is already known at registration, seed its chart of accounts.
    # (Otherwise it's seeded later in set_country once the user picks a country.)
    if company.country:
        try:
            from modules.accounting.journal import setup_chart_of_accounts
            setup_chart_of_accounts(db, company.id, company.country)
        except Exception as e:
            logger.warning("Could not seed chart of accounts for company %s (%s): %s",
                           company.id, company.country, e)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_admin": user.is_admin,
        "country": company.country,
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(8, 60, "login"))],
)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password, returns a JWT token."""

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
                                       "tv": getattr(user, "token_version", 0) or 0})
    audit_event(db, "login_success", actor_user_id=user.id, actor_email=user.email,
                company_id=user.company_id, request=request, detail={"twofa": False})
    return {"access_token": token, "token_type": "bearer", "requires_2fa": False}


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db),
           current_user: User = Depends(__import__('core.security', fromlist=['get_current_user']).get_current_user)):
    """Server-side logout: bump token_version so EVERY outstanding token for this
    user stops validating (real revocation, not just clearing client storage)."""
    current_user.token_version = (getattr(current_user, "token_version", 0) or 0) + 1
    db.commit()
    audit_event(db, "logout", actor_user_id=current_user.id, actor_email=current_user.email,
                company_id=current_user.company_id, request=request)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db),
           token: str = Depends(__import__('fastapi').security.OAuth2PasswordBearer(tokenUrl="/api/auth/login"))):
    """Returns the currently logged in user."""
    from core.security import get_current_user
    user = get_current_user(token=token, db=db)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_admin": user.is_admin,
        "country": user.company.country if user.company else None,
    }

@router.post("/set-country")
def set_country(
    data: dict,
    db: Session = Depends(get_db),
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
