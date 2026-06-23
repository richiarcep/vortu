"""
Doc Prompts Admin API — gestión de prompts variantes por template.
Permite crear, editar, borrar prompts y ver estadísticas de uso.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from core.database import get_db
from core.security import get_current_user
from models.user import User

router = APIRouter(prefix="/api/admin/doc-prompts", tags=["Doc Prompts Admin"])


def _check_admin(user: User):
    # Platform-wide doc prompts: gate on superadmin only.
    # (Note: the column is `is_superadmin` — the old `is_super_admin` check was a
    # permanently-dead branch that silently collapsed the gate to any is_admin user.)
    if not getattr(user, "is_superadmin", False):
        raise HTTPException(403, "Solo administradores de plataforma")


class PromptPayload(BaseModel):
    prompt_key: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    prompt_text: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


# ───────────────────────────────────────────────
# Lista de templates con count de prompts (para tab 1)
# ───────────────────────────────────────────────
@router.get("/list-templates")
def templates_with_counts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    rows = db.execute(text(
        "SELECT t.id, t.slug, t.label, t.icon, t.color, t.module_target, "
        "t.description, "
        "(SELECT COUNT(*) FROM doc_template_prompts p WHERE p.template_id = t.id) as prompts_count, "
        "(SELECT COUNT(*) FROM doc_template_prompts p WHERE p.template_id = t.id AND p.is_active = 1) as active_count "
        "FROM doc_templates t "
        "WHERE t.is_active = 1 "
        "ORDER BY t.display_order, t.label"
    )).fetchall()

    return [{
        "id": r[0],
        "slug": r[1],
        "label": r[2],
        "icon": r[3],
        "color": r[4],
        "module_target": r[5],
        "description": r[6],
        "prompts_count": r[7],
        "active_count": r[8],
    } for r in rows]


# ───────────────────────────────────────────────
# Listar prompts por template
# ───────────────────────────────────────────────
@router.get("/by-template/{template_id}")
def list_prompts_by_template(
    template_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    rows = db.execute(text(
        "SELECT p.id, p.prompt_key, p.label, p.description, p.is_default, "
        "p.is_system, p.is_active, p.times_used, p.accuracy_score, "
        "p.corrections_avg, p.last_evaluated_at, length(p.prompt_text) as prompt_len, "
        "(SELECT COUNT(*) FROM doc_provider_prompt_assignment a "
        " WHERE a.prompt_id = p.id) as providers_count "
        "FROM doc_template_prompts p "
        "WHERE p.template_id = :tid "
        "ORDER BY p.is_default DESC, p.times_used DESC, p.id"
    ), {"tid": template_id}).fetchall()

    return [{
        "id": r[0],
        "prompt_key": r[1],
        "label": r[2],
        "description": r[3],
        "is_default": bool(r[4]),
        "is_system": bool(r[5]),
        "is_active": bool(r[6]),
        "times_used": r[7] or 0,
        "accuracy_score": r[8] or 0.0,
        "corrections_avg": r[9] or 0.0,
        "last_evaluated_at": r[10],
        "prompt_length": r[11],
        "providers_count": r[12],
    } for r in rows]


# ───────────────────────────────────────────────
# Obtener un prompt completo (con su texto)
# ───────────────────────────────────────────────
@router.get("/{prompt_id}")
def get_prompt(
    prompt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    row = db.execute(text(
        "SELECT id, template_id, prompt_key, label, description, prompt_text, "
        "is_default, is_system, is_active, times_used, accuracy_score, "
        "corrections_avg, last_evaluated_at "
        "FROM doc_template_prompts WHERE id = :pid"
    ), {"pid": prompt_id}).fetchone()
    if not row:
        raise HTTPException(404, "Prompt no encontrado")

    # Top 5 proveedores que usan este prompt
    top_providers = db.execute(text(
        "SELECT provider_name, provider_cif, accuracy_score, times_used "
        "FROM doc_provider_prompt_assignment "
        "WHERE prompt_id = :pid "
        "ORDER BY times_used DESC LIMIT 5"
    ), {"pid": prompt_id}).fetchall()

    return {
        "id": row[0],
        "template_id": row[1],
        "prompt_key": row[2],
        "label": row[3],
        "description": row[4],
        "prompt_text": row[5],
        "is_default": bool(row[6]),
        "is_system": bool(row[7]),
        "is_active": bool(row[8]),
        "times_used": row[9] or 0,
        "accuracy_score": row[10] or 0.0,
        "corrections_avg": row[11] or 0.0,
        "last_evaluated_at": row[12],
        "top_providers": [{
            "name": p[0],
            "cif": p[1],
            "accuracy": p[2] or 0.0,
            "times_used": p[3] or 0,
        } for p in top_providers],
    }


# ───────────────────────────────────────────────
# Actualizar prompt
# ───────────────────────────────────────────────
@router.put("/{prompt_id}")
def update_prompt(
    prompt_id: int,
    patch: PromptPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    data = patch.dict(exclude_unset=True)
    if not data:
        raise HTTPException(400, "Nada que actualizar")

    for bk in ("is_default", "is_active"):
        if bk in data:
            data[bk] = 1 if data[bk] else 0

    # Si se marca como default, quitar default a los demás del mismo template
    if data.get("is_default") == 1:
        tid = db.execute(text(
            "SELECT template_id FROM doc_template_prompts WHERE id=:pid"
        ), {"pid": prompt_id}).fetchone()
        if tid:
            db.execute(text(
                "UPDATE doc_template_prompts SET is_default=0 "
                "WHERE template_id=:tid AND id != :pid"
            ), {"tid": tid[0], "pid": prompt_id})

    set_clause = ", ".join([k + " = :" + k for k in data])
    data["pid"] = prompt_id
    sql = "UPDATE doc_template_prompts SET " + set_clause + ", updated_at = datetime('now') WHERE id = :pid"
    result = db.execute(text(sql), data)
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Prompt no encontrado")
    return {"updated": True, "prompt_id": prompt_id}


# ───────────────────────────────────────────────
# Crear nuevo prompt (custom, no system)
# ───────────────────────────────────────────────
class CreatePromptPayload(BaseModel):
    template_id: int
    prompt_key: str
    label: str
    description: Optional[str] = ""
    prompt_text: str
    is_default: Optional[bool] = False


@router.post("")
def create_prompt(
    payload: CreatePromptPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    try:
        result = db.execute(text(
            "INSERT INTO doc_template_prompts "
            "(template_id, prompt_key, label, description, prompt_text, "
            " is_default, is_system, is_active) "
            "VALUES (:tid, :key, :lbl, :desc, :txt, :def, 0, 1)"
        ), {
            "tid": payload.template_id,
            "key": payload.prompt_key,
            "lbl": payload.label,
            "desc": payload.description or "",
            "txt": payload.prompt_text,
            "def": 1 if payload.is_default else 0,
        })
        db.commit()
        return {"created": True, "prompt_id": result.lastrowid}
    except Exception as e:
        db.rollback()
        raise HTTPException(400, f"Error: {str(e)}")


# ───────────────────────────────────────────────
# Borrar prompt (solo si NO es del sistema)
# ───────────────────────────────────────────────
@router.delete("/{prompt_id}")
def delete_prompt(
    prompt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    row = db.execute(text(
        "SELECT is_system FROM doc_template_prompts WHERE id=:pid"
    ), {"pid": prompt_id}).fetchone()
    if not row:
        raise HTTPException(404, "Prompt no encontrado")
    if row[0]:
        raise HTTPException(400, "Los prompts del sistema no se pueden eliminar, solo desactivar")

    db.execute(text("DELETE FROM doc_template_prompts WHERE id=:pid"), {"pid": prompt_id})
    db.commit()
    return {"deleted": True}


