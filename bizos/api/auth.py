from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from core.database import get_db
from core.security import hash_password, verify_password, create_access_token
from models.user import User, Company

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

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_admin": user.is_admin,
        "country": company.country,
    }


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password, returns a JWT token."""

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    # Get user plan
    from models.billing import Subscription
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    plan_id = sub.plan_id if sub else "starter"

    token = create_access_token(data={"sub": str(user.id), "is_admin": user.is_admin, "plan_id": plan_id})
    return {"access_token": token, "token_type": "bearer"}


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
    return {
        "mensaje": f"País configurado: {company.country}",
        "country": company.country,
        "company_id": company.id,
    }
