"""
Backoffice — gestión de prompts de Vera.
Solo accesible para admins (is_admin=True).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user, _is_platform_admin
from models.user import User
from datetime import datetime

router = APIRouter(prefix="/api/backoffice/prompts", tags=["Backoffice"])


def require_admin(current_user: User = Depends(get_current_user)):
    # Global Vera prompts are platform-wide: gate on superadmin, not company admin.
    if not _is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo administradores de plataforma")
    return current_user


class PromptUpdate(BaseModel):
    content: str
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("/")
def list_prompts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    rows = db.execute(text(
        "SELECT id, key, name, module, description, content, is_active, updated_at, updated_by "
        "FROM system_prompts ORDER BY module, key"
    )).fetchall()
    return [
        {
            "id": r[0], "key": r[1], "name": r[2], "module": r[3],
            "description": r[4], "content": r[5], "is_active": r[6],
            "updated_at": str(r[7]), "updated_by": r[8],
        }
        for r in rows
    ]


@router.get("/{key}")
def get_prompt(
    key: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    row = db.execute(text(
        "SELECT id, key, name, module, description, content, is_active, updated_at, updated_by "
        "FROM system_prompts WHERE key=:key LIMIT 1"
    ), {"key": key}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")
    return {
        "id": row[0], "key": row[1], "name": row[2], "module": row[3],
        "description": row[4], "content": row[5], "is_active": row[6],
        "updated_at": str(row[7]), "updated_by": row[8],
    }


@router.put("/{key}")
def update_prompt(
    key: str,
    data: PromptUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = db.execute(text(
        "SELECT id FROM system_prompts WHERE key=:key"
    ), {"key": key}).fetchone()

    now = datetime.utcnow()

    if existing:
        db.execute(text("""
            UPDATE system_prompts
            SET content=:content,
                name=COALESCE(:name, name),
                description=COALESCE(:desc, description),
                updated_at=:now,
                updated_by=:by
            WHERE key=:key
        """), {
            "content": data.content,
            "name": data.name,
            "desc": data.description,
            "now": now,
            "by": admin.email,
            "key": key,
        })
    else:
        module = key.split("_")[2] if key.startswith("vera_insight_") else "general"
        db.execute(text("""
            INSERT INTO system_prompts (key, name, module, description, content, is_active, created_at, updated_at, updated_by)
            VALUES (:key, :name, :module, :desc, :content, 1, :now, :now, :by)
        """), {
            "key": key,
            "name": data.name or key,
            "module": module,
            "desc": data.description or "",
            "content": data.content,
            "now": now,
            "by": admin.email,
        })
    db.commit()
    return {"ok": True, "key": key, "updated_by": admin.email}


@router.delete("/{key}")
def deactivate_prompt(
    key: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    db.execute(text(
        "UPDATE system_prompts SET is_active=0 WHERE key=:key"
    ), {"key": key})
    db.commit()
    return {"ok": True, "key": key, "status": "deactivated"}
