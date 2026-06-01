import os
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from core.config import get_settings
from core.security import get_current_user
from models.user import User
from models.document import Document
from services.parsers import parse_file
from services.ai_service import analyze_document

settings = get_settings()

router = APIRouter(prefix="/api/upload", tags=["Upload"])

UPLOAD_DIR = "uploads"
ALLOWED_TYPES = {
    "text/csv": "csv",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
}
ALLOWED_MODULES = ["finance", "hr", "marketing"]


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    status: str
    module: str
    ai_result: str | None

    class Config:
        from_attributes = True


@router.post("/", response_model=DocumentResponse, status_code=201)
def upload_file(
    file: UploadFile = File(...),
    module: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file and instantly process it with AI.
    Module must be: finance, hr, or marketing.
    """

    # Validate module
    if module not in ALLOWED_MODULES:
        raise HTTPException(
            status_code=400,
            detail=f"Module must be one of: {', '.join(ALLOWED_MODULES)}"
        )

    # Validate file type
    file_type = ALLOWED_TYPES.get(file.content_type)
    if not file_type:
        raise HTTPException(
            status_code=400,
            detail="File type not supported. Upload a CSV, PDF, or Excel file."
        )

    # Create uploads directory if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Save file to disk
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    # Create document record in database
    document = Document(
        filename=file.filename,
        file_type=file_type,
        file_path=file_path,
        status="processing",
        module=module,
        company_id=current_user.company_id,
        uploaded_by=current_user.id
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Parse the file
    try:
        parsed_data = parse_file(file_path, file_type)
    except Exception as e:
        document.status = "failed"
        document.error_message = f"Parse error: {str(e)}"
        db.commit()
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    # Send to Claude for analysis
    try:
        if settings.ANTHROPIC_API_KEY:
            ai_result = analyze_document(parsed_data, module)
        else:
            ai_result = {"message": "No API key set — add ANTHROPIC_API_KEY to .env"}

        document.ai_result = json.dumps(ai_result)
        document.status = "complete"

    except Exception as e:
        document.status = "failed"
        document.error_message = f"AI error: {str(e)}"
        document.ai_result = json.dumps({"error": str(e)})

    db.commit()
    db.refresh(document)

    return document


@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all documents uploaded by the current user's company."""
    documents = db.query(Document).filter(
        Document.company_id == current_user.company_id
    ).all()
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns a single document by ID."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.company_id == current_user.company_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document