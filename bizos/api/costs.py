from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.costs import CostCategory, CostDepartment, CostEntry

router = APIRouter(prefix="/api/costs", tags=["costs"])

class CategoryCreate(BaseModel):
    name: str
    color: str = "#6b7280"
    icon: str = "💰"

class DepartmentCreate(BaseModel):
    name: str

class CostCreate(BaseModel):
    description: str
    amount: float
    category_id: Optional[int] = None
    department_id: Optional[int] = None
    date: Optional[str] = None
    notes: Optional[str] = None

# ── Categorías ────────────────────────────────────────────────────────────────

@router.get("/categories")
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cats = db.query(CostCategory).filter(CostCategory.company_id == current_user.company_id).all()
    return [{"id": c.id, "name": c.name, "color": c.color, "icon": c.icon} for c in cats]

@router.post("/categories")
def create_category(body: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = CostCategory(company_id=current_user.company_id, name=body.name, color=body.color, icon=body.icon)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "color": cat.color, "icon": cat.icon}

# ── Departamentos ─────────────────────────────────────────────────────────────

@router.get("/departments")
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deps = db.query(CostDepartment).filter(CostDepartment.company_id == current_user.company_id).all()
    return [{"id": d.id, "name": d.name} for d in deps]

@router.post("/departments")
def create_department(body: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dep = CostDepartment(company_id=current_user.company_id, name=body.name)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return {"id": dep.id, "name": dep.name}

# ── Gastos ────────────────────────────────────────────────────────────────────

@router.get("/entries")
def get_entries(month: Optional[int] = None, year: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    month = month or now.month
    year = year or now.year
    entries = db.query(CostEntry).filter(
        CostEntry.company_id == current_user.company_id,
        extract('month', CostEntry.date) == month,
        extract('year', CostEntry.date) == year,
    ).order_by(CostEntry.date.desc()).all()
    return [{"id": e.id, "description": e.description, "amount": e.amount,
             "date": e.date.isoformat(), "notes": e.notes,
             "category": {"id": e.category.id, "name": e.category.name, "color": e.category.color, "icon": e.category.icon} if e.category else None,
             "department": {"id": e.department.id, "name": e.department.name} if e.department else None} for e in entries]

@router.post("/entries")
def create_entry(body: CostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = CostEntry(
        company_id=current_user.company_id,
        description=body.description,
        amount=body.amount,
        category_id=body.category_id,
        department_id=body.department_id,
        date=datetime.fromisoformat(body.date) if body.date else datetime.utcnow(),
        notes=body.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "description": entry.description, "amount": entry.amount}

@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = db.query(CostEntry).filter(CostEntry.id == entry_id, CostEntry.company_id == current_user.company_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(entry)
    db.commit()
    return {"success": True}

# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    
    # Mes actual
    cur_entries = db.query(CostEntry).filter(
        CostEntry.company_id == current_user.company_id,
        extract('month', CostEntry.date) == now.month,
        extract('year', CostEntry.date) == now.year,
    ).all()
    
    # Mes anterior
    prev = now.replace(day=1) - timedelta(days=1)
    prev_entries = db.query(CostEntry).filter(
        CostEntry.company_id == current_user.company_id,
        extract('month', CostEntry.date) == prev.month,
        extract('year', CostEntry.date) == prev.year,
    ).all()

    total_current = sum(e.amount for e in cur_entries)
    total_prev = sum(e.amount for e in prev_entries)
    diff_pct = ((total_current - total_prev) / total_prev * 100) if total_prev > 0 else 0

    # Por categoría
    by_cat = {}
    for e in cur_entries:
        cat_name = e.category.name if e.category else "Sin categoría"
        cat_color = e.category.color if e.category else "#9ca3af"
        cat_icon = e.category.icon if e.category else "📦"
        if cat_name not in by_cat:
            by_cat[cat_name] = {"name": cat_name, "color": cat_color, "icon": cat_icon, "total": 0, "count": 0}
        by_cat[cat_name]["total"] += e.amount
        by_cat[cat_name]["count"] += 1

    # Por departamento
    by_dep = {}
    for e in cur_entries:
        dep_name = e.department.name if e.department else "Sin departamento"
        if dep_name not in by_dep:
            by_dep[dep_name] = {"name": dep_name, "total": 0}
        by_dep[dep_name]["total"] += e.amount

    return {
        "total_current": total_current,
        "total_prev": total_prev,
        "diff_pct": round(diff_pct, 1),
        "count": len(cur_entries),
        "by_category": sorted(by_cat.values(), key=lambda x: x["total"], reverse=True),
        "by_department": sorted(by_dep.values(), key=lambda x: x["total"], reverse=True),
        "month": now.month,
        "year": now.year,
    }
