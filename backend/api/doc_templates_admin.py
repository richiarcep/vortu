"""
Doc Templates Admin API — editar plantillas de extracción de documentos.
Estas plantillas se usan en /api/documentos/analyze para extraer datos
estructurados de PDFs/imágenes según el tipo de documento.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

from core.database import get_db
from core.security import get_current_user
from models.user import User

router = APIRouter(prefix="/api/admin/doc-templates", tags=["Doc Templates Admin"])


def _check_admin(user: User):
    # Platform-wide extraction templates: gate on superadmin only.
    # (The old `is_super_admin` check was a dead branch — real column is `is_superadmin`.)
    if not getattr(user, "is_superadmin", False):
        raise HTTPException(403, "Solo administradores de plataforma")


# ──────────────────────────────────────────────────────────────
# MODELS Pydantic
# ──────────────────────────────────────────────────────────────
class FieldPayload(BaseModel):
    section: Optional[str] = None
    field_key: Optional[str] = None
    label: Optional[str] = None
    field_type: Optional[str] = None
    is_required: Optional[bool] = None
    is_enabled: Optional[bool] = None
    is_repeating: Optional[bool] = None
    regex_pattern: Optional[str] = None
    keywords: Optional[List[str]] = None
    position_hint: Optional[str] = None
    validator: Optional[str] = None
    fallback_strategy: Optional[str] = None
    default_value: Optional[str] = None
    ai_hint: Optional[str] = None
    example_value: Optional[str] = None
    options: Optional[List[str]] = None
    field_order: Optional[int] = None
    section_order: Optional[int] = None


class TemplatePayload(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    module_target: Optional[str] = None
    description: Optional[str] = None
    extraction_prompt: Optional[str] = None
    accounting_account_default: Optional[str] = None
    model_preferred: Optional[str] = None
    validation_rules: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
def _serialize_template(row) -> dict:
    return {
        "id": row[0],
        "slug": row[1],
        "label": row[2],
        "icon": row[3],
        "color": row[4],
        "module_target": row[5],
        "description": row[6],
        "extraction_prompt": row[7],
        "accounting_account_default": row[8],
        "model_preferred": row[9],
        "validation_rules": json.loads(row[10]) if row[10] else [],
        "is_active": bool(row[11]),
        "is_system": bool(row[12]),
        "plan_required": row[13],
        "display_order": row[14],
    }


def _serialize_field(row) -> dict:
    return {
        "id": row[0],
        "section": row[1],
        "section_order": row[2],
        "field_order": row[3],
        "field_key": row[4],
        "label": row[5],
        "field_type": row[6],
        "is_required": bool(row[7]),
        "is_enabled": bool(row[8]),
        "is_repeating": bool(row[9]),
        "regex_pattern": row[10],
        "keywords": json.loads(row[11]) if row[11] else [],
        "position_hint": row[12],
        "validator": row[13],
        "fallback_strategy": row[14],
        "default_value": row[15],
        "ai_hint": row[16],
        "example_value": row[17],
        "options": json.loads(row[18]) if row[18] else [],
    }


# ──────────────────────────────────────────────────────────────
# ENDPOINTS — TEMPLATES
# ──────────────────────────────────────────────────────────────
@router.get("")
def list_templates(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_admin(user)
    rows = db.execute(text(
        "SELECT id, slug, label, icon, color, module_target, description, "
        "extraction_prompt, accounting_account_default, model_preferred, "
        "validation_rules_json, is_active, is_system, plan_required, display_order "
        "FROM doc_templates ORDER BY display_order, label"
    )).fetchall()
    
    result = []
    for row in rows:
        t = _serialize_template(row)
        # Añadir count de campos
        count = db.execute(text(
            "SELECT COUNT(*) FROM doc_template_fields WHERE template_id=:tid"
        ), {"tid": t["id"]}).fetchone()[0]
        t["fields_count"] = count
        result.append(t)
    return result


@router.get("/{template_id}")
def get_template(template_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_admin(user)
    row = db.execute(text(
        "SELECT id, slug, label, icon, color, module_target, description, "
        "extraction_prompt, accounting_account_default, model_preferred, "
        "validation_rules_json, is_active, is_system, plan_required, display_order "
        "FROM doc_templates WHERE id=:tid"
    ), {"tid": template_id}).fetchone()
    if not row:
        raise HTTPException(404, "Template no encontrado")
    
    template = _serialize_template(row)
    
    # Cargar campos agrupados por sección
    field_rows = db.execute(text(
        "SELECT id, section, section_order, field_order, field_key, label, "
        "field_type, is_required, is_enabled, is_repeating, regex_pattern, "
        "keywords_json, position_hint, validator, fallback_strategy, "
        "default_value, ai_hint, example_value, options_json "
        "FROM doc_template_fields WHERE template_id=:tid "
        "ORDER BY section_order, field_order"
    ), {"tid": template_id}).fetchall()
    
    sections = {}
    for fr in field_rows:
        field = _serialize_field(fr)
        sect = field["section"]
        if sect not in sections:
            sections[sect] = {
                "name": sect,
                "section_order": field["section_order"],
                "fields": [],
            }
        sections[sect]["fields"].append(field)
    
    template["sections"] = sorted(sections.values(), key=lambda s: s["section_order"])
    return template


@router.put("/{template_id}")
def update_template(
    template_id: int,
    patch: TemplatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    data = patch.dict(exclude_unset=True)
    if "validation_rules" in data:
        data["validation_rules_json"] = json.dumps(data.pop("validation_rules"), ensure_ascii=False)
    if "is_active" in data:
        data["is_active"] = 1 if data["is_active"] else 0
    
    if not data:
        raise HTTPException(400, "Nada que actualizar")
    
    set_clause = ", ".join([k + " = :" + k for k in data])
    data["tid"] = template_id
    sql = "UPDATE doc_templates SET " + set_clause + ", updated_at = datetime('now') WHERE id = :tid"
    result = db.execute(text(sql), data)
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Template no encontrado")
    return {"updated": True, "template_id": template_id}


# ──────────────────────────────────────────────────────────────
# ENDPOINTS — FIELDS (CRUD individual de campos)
# ──────────────────────────────────────────────────────────────
@router.put("/{template_id}/fields/{field_id}")
def update_field(
    template_id: int,
    field_id: int,
    patch: FieldPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    data = patch.dict(exclude_unset=True)
    
    # Convertir listas a JSON
    if "keywords" in data:
        data["keywords_json"] = json.dumps(data.pop("keywords"), ensure_ascii=False)
    if "options" in data:
        data["options_json"] = json.dumps(data.pop("options"), ensure_ascii=False)
    
    # Boolean → INTEGER
    for bk in ("is_required", "is_enabled", "is_repeating"):
        if bk in data:
            data[bk] = 1 if data[bk] else 0
    
    if not data:
        raise HTTPException(400, "Nada que actualizar")
    
    set_clause = ", ".join([k + " = :" + k for k in data])
    data["fid"] = field_id
    data["tid"] = template_id
    sql = ("UPDATE doc_template_fields SET " + set_clause + 
           ", updated_at = datetime('now') WHERE id = :fid AND template_id = :tid")
    result = db.execute(text(sql), data)
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Campo no encontrado")
    return {"updated": True, "field_id": field_id}


@router.post("/{template_id}/fields")
def create_field(
    template_id: int,
    payload: FieldPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    data = payload.dict(exclude_unset=True)
    
    required_fields = ("section", "field_key", "label", "field_type")
    for rf in required_fields:
        if rf not in data:
            raise HTTPException(400, f"Falta campo obligatorio: {rf}")
    
    if "keywords" in data:
        data["keywords_json"] = json.dumps(data.pop("keywords"), ensure_ascii=False)
    if "options" in data:
        data["options_json"] = json.dumps(data.pop("options"), ensure_ascii=False)
    for bk in ("is_required", "is_enabled", "is_repeating"):
        if bk in data:
            data[bk] = 1 if data[bk] else 0
    
    # Calcular field_order si no viene
    if "field_order" not in data:
        max_order = db.execute(text(
            "SELECT COALESCE(MAX(field_order), -1) FROM doc_template_fields "
            "WHERE template_id=:tid AND section=:sec"
        ), {"tid": template_id, "sec": data["section"]}).fetchone()[0]
        data["field_order"] = max_order + 1
    
    data["template_id"] = template_id
    cols = ", ".join(data.keys())
    placeholders = ", ".join([":" + k for k in data.keys()])
    sql = f"INSERT INTO doc_template_fields ({cols}) VALUES ({placeholders})"
    try:
        result = db.execute(text(sql), data)
        db.commit()
        return {"created": True, "field_id": result.lastrowid}
    except Exception as e:
        db.rollback()
        raise HTTPException(400, f"Error: {str(e)}")


@router.delete("/{template_id}/fields/{field_id}")
def delete_field(
    template_id: int,
    field_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    result = db.execute(text(
        "DELETE FROM doc_template_fields WHERE id=:fid AND template_id=:tid"
    ), {"fid": field_id, "tid": template_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Campo no encontrado")
    return {"deleted": True}


# ──────────────────────────────────────────────────────────────
# ENDPOINT especial: reordenar campos dentro de una sección
# ──────────────────────────────────────────────────────────────
class ReorderPayload(BaseModel):
    field_ids: List[int]  # En el orden nuevo


@router.post("/{template_id}/reorder")
def reorder_fields(
    template_id: int,
    payload: ReorderPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_admin(user)
    for new_order, fid in enumerate(payload.field_ids):
        db.execute(text(
            "UPDATE doc_template_fields SET field_order=:o "
            "WHERE id=:fid AND template_id=:tid"
        ), {"o": new_order, "fid": fid, "tid": template_id})
    db.commit()
    return {"reordered": len(payload.field_ids)}
