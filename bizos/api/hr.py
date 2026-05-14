from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.document import Document
from modules.hr.employees import Employee, EmployeeFeedback, analyze_feedback
from modules.hr.payroll import process_payroll
import json
import os

router = APIRouter(prefix="/api/hr", tags=["HR & Payroll"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    full_name: str
    email: str
    department: Optional[str] = None
    position: Optional[str] = None
    gross_salary: float


class FeedbackCreate(BaseModel):
    employee_id: int
    content: str


class FeedbackBatchAnalyze(BaseModel):
    comments: list[str]


# ── Employee routes ───────────────────────────────────────────────────────────

@router.post("/employees", status_code=201)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new employee record."""

    existing = db.query(Employee).filter(
        Employee.email == data.email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee email already exists")

    employee = Employee(
        full_name=data.full_name,
        email=data.email,
        department=data.department,
        position=data.position,
        gross_salary=data.gross_salary,
        company_id=current_user.company_id
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return {
        "id": employee.id,
        "full_name": employee.full_name,
        "email": employee.email,
        "department": employee.department,
        "position": employee.position,
        "gross_salary": employee.gross_salary,
    }


@router.get("/employees")
def get_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all employees for the company."""
    employees = db.query(Employee).filter(
        Employee.company_id == current_user.company_id,
        Employee.is_active == True
    ).all()

    return [{
        "id": e.id,
        "full_name": e.full_name,
        "email": e.email,
        "department": e.department,
        "position": e.position,
        "gross_salary": e.gross_salary,
    } for e in employees]


@router.delete("/employees/{employee_id}")
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivates an employee (soft delete)."""
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == current_user.company_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.is_active = False
    db.commit()

    return {"message": f"{employee.full_name} deactivated successfully"}


# ── Payroll routes ────────────────────────────────────────────────────────────

@router.get("/payroll/{document_id}")
def process_payroll_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Takes an uploaded payroll file and calculates
    net wages for every employee automatically.
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.company_id == current_user.company_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    from services.parsers import parse_file
    parsed_data = parse_file(document.file_path, document.file_type)

    result = process_payroll(parsed_data)

    return {
        "document_id": document_id,
        "filename": document.filename,
        "payroll": result
    }


@router.get("/payslip/{employee_name}")
def download_payslip(
    employee_name: str,
    current_user: User = Depends(get_current_user)
):
    """Downloads a generated payslip PDF for an employee."""
    filename = f"payslips/{employee_name}_payslip.pdf"

    if not os.path.exists(filename):
        raise HTTPException(
            status_code=404,
            detail="Payslip not found. Run payroll processing first."
        )

    return FileResponse(
        filename,
        media_type="application/pdf",
        filename=f"{employee_name}_payslip.pdf"
    )


# ── Feedback routes ───────────────────────────────────────────────────────────

@router.post("/feedback", status_code=201)
def add_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adds a feedback comment for an employee."""
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.company_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    feedback = EmployeeFeedback(
        employee_id=data.employee_id,
        content=data.content
    )
    db.add(feedback)
    db.commit()

    return {"message": "Feedback added successfully"}


@router.post("/feedback/analyze")
def analyze_employee_feedback(
    data: FeedbackBatchAnalyze,
    current_user: User = Depends(get_current_user)
):
    """
    Sends a batch of feedback comments to Claude
    for sentiment analysis.
    """
    if not data.comments:
        raise HTTPException(status_code=400, detail="No comments provided")

    result = analyze_feedback(data.comments)
    return result


@router.get("/summary")
def get_hr_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns HR overview — headcount, payroll cost, departments."""
    employees = db.query(Employee).filter(
        Employee.company_id == current_user.company_id,
        Employee.is_active == True
    ).all()

    total_gross = sum(e.gross_salary for e in employees)

    departments = {}
    for e in employees:
        dept = e.department or "General"
        if dept not in departments:
            departments[dept] = {"headcount": 0, "total_gross": 0}
        departments[dept]["headcount"] += 1
        departments[dept]["total_gross"] += e.gross_salary

    return {
        "total_employees": len(employees),
        "total_gross_payroll": round(total_gross, 2),
        "departments": departments
    }