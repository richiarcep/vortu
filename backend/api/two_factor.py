"""
2FA — TOTP Authentication with Google Authenticator / Authy
"""
import pyotp
import qrcode
import io
import base64
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from core.database import get_db
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
from core.security import get_current_user
from core.rate_limit import rate_limit
from core.audit import audit_event
from models.user import User

router = APIRouter(prefix="/api/auth/2fa", tags=["2FA"])


class VerifyRequest(BaseModel):
    code: str


@router.post("/setup")
def setup_2fa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate TOTP secret and QR code for setup."""
    # Generate new secret
    secret = pyotp.random_base32()
    
    # Save secret (not yet enabled until verified)
    current_user.totp_secret = secret
    db.commit()
    
    # Generate provisioning URI
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="Vela"
    )
    
    # Generate QR code as base64
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "uri": uri,
    }


@router.post("/verify", dependencies=[Depends(rate_limit(10, 60, "2fa-verify"))])
def verify_2fa(
    body: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify TOTP code and enable 2FA."""
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA no configurado. Ejecuta /setup primero.")
    
    totp = pyotp.TOTP(current_user.totp_secret)
    
    if totp.verify(body.code, valid_window=1):
        current_user.totp_enabled = True
        current_user.totp_verified_at = datetime.utcnow().isoformat()
        db.commit()
        return {"enabled": True, "message": "2FA activado correctamente"}
    else:
        raise HTTPException(status_code=400, detail="Codigo incorrecto. Intenta de nuevo.")


@router.post("/disable", dependencies=[Depends(rate_limit(10, 60, "2fa-disable"))])
def disable_2fa(
    body: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disable 2FA (requires current code)."""
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA no esta activo")
    
    totp = pyotp.TOTP(current_user.totp_secret)
    
    if totp.verify(body.code, valid_window=1):
        current_user.totp_enabled = False
        current_user.totp_secret = None
        current_user.totp_verified_at = None
        db.commit()
        return {"enabled": False, "message": "2FA desactivado"}
    else:
        raise HTTPException(status_code=400, detail="Codigo incorrecto")



@router.post("/verify-login", dependencies=[Depends(rate_limit(6, 60, "2fa-verify-login"))])
def verify_login_2fa(
    body: VerifyRequest,
    request: Request,
    response: Response,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Verify 2FA during login. Exchanges the short-lived TEMP token for a full
    session (body access token + refresh cookie)."""
    from core.security import decode_token, create_access_token
    from core import refresh as refresh_service
    from core.cookies import set_refresh_cookie

    payload = decode_token(token)
    # Positively assert this is a 2FA temp token: it must carry requires_2fa=True
    # and must NOT be a full-session token (which carries plan_id/tv). This closes
    # the cosmetic-scoping hole where any valid token was accepted at the exchange.
    if payload.get("requires_2fa") is not True or "tv" in payload or "plan_id" in payload:
        raise HTTPException(status_code=401, detail="Token de 2FA inválido")
    user_id = payload.get("sub")

    if str(user_id).isdigit():
        user = db.query(User).filter(User.id == int(user_id)).first()
    else:
        user = db.query(User).filter(User.email == str(user_id)).first()

    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    import pyotp
    totp = pyotp.TOTP(user.totp_secret)

    if totp.verify(body.code, valid_window=1):
        user.last_2fa_verified = datetime.utcnow().isoformat()
        db.commit()

        from models.billing import Subscription
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        plan_id = sub.plan_id if sub else "starter"
        full_token = create_access_token(data={"sub": str(user.id), "is_admin": user.is_admin, "plan_id": plan_id,
                                                "tv": getattr(user, "token_version", 0) or 0})
        _rt = refresh_service.issue(db, user, request=request)
        set_refresh_cookie(response, _rt, request=request)
        audit_event(db, "login_success", actor_user_id=user.id, actor_email=user.email,
                    company_id=user.company_id, request=request, detail={"twofa": True})
        return {"access_token": full_token, "token_type": "bearer", "verified": True}
    else:
        audit_event(db, "login_2fa_failure", actor_user_id=user.id, actor_email=user.email,
                    company_id=user.company_id, request=request)
        raise HTTPException(status_code=400, detail="Codigo incorrecto. Intenta de nuevo.")

@router.get("/status")
def get_2fa_status(
    current_user: User = Depends(get_current_user)
):
    """Check if 2FA is enabled."""
    return {
        "enabled": bool(current_user.totp_enabled),
        "verified_at": current_user.totp_verified_at if current_user.totp_enabled else None,
    }
