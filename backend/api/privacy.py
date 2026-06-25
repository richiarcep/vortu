"""GDPR data-subject endpoints — right of access/portability (Art.15/20) and
right to erasure (Art.17).

- GET  /api/me/export                      → the caller's personal data (JSON)
- DELETE /api/me/erase                      → erase/anonymize the caller's account
- POST /api/admin/privacy/customers/{id}/erase  → company admin erases a contact
- POST /api/admin/privacy/employees/{id}/erase  → company admin erases an employee

Erasure pseudonymizes PII in place rather than hard-deleting, because financial
/ fiscal records carry a legal retention duty (≥4–6 yrs) and rows are referenced
by accounting entries. Names/emails/phones are replaced with non-identifying
tokens; the structural row and its financial figures survive in anonymized form.
Every access and erasure is written to the security audit log (without echoing
the erased PII back into the audit detail).
"""
import hashlib
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.audit import audit_event
from models.user import User, Company

logger = logging.getLogger("vela.privacy")

router = APIRouter(tags=["Privacy / GDPR"])

_ANON_NAME = "[borrado]"


def _anon_email(original: str) -> str:
    """Deterministic, non-reversible placeholder email so uniqueness constraints
    still hold after erasure without keeping the real address."""
    digest = hashlib.sha256((original or "").encode("utf-8")).hexdigest()[:16]
    return f"borrado+{digest}@anon.invalid"


# ── Right of access / portability (Art.15 / Art.20) ──────────────────────────

@router.get("/api/me/export")
def export_my_data(request: Request, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """Return the authenticated user's personal data as JSON (data portability)."""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()

    # SELECT * + mapping access so this stays correct across schema drift
    # (some deployments predate the subscriptions.fase column).
    subs = []
    if _table_exists(db, "subscriptions"):
        for row in db.execute(text("SELECT * FROM subscriptions WHERE user_id = :uid"),
                              {"uid": current_user.id}).mappings():
            subs.append({
                "plan_id": row.get("plan_id"), "status": row.get("status"),
                "fase": row.get("fase"), "created_at": str(row.get("created_at")),
            })

    audit_rows = db.execute(text("""
        SELECT ts, event, ip, user_agent FROM security_audit_log
        WHERE actor_user_id = :uid ORDER BY id DESC LIMIT 500
    """), {"uid": current_user.id}).fetchall()

    payload = {
        "exported_at": _now_iso(),
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "is_admin": current_user.is_admin,
            "country": company.country if company else None,
            "created_at": str(current_user.created_at) if current_user.created_at else None,
            "last_login": current_user.last_login,
            "two_factor_enabled": bool(current_user.totp_enabled),
        },
        "company": {
            "id": company.id, "name": company.name, "email": company.email,
            "country": company.country,
        } if company else None,
        "subscriptions": subs,
        "security_events": [
            {"ts": r[0], "event": r[1], "ip": r[2], "user_agent": r[3]} for r in audit_rows
        ],
    }
    audit_event(db, "data_export", actor_user_id=current_user.id, actor_email=current_user.email,
                target="self", company_id=current_user.company_id, request=request)
    return payload


# ── Right to erasure (Art.17) ────────────────────────────────────────────────

@router.delete("/api/me/erase")
def erase_my_account(request: Request, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    """Erase (pseudonymize) the caller's own account. Disables sign-in, revokes
    all outstanding tokens, clears 2FA secrets, and anonymizes name/email. The
    user row is kept (anonymized) to preserve references from financial records."""
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        user.full_name = _ANON_NAME
        user.email = _anon_email(user.email)
        user.is_active = False
        user.token_version = (getattr(user, "token_version", 0) or 0) + 1
        user.totp_secret = None
        user.totp_enabled = False
        user.last_2fa_device = None

        # If this was the company's last remaining user, anonymize the company's
        # contact email too (it is the registrant's personal email).
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if company:
            others = db.query(User).filter(
                User.company_id == company.id, User.id != user.id, User.is_active == True  # noqa: E712
            ).count()
            if others == 0:
                company.email = _anon_email(company.email)

        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Account erasure failed for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="No se pudo completar el borrado")

    # Audit WITHOUT echoing the erased PII back into the log.
    audit_event(db, "account_erasure", actor_user_id=current_user.id, actor_email=None,
                target="self", company_id=current_user.company_id, request=request,
                detail={"anonymized": True})
    return {"erased": True, "message": "Tu cuenta ha sido anonimizada. Los registros con "
                                       "obligación fiscal se conservan de forma anonimizada."}


@router.post("/api/admin/privacy/customers/{contact_id}/erase")
def erase_customer(contact_id: int, request: Request, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """Company admin erases a customer/contact's PII, scoped to their company."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")

    contact = db.execute(text(
        "SELECT id, company_id FROM contacts WHERE id = :id"
    ), {"id": contact_id}).fetchone()
    if not contact or contact[1] != current_user.company_id:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    try:
        db.execute(text("""
            UPDATE contacts SET name = :n, email = NULL, phone = NULL
            WHERE id = :id AND company_id = :cid
        """), {"n": _ANON_NAME, "id": contact_id, "cid": current_user.company_id})
        # Free-text messages can contain the subject's PII — redact their bodies.
        if _table_exists(db, "messages"):
            db.execute(text("""
                UPDATE messages SET content = '[borrado]'
                WHERE contact_id = :id AND company_id = :cid
            """), {"id": contact_id, "cid": current_user.company_id})
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Customer erasure failed (contact %s)", contact_id)
        raise HTTPException(status_code=500, detail="No se pudo completar el borrado")

    audit_event(db, "customer_erasure", actor_user_id=current_user.id, actor_email=current_user.email,
                target=f"contact:{contact_id}", company_id=current_user.company_id, request=request,
                detail={"anonymized": True})
    return {"erased": True, "contact_id": contact_id}


@router.post("/api/admin/privacy/employees/{employee_id}/erase")
def erase_employee(employee_id: int, request: Request, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """Company admin erases an employee's PII, scoped to their company. Salary /
    structural figures are kept (payroll retention) but the identity is removed."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")

    emp = db.execute(text(
        "SELECT id, company_id FROM employees WHERE id = :id"
    ), {"id": employee_id}).fetchone()
    if not emp or emp[1] != current_user.company_id:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    try:
        db.execute(text("""
            UPDATE employees SET full_name = :n, email = :e, is_active = 0
            WHERE id = :id AND company_id = :cid
        """), {"n": _ANON_NAME, "e": _anon_email(f"emp{employee_id}"),
               "id": employee_id, "cid": current_user.company_id})
        if _table_exists(db, "employee_feedback"):
            db.execute(text("UPDATE employee_feedback SET content = '[borrado]' WHERE employee_id = :id"),
                       {"id": employee_id})
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Employee erasure failed (employee %s)", employee_id)
        raise HTTPException(status_code=500, detail="No se pudo completar el borrado")

    audit_event(db, "employee_erasure", actor_user_id=current_user.id, actor_email=current_user.email,
                target=f"employee:{employee_id}", company_id=current_user.company_id, request=request,
                detail={"anonymized": True})
    return {"erased": True, "employee_id": employee_id}


# ── helpers ──────────────────────────────────────────────────────────────────

def _table_exists(db: Session, name: str) -> bool:
    from sqlalchemy import inspect as sa_inspect
    try:
        return sa_inspect(db.get_bind()).has_table(name)
    except Exception:
        return False


def _now_iso() -> str:
    from datetime import datetime
    return datetime.utcnow().isoformat()
