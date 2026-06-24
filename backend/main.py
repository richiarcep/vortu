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
from core.security import require_module
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
from api.prospector import router as prospector_router
from api.costs import router as costs_router
from api.costes import router as costes_router
from api.two_factor import router as two_factor_router
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


# The background scheduler must run in exactly ONE process. With multiple
# gunicorn/uvicorn workers, starting it in every worker would duplicate every
# scheduled job. Gate it on an env var: enable it in a single process (default
# true for local/dev single-process; set ENABLE_SCHEDULER=false on multi-worker
# web instances and run one dedicated scheduler process instead).
_ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "true").lower() in ("1", "true", "yes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    ensure_runtime_schema()
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
)

# ── Global exception handler ───────────────────────────────────────────────────
# Catches any UNHANDLED exception (HTTPException is handled by FastAPI normally),
# logs it with a full traceback server-side, and returns a generic message so we
# never leak internals/stack traces to clients (unless DEBUG is on for local dev).
_error_log = logging.getLogger("vela.error")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    _error_log.exception("Unhandled error on %s %s", request.method, request.url.path)
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


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
app.include_router(upload_router)
# ── Per-plan module gating (server-side entitlement; UX-only in the frontend) ──
# Beta/superadmin get the full module set, so nothing is blocked until the billing
# phase flips to paid. Dashboard-aggregation routers (agent /resumen, analytics,
# vera-insights) are intentionally NOT gated so the dashboard works on every plan.
app.include_router(documentos_router, dependencies=[Depends(require_module("documentos"))])
app.include_router(finance_router, dependencies=[Depends(require_module("finanzas"))])
app.include_router(hr_router, dependencies=[Depends(require_module("hr"))])
app.include_router(accounting_router, dependencies=[Depends(require_module("contabilidad"))])
app.include_router(fiscal_router)
app.include_router(agent_router)
app.include_router(prompts_router)
app.include_router(projects_router, dependencies=[Depends(require_module("proyectos"))])
app.include_router(customers_router, dependencies=[Depends(require_module("clientes"))])
app.include_router(sales_router, dependencies=[Depends(require_module("ventas"))])
app.include_router(marketing_router, dependencies=[Depends(require_module("marketing"))])
app.include_router(billing_router)
app.include_router(analytics_router)
app.include_router(admin_router)
app.include_router(prospector_router)
app.include_router(costs_router, dependencies=[Depends(require_module("finanzas"))])
app.include_router(costes_router, dependencies=[Depends(require_module("finanzas"))])
app.include_router(two_factor_router)
app.include_router(profit_optimizer_router)
app.include_router(vera_router)
app.include_router(vera_route_api_router)
app.include_router(vera_routing_admin_router)
app.include_router(vera_v2_router)
app.include_router(vera_plus_router)
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

