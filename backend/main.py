from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
import os, ssl
import logging

# Central logging config: structured, level-tagged lines to stdout. Replaces
# scattered print() calls so output can be filtered by severity in production.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s | %(message)s",
)
# Fix SSL para AuraDB en macOS/Python 3.14
if os.path.exists('/tmp/cacert.pem'):
    os.environ['SSL_CERT_FILE'] = '/tmp/cacert.pem'
    os.environ['REQUESTS_CA_BUNDLE'] = '/tmp/cacert.pem'

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.security import require_module, block_impersonated_writes
from apscheduler.schedulers.background import BackgroundScheduler
from core.config import get_settings
from core.database import create_tables, ensure_runtime_schema
from api.auth import router as auth_router
from api.upload import router as upload_router
from api.documentos import router as documentos_router
from api.finance import router as finance_router
from modules.hr.extended import Vacation, Contract, Payslip
from api.hr import router as hr_router
from api.accounting import router as accounting_router
from api.fiscal import router as fiscal_router
from api.agent import router as agent_router
from api.backoffice_prompts import router as prompts_router
from api.projects import router as projects_router
from models.project import Project, Task, TimeEntry, ProjectExpense
from models.workgroup import WorkGroup, WorkGroupMember, GroupTask, GroupTaskTime
from modules.projects.scheduler import setup_project_scheduler
from models.customer import Contact, Message, KnowledgeBase, AutoResponse, EmailConfig, SentimentReport
from api.customers import router as customers_router
from models.sales import Product, Sale, SaleItem, SaleRefund, SaleRefundItem
from api.sales import router as sales_router
from api.marketing import router as marketing_router
from api.billing import router as billing_router
from api.analytics import router as analytics_router
from api.admin import router as admin_router
from api.impersonation_admin import router as impersonation_admin_router
from api.prospector import router as prospector_router
from api.costs import router as costs_router
from api.costes import router as costes_router
from api.two_factor import router as two_factor_router
from api.privacy import router as privacy_router
from api.connect import router as connect_router
from vera.router import router as vera_router
from api.profit_optimizer import router as profit_optimizer_router
from api.vera_route_api import router as vera_route_api_router
from api.vera_routing_admin import router as vera_routing_admin_router
from api.vera_v2 import router as vera_v2_router
from api.vera_plus import router as vera_plus_router
from api.vera_insights import router as vera_insights_router
from api.vera_pipeline_admin import router as vera_pipeline_admin_router
from api.doc_templates_admin import router as doc_templates_admin_router
from api.doc_prompts_admin import router as doc_prompts_admin_router
from api.vera_network import router as vera_network_router
from api.vera_quota import router as vera_quota_router
from api.extraction_review_admin import router as extraction_review_router
from models.analytics import ProspectorSearch, ProspectorLead
from models.billing import License, Subscription, UsageTracking, BillingEvent, TeamMember
from models.analytics import BusinessSnapshot, BusinessAIMemory
from models.profit_optimizer import CommercialLine, OptimizerProduct, OptimizerInputs, OptimizerRun
from models.marketing import CompanyAnalysis, MarketingCampaign, CampaignMetrics, PlatformCredential

settings = get_settings()
scheduler = BackgroundScheduler()


# ── Error tracking (Sentry) ─────────────────────────────────────────────────
# Enabled only when SENTRY_DSN is set, so local/dev stays a no-op. PII scrubbing
# is on (send_default_pii=False) and a before_send hook strips the Authorization
# header so tokens never reach Sentry.
def _init_sentry():
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        def _before_send(event, hint):
            try:
                headers = event.get("request", {}).get("headers")
                if isinstance(headers, dict):
                    for h in list(headers):
                        if h.lower() in ("authorization", "cookie", "x-api-key"):
                            headers[h] = "[redacted]"
            except Exception:
                pass
            return event

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            release=f"{settings.APP_NAME}@{settings.APP_VERSION}",
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            send_default_pii=False,
            before_send=_before_send,
            integrations=[
                StarletteIntegration(), FastApiIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
        )
        logging.getLogger("vela").info("Sentry error tracking enabled (env=%s)", settings.ENVIRONMENT)
    except Exception as e:
        logging.getLogger("vela").warning("Sentry init failed (continuing without it): %s", e)


_init_sentry()


# The background scheduler must run in exactly ONE process. With multiple
# gunicorn/uvicorn workers, starting it in every worker would duplicate every
# scheduled job. Gate it on an env var: enable it in a single process (default
# true for local/dev single-process; set ENABLE_SCHEDULER=false on multi-worker
# web instances and run one dedicated scheduler process instead).
_ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "true").lower() in ("1", "true", "yes")


def _rls_preflight():
    """Fail fast on an RLS misconfiguration BEFORE serving traffic.

    Two states the app must never start in:
      1. RLS on + the app serves traffic (MANAGE_SCHEMA=false) as a SUPERUSER /
         BYPASSRLS role → RLS is silently bypassed, no isolation (e.g. a leaked
         ADMIN_DATABASE_URL in the web tier).
      2. RLS on + WORKER_DB_URL/NETWORK_DB_URL unset → the scheduler and the
         superadmin backoffice run cross-tenant on the RLS-bound role and silently
         return 0 rows / fail WITH CHECK.
    """
    from core.database import RLS_ENABLED, engine
    if not RLS_ENABLED:
        return
    from sqlalchemy import text
    log = logging.getLogger("vela")
    try:
        with engine.connect() as conn:
            is_super = str(conn.execute(text("SELECT current_setting('is_superuser')")).scalar()).lower()
            bypass = conn.execute(text("SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user")).scalar()
    except Exception as e:
        log.warning("RLS preflight: could not introspect the DB role (%s) — skipping", e)
        return
    privileged = is_super in ("on", "true", "t", "1", "yes") or bool(bypass)
    if settings.MANAGE_SCHEMA:
        # Owner/build mode — a privileged role is expected. But if the operator left
        # RLS_ENABLED=true here (the .env.example default) and never switched to vela_app,
        # the app serves traffic ADVERTISING isolation while RLS is inert (superuser/owner
        # bypasses it; policies may not even be applied yet). Make that loud — silence here
        # was how a "RLS on" deploy could ship with zero DB-level isolation.
        if privileged:
            log.warning(
                "RLS_ENABLED=true but MANAGE_SCHEMA=true and the DB role is privileged "
                "(superuser/bypassrls) → RLS is NOT enforced; app-layer company_id filters "
                "are the ONLY tenant isolation. To enforce it, switch DATABASE_URL to "
                "vela_app + MANAGE_SCHEMA=false and apply the policies. See docs/RLS.md."
            )
        return  # owner/build mode — a privileged role is expected here
    if privileged:
        raise RuntimeError(
            "RLS_ENABLED and MANAGE_SCHEMA=false, but the app connects as a "
            "SUPERUSER/BYPASSRLS role → RLS would be bypassed (no tenant isolation). "
            "Point DATABASE_URL at vela_app (NOSUPERUSER, NOBYPASSRLS)."
        )
    if not settings.WORKER_DB_URL or not settings.NETWORK_DB_URL:
        raise RuntimeError(
            "RLS_ENABLED but WORKER_DB_URL/NETWORK_DB_URL are unset. The scheduler "
            "and superadmin backoffice run cross-tenant and need the BYPASSRLS "
            "worker/network roles; without them they silently return 0 rows. Set "
            "both DSNs, or set RLS_ENABLED=false."
        )
    log.info("RLS preflight OK · app role is RLS-subject · worker/network DSNs set")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — schema DDL. Skipped when MANAGE_SCHEMA=false (the app connects as a
    # non-owner role like vela_app under RLS, which can't run the DROP/CREATE INDEX
    # /TRIGGER DDL in ensure_runtime_schema). In that case the OWNER builds/migrates
    # the schema out-of-band (deploy step / one-off) before the app boots.
    if settings.MANAGE_SCHEMA:
        create_tables()
        ensure_runtime_schema()
    else:
        logging.getLogger("vela").info("MANAGE_SCHEMA=false → skipping startup DDL (schema managed by owner)")
    _rls_preflight()
    if _ENABLE_SCHEDULER:
        setup_project_scheduler(scheduler)
        scheduler.start()
    logging.getLogger("vela").info(
        "%s v%s started · scheduler=%s", settings.APP_NAME, settings.APP_VERSION,
        "on" if _ENABLE_SCHEDULER else "off",
    )
    yield
    # Shutdown
    if _ENABLE_SCHEDULER and scheduler.running:
        scheduler.shutdown()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
    # Don't expose the interactive API explorer / schema in production (sec spec §9).
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# ── Global exception handler ───────────────────────────────────────────────────
# Catches any UNHANDLED exception (HTTPException is handled by FastAPI normally),
# logs it with a full traceback + a correlation id server-side, and returns a
# generic message + that id to the client — never a stack trace (unless DEBUG).
_error_log = logging.getLogger("vela.error")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    import uuid
    error_id = uuid.uuid4().hex[:12]
    _error_log.exception("Unhandled error [%s] on %s %s", error_id, request.method, request.url.path)
    # Capture to Sentry (no-op if not initialised) with the correlation id so the
    # server log line and the Sentry issue can be cross-referenced.
    if settings.SENTRY_DSN:
        try:
            import sentry_sdk
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("error_id", error_id)
                sentry_sdk.capture_exception(exc)
        except Exception:
            pass
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail, "error_id": error_id})


# ── CORS ──────────────────────────────────────────────────────────────────────
# A wildcard origin combined with allow_credentials is invalid and unsafe — it
# lets any site make authenticated requests. Whitelist the configured frontend
# plus the usual local dev origins instead.
_allowed_origins = sorted({
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3010",
    "http://127.0.0.1:3010",
})
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
# privacy: GDPR export/erasure (Art.15/17/20). The erasure (write) routes are
# destructive → guard them behind the read-only impersonation block so a support
# session can never erase the customer's account/contacts/employees.
app.include_router(privacy_router, dependencies=[Depends(block_impersonated_writes)])
app.include_router(connect_router, dependencies=[Depends(block_impersonated_writes)])  # Stripe Connect (company merchant accounts)
app.include_router(upload_router, dependencies=[Depends(block_impersonated_writes)])
# ── Per-plan module gating (server-side entitlement; UX-only in the frontend) ──
# Beta/superadmin get the full module set, so nothing is blocked until the billing
# phase flips to paid. Dashboard-aggregation routers (agent /resumen, analytics,
# vera-insights) are intentionally NOT gated so the dashboard works on every plan.
# ── Read-only impersonation guard on the tenant routers ──────────────────────
# block_impersonated_writes 403s any non-GET/HEAD/OPTIONS request made under a
# READ-ONLY impersonation session, so a platform admin "acting as" a customer in
# the default mode physically cannot mutate that customer's tenant data. No-op for
# normal sessions and for write-mode impersonation. Attached to every tenant
# (customer-data) router below.
# _block_imp is listed FIRST so the read-only invariant is evaluated before the
# plan-entitlement gate — a support session is refused a write regardless of the
# target's plan.
_block_imp = Depends(block_impersonated_writes)
app.include_router(documentos_router, dependencies=[_block_imp, Depends(require_module("documentos"))])
app.include_router(finance_router, dependencies=[_block_imp, Depends(require_module("finanzas"))])
app.include_router(hr_router, dependencies=[_block_imp, Depends(require_module("hr"))])
app.include_router(accounting_router, dependencies=[_block_imp, Depends(require_module("contabilidad"))])
app.include_router(fiscal_router, dependencies=[_block_imp])
app.include_router(agent_router, dependencies=[_block_imp])
app.include_router(prompts_router)
app.include_router(projects_router, dependencies=[_block_imp, Depends(require_module("proyectos"))])
app.include_router(customers_router, dependencies=[_block_imp, Depends(require_module("clientes"))])
app.include_router(sales_router, dependencies=[_block_imp, Depends(require_module("ventas"))])
app.include_router(marketing_router, dependencies=[_block_imp, Depends(require_module("marketing"))])
app.include_router(billing_router)
app.include_router(analytics_router, dependencies=[_block_imp])
app.include_router(admin_router)
app.include_router(impersonation_admin_router)  # /api/admin/impersonate/* (start/stop)
app.include_router(prospector_router)
app.include_router(costs_router, dependencies=[_block_imp, Depends(require_module("finanzas"))])
app.include_router(costes_router, dependencies=[_block_imp, Depends(require_module("finanzas"))])
app.include_router(two_factor_router)
# These Vera / profit-optimizer routers authenticate with get_current_user (so an
# impersonation token resolves to the TARGET and reaches them) and expose
# state-changing endpoints that write the customer's tenant data (Vera
# conversations/chat/quota, Vera-Plus requests, profit-optimizer lines/products/
# inputs/run). They MUST carry the read-only impersonation write-block so a default
# 'read' support session physically cannot mutate the customer's data through them.
# (admin-gated routers below use get_admin_user, which rejects impersonation tokens
# outright, so they need no _block_imp.)
app.include_router(profit_optimizer_router, dependencies=[_block_imp])
app.include_router(vera_router, dependencies=[_block_imp])
app.include_router(vera_route_api_router, dependencies=[_block_imp])
app.include_router(vera_routing_admin_router)
app.include_router(vera_v2_router, dependencies=[_block_imp])
app.include_router(vera_plus_router, dependencies=[_block_imp])
app.include_router(vera_insights_router)
app.include_router(vera_pipeline_admin_router)
app.include_router(doc_templates_admin_router)
app.include_router(doc_prompts_admin_router)
app.include_router(vera_network_router)
app.include_router(vera_quota_router)
app.include_router(extraction_review_router)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status":  "running"
    }


@app.get("/health")
def health():
    """Liveness + readiness probe for load balancers / orchestrators.
    Pings the database so the instance is only reported healthy if it can
    actually serve requests."""
    from sqlalchemy import text
    from core.database import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return JSONResponse(
        status_code=200 if db_ok else 503,
        content={"status": "ok" if db_ok else "degraded", "database": db_ok},
    )

