from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from core.config import get_settings
from core.database import create_tables
from api.auth import router as auth_router
from api.upload import router as upload_router
from api.finance import router as finance_router
from api.hr import router as hr_router
from api.accounting import router as accounting_router
from api.agent import router as agent_router
from api.projects import router as projects_router
from models.project import Project, Task, TimeEntry, ProjectExpense
from modules.projects.scheduler import setup_project_scheduler
from models.customer import Contact, Message, KnowledgeBase, AutoResponse, EmailConfig, SentimentReport
from api.customers import router as customers_router
from models.sales import Product, Sale, SaleItem
from api.sales import router as sales_router
from api.marketing import router as marketing_router
from api.billing import router as billing_router
from api.analytics import router as analytics_router
from api.admin import router as admin_router
from api.prospector import router as prospector_router
from api.costs import router as costs_router
from models.analytics import ProspectorSearch, ProspectorLead
from models.billing import License, Subscription, UsageTracking, BillingEvent, TeamMember
from models.analytics import BusinessSnapshot, BusinessAIMemory
from models.marketing import CompanyAnalysis, MarketingCampaign, CampaignMetrics, PlatformCredential

settings = get_settings()
scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    setup_project_scheduler(scheduler)
    scheduler.start()
    print(f"✓ {settings.APP_NAME} v{settings.APP_VERSION} started")
    print(f"✓ Database ready")
    print(f"✓ Scheduler running")
    print(f"✓ Docs at http://127.0.0.1:8000/docs")
    yield
    # Shutdown
    scheduler.shutdown()
    print("✓ Server stopped cleanly")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(finance_router)
app.include_router(hr_router)
app.include_router(accounting_router)
app.include_router(agent_router)
app.include_router(projects_router)
app.include_router(customers_router)
app.include_router(sales_router)
app.include_router(marketing_router)
app.include_router(billing_router)
app.include_router(analytics_router)
app.include_router(admin_router)
app.include_router(prospector_router)
app.include_router(costs_router)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status":  "running"
    }

