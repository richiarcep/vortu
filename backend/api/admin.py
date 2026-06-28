"""
Backoffice API — solo accesible para usuarios con is_admin=True.
Gestión de empresas, usuarios, planes, snapshots y prompts.
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from core.database import get_db
from core.security import get_admin_user, get_admin_db
from core.audit import audit_event
from vera.models import OPUS
from vera.compat import vera_client   # IA por Vera (cuota + config admin)
from models.user import User, Company
from models.billing import Subscription, License, PLANS
from models.analytics import BusinessSnapshot, BusinessAIMemory
from models.sales import Sale, Product
from models.customer import Contact
from models.project import Project
from modules.analytics.snapshot_worker import generate_snapshot, generate_all_snapshots
from modules.analytics.memory_updater import auto_update_memory, generate_memory_txt
from models.analytics import MemoryEntry
from models.prompt import SystemPrompt
from modules.core.prompt_loader import invalidate_cache

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class PlanUpdateRequest(BaseModel):
    plan_id: str

class UserStatusRequest(BaseModel):
    is_active: bool

class CompanyStatusRequest(BaseModel):
    is_active: bool

class PromptUpdateRequest(BaseModel):
    prompt_key: str
    new_content: str

class MemoryUpdateRequest(BaseModel):
    company_id: int
    manual_training: Optional[str] = None
    business_personality: Optional[str] = None
    business_goals: Optional[str] = None


# ── Dashboard overview ─────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Stats globales de Vela para el backoffice."""
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    # Suscripciones por plan
    subs = db.query(Subscription.plan_id, func.count(Subscription.id)).group_by(Subscription.plan_id).all()
    subs_by_plan = {s[0]: s[1] for s in subs}

    active_subs = db.query(func.count(Subscription.id)).filter(
        Subscription.status.in_(["active", "trialing"])
    ).scalar() or 0

    trial_subs = db.query(func.count(Subscription.id)).filter(
        Subscription.status == "trialing"
    ).scalar() or 0

    # MRR estimado
    mrr = 0
    for sub in db.query(Subscription).filter(Subscription.status == "active").all():
        plan = PLANS.get(sub.plan_id, {})
        mrr += plan.get("price_monthly", 0) + (sub.extra_users or 0) * 8

    # Snapshots generados
    total_snapshots = db.query(func.count(BusinessSnapshot.id)).scalar() or 0

    return {
        "total_companies": total_companies,
        "total_users": total_users,
        "active_users": active_users,
        "active_subscriptions": active_subs,
        "trial_subscriptions": trial_subs,
        "subscriptions_by_plan": subs_by_plan,
        "mrr_estimated": round(mrr, 2),
        "total_snapshots": total_snapshots,
    }


# ── Companies ──────────────────────────────────────────────────────────────────

@router.get("/companies")
def list_companies(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todas las empresas con su info de suscripción."""
    from collections import defaultdict
    from datetime import date

    companies = db.query(Company).all()
    # Leer companies.plan directamente con SQL (saltar caché ORM)
    plan_rows = db.execute(text("SELECT id, plan FROM companies")).fetchall()
    plan_map = {r[0]: (r[1] or 'base') for r in plan_rows}

    # ── Bulk-load everything once (avoids N+1 queries inside the loop) ──────────
    # Users grouped by company.
    users_by_company = defaultdict(list)
    all_users = db.query(User).all()
    for u in all_users:
        users_by_company[u.company_id].append(u)

    # One subscription per user (first seen), loaded in a single query.
    all_user_ids = [u.id for u in all_users]
    sub_by_user = {}
    if all_user_ids:
        for s in db.query(Subscription).filter(Subscription.user_id.in_(all_user_ids)).all():
            sub_by_user.setdefault(s.user_id, s)

    # Latest snapshot per company: read all ordered newest-first, keep first seen.
    snap_by_company = {}
    for s in db.query(BusinessSnapshot).order_by(BusinessSnapshot.snapshot_date.desc()).all():
        snap_by_company.setdefault(s.company_id, s)

    # Monthly revenue per company in one grouped query.
    month_start = date.today().replace(day=1)
    revenue_by_company = {
        cid: tot for cid, tot in db.query(
            Sale.company_id, func.sum(Sale.total)
        ).filter(Sale.sale_date >= month_start).group_by(Sale.company_id).all()
    }

    result = []
    for company in companies:
        users = users_by_company.get(company.id, [])

        # First user (in order) that has a subscription.
        sub = None
        for user in users:
            if user.id in sub_by_user:
                sub = sub_by_user[user.id]
                break

        snap = snap_by_company.get(company.id)
        monthly_revenue = revenue_by_company.get(company.id) or 0

        result.append({
            "id": company.id,
            "name": company.name,
            "email": company.email,
            "created_at": company.created_at.isoformat() if company.created_at else None,
            "users_count": len(users),
            "users": [{"id": u.id, "email": u.email, "full_name": u.full_name, "is_active": u.is_active, "is_admin": u.is_admin} for u in users],
            "plan": sub.plan_id if sub else "none",
            "plan_status": sub.status if sub else "none",
            "vera_plan": plan_map.get(company.id, "base"),  # ★ Vera Plus toggle (SQL directo, sin caché ORM)
            "trial_active": sub.status == "trialing" if sub else False,
            "monthly_revenue": round(float(monthly_revenue), 2),
            "snapshot": {
                "date": snap.snapshot_date.isoformat() if snap else None,
                "ingresos": snap.ingresos_mes if snap else 0,
                "tendencia": snap.label_tendencia if snap else None,
                "salud": snap.label_salud_financiera if snap else None,
                "riesgo": snap.label_riesgo_negocio if snap else None,
                "health_score": snap.health_score_avg if snap else None,
            } if snap else None,
        })

    return {"companies": result, "total": len(result)}


@router.get("/companies/{company_id}")
def get_company_detail(
    company_id: int,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Detalle completo de una empresa."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    users = db.query(User).filter(User.company_id == company_id).all()
    snapshots = db.query(BusinessSnapshot).filter(
        BusinessSnapshot.company_id == company_id
    ).order_by(BusinessSnapshot.snapshot_date.desc()).limit(12).all()

    memory = db.query(BusinessAIMemory).filter(
        BusinessAIMemory.company_id == company_id
    ).first()

    contacts = db.query(func.count(Contact.id)).filter(Contact.company_id == company_id).scalar() or 0
    products = db.query(func.count(Product.id)).filter(Product.company_id == company_id).scalar() or 0
    projects = db.query(func.count(Project.id)).filter(Project.company_id == company_id).scalar() or 0

    return {
        "company": {"id": company.id, "name": company.name, "email": company.email, "created_at": company.created_at.isoformat() if company.created_at else None},
        "users": [{"id": u.id, "email": u.email, "full_name": u.full_name, "is_active": u.is_active} for u in users],
        "stats": {"contacts": contacts, "products": products, "projects": projects},
        "snapshots": [
            {
                "date": s.snapshot_date.isoformat(),
                "ingresos": s.ingresos_mes,
                "resultado_neto": s.resultado_neto,
                "margen_pct": s.margen_neto_pct,
                "crecimiento_pct": s.crecimiento_ingresos_pct,
                "tendencia": s.label_tendencia,
                "salud": s.label_salud_financiera,
                "riesgo": s.label_riesgo_negocio,
                "health_score": s.health_score_avg,
                "sentiment_avg": s.sentiment_score_avg,
                "clientes_riesgo": s.clientes_riesgo,
            }
            for s in snapshots
        ],
        "memory": {
            "learned_facts": memory.learned_facts if memory else None,
            "manual_training": memory.manual_training if memory else None,
            "business_personality": memory.business_personality if memory else None,
            "business_goals": memory.business_goals if memory else None,
            "last_auto_update": memory.last_auto_update.isoformat() if memory and memory.last_auto_update else None,
            "auto_update_count": memory.auto_update_count if memory else 0,
        } if memory else None,
    }


@router.put("/companies/{company_id}/plan")
def update_company_plan(
    company_id: int,
    body: PlanUpdateRequest,
    request: Request,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Cambia el plan de una empresa manualmente."""
    if body.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Plan no válido")

    users = db.query(User).filter(User.company_id == company_id).all()
    updated = False
    for user in users:
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if sub:
            sub.plan_id = body.plan_id
            sub.status = "active"
            updated = True
            break

    if not updated:
        # Create subscription
        if users:
            sub = Subscription(
                user_id=users[0].id,
                plan_id=body.plan_id,
                status="active",
            )
            db.add(sub)

    db.commit()
    audit_event(db, "admin_company_plan_change", actor_user_id=admin.id, actor_email=admin.email,
                target=f"company:{company_id}", company_id=company_id, request=request,
                detail={"plan_id": body.plan_id})
    return {"message": f"Plan actualizado a {body.plan_id}", "company_id": company_id}

# ──────────────────────────────────────────────────────────────────
# ★ Vera Plus — toggle de companies.plan (independiente de subscriptions Vela)
# ──────────────────────────────────────────────────────────────────
class VeraPlanUpdate(BaseModel):
    vera_plan: str  # 'base' | 'plus'


@router.put("/companies/{company_id}/vera-plan")
def update_company_vera_plan(
    company_id: int,
    body: VeraPlanUpdate,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user),
):
    """
    Activa o desactiva Vera Plus para una empresa.
    Independiente de la subscription Vela (no toca subscriptions.plan_id).
    Sólo cambia companies.plan entre 'base' y 'plus'.
    """
    if body.vera_plan not in ("base", "plus"):
        raise HTTPException(400, "vera_plan debe ser 'base' o 'plus'")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Empresa no encontrada")

    old_plan = getattr(company, "plan", "base") or "base"

    db.execute(text(
        "UPDATE companies SET plan = :p WHERE id = :cid"
    ), {"p": body.vera_plan, "cid": company_id})
    db.commit()

    # Audit log (si la tabla existe)
    try:
        db.execute(text("""
            INSERT INTO vera_network_audit (
                user_id, user_email, endpoint, action, question,
                response_preview, model_used
            ) VALUES (
                :uid, :email, '/vera-plan', :action, :q,
                :preview, 'admin-action'
            )
        """), {
            "uid": admin.id,
            "email": admin.email,
            "action": f"vera_plan_change",
            "q": f"Empresa {company.name} (id={company_id})",
            "preview": f"Plan Vera: {old_plan} → {body.vera_plan}",
        })
        db.commit()
    except Exception as e:
        print(f"[audit] no se pudo loggear: {e}")

    return {
        "ok": True,
        "company_id": company_id,
        "company_name": company.name,
        "vera_plan_before": old_plan,
        "vera_plan_after": body.vera_plan,
    }



# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todos los usuarios."""
    users = db.query(User).all()
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "is_active": u.is_active,
                "is_admin": u.is_admin,
                "company_id": u.company_id,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": len(users)
    }


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: UserStatusRequest,
    request: Request,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Activa o desactiva un usuario."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    before = user.is_active
    user.is_active = body.is_active
    # Disabling a user should also revoke their outstanding tokens immediately.
    if before and not body.is_active:
        user.token_version = (getattr(user, "token_version", 0) or 0) + 1
    db.commit()
    audit_event(db, "admin_user_status_change", actor_user_id=admin.id, actor_email=admin.email,
                target=f"user:{user_id}", company_id=user.company_id, request=request,
                detail={"is_active": {"before": before, "after": body.is_active}})
    return {"message": f"Usuario {'activado' if body.is_active else 'desactivado'}", "user_id": user_id}


@router.get("/security-audit")
def get_security_audit(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user),
    event: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Security audit log (logins, 2FA, privileged admin changes, exports) with a
    tamper-evidence chain check. Superadmin-only."""
    from core.audit import verify_chain
    limit = max(1, min(limit, 500))
    where = "WHERE event = :event" if event else ""
    params = {"lim": limit, "off": max(0, offset)}
    if event:
        params["event"] = event
    rows = db.execute(text(f"""
        SELECT id, ts, event, actor_user_id, actor_email, target, company_id, ip, user_agent, detail
        FROM security_audit_log {where}
        ORDER BY id DESC LIMIT :lim OFFSET :off
    """), params).fetchall()
    return {
        "integrity": verify_chain(db),
        "events": [
            {"id": r[0], "ts": r[1], "event": r[2], "actor_user_id": r[3],
             "actor_email": r[4], "target": r[5], "company_id": r[6],
             "ip": r[7], "user_agent": r[8], "detail": r[9]}
            for r in rows
        ],
    }


# ── Security: cyber-attack detection (aggregated/scored over the audit log) ─────
#
# Read-only complement to /security-audit: instead of the raw tamper-evident log,
# this aggregates security_audit_log over short/long windows and scores attack
# indicators (brute force per IP / per account, credential stuffing, 2FA spikes,
# account lockouts, rate-limit blocks). Cross-tenant + pre-tenant events
# (login_failure has company_id=null), so it MUST run on get_admin_db (BYPASSRLS);
# an RLS-scoped session would hide the very rows that matter.
#
# ts is ISO-8601 TEXT, so every window filter is a plain lexicographic string
# compare `ts >= :cutoff` (no date functions → identical on SQLite dev + Postgres
# prod; covered by ix_audit_ts). login_failure carries the SUBMITTED username in
# actor_email even when the user doesn't exist, which is what makes per-email
# brute-force and per-IP credential-stuffing computable from one event type.
#
# Thresholds are module constants (tuned to the app's own limits: per-account
# throttle 10/300s, per-IP login 8/60s) so they are tunable without touching SQL.

# Severity ladder: ok < vigilancia < elevado < crítico.
_SEV_OK, _SEV_WATCH, _SEV_HIGH, _SEV_CRIT = "ok", "vigilancia", "elevado", "crítico"
_SEV_RANK = {_SEV_OK: 0, _SEV_WATCH: 1, _SEV_HIGH: 2, _SEV_CRIT: 3}
# Map indicator severity → top-level threat_level (ok collapses to "tranquilo").
_LEVEL_FOR_SEV = {_SEV_OK: "tranquilo", _SEV_WATCH: "vigilancia", _SEV_HIGH: "elevado", _SEV_CRIT: "crítico"}

# brute_force_ip: login_failure GROUP BY ip over 15m (slow-burn fallback at 24h).
_BF_IP_15M_HIGH, _BF_IP_15M_CRIT = 20, 50
_BF_IP_24H_HIGH = 200
# brute_force_account: login_failure GROUP BY actor_email over 15m.
_BF_ACCT_15M_HIGH, _BF_ACCT_15M_CRIT = 10, 30
# credential_stuffing: distinct actor_email per ip over 24h.
_CS_24H_HIGH, _CS_24H_CRIT = 10, 30
# twofa_spike: login_2fa_failure over 15m (global + per-account).
_2FA_GLOBAL_15M_HIGH = 20
_2FA_ACCT_15M_HIGH = 5
# account_lockouts: account_disabled + admin disable over 24h.
_LOCKOUT_24H_WATCH, _LOCKOUT_24H_HIGH = 3, 5
# rate_limit_blocks: rate_limit_block over 24h (available once the audit hook ships).
_RL_24H_HIGH, _RL_24H_CRIT = 100, 500

_OFFENDERS_CAP = 10  # each offenders list sorted desc by count, top N.


def _worst(*severities: str) -> str:
    """Highest severity among the args (ok if none triggered)."""
    return max(severities, key=lambda s: _SEV_RANK.get(s, 0)) if severities else _SEV_OK


@router.get("/security/threats")
def get_security_threats(
    db: Session = Depends(get_admin_db),       # BYPASSRLS worker session — audit spans tenants
    admin: User = Depends(get_admin_user),     # superadmin-only (is_superadmin), 403 otherwise
    window_hours: int = 24,                    # main window, clamped 1..168
):
    """Aggregated cyber-attack detection over the security audit log.

    Scores brute-force (per-IP / per-account), credential-stuffing, 2FA spikes,
    account lockouts and rate-limit blocks across a recent 15-minute window and a
    longer `window_hours` window, then derives an overall threat_level from the
    worst triggered indicator. Read-only; aggregates in SQL where possible.
    """
    from datetime import timedelta

    window_hours = max(1, min(window_hours, 168))
    now = datetime.utcnow()
    cutoff_24h = (now - timedelta(hours=window_hours)).isoformat()
    cutoff_15m = (now - timedelta(minutes=15)).isoformat()

    # ── Raw grouped pulls (all string-compare `ts >= :cutoff` over ix_audit_ts) ──

    # login_failure per IP, recent 15m window (with distinct submitted emails).
    bf_ip_15m = db.execute(text("""
        SELECT ip, COUNT(*) AS c, COUNT(DISTINCT actor_email) AS de, MAX(ts) AS last_ts
        FROM security_audit_log
        WHERE event = 'login_failure' AND ts >= :cutoff AND ip IS NOT NULL
        GROUP BY ip ORDER BY c DESC
    """), {"cutoff": cutoff_15m}).fetchall()

    # login_failure per IP, full window (slow-burn fallback + summary distinct IPs).
    bf_ip_24h = db.execute(text("""
        SELECT ip, COUNT(*) AS c, COUNT(DISTINCT actor_email) AS de, MAX(ts) AS last_ts
        FROM security_audit_log
        WHERE event = 'login_failure' AND ts >= :cutoff AND ip IS NOT NULL
        GROUP BY ip ORDER BY c DESC
    """), {"cutoff": cutoff_24h}).fetchall()

    # login_failure per account, recent 15m window (with distinct source IPs).
    bf_acct_15m = db.execute(text("""
        SELECT actor_email, COUNT(*) AS c, COUNT(DISTINCT ip) AS di, MAX(ts) AS last_ts
        FROM security_audit_log
        WHERE event = 'login_failure' AND ts >= :cutoff AND actor_email IS NOT NULL
        GROUP BY actor_email ORDER BY c DESC
    """), {"cutoff": cutoff_15m}).fetchall()

    # login_2fa_failure per account, recent 15m window (carry an example IP).
    twofa_15m = db.execute(text("""
        SELECT actor_email, COUNT(*) AS c, MAX(ip) AS ip, MAX(ts) AS last_ts
        FROM security_audit_log
        WHERE event = 'login_2fa_failure' AND ts >= :cutoff
        GROUP BY actor_email ORDER BY c DESC
    """), {"cutoff": cutoff_15m}).fetchall()

    twofa_total_15m = db.execute(text("""
        SELECT COUNT(*) FROM security_audit_log
        WHERE event = 'login_2fa_failure' AND ts >= :cutoff
    """), {"cutoff": cutoff_15m}).scalar() or 0

    # Account lockouts over the full window — union of two events:
    #  • account_disabled: a disabled user still attempting login.
    #  • admin_user_status_change with detail.is_active.after = false (an admin disabling).
    # detail is a JSON string; admin disable rows always contain '"after": false'
    # (json.dumps(..., sort_keys=True) → ``"is_active": {"after": false, ...}``).
    # We match on the substring to stay portable across SQLite/Postgres without JSON ops.
    lockouts = db.execute(text("""
        SELECT actor_email, target, COUNT(*) AS c, MAX(ts) AS last_ts
        FROM security_audit_log
        WHERE ts >= :cutoff AND (
            event = 'account_disabled'
            OR (event = 'admin_user_status_change' AND detail LIKE '%"after": false%')
        )
        GROUP BY actor_email, target ORDER BY c DESC
    """), {"cutoff": cutoff_24h}).fetchall()

    # rate_limit_blocks over the full window. The event is PROPOSED — not emitted
    # until the core/rate_limit.py audit hook ships — so we report available=false
    # whenever zero such rows exist (and count 0). Once the hook lands, rows appear
    # and the indicator self-activates.
    rl_blocks = db.execute(text("""
        SELECT ip, actor_email, COUNT(*) AS c, MAX(ts) AS last_ts
        FROM security_audit_log
        WHERE event = 'rate_limit_block' AND ts >= :cutoff
        GROUP BY ip, actor_email ORDER BY c DESC
    """), {"cutoff": cutoff_24h}).fetchall()

    # ── Indicator: brute_force_ip ───────────────────────────────────────────────
    bf_ip_offenders, bf_ip_sev = [], _SEV_OK
    by_ip_24h = {r[0]: r for r in bf_ip_24h}
    seen_ips = set()
    for ip, c, de, last_ts in bf_ip_15m:
        sev = _SEV_CRIT if c >= _BF_IP_15M_CRIT else (_SEV_HIGH if c >= _BF_IP_15M_HIGH else _SEV_OK)
        if sev != _SEV_OK:
            bf_ip_sev = _worst(bf_ip_sev, sev)
        seen_ips.add(ip)
        bf_ip_offenders.append({"ip": ip, "count": c, "distinct_emails": de, "last_ts": last_ts})
    # Slow-burn 24h fallback: a high per-IP volume over the long window → elevado.
    for ip, c, de, last_ts in bf_ip_24h:
        if c >= _BF_IP_24H_HIGH:
            bf_ip_sev = _worst(bf_ip_sev, _SEV_HIGH)
            if ip not in seen_ips:
                bf_ip_offenders.append({"ip": ip, "count": c, "distinct_emails": de, "last_ts": last_ts})
    bf_ip_offenders.sort(key=lambda o: o["count"], reverse=True)
    bf_ip_offenders = bf_ip_offenders[:_OFFENDERS_CAP]

    # ── Indicator: brute_force_account ──────────────────────────────────────────
    bf_acct_offenders, bf_acct_sev = [], _SEV_OK
    for email, c, di, last_ts in bf_acct_15m:
        sev = _SEV_CRIT if c >= _BF_ACCT_15M_CRIT else (_SEV_HIGH if c >= _BF_ACCT_15M_HIGH else _SEV_OK)
        if sev != _SEV_OK:
            bf_acct_sev = _worst(bf_acct_sev, sev)
        bf_acct_offenders.append({"email": email, "count": c, "distinct_ips": di, "last_ts": last_ts})
    bf_acct_offenders = bf_acct_offenders[:_OFFENDERS_CAP]

    # ── Indicator: credential_stuffing (one IP touching many distinct emails / 24h)
    cs_offenders, cs_sev = [], _SEV_OK
    for ip, c, de, last_ts in bf_ip_24h:
        sev = _SEV_CRIT if de >= _CS_24H_CRIT else (_SEV_HIGH if de >= _CS_24H_HIGH else _SEV_OK)
        if sev != _SEV_OK:
            cs_sev = _worst(cs_sev, sev)
            cs_offenders.append({"ip": ip, "distinct_emails": de, "count": c, "last_ts": last_ts})
    cs_offenders.sort(key=lambda o: o["distinct_emails"], reverse=True)
    cs_offenders = cs_offenders[:_OFFENDERS_CAP]

    # ── Indicator: twofa_spike (global OR per-account / 15m) ─────────────────────
    twofa_offenders, twofa_sev = [], _SEV_OK
    if twofa_total_15m >= _2FA_GLOBAL_15M_HIGH:
        twofa_sev = _worst(twofa_sev, _SEV_HIGH)
    for email, c, ip, last_ts in twofa_15m:
        if c >= _2FA_ACCT_15M_HIGH:
            twofa_sev = _worst(twofa_sev, _SEV_HIGH)
        twofa_offenders.append({"email": email, "ip": ip, "count": c, "last_ts": last_ts})
    twofa_offenders = twofa_offenders[:_OFFENDERS_CAP]

    # ── Indicator: account_lockouts (account_disabled + admin disable / 24h) ─────
    lockout_offenders = [
        {"actor_email": r[0], "target": r[1], "count": r[2], "last_ts": r[3]}
        for r in lockouts
    ]
    lockout_total = sum(o["count"] for o in lockout_offenders)
    lockout_sev = (_SEV_HIGH if lockout_total >= _LOCKOUT_24H_HIGH
                   else (_SEV_WATCH if lockout_total >= _LOCKOUT_24H_WATCH else _SEV_OK))
    lockout_offenders = lockout_offenders[:_OFFENDERS_CAP]

    # ── Indicator: rate_limit_blocks (available only once rows exist) ────────────
    rl_offenders = [
        {"ip": r[0], "email": r[1], "count": r[2], "last_ts": r[3]}
        for r in rl_blocks
    ]
    rl_total = sum(o["count"] for o in rl_offenders)
    rl_available = rl_total > 0
    rl_sev = _SEV_OK
    if rl_available:
        rl_sev = (_SEV_CRIT if rl_total >= _RL_24H_CRIT
                  else (_SEV_HIGH if rl_total >= _RL_24H_HIGH else _SEV_OK))
    rl_offenders = rl_offenders[:_OFFENDERS_CAP]

    # ── Summary counts (raw, over the 24h window) ───────────────────────────────
    # Counted directly (not summed from bf_ip_24h, which excludes null-IP rows).
    failed_logins_24h = db.execute(text("""
        SELECT COUNT(*) FROM security_audit_log
        WHERE event = 'login_failure' AND ts >= :cutoff
    """), {"cutoff": cutoff_24h}).scalar() or 0
    failed_logins_15m = db.execute(text("""
        SELECT COUNT(*) FROM security_audit_log
        WHERE event = 'login_failure' AND ts >= :cutoff
    """), {"cutoff": cutoff_15m}).scalar() or 0
    twofa_failures_24h = db.execute(text("""
        SELECT COUNT(*) FROM security_audit_log
        WHERE event = 'login_2fa_failure' AND ts >= :cutoff
    """), {"cutoff": cutoff_24h}).scalar() or 0

    # ── Assemble indicators (each: triggered = severity above ok) ───────────────
    indicators = [
        {"key": "brute_force_ip", "label": "Fuerza bruta por IP",
         "severity": bf_ip_sev, "triggered": bf_ip_sev != _SEV_OK,
         "threshold": _BF_IP_15M_CRIT, "window": "15m", "offenders": bf_ip_offenders},
        {"key": "brute_force_account", "label": "Fuerza bruta por cuenta",
         "severity": bf_acct_sev, "triggered": bf_acct_sev != _SEV_OK,
         "threshold": _BF_ACCT_15M_HIGH, "window": "15m", "offenders": bf_acct_offenders},
        {"key": "credential_stuffing", "label": "Relleno de credenciales",
         "severity": cs_sev, "triggered": cs_sev != _SEV_OK,
         "threshold": _CS_24H_HIGH, "window": "24h", "offenders": cs_offenders},
        {"key": "twofa_spike", "label": "Pico de fallos 2FA",
         "severity": twofa_sev, "triggered": twofa_sev != _SEV_OK,
         "threshold": _2FA_GLOBAL_15M_HIGH, "window": "15m", "offenders": twofa_offenders},
        {"key": "account_lockouts", "label": "Cuentas deshabilitadas / bloqueos",
         "severity": lockout_sev, "triggered": lockout_sev != _SEV_OK,
         "threshold": _LOCKOUT_24H_HIGH, "window": "24h", "offenders": lockout_offenders},
        {"key": "rate_limit_blocks", "label": "Bloqueos por límite de tasa (429)",
         "severity": rl_sev, "triggered": rl_available and rl_sev != _SEV_OK,
         "threshold": _RL_24H_HIGH, "window": "24h",
         "available": rl_available, "offenders": rl_offenders},
    ]

    # threat_level = worst severity across all TRIGGERED indicators.
    worst_sev = _worst(*[i["severity"] for i in indicators if i["triggered"]])
    threat_level = _LEVEL_FOR_SEV[worst_sev]

    distinct_attacker_ips_24h = len([r for r in bf_ip_24h if r[0]])

    return {
        "generated_at": now.isoformat(),
        "window": {"hours": window_hours, "recent_minutes": 15},
        "threat_level": threat_level,
        "summary": {
            "failed_logins_24h": failed_logins_24h,
            "failed_logins_15m": failed_logins_15m,
            "twofa_failures_24h": twofa_failures_24h,
            "distinct_attacker_ips_24h": distinct_attacker_ips_24h,
            "account_disables_24h": lockout_total,
            "rate_limit_blocks_24h": rl_total,
        },
        "indicators": indicators,
    }


# ── Snapshots ──────────────────────────────────────────────────────────────────

@router.get("/snapshots")
def get_all_snapshots(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Tabla maestra de snapshots de todas las empresas."""
    snapshots = db.query(BusinessSnapshot).order_by(
        BusinessSnapshot.snapshot_date.desc()
    ).limit(500).all()

    return {
        "snapshots": [
            {
                "id": s.id,
                "company_id": s.company_id,
                "date": s.snapshot_date.isoformat(),
                "sector": s.sector,
                "empresa_size": s.empresa_size,
                "num_empleados": s.num_empleados,
                "ingresos_mes": s.ingresos_mes,
                "gastos_mes": s.gastos_mes,
                "resultado_neto": s.resultado_neto,
                "margen_neto_pct": s.margen_neto_pct,
                "crecimiento_pct": s.crecimiento_ingresos_pct,
                "num_ventas": s.num_ventas_mes,
                "ticket_medio": s.ticket_medio,
                "total_contactos": s.total_contactos,
                "sentiment_avg": s.sentiment_score_avg,
                "clientes_riesgo": s.clientes_riesgo,
                "proyectos_activos": s.proyectos_activos,
                "health_score_avg": s.health_score_avg,
                "tendencia": s.label_tendencia,
                "salud_financiera": s.label_salud_financiera,
                "riesgo_negocio": s.label_riesgo_negocio,
                "ai_health_score": s.ai_health_score,
            }
            for s in snapshots
        ],
        "total": len(snapshots)
    }


@router.post("/snapshots/generate-all")
def generate_all(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Genera snapshots para todas las empresas (cross-tenant → worker session)."""
    from core.database import worker_session
    wdb = worker_session()
    try:
        results = generate_all_snapshots(wdb)
    finally:
        wdb.close()
    return {"results": results, "total": len(results)}


@router.post("/snapshots/generate/{company_id}")
def generate_one(
    company_id: int,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Genera snapshot para una empresa específica."""
    from core.security import set_tenant_context
    set_tenant_context(db, company_id)  # defensive; db is the BYPASSRLS worker session
    snap = generate_snapshot(db, company_id)
    if not snap:
        raise HTTPException(status_code=500, detail="Error generando snapshot")
    return {"message": "Snapshot generado", "date": snap.snapshot_date.isoformat()}


# ── Prompts ────────────────────────────────────────────────────────────────────

# Prompts guardados en memoria (en producción esto iría a BD)
_PROMPTS = {
    "marketing_analyzer": {
        "key": "marketing_analyzer",
        "name": "Analizador de empresa (Marketing)",
        "module": "Marketing",
        "description": "Analiza la empresa con datos internos y genera estrategia de marketing",
        "content": """Eres un experto en marketing digital y estrategia empresarial con 20 años de experiencia.
Analizas empresas en profundidad y generas estrategias de marketing basadas en datos reales.
Respondes SOLO en JSON válido, sin markdown, sin texto adicional.""",
        "variables": ["sector", "ventas", "clientes", "hr"],
        "last_modified": None,
    },
    "campaign_generator": {
        "key": "campaign_generator",
        "name": "Generador de campañas IA",
        "module": "Marketing",
        "description": "Genera copies, keywords e imágenes para campañas de publicidad",
        "content": """Eres un experto en publicidad digital con especialización en Google Ads, Meta Ads y TikTok.
Creas copies de alta conversión basados en datos reales de la empresa.
Respondes SOLO en JSON válido sin markdown.""",
        "variables": ["analysis", "campaign_name", "objective", "budget_daily", "platforms"],
        "last_modified": None,
    },
    "agent_chat": {
        "key": "agent_chat",
        "name": "Agente IA — Chat",
        "module": "Agente",
        "description": "Prompt del agente de chat que responde preguntas sobre el negocio",
        "content": """Eres el agente IA de Vela para esta empresa. Tienes acceso completo a todos los datos del negocio.
Responde de forma concisa y accionable. Usa datos reales cuando estén disponibles.
Si no tienes datos suficientes, dilo claramente.""",
        "variables": ["company_context", "historial", "mensaje"],
        "last_modified": None,
    },
    "customer_response": {
        "key": "customer_response",
        "name": "Respuesta automática a clientes",
        "module": "Clientes",
        "description": "Genera respuestas automáticas a mensajes de clientes",
        "content": """Eres el asistente de atención al cliente de esta empresa. 
Responde de forma amable, profesional y resolutiva.
Usa la información de la base de conocimiento cuando sea relevante.
Si no puedes resolver el problema, escala al equipo humano.""",
        "variables": ["knowledge_base", "contact_name", "message", "sentiment"],
        "last_modified": None,
    },
    "project_analysis": {
        "key": "project_analysis",
        "name": "Análisis de proyecto",
        "module": "Proyectos",
        "description": "Analiza el estado de un proyecto y genera recomendaciones",
        "content": """Eres un project manager experto. Analiza el estado del proyecto y genera:
1. Resumen ejecutivo
2. Riesgos detectados con severidad
3. Recomendaciones priorizadas
4. Predicción de finalización
Sé conciso y accionable.""",
        "variables": ["project_name", "tasks", "budget", "deadline", "health_score"],
        "last_modified": None,
    },
    "finance_analyzer": {
        "key": "finance_analyzer",
        "name": "Analizador financiero",
        "module": "Finanzas",
        "description": "Analiza documentos financieros y genera insights",
        "content": """Eres un analista financiero experto en pymes españolas.
Analiza los datos financieros y genera un informe con:
- Resumen ejecutivo
- Puntuación de salud financiera (1-10)
- Principales métricas
- Recomendaciones concretas
Responde en JSON.""",
        "variables": ["file_type", "data", "module"],
        "last_modified": None,
    },
    "memory_updater": {
        "key": "memory_updater",
        "name": "Actualizador de memoria IA",
        "module": "Analytics",
        "description": "Extrae patrones y hechos aprendidos del negocio para la memoria IA",
        "content": """Eres el analista de IA de Vela. Analiza los datos de este negocio y extrae patrones y hechos aprendidos.
Sé específico con números cuando puedas.
Formato: una línea por hecho, empezando con "- ".
Solo incluye hechos relevantes y accionables.
No repitas hechos que ya están en los conocidos anteriores.""",
        "variables": ["snapshot_data", "existing_facts", "manual_context"],
        "last_modified": None,
    },
}


@router.get("/prompts")
def list_prompts(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todos los prompts desde PostgreSQL."""
    prompts = db.query(SystemPrompt).order_by(SystemPrompt.module, SystemPrompt.name).all()
    result = [
        {
            "key": p.key, "name": p.name, "module": p.module,
            "description": p.description, "content": p.content,
            "variables": p.variables, "is_active": p.is_active,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            "updated_by": p.updated_by,
        }
        for p in prompts
    ]
    modules = list(set(p.module for p in prompts))
    return {"prompts": result, "total": len(result), "modules": modules}


@router.get("/prompts/{prompt_key}")
def get_prompt_detail(
    prompt_key: str,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Obtiene un prompt específico desde PostgreSQL."""
    prompt = db.query(SystemPrompt).filter(SystemPrompt.key == prompt_key).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")
    return {
        "key": prompt.key, "name": prompt.name, "module": prompt.module,
        "description": prompt.description, "content": prompt.content,
        "variables": prompt.variables, "is_active": prompt.is_active,
        "updated_at": prompt.updated_at.isoformat() if prompt.updated_at else None,
        "updated_by": prompt.updated_by,
    }


@router.put("/prompts/{prompt_key}")
def update_prompt(
    prompt_key: str,
    body: PromptUpdateRequest,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Actualiza el prompt en PostgreSQL e invalida la cache."""
    prompt = db.query(SystemPrompt).filter(SystemPrompt.key == prompt_key).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    prompt.content = body.new_content
    prompt.updated_at = datetime.utcnow()
    prompt.updated_by = admin.email
    db.commit()

    # Invalidar cache para que el cambio sea inmediato
    invalidate_cache(prompt_key)

    return {
        "message": f"Prompt '{prompt_key}' guardado en BD y cache invalidada",
        "updated_at": prompt.updated_at.isoformat(),
        "updated_by": prompt.updated_by,
    }


# ── Billing Admin ─────────────────────────────────────────────────────────────

class FaseUpdateRequest(BaseModel):
    fase: str  # beta | early_adopter | paid
    fase_expiry_days: Optional[int] = None  # dias de periodo gratis


@router.get("/billing/overview")
def billing_overview(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Vista completa de billing — fases, MRR, uso de IA."""
    from models.billing import Subscription, UsageTracking, PLANS
    from models.analytics import BusinessSnapshot
    from collections import defaultdict
    from datetime import date, datetime

    companies = db.query(Company).all()
    # Leer companies.plan directamente con SQL (saltar caché ORM)
    plan_rows = db.execute(text("SELECT id, plan FROM companies")).fetchall()
    plan_map = {r[0]: (r[1] or 'base') for r in plan_rows}

    # ── Bulk-load everything once (avoids N+1 queries inside the loop) ──────────
    users_by_company = defaultdict(list)
    all_users = db.query(User).all()
    for u in all_users:
        users_by_company[u.company_id].append(u)

    all_user_ids = [u.id for u in all_users]
    sub_by_user = {}
    if all_user_ids:
        for s in db.query(Subscription).filter(Subscription.user_id.in_(all_user_ids)).all():
            sub_by_user.setdefault(s.user_id, s)

    # Pick one subscription per company (first user with a sub).
    sub_by_company = {}
    for company in companies:
        for user in users_by_company.get(company.id, []):
            if user.id in sub_by_user:
                sub_by_company[company.id] = sub_by_user[user.id]
                break

    # AI / document usage this month, summed per subscription in one grouped query.
    month_start = date.today().replace(day=1)
    sub_ids = [s.id for s in sub_by_company.values()]
    usage_by_sub = {}
    if sub_ids:
        for sid, ai, doc in db.query(
            UsageTracking.subscription_id,
            func.sum(UsageTracking.ai_queries_used),
            func.sum(UsageTracking.documents_used),
        ).filter(
            UsageTracking.subscription_id.in_(sub_ids),
            UsageTracking.period_start >= datetime.combine(month_start, datetime.min.time())
        ).group_by(UsageTracking.subscription_id).all():
            usage_by_sub[sid] = (ai or 0, doc or 0)

    result = []
    for company in companies:
        users = users_by_company.get(company.id, [])
        if not users:
            continue

        sub = sub_by_company.get(company.id)
        ai_usage, doc_usage = usage_by_sub.get(sub.id, (0, 0)) if sub else (0, 0)

        # Plan limits
        plan = PLANS.get(sub.plan_id if sub else "starter", {})
        ai_limit = plan.get("ai_queries", 50)
        doc_limit = plan.get("documents", 25)

        # MRR
        mrr = 0
        if sub and sub.fase == "paid" and sub.status == "active":
            mrr = plan.get("price_monthly", 0) + (sub.extra_users or 0) * 8

        result.append({
            "company_id": company.id,
            "company_name": company.name,
            "company_email": company.email,
            "plan": sub.plan_id if sub else "none",
            "plan_status": sub.status if sub else "none",
            "fase": sub.fase if sub else "beta",
            "fase_expiry": sub.fase_expiry.isoformat() if sub and sub.fase_expiry else None,
            "sub_id": sub.id if sub else None,
            "ai_queries_used": ai_usage,
            "ai_queries_limit": ai_limit,
            "ai_pct": round(ai_usage / ai_limit * 100) if ai_limit > 0 else 0,
            "documents_used": doc_usage,
            "documents_limit": doc_limit,
            "doc_pct": round(doc_usage / doc_limit * 100) if doc_limit > 0 else 0,
            "mrr": mrr,
            "users_count": len(users),
            "created_at": company.created_at.isoformat() if company.created_at else None,
        })

    total_mrr = sum(r["mrr"] for r in result)
    by_fase = {
        "beta": sum(1 for r in result if r["fase"] == "beta"),
        "early_adopter": sum(1 for r in result if r["fase"] == "early_adopter"),
        "paid": sum(1 for r in result if r["fase"] == "paid"),
    }

    return {
        "companies": result,
        "total_mrr": round(total_mrr, 2),
        "by_fase": by_fase,
        "total": len(result),
    }


@router.put("/billing/{company_id}/fase")
def update_fase(
    company_id: int,
    body: FaseUpdateRequest,
    request: Request,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Cambia la fase de una empresa (beta/early_adopter/paid)."""
    from models.billing import Subscription
    from datetime import datetime, timedelta

    if body.fase not in ["beta", "early_adopter", "paid"]:
        raise HTTPException(status_code=400, detail="Fase inválida")

    users = db.query(User).filter(User.company_id == company_id).all()
    sub = None
    for user in users:
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if sub:
            break

    if not sub:
        raise HTTPException(status_code=404, detail="Sin suscripción")

    sub.fase = body.fase
    if body.fase_expiry_days:
        sub.fase_expiry = datetime.utcnow() + timedelta(days=body.fase_expiry_days)
    if body.fase == "paid":
        sub.status = "active"
    elif body.fase in ["beta", "early_adopter"]:
        sub.status = "trialing"

    db.commit()
    audit_event(db, "admin_company_fase_change", actor_user_id=admin.id, actor_email=admin.email,
                target=f"company:{company_id}", company_id=company_id, request=request,
                detail={"fase": body.fase, "fase_expiry_days": body.fase_expiry_days})
    return {"message": f"Fase actualizada a {body.fase}", "company_id": company_id}


# ── Graph DB ──────────────────────────────────────────────────────────────────

@router.post("/graph/migrate")
def migrate_to_graph(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Migra todos los datos de PostgreSQL a Neo4j."""
    from services.graph.sync import migrate_all_to_graph
    stats = migrate_all_to_graph(db)
    return {"message": "Migración completada", "stats": stats}


@router.get("/graph/overview/{company_id}")
def graph_overview(
    company_id: int,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Vista general del negocio como grafo."""
    from services.graph.queries import get_business_overview_graph, get_risk_chain, get_product_affinity
    return {
        "overview": get_business_overview_graph(company_id),
        "risk_chain": get_risk_chain(company_id),
        "product_affinity": get_product_affinity(company_id),
    }


@router.get("/graph/stats")
def graph_stats(
    admin: User = Depends(get_admin_user)
):
    """Estadísticas globales del grafo Neo4j."""
    from services.graph.neo4j_store import graph_store
    result = graph_store.run(
        "MATCH (n) RETURN labels(n)[0] AS tipo, COUNT(*) AS total ORDER BY total DESC"
    )
    rels = graph_store.run("MATCH ()-[r]->() RETURN type(r) AS tipo, COUNT(*) AS total ORDER BY total DESC")
    return {"nodos": result, "relaciones": rels}


# ── AI Insights ───────────────────────────────────────────────────────────────

@router.post("/ai-insights")
def get_ai_insights(
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Claude analiza los datos de la plataforma y devuelve oportunidades y riesgos."""
    import anthropic as _anthropic
    from core.config import get_settings
    settings = get_settings()

    # Recoger datos reales
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_subs = db.query(func.count(Subscription.id)).filter(Subscription.status.in_(["active","trialing"])).scalar() or 0
    trial_subs = db.query(func.count(Subscription.id)).filter(Subscription.status == "trialing").scalar() or 0

    mrr = 0
    for sub in db.query(Subscription).filter(Subscription.status == "active").all():
        plan = PLANS.get(sub.plan_id, {})
        mrr += plan.get("price_monthly", 0) + (sub.extra_users or 0) * 8

    subs = db.query(Subscription.plan_id, func.count(Subscription.id)).group_by(Subscription.plan_id).all()
    subs_by_plan = {s[0]: s[1] for s in subs}

    snapshots = db.query(BusinessSnapshot).order_by(BusinessSnapshot.snapshot_date.desc()).limit(20).all()
    snap_data = [
        {
            "company_id": s.company_id,
            "fecha": s.snapshot_date.isoformat(),
            "sector": s.sector,
            "ingresos": s.ingresos_mes,
            "gastos": s.gastos_mes,
            "resultado_neto": s.resultado_neto,
            "margen_pct": s.margen_neto_pct,
            "crecimiento_pct": s.crecimiento_ingresos_pct,
            "num_ventas": s.num_ventas_mes,
            "ticket_medio": s.ticket_medio,
            "clientes": s.total_contactos,
            "sentiment": s.sentiment_score_avg,
            "proyectos_activos": s.proyectos_activos,
            "health_score": s.health_score_avg,
            "tendencia": s.label_tendencia,
            "salud_financiera": s.label_salud_financiera,
            "riesgo_negocio": s.label_riesgo_negocio,
        }
        for s in snapshots
    ]

    summary = {
        "plataforma": "Vela — SaaS de gestión empresarial con IA para pymes españolas",
        "empresas_registradas": total_companies,
        "usuarios_totales": total_users,
        "suscripciones_activas": active_subs,
        "en_trial": trial_subs,
        "mrr_estimado_eur": round(mrr, 2),
        "distribucion_planes": subs_by_plan,
        "snapshots_disponibles": len(snap_data),
        "datos_empresas": snap_data,
    }

    prompt = f"""Eres el analista de negocio de Vela, una plataforma SaaS de gestión empresarial con IA para pymes españolas.

Analiza estos datos reales de la plataforma y devuelve SOLO un JSON válido con esta estructura exacta:
{{
  "resumen": "2-3 frases sobre el estado actual de la plataforma",
  "oportunidades": [
    {{ "titulo": "...", "descripcion": "...", "impacto": "alto|medio|bajo", "accion": "..." }}
  ],
  "riesgos": [
    {{ "titulo": "...", "descripcion": "...", "urgencia": "alta|media|baja" }}
  ],
  "recomendacion_principal": "La acción más importante que debería tomar Vela ahora mismo"
}}

DATOS REALES DE LA PLATAFORMA:
{json.dumps(summary, ensure_ascii=False, indent=2)}"""

    client = vera_client(db, admin.company_id, module="admin")
    response = client.messages.create(
        model=OPUS,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    clean = text.replace("```json", "").replace("```", "").strip()
    try:
        result = json.loads(clean)
    except Exception:
        # Si el JSON viene cortado, intentar repararlo
        if not clean.endswith("}"):
            clean = clean + '"}}'
        try:
            result = json.loads(clean)
        except Exception:
            raise HTTPException(status_code=500, detail="Error parseando respuesta de Claude")
    return result


# ── AI Memory admin ────────────────────────────────────────────────────────────

@router.get("/memory/{company_id}/entries")
def get_memory_entries(
    company_id: int,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Lista todas las entradas de memoria de una empresa con trazabilidad."""
    entries = db.query(MemoryEntry).filter(
        MemoryEntry.company_id == company_id
    ).order_by(MemoryEntry.created_at.desc()).all()

    memory = db.query(BusinessAIMemory).filter(
        BusinessAIMemory.company_id == company_id
    ).first()

    return {
        "entries": [
            {
                "id": e.id,
                "tipo": e.tipo,
                "fuente": e.fuente,
                "autor": e.autor,
                "contenido": e.contenido,
                "categoria": e.categoria,
                "confianza": e.confianza,
                "created_at": e.created_at.isoformat(),
                "snapshot_id": e.snapshot_id,
            }
            for e in entries
        ],
        "total": len(entries),
        "auto_count": sum(1 for e in entries if e.tipo == "auto"),
        "manual_count": sum(1 for e in entries if e.tipo == "manual"),
        "last_auto_update": memory.last_auto_update.isoformat() if memory and memory.last_auto_update else None,
        "context_version": memory.context_version if memory else 0,
        "manual_training": memory.manual_training if memory else "",
        "business_personality": memory.business_personality if memory else "",
        "business_goals": memory.business_goals if memory else "",
    }


@router.get("/memory/{company_id}/download")
def download_memory_txt(
    company_id: int,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Devuelve el TXT completo de memoria para descargar."""
    txt = generate_memory_txt(db, company_id)
    return {"txt": txt, "filename": f"memoria_empresa_{company_id}_{datetime.utcnow().strftime('%Y%m%d')}.txt"}


@router.put("/memory/{company_id}")
def admin_update_memory(
    company_id: int,
    body: MemoryUpdateRequest,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Admin actualiza la memoria IA de una empresa."""
    from modules.analytics.memory_updater import manual_update
    memory = manual_update(
        db=db,
        company_id=company_id,
        manual_text=body.manual_training,
        personality=body.business_personality,
        goals=body.business_goals,
    )
    return {"message": "Memoria actualizada", "context_version": memory.context_version}


@router.post("/memory/{company_id}/auto-update")
def admin_auto_update_memory(
    company_id: int,
    db: Session = Depends(get_admin_db),
    admin: User = Depends(get_admin_user)
):
    """Admin dispara actualización automática de memoria para una empresa."""
    memory = auto_update_memory(db, company_id)
    return {
        "message": "Memoria auto-actualizada",
        "auto_update_count": memory.auto_update_count,
    }
