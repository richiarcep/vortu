# models/marketing.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class CompanyAnalysis(Base):
    __tablename__ = "marketing_company_analyses"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)

    # AI-generated fields
    sector          = Column(String(200))
    business_type   = Column(String(200))
    target_audience = Column(Text)          # JSON string
    value_proposition = Column(Text)
    strengths       = Column(Text)          # JSON list
    weaknesses      = Column(Text)          # JSON list
    opportunities   = Column(Text)          # JSON list
    recommended_budget_monthly = Column(Float, default=0)
    best_platforms  = Column(Text)          # JSON list  e.g. ["google", "meta", "tiktok"]
    tone_of_voice   = Column(String(200))
    key_messages    = Column(Text)          # JSON list
    full_analysis   = Column(Text)          # raw AI narrative

    # Context used
    used_internal_data  = Column(Boolean, default=True)
    used_document_ids   = Column(Text)      # JSON list of doc ids

    created_at      = Column(DateTime, default=datetime.utcnow)

    campaigns = relationship("MarketingCampaign", back_populates="analysis")


class MarketingCampaign(Base):
    __tablename__ = "marketing_campaigns"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id     = Column(Integer, ForeignKey("marketing_company_analyses.id"), nullable=True)

    name            = Column(String(300), nullable=False)
    objective       = Column(String(100))   # awareness | traffic | leads | sales | retargeting
    status          = Column(String(50), default="draft")  # draft | active | paused | ended

    budget_total    = Column(Float, default=0)
    budget_daily    = Column(Float, default=0)
    start_date      = Column(String(20))
    end_date        = Column(String(20))

    platforms       = Column(Text)          # JSON list ["google", "meta"]

    # AI-generated copies
    copies_google   = Column(Text)          # JSON: {headlines, descriptions, keywords}
    copies_meta     = Column(Text)          # JSON: {primary_text, headline, description, cta}
    copies_tiktok   = Column(Text)          # JSON: {script, hook, cta}

    # AI-generated image prompts
    image_prompts   = Column(Text)          # JSON list of prompts
    generated_images = Column(Text)         # JSON list of URLs / base64 refs

    # AI-generated video scripts
    video_scripts   = Column(Text)          # JSON: {hook, body, cta, duration_secs}

    # External IDs once published
    google_campaign_id   = Column(String(200))
    google_ad_group_id   = Column(String(200))
    meta_campaign_id     = Column(String(200))
    meta_adset_id        = Column(String(200))
    meta_ad_id           = Column(String(200))

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    analysis    = relationship("CompanyAnalysis", back_populates="campaigns")
    metrics     = relationship("CampaignMetrics", back_populates="campaign")


class CampaignMetrics(Base):
    __tablename__ = "marketing_campaign_metrics"

    id              = Column(Integer, primary_key=True, index=True)
    campaign_id     = Column(Integer, ForeignKey("marketing_campaigns.id"), nullable=False)
    platform        = Column(String(50))    # google | meta

    date            = Column(String(20))    # YYYY-MM-DD
    impressions     = Column(Integer, default=0)
    clicks          = Column(Integer, default=0)
    ctr             = Column(Float, default=0)      # %
    spend           = Column(Float, default=0)      # €
    conversions     = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0)      # %
    cpc             = Column(Float, default=0)      # cost per click
    cpa             = Column(Float, default=0)      # cost per acquisition
    roas            = Column(Float, default=0)      # return on ad spend

    raw_response    = Column(Text)          # raw API JSON for debugging

    fetched_at      = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("MarketingCampaign", back_populates="metrics")


class PlatformCredential(Base):
    __tablename__ = "marketing_platform_credentials"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform        = Column(String(50))    # google | meta

    # Google Ads
    google_customer_id      = Column(String(100))
    google_developer_token  = Column(String(300))
    google_refresh_token    = Column(String(500))
    google_client_id        = Column(String(300))
    google_client_secret    = Column(String(300))

    # Meta / Facebook Ads
    meta_account_id         = Column(String(100))
    meta_access_token       = Column(String(500))
    meta_app_id             = Column(String(100))
    meta_app_secret         = Column(String(300))
    meta_pixel_id           = Column(String(100))

    connected               = Column(Boolean, default=False)
    last_verified_at        = Column(DateTime)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)