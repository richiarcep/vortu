from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from core.database import Base


class CommercialLine(Base):
    __tablename__ = "profit_optimizer_lines"
    id             = Column(Integer, primary_key=True, index=True)
    company_id     = Column(Integer, nullable=False, index=True)
    name           = Column(String(100), nullable=False)
    description    = Column(String(255), nullable=True)
    margin_rate    = Column(Float, nullable=False, default=0.5)
    seasonality    = Column(Float, nullable=False, default=1.0)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    products       = relationship("OptimizerProduct", back_populates="line", cascade="all, delete-orphan")
    runs           = relationship("OptimizerRun", back_populates="line")


class OptimizerProduct(Base):
    __tablename__ = "profit_optimizer_products"
    id               = Column(Integer, primary_key=True, index=True)
    company_id       = Column(Integer, nullable=False, index=True)
    line_id          = Column(Integer, ForeignKey("profit_optimizer_lines.id"), nullable=False)
    vortu_product_id = Column(Integer, nullable=True)
    name             = Column(String(100), nullable=False)
    selling_price    = Column(Float, nullable=False)
    labour_cost_m3   = Column(Float, nullable=False, default=0.0)
    labour_cost_m2   = Column(Float, nullable=False, default=0.0)
    labour_cost_m1   = Column(Float, nullable=False, default=0.0)
    material_cost_m3 = Column(Float, nullable=False, default=0.0)
    material_cost_m2 = Column(Float, nullable=False, default=0.0)
    material_cost_m1 = Column(Float, nullable=False, default=0.0)
    logistics_cost_m3= Column(Float, nullable=False, default=0.0)
    logistics_cost_m2= Column(Float, nullable=False, default=0.0)
    logistics_cost_m1= Column(Float, nullable=False, default=0.0)
    supply_limit     = Column(Integer, nullable=False, default=0)
    demand_p0        = Column(Float, nullable=True)
    demand_q0        = Column(Float, nullable=True)
    demand_eps       = Column(Float, nullable=True)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    line             = relationship("CommercialLine", back_populates="products")

    @property
    def unit_labour(self):
        return 0.5*self.labour_cost_m1 + 0.3*self.labour_cost_m2 + 0.2*self.labour_cost_m3

    @property
    def unit_material(self):
        return 0.5*self.material_cost_m1 + 0.3*self.material_cost_m2 + 0.2*self.material_cost_m3

    @property
    def unit_logistics(self):
        return 0.5*self.logistics_cost_m1 + 0.3*self.logistics_cost_m2 + 0.2*self.logistics_cost_m3

    @property
    def unit_cost(self):
        return self.unit_labour + self.unit_material + self.unit_logistics

    @property
    def implied_margin(self):
        if self.selling_price <= 0:
            return 0.0
        return (self.selling_price - self.unit_cost) / self.selling_price


class OptimizerInputs(Base):
    __tablename__ = "profit_optimizer_inputs"
    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, nullable=False, index=True)
    period_label    = Column(String(20), nullable=False)
    planning_date   = Column(Date, nullable=False)
    fixed_costs     = Column(Float, nullable=False, default=0.0)
    total_budget    = Column(Float, nullable=False, default=0.0)
    vacation_factor = Column(Float, nullable=False, default=1.0)
    vacation_month  = Column(Boolean, nullable=False, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OptimizerRun(Base):
    __tablename__ = "profit_optimizer_runs"
    id                = Column(Integer, primary_key=True, index=True)
    company_id        = Column(Integer, nullable=False, index=True)
    line_id           = Column(Integer, ForeignKey("profit_optimizer_lines.id"), nullable=True)
    run_at            = Column(DateTime, default=datetime.utcnow)
    period_label      = Column(String(20), nullable=False)
    current_profit    = Column(Float, nullable=True)
    optimised_profit  = Column(Float, nullable=True)
    profit_gain       = Column(Float, nullable=True)
    result_json       = Column(JSON, nullable=True)
    status            = Column(String(20), nullable=False, default="ok")
    escalation_reason = Column(Text, nullable=True)
    line              = relationship("CommercialLine", back_populates="runs")
