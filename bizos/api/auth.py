from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool

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
    company = Company(name=data.company_name, email=data.email)
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
    db.commit()
    db.refresh(user)

    return user


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
    return get_current_user(token=token, db=db)