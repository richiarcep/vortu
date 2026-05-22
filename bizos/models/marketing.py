from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class CompanyAnalysis(Base):
    __tablename__ = "marketing_company_analyses"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector          = Column(String(200))
    business_type   = Column(String(200))
    target_audience = Column(Text)
    value_proposition = Column(Text)
    strengths       = Column(Text)
    weaknesses      = Column(Text)
    opportunities   = Column(Text)
    recommended_budget_monthly = Column(Float, default=0)
    best_platforms  = Column(Text)
    tone_of_voice   = Column(String(200))
    key_messages    = Column(Text)
    full_analysis   = Column(Text)
    used_internal_data  = Column(Boolean, default=True)
    used_document_ids   = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    campaigns = relationship("MarketingCampaign", back_populates="analysis")


class MarketingCampaign(Base):
    __tablename__ = "marketing_campaigns"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id     = Column(Integer, ForeignKey("marketing_company_analyses.id"), nullable=True)
    name            = Column(String(300), nullable=False)
    objective       = Column(String(100))
    status          = Column(String(50), default="draft")
    budget_total    = Column(Float, default=0)
    budget_daily    = Column(Float, default=0)
    start_date      = Column(String(20))
    end_date        = Column(String(20))
    platforms       = Column(Text)
    copies_google   = Column(Text)
    copies_meta     = Column(Text)
    copies_tiktok   = Column(Text)
    image_prompts   = Column(Text)
    generated_images = Column(Text)
    video_scripts   = Column(Text)
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
    platform        = Column(String(50))
    date            = Column(String(20))
    impressions     = Column(Integer, default=0)
    clicks          = Column(Integer, default=0)
    ctr             = Column(Float, default=0)
    spend           = Column(Float, default=0)
    conversions     = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0)
    cpc             = Column(Float, default=0)
    cpa             = Column(Float, default=0)
    roas            = Column(Float, default=0)
    raw_response    = Column(Text)
    fetched_at      = Column(DateTime, default=datetime.utcnow)
    campaign = relationship("MarketingCampaign", back_populates="metrics")


class PlatformCredential(Base):
    __tablename__ = "marketing_platform_credentials"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform        = Column(String(50))
    google_customer_id      = Column(String(100))
    google_developer_token  = Column(String(300))
    google_refresh_token    = Column(String(500))
    google_client_id        = Column(String(300))
    google_client_secret    = Column(String(300))
    meta_account_id         = Column(String(100))
    meta_access_token       = Column(String(500))
    meta_app_id             = Column(String(100))
    meta_app_secret         = Column(String(300))
    meta_pixel_id           = Column(String(100))
    connected               = Column(Boolean, default=False)
    last_verified_at        = Column(DateTime)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
