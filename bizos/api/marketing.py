# api/marketing.py
"""
Marketing module API endpoints.

Routes:
  POST /api/marketing/analizar              — Analyze company with AI
  GET  /api/marketing/analisis              — Get last analysis
  POST /api/marketing/campanas              — Create campaign (AI generates content)
  GET  /api/marketing/campanas              — List campaigns
  GET  /api/marketing/campanas/{id}         — Get single campaign
  PUT  /api/marketing/campanas/{id}/status  — Pause / resume
  POST /api/marketing/campanas/{id}/publicar — Publish to platforms
  GET  /api/marketing/campanas/{id}/metricas — Fetch live metrics
  POST /api/marketing/plataformas/conectar  — Save platform credentials
  GET  /api/marketing/plataformas           — Get connected platforms
  POST /api/marketing/plataformas/{p}/verificar — Test connection
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from core.database import get_db
from models.user import User
from models.marketing import (
    CompanyAnalysis, MarketingCampaign, CampaignMetrics, PlatformCredential
)
from models.document import Document
from core.security import get_current_user

from modules.marketing.analyzer import analyze_company
from modules.marketing.generator import generate_campaign_content
from modules.marketing.platforms import (
    verify_google_credentials, create_google_campaign, get_google_metrics,
    pause_google_campaign, resume_google_campaign,
    verify_meta_credentials, create_meta_campaign, get_meta_metrics,
    pause_meta_campaign, resume_meta_campaign,
)

router = APIRouter(prefix="/api/marketing", tags=["marketing"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    document_ids: Optional[List[int]] = []


class CreateCampaignRequest(BaseModel):
    name: str
    objective: str                   # awareness|traffic|leads|sales|retargeting
    platforms: List[str]             # ["google", "meta"]
    budget_daily: float
    budget_total: Optional[float] = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    final_url: Optional[str] = ""
    extra_context: Optional[str] = ""
    analysis_id: Optional[int] = None


class PublishRequest(BaseModel):
    platforms: List[str]             # ["google", "meta"]
    final_url: str


class StatusUpdateRequest(BaseModel):
    status: str                      # paused | active


class GoogleCredentials(BaseModel):
    customer_id: str
    developer_token: str
    refresh_token: str
    client_id: str
    client_secret: str


class MetaCredentials(BaseModel):
    account_id: str
    access_token: str
    app_id: Optional[str] = ""
    app_secret: Optional[str] = ""
    pixel_id: Optional[str] = ""
    page_id: Optional[str] = ""


# ── Internal helper: gather company data ─────────────────────────────────────

def _gather_internal_data(db: Session, user_id: int) -> dict:
    """Pull summarised data from existing modules for context."""
    from models.sales import Sale, SaleItem, Product
    from models.customer import Contact, Message
    from sqlalchemy import func
    from datetime import datetime

    today = datetime.utcnow()
    month_start = today.replace(day=1)

    # Ventas
    ventas_mes = db.query(func.sum(Sale.total)).filter(
        Sale.company_id == user_id, Sale.created_at >= month_start
    ).scalar() or 0
    num_ventas = db.query(func.count(Sale.id)).filter(
        Sale.company_id == user_id, Sale.created_at >= month_start
    ).scalar() or 0

    # Productos
    num_productos = db.query(func.count(Product.id)).filter(
        Product.company_id == user_id
    ).scalar() or 0

    # Clientes
    total_contacts = db.query(func.count(Contact.id)).filter(
        Contact.company_id == user_id
    ).scalar() or 0

    return {
        "contabilidad": {
            "ingresos_mes": round(float(ventas_mes), 2),
            "gastos_mes": 0,
            "resultado_neto": round(float(ventas_mes), 2),
        },
        "ventas": {
            "ingresos_ventas_mes": round(float(ventas_mes), 2),
            "num_ventas_mes": num_ventas,
            "ticket_medio": round(float(ventas_mes / num_ventas), 2) if num_ventas > 0 else 0,
            "num_productos": num_productos,
        },
        "clientes": {
            "total_contactos": total_contacts,
        },
        "hr": {
            "empleados_activos": 0,
        },
    }


def _get_creds_dict(cred: PlatformCredential, platform: str) -> dict:
    if platform == "google":
        return {
            "customer_id": cred.google_customer_id or "",
            "developer_token": cred.google_developer_token or "",
            "refresh_token": cred.google_refresh_token or "",
            "client_id": cred.google_client_id or "",
            "client_secret": cred.google_client_secret or "",
        }
    else:  # meta
        return {
            "account_id": cred.meta_account_id or "",
            "access_token": cred.meta_access_token or "",
            "app_id": cred.meta_app_id or "",
            "app_secret": cred.meta_app_secret or "",
            "pixel_id": cred.meta_pixel_id or "",
        }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/analizar")
async def analizar_empresa(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze company with AI using internal data + optional uploaded documents."""

    # 1. Internal data
    internal_data = _gather_internal_data(db, current_user.id)

    # 2. External documents text
    document_texts = []
    if body.document_ids:
        for doc_id in body.document_ids:
            doc = db.query(Document).filter(
                Document.id == doc_id, Document.user_id == current_user.id
            ).first()
            if doc and doc.extracted_text:
                document_texts.append(f"[{doc.filename}]\n{doc.extracted_text}")

    # 3. Call AI
    try:
        result = await analyze_company(
            db=db,
            user_id=current_user.id,
            internal_data=internal_data,
            document_texts=document_texts or None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis IA: {str(e)}")

    # 4. Persist
    analysis = CompanyAnalysis(
        user_id=current_user.id,
        sector=result.get("sector"),
        business_type=result.get("business_type"),
        target_audience=json.dumps(result.get("target_audience", {}), ensure_ascii=False),
        value_proposition=result.get("value_proposition"),
        strengths=json.dumps(result.get("strengths", []), ensure_ascii=False),
        weaknesses=json.dumps(result.get("weaknesses", []), ensure_ascii=False),
        opportunities=json.dumps(result.get("opportunities", []), ensure_ascii=False),
        recommended_budget_monthly=result.get("recommended_budget_monthly", 0),
        best_platforms=json.dumps(result.get("best_platforms", []), ensure_ascii=False),
        tone_of_voice=result.get("tone_of_voice"),
        key_messages=json.dumps(result.get("key_messages", []), ensure_ascii=False),
        full_analysis=result.get("full_analysis"),
        used_internal_data=True,
        used_document_ids=json.dumps(body.document_ids),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "sector": analysis.sector,
        "business_type": analysis.business_type,
        "target_audience": result.get("target_audience"),
        "value_proposition": analysis.value_proposition,
        "strengths": result.get("strengths"),
        "weaknesses": result.get("weaknesses"),
        "opportunities": result.get("opportunities"),
        "recommended_budget_monthly": analysis.recommended_budget_monthly,
        "budget_breakdown": result.get("budget_breakdown"),
        "best_platforms": result.get("best_platforms"),
        "tone_of_voice": analysis.tone_of_voice,
        "key_messages": result.get("key_messages"),
        "competitive_position": result.get("competitive_position"),
        "quick_wins": result.get("quick_wins"),
        "full_analysis": analysis.full_analysis,
        "created_at": analysis.created_at.isoformat(),
    }


@router.get("/analisis")
def get_last_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent company analysis."""
    analysis = db.query(CompanyAnalysis).filter(
        CompanyAnalysis.user_id == current_user.id
    ).order_by(CompanyAnalysis.created_at.desc()).first()

    if not analysis:
        return {"analisis": None}

    def _parse(val):
        if not val:
            return val
        try:
            return json.loads(val)
        except Exception:
            return val

    return {
        "analisis": {
            "id": analysis.id,
            "sector": analysis.sector,
            "business_type": analysis.business_type,
            "target_audience": _parse(analysis.target_audience),
            "value_proposition": analysis.value_proposition,
            "strengths": _parse(analysis.strengths),
            "weaknesses": _parse(analysis.weaknesses),
            "opportunities": _parse(analysis.opportunities),
            "recommended_budget_monthly": analysis.recommended_budget_monthly,
            "best_platforms": _parse(analysis.best_platforms),
            "tone_of_voice": analysis.tone_of_voice,
            "key_messages": _parse(analysis.key_messages),
            "full_analysis": analysis.full_analysis,
            "created_at": analysis.created_at.isoformat(),
        }
    }


@router.post("/campanas")
async def create_campaign(
    body: CreateCampaignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a campaign: AI generates all creative content."""

    # Get analysis context
    analysis_dict = {}
    if body.analysis_id:
        an = db.query(CompanyAnalysis).filter(
            CompanyAnalysis.id == body.analysis_id,
            CompanyAnalysis.user_id == current_user.id
        ).first()
        if an:
            def _p(v):
                try: return json.loads(v) if v else {}
                except: return {}
            analysis_dict = {
                "sector": an.sector,
                "business_type": an.business_type,
                "target_audience": _p(an.target_audience),
                "value_proposition": an.value_proposition,
                "tone_of_voice": an.tone_of_voice,
                "key_messages": _p(an.key_messages),
                "competitive_position": an.full_analysis,
            }

    # If no analysis, use a minimal context
    if not analysis_dict:
        analysis_dict = {
            "sector": "empresa española",
            "business_type": "B2C",
            "target_audience": {"primario": "adultos 25-55 en España"},
            "value_proposition": "producto/servicio de calidad",
            "tone_of_voice": "profesional y cercano",
            "key_messages": ["calidad", "confianza", "resultados"],
        }

    # Generate all creative content
    try:
        content = await generate_campaign_content(
            analysis=analysis_dict,
            campaign_name=body.name,
            objective=body.objective,
            budget_daily=body.budget_daily,
            platforms=body.platforms,
            extra_context=body.extra_context or "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando contenido: {str(e)}")

    # Persist campaign
    campaign = MarketingCampaign(
        user_id=current_user.id,
        analysis_id=body.analysis_id,
        name=body.name,
        objective=body.objective,
        status="draft",
        budget_total=body.budget_total or 0,
        budget_daily=body.budget_daily,
        start_date=body.start_date,
        end_date=body.end_date,
        platforms=json.dumps(body.platforms),
        copies_google=json.dumps(content.get("google_ads", {}), ensure_ascii=False),
        copies_meta=json.dumps(content.get("meta_ads", {}), ensure_ascii=False),
        copies_tiktok=json.dumps(content.get("tiktok_ads", {}), ensure_ascii=False),
        image_prompts=json.dumps(content.get("image_prompts", []), ensure_ascii=False),
        video_scripts=json.dumps(content.get("video_scripts", []), ensure_ascii=False),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    def _p(v):
        try: return json.loads(v) if v else {}
        except: return {}

    return {
        "id": campaign.id,
        "name": campaign.name,
        "objective": campaign.objective,
        "status": campaign.status,
        "budget_daily": campaign.budget_daily,
        "platforms": _p(campaign.platforms) if isinstance(_p(campaign.platforms), list) else body.platforms,
        "copies_google": _p(campaign.copies_google),
        "copies_meta": _p(campaign.copies_meta),
        "copies_tiktok": _p(campaign.copies_tiktok),
        "image_prompts": _p(campaign.image_prompts),
        "video_scripts": _p(campaign.video_scripts),
        "ab_testing_plan": content.get("ab_testing_plan"),
        "launch_checklist": content.get("launch_checklist"),
        "created_at": campaign.created_at.isoformat(),
    }


@router.get("/campanas")
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = db.query(MarketingCampaign).filter(
        MarketingCampaign.user_id == current_user.id
    ).order_by(MarketingCampaign.created_at.desc()).all()

    def _p(v):
        try: return json.loads(v) if v else []
        except: return []

    return {
        "campaigns": [
            {
                "id": c.id,
                "name": c.name,
                "objective": c.objective,
                "status": c.status,
                "budget_daily": c.budget_daily,
                "platforms": _p(c.platforms),
                "google_campaign_id": c.google_campaign_id,
                "meta_campaign_id": c.meta_campaign_id,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in campaigns
        ],
        "total": len(campaigns),
        "active": sum(1 for c in campaigns if c.status == "active"),
        "draft": sum(1 for c in campaigns if c.status == "draft"),
    }


@router.get("/campanas/{campaign_id}")
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = db.query(MarketingCampaign).filter(
        MarketingCampaign.id == campaign_id,
        MarketingCampaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    def _p(v):
        try: return json.loads(v) if v else {}
        except: return {}

    return {
        "id": campaign.id,
        "name": campaign.name,
        "objective": campaign.objective,
        "status": campaign.status,
        "budget_daily": campaign.budget_daily,
        "budget_total": campaign.budget_total,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "platforms": _p(campaign.platforms),
        "copies_google": _p(campaign.copies_google),
        "copies_meta": _p(campaign.copies_meta),
        "copies_tiktok": _p(campaign.copies_tiktok),
        "image_prompts": _p(campaign.image_prompts),
        "video_scripts": _p(campaign.video_scripts),
        "google_campaign_id": campaign.google_campaign_id,
        "meta_campaign_id": campaign.meta_campaign_id,
        "created_at": campaign.created_at.isoformat(),
    }


@router.put("/campanas/{campaign_id}/status")
async def update_campaign_status(
    campaign_id: int,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = db.query(MarketingCampaign).filter(
        MarketingCampaign.id == campaign_id,
        MarketingCampaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    results = {}

    # Sync with platforms if published
    if campaign.google_campaign_id:
        cred = db.query(PlatformCredential).filter(
            PlatformCredential.user_id == current_user.id,
            PlatformCredential.platform == "google"
        ).first()
        if cred:
            creds = _get_creds_dict(cred, "google")
            if body.status == "paused":
                results["google"] = await pause_google_campaign(creds, campaign.google_campaign_id)
            else:
                results["google"] = await resume_google_campaign(creds, campaign.google_campaign_id)

    if campaign.meta_campaign_id:
        cred = db.query(PlatformCredential).filter(
            PlatformCredential.user_id == current_user.id,
            PlatformCredential.platform == "meta"
        ).first()
        if cred:
            creds = _get_creds_dict(cred, "meta")
            if body.status == "paused":
                results["meta"] = await pause_meta_campaign(creds, campaign.meta_campaign_id)
            else:
                results["meta"] = await resume_meta_campaign(creds, campaign.meta_campaign_id)

    campaign.status = body.status
    campaign.updated_at = datetime.utcnow()
    db.commit()

    return {"mensaje": f"Campaña {body.status}", "platform_results": results}


@router.post("/campanas/{campaign_id}/publicar")
async def publish_campaign(
    campaign_id: int,
    body: PublishRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publish campaign to selected platforms via their APIs."""
    campaign = db.query(MarketingCampaign).filter(
        MarketingCampaign.id == campaign_id,
        MarketingCampaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    def _p(v):
        try: return json.loads(v) if v else {}
        except: return {}

    results = {}
    campaign_data = {
        "name": campaign.name,
        "objective": campaign.objective,
        "budget_daily": campaign.budget_daily,
        "budget_total": campaign.budget_total,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "final_url": body.final_url,
    }

    if "google" in body.platforms:
        cred = db.query(PlatformCredential).filter(
            PlatformCredential.user_id == current_user.id,
            PlatformCredential.platform == "google",
            PlatformCredential.connected == True,
        ).first()
        if not cred:
            results["google"] = {"success": False, "error": "Google Ads no conectado. Ve a Plataformas."}
        else:
            creds = _get_creds_dict(cred, "google")
            copies = _p(campaign.copies_google)
            result = await create_google_campaign(creds, campaign_data, copies)
            results["google"] = result
            if result.get("success"):
                campaign.google_campaign_id = result.get("campaign_id")
                campaign.google_ad_group_id = result.get("ad_group_id")

    if "meta" in body.platforms:
        cred = db.query(PlatformCredential).filter(
            PlatformCredential.user_id == current_user.id,
            PlatformCredential.platform == "meta",
            PlatformCredential.connected == True,
        ).first()
        if not cred:
            results["meta"] = {"success": False, "error": "Meta Ads no conectado. Ve a Plataformas."}
        else:
            creds = _get_creds_dict(cred, "meta")
            copies = _p(campaign.copies_meta)
            result = await create_meta_campaign(creds, campaign_data, copies)
            results["meta"] = result
            if result.get("success"):
                campaign.meta_campaign_id = result.get("campaign_id")
                campaign.meta_adset_id = result.get("adset_id")
                campaign.meta_ad_id = result.get("ad_id")

    any_success = any(r.get("success") for r in results.values())
    if any_success:
        campaign.status = "active"

    campaign.updated_at = datetime.utcnow()
    db.commit()

    return {
        "mensaje": "Campaña publicada" if any_success else "Error al publicar",
        "results": results,
        "campaign_status": campaign.status,
    }


@router.get("/campanas/{campaign_id}/metricas")
async def get_campaign_metrics(
    campaign_id: int,
    days: int = 14,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = db.query(MarketingCampaign).filter(
        MarketingCampaign.id == campaign_id,
        MarketingCampaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    all_metrics = []

    if campaign.google_campaign_id:
        cred = db.query(PlatformCredential).filter(
            PlatformCredential.user_id == current_user.id,
            PlatformCredential.platform == "google"
        ).first()
        if cred:
            metrics = await get_google_metrics(_get_creds_dict(cred, "google"), campaign.google_campaign_id, days)
            all_metrics.extend(metrics)
            # Persist to DB
            for m in metrics:
                existing = db.query(CampaignMetrics).filter(
                    CampaignMetrics.campaign_id == campaign_id,
                    CampaignMetrics.platform == "google",
                    CampaignMetrics.date == m["date"]
                ).first()
                if not existing:
                    db.add(CampaignMetrics(campaign_id=campaign_id, **m))

    if campaign.meta_campaign_id:
        cred = db.query(PlatformCredential).filter(
            PlatformCredential.user_id == current_user.id,
            PlatformCredential.platform == "meta"
        ).first()
        if cred:
            metrics = await get_meta_metrics(_get_creds_dict(cred, "meta"), campaign.meta_campaign_id, days)
            all_metrics.extend(metrics)
            for m in metrics:
                existing = db.query(CampaignMetrics).filter(
                    CampaignMetrics.campaign_id == campaign_id,
                    CampaignMetrics.platform == "meta",
                    CampaignMetrics.date == m["date"]
                ).first()
                if not existing:
                    db.add(CampaignMetrics(campaign_id=campaign_id, **m))

    db.commit()

    # Summary
    total_spend = sum(m["spend"] for m in all_metrics)
    total_clicks = sum(m["clicks"] for m in all_metrics)
    total_impressions = sum(m["impressions"] for m in all_metrics)
    total_conversions = sum(m["conversions"] for m in all_metrics)

    return {
        "campaign_id": campaign_id,
        "metrics": all_metrics,
        "summary": {
            "total_spend": round(total_spend, 2),
            "total_clicks": total_clicks,
            "total_impressions": total_impressions,
            "total_conversions": total_conversions,
            "avg_ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
            "avg_cpc": round((total_spend / total_clicks) if total_clicks > 0 else 0, 2),
            "avg_cpa": round((total_spend / total_conversions) if total_conversions > 0 else 0, 2),
        }
    }


# ── Platform credentials ──────────────────────────────────────────────────────

@router.post("/plataformas/google/conectar")
async def connect_google(
    body: GoogleCredentials,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cred = db.query(PlatformCredential).filter(
        PlatformCredential.user_id == current_user.id,
        PlatformCredential.platform == "google"
    ).first()
    if not cred:
        cred = PlatformCredential(user_id=current_user.id, platform="google")
        db.add(cred)

    cred.google_customer_id = body.customer_id
    cred.google_developer_token = body.developer_token
    cred.google_refresh_token = body.refresh_token
    cred.google_client_id = body.client_id
    cred.google_client_secret = body.client_secret
    cred.connected = False
    cred.updated_at = datetime.utcnow()
    db.commit()

    # Verify immediately
    creds_dict = {
        "customer_id": body.customer_id,
        "developer_token": body.developer_token,
        "refresh_token": body.refresh_token,
        "client_id": body.client_id,
        "client_secret": body.client_secret,
    }
    result = await verify_google_credentials(creds_dict)
    cred.connected = result.get("connected", False)
    if cred.connected:
        cred.last_verified_at = datetime.utcnow()
    db.commit()

    return result


@router.post("/plataformas/meta/conectar")
async def connect_meta(
    body: MetaCredentials,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cred = db.query(PlatformCredential).filter(
        PlatformCredential.user_id == current_user.id,
        PlatformCredential.platform == "meta"
    ).first()
    if not cred:
        cred = PlatformCredential(user_id=current_user.id, platform="meta")
        db.add(cred)

    cred.meta_account_id = body.account_id
    cred.meta_access_token = body.access_token
    cred.meta_app_id = body.app_id
    cred.meta_app_secret = body.app_secret
    cred.meta_pixel_id = body.pixel_id
    cred.connected = False
    cred.updated_at = datetime.utcnow()
    db.commit()

    creds_dict = {"account_id": body.account_id, "access_token": body.access_token}
    result = await verify_meta_credentials(creds_dict)
    cred.connected = result.get("connected", False)
    if cred.connected:
        cred.last_verified_at = datetime.utcnow()
    db.commit()

    return result


@router.get("/plataformas")
def get_platforms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    creds = db.query(PlatformCredential).filter(
        PlatformCredential.user_id == current_user.id
    ).all()

    result = {"google": None, "meta": None}
    for c in creds:
        if c.platform == "google":
            result["google"] = {
                "connected": c.connected,
                "customer_id": c.google_customer_id,
                "last_verified_at": c.last_verified_at.isoformat() if c.last_verified_at else None,
            }
        elif c.platform == "meta":
            result["meta"] = {
                "connected": c.connected,
                "account_id": c.meta_account_id,
                "last_verified_at": c.last_verified_at.isoformat() if c.last_verified_at else None,
            }

    return result


@router.post("/plataformas/{platform}/verificar")
async def verify_platform(
    platform: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cred = db.query(PlatformCredential).filter(
        PlatformCredential.user_id == current_user.id,
        PlatformCredential.platform == platform
    ).first()
    if not cred:
        raise HTTPException(status_code=404, detail=f"Plataforma {platform} no configurada")

    creds_dict = _get_creds_dict(cred, platform)
    if platform == "google":
        result = await verify_google_credentials(creds_dict)
    elif platform == "meta":
        result = await verify_meta_credentials(creds_dict)
    else:
        raise HTTPException(status_code=400, detail="Plataforma no soportada")

    cred.connected = result.get("connected", False)
    if cred.connected:
        cred.last_verified_at = datetime.utcnow()
    db.commit()

    return result