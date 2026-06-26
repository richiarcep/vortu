"""Per-tenant Veri*Factu operating mode + legal rules.

Each company (obligado tributario) chooses VERIFACTU (remit to AEAT in real time)
or NO_VERIFACTU (keep signed records locally) at onboarding. The choice is
persisted, audited (who/when/IP), and governed by a permanence rule: once you
START remitting in VERIFACTU you must stay until 31 Dec of that natural year
(§3.2). NO_VERIFACTU → VERIFACTU is always allowed.

Default is VERIFACTU (less local-security surface, fits a SaaS, no per-record
signature to manage) — the onboarding makes the client confirm it consciously.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from .service import VerifactuError  # service has no top-level import of this module → no cycle

VALID_MODES = ("VERIFACTU", "NO_VERIFACTU")
DEFAULT_MODE = "VERIFACTU"


def get_config(db: Session, company_id: int) -> dict:
    """Return the tenant's mode config, or a default-shaped dict (mode=VERIFACTU,
    SANDBOX) when no row exists yet."""
    row = db.execute(text("SELECT * FROM verifactu_config WHERE company_id=:c"),
                     {"c": company_id}).mappings().first()
    if row:
        return dict(row)
    return {
        "company_id": company_id, "verifactu_mode": DEFAULT_MODE, "mode_set_at": None,
        "mode_set_by": None, "verifactu_opted_in_at": None, "environment": "SANDBOX",
        "cert_ref": None, "cert_valid_until": None,
    }


def can_switch_to_no_verifactu(cfg: dict) -> bool:
    """§3.2 — once VERIFACTU is opted into (first real remittance), the tenant must
    stay until 31 Dec of that natural year."""
    opted = cfg.get("verifactu_opted_in_at")
    if not opted:
        return True
    try:
        return datetime.utcnow().year > datetime.fromisoformat(opted).year
    except (ValueError, TypeError):
        return False  # fail-closed: unparseable opt-in date blocks the downgrade


def set_mode(db: Session, company_id: int, new_mode: str,
             user_id: Optional[int] = None, ip: Optional[str] = None) -> dict:
    """Set/change the tenant's mode, enforcing the permanence rule, and append an
    audit row. Returns the new config."""
    new_mode = (new_mode or "").upper()
    if new_mode not in VALID_MODES:
        raise VerifactuError("Modo inválido (usa VERIFACTU o NO_VERIFACTU).")

    cfg = get_config(db, company_id)
    old_mode = cfg.get("verifactu_mode")

    if old_mode == "VERIFACTU" and new_mode == "NO_VERIFACTU" and not can_switch_to_no_verifactu(cfg):
        year = datetime.fromisoformat(cfg["verifactu_opted_in_at"]).year
        raise VerifactuError(
            f"No puedes cambiar a NO VERI*FACTU hasta el 31 de diciembre de {year} "
            "(permanencia obligatoria desde tu primer envío a la AEAT)."
        )

    now = datetime.utcnow().isoformat()
    exists = db.execute(text("SELECT 1 FROM verifactu_config WHERE company_id=:c"),
                        {"c": company_id}).first()
    if exists:
        db.execute(text("""
            UPDATE verifactu_config SET verifactu_mode=:m, mode_set_at=:now, mode_set_by=:u
            WHERE company_id=:c
        """), {"m": new_mode, "now": now, "u": user_id, "c": company_id})
    else:
        db.execute(text("""
            INSERT INTO verifactu_config (company_id, verifactu_mode, mode_set_at, mode_set_by, environment, created_at)
            VALUES (:c, :m, :now, :u, 'SANDBOX', :now)
        """), {"c": company_id, "m": new_mode, "now": now, "u": user_id})

    db.execute(text("""
        INSERT INTO verifactu_mode_audit (company_id, old_mode, new_mode, user_id, ip, ts)
        VALUES (:c, :old, :new, :u, :ip, :ts)
    """), {"c": company_id, "old": old_mode, "new": new_mode, "u": user_id, "ip": ip, "ts": now})
    db.commit()
    return get_config(db, company_id)


def mark_opted_in(db: Session, company_id: int) -> None:
    """Record the tacit opt-in (§3.1): the first real VERIFACTU remittance starts
    the permanence clock. Idempotent — only sets it once."""
    cfg = get_config(db, company_id)
    if cfg.get("verifactu_opted_in_at"):
        return
    now = datetime.utcnow().isoformat()
    exists = db.execute(text("SELECT 1 FROM verifactu_config WHERE company_id=:c"),
                        {"c": company_id}).first()
    if exists:
        db.execute(text("UPDATE verifactu_config SET verifactu_opted_in_at=:now WHERE company_id=:c AND verifactu_opted_in_at IS NULL"),
                   {"now": now, "c": company_id})
    else:
        db.execute(text("""
            INSERT INTO verifactu_config (company_id, verifactu_mode, mode_set_at, verifactu_opted_in_at, environment, created_at)
            VALUES (:c, 'VERIFACTU', :now, :now, 'SANDBOX', :now)
        """), {"c": company_id, "now": now})
    db.commit()
