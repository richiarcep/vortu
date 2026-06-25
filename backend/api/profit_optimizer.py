from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from core.database import get_db
from core.security import get_current_user
from core.pagination import LimitQuery
from models.profit_optimizer import CommercialLine, OptimizerProduct, OptimizerInputs, OptimizerRun
from modules.profit_optimizer.engine import run_optimizer

router = APIRouter(prefix="/profit-optimizer", tags=["Profit Optimizer"])


class LineCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    seasonality: float = Field(default=1.0, ge=0.1, le=5.0)

class LineUpdate(BaseModel):
    name:        Optional[str]   = None
    description: Optional[str]  = None
    seasonality: Optional[float] = None
    is_active:   Optional[bool]  = None

class ProductCreate(BaseModel):
    line_id:           int
    name:              str
    selling_price:     float = Field(gt=0)
    vela_product_id:  Optional[int]   = None
    supply_limit:      int             = 0
    labour_cost_m3:    float = 0.0
    labour_cost_m2:    float = 0.0
    labour_cost_m1:    float = 0.0
    material_cost_m3:  float = 0.0
    material_cost_m2:  float = 0.0
    material_cost_m1:  float = 0.0
    logistics_cost_m3: float = 0.0
    logistics_cost_m2: float = 0.0
    logistics_cost_m1: float = 0.0
    demand_p0:         Optional[float] = None
    demand_q0:         Optional[float] = None
    demand_eps:        Optional[float] = None

class ProductUpdate(BaseModel):
    selling_price:     Optional[float] = None
    supply_limit:      Optional[int]   = None
    labour_cost_m3:    Optional[float] = None
    labour_cost_m2:    Optional[float] = None
    labour_cost_m1:    Optional[float] = None
    material_cost_m3:  Optional[float] = None
    material_cost_m2:  Optional[float] = None
    material_cost_m1:  Optional[float] = None
    logistics_cost_m3: Optional[float] = None
    logistics_cost_m2: Optional[float] = None
    logistics_cost_m1: Optional[float] = None
    demand_p0:         Optional[float] = None
    demand_q0:         Optional[float] = None
    demand_eps:        Optional[float] = None
    is_active:         Optional[bool]  = None

class InputsUpdate(BaseModel):
    period_label:    str
    planning_date:   Optional[date]  = None
    fixed_costs:     float           = Field(default=5000.0, ge=0)
    total_budget:    float           = Field(default=45000.0, ge=0)
    vacation_factor: float           = Field(default=1.0, ge=0.5, le=1.0)
    vacation_month:  bool            = False

class RunRequest(BaseModel):
    period_label:  str
    planning_date: Optional[date] = None
    n_months:      int            = Field(default=8, ge=4, le=24)


@router.get("/lines")
def get_lines(db=Depends(get_db), current_user=Depends(get_current_user)):
    lines = db.query(CommercialLine).filter(
        CommercialLine.company_id == current_user.company_id,
    ).order_by(CommercialLine.id).all()
    return [{"id":l.id,"name":l.name,"description":l.description,
             "seasonality":l.seasonality,"is_active":l.is_active,
             "n_products":len(l.products)} for l in lines]


@router.post("/lines", status_code=status.HTTP_201_CREATED)
def create_line(body: LineCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    line = CommercialLine(company_id=current_user.company_id, **body.model_dump())
    db.add(line); db.commit(); db.refresh(line)
    return {"id":line.id,"name":line.name,"message":"Line created."}


@router.patch("/lines/{line_id}")
def update_line(line_id: int, body: LineUpdate, db=Depends(get_db), current_user=Depends(get_current_user)):
    line = db.query(CommercialLine).filter(
        CommercialLine.id==line_id, CommercialLine.company_id==current_user.company_id
    ).first()
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(line, f, v)
    db.commit()
    return {"message":"Line updated."}


@router.get("/lines/{line_id}/products")
def get_products(line_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    products = db.query(OptimizerProduct).filter(
        OptimizerProduct.line_id==line_id,
        OptimizerProduct.company_id==current_user.company_id,
    ).order_by(OptimizerProduct.id).all()
    return [{
        "id":p.id,"name":p.name,"selling_price":p.selling_price,
        "unit_cost":round(p.unit_cost,2),
        "unit_labour":round(p.unit_labour,2),
        "unit_material":round(p.unit_material,2),
        "unit_logistics":round(p.unit_logistics,2),
        "implied_margin":round(p.implied_margin,4),
        "supply_limit":p.supply_limit,
        "demand_p0":p.demand_p0,"demand_q0":p.demand_q0,"demand_eps":p.demand_eps,
        "erp_history":{
            "labour":   [p.labour_cost_m3,   p.labour_cost_m2,   p.labour_cost_m1],
            "material": [p.material_cost_m3, p.material_cost_m2, p.material_cost_m1],
            "logistics":[p.logistics_cost_m3,p.logistics_cost_m2,p.logistics_cost_m1],
        },
        "is_active":p.is_active,"vela_product_id":p.vela_product_id,
    } for p in products]


@router.post("/lines/{line_id}/products", status_code=status.HTTP_201_CREATED)
def create_product(line_id: int, body: ProductCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    line = db.query(CommercialLine).filter(
        CommercialLine.id==line_id, CommercialLine.company_id==current_user.company_id
    ).first()
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")
    product = OptimizerProduct(company_id=current_user.company_id, **body.model_dump())
    db.add(product); db.commit(); db.refresh(product)
    return {"id":product.id,"name":product.name,"unit_cost":round(product.unit_cost,2)}


@router.patch("/products/{product_id}")
def update_product(product_id: int, body: ProductUpdate, db=Depends(get_db), current_user=Depends(get_current_user)):
    product = db.query(OptimizerProduct).filter(
        OptimizerProduct.id==product_id,
        OptimizerProduct.company_id==current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(product, f, v)
    db.commit()
    return {"message":"Product updated.","unit_cost":round(product.unit_cost,2),"implied_margin":round(product.implied_margin,4)}


@router.get("/inputs/{period_label}")
def get_inputs(period_label: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    inputs = db.query(OptimizerInputs).filter(
        OptimizerInputs.company_id==current_user.company_id,
        OptimizerInputs.period_label==period_label,
    ).first()
    if not inputs:
        return {"period_label":period_label,"fixed_costs":5000.0,"total_budget":45000.0,
                "vacation_factor":1.0,"vacation_month":False,"is_default":True}
    return {"period_label":inputs.period_label,"fixed_costs":inputs.fixed_costs,
            "total_budget":inputs.total_budget,"vacation_factor":inputs.vacation_factor,
            "vacation_month":inputs.vacation_month,"is_default":False}


@router.put("/inputs")
def save_inputs(body: InputsUpdate, db=Depends(get_db), current_user=Depends(get_current_user)):
    inputs = db.query(OptimizerInputs).filter(
        OptimizerInputs.company_id==current_user.company_id,
        OptimizerInputs.period_label==body.period_label,
    ).first()
    if inputs:
        for f, v in body.model_dump(exclude_none=True).items():
            setattr(inputs, f, v)
    else:
        inputs = OptimizerInputs(company_id=current_user.company_id, **body.model_dump())
        db.add(inputs)
    db.commit()
    return {"message":"Inputs saved.","period":body.period_label}


@router.post("/run")
def run(body: RunRequest, db=Depends(get_db), current_user=Depends(get_current_user)):
    return run_optimizer(
        db=db, company_id=current_user.company_id,
        period_label=body.period_label,
        planning_date=body.planning_date,
        n_months=body.n_months,
    )


@router.get("/runs")
def get_runs(limit: int = LimitQuery(10), db=Depends(get_db), current_user=Depends(get_current_user)):
    runs = db.query(OptimizerRun).filter(
        OptimizerRun.company_id==current_user.company_id,
    ).order_by(OptimizerRun.run_at.desc()).limit(limit).all()
    return [{"id":r.id,"period":r.period_label,"run_at":r.run_at.isoformat(),
             "optimised_profit":r.optimised_profit,"status":r.status,
             "escalation_reason":r.escalation_reason} for r in runs]


@router.get("/runs/{run_id}")
def get_run(run_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    run = db.query(OptimizerRun).filter(
        OptimizerRun.id==run_id,
        OptimizerRun.company_id==current_user.company_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return run.result_json
