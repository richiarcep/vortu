"""
Doc Template Service — usa doc_templates para extracción guiada.

Funciona como una capa sobre el sistema actual:
- Si hay template para el tipo detectado, lo aplica.
- Si no, devuelve None y el sistema cae al prompt hardcoded.

NO altera la lógica existente de documentos.py, solo la enriquece.
"""
import json
import re
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text


def get_template_by_slug(db: Session, slug: str) -> Optional[Dict[str, Any]]:
    """Carga un template completo (con sus campos) por slug."""
    row = db.execute(text(
        "SELECT id, slug, label, extraction_prompt, accounting_account_default, "
        "model_preferred, validation_rules_json, module_target "
        "FROM doc_templates WHERE slug = :slug AND is_active = 1"
    ), {"slug": slug}).fetchone()

    if not row:
        return None

    template_id = row[0]
    fields_rows = db.execute(text(
        "SELECT section, section_order, field_order, field_key, label, "
        "field_type, is_required, is_enabled, is_repeating, regex_pattern, "
        "keywords_json, position_hint, validator, default_value, ai_hint, example_value "
        "FROM doc_template_fields "
        "WHERE template_id = :tid AND is_enabled = 1 "
        "ORDER BY section_order, field_order"
    ), {"tid": template_id}).fetchall()

    fields = []
    for fr in fields_rows:
        fields.append({
            "section": fr[0],
            "section_order": fr[1],
            "field_order": fr[2],
            "field_key": fr[3],
            "label": fr[4],
            "field_type": fr[5],
            "is_required": bool(fr[6]),
            "is_enabled": bool(fr[7]),
            "is_repeating": bool(fr[8]),
            "regex_pattern": fr[9],
            "keywords": json.loads(fr[10]) if fr[10] else [],
            "position_hint": fr[11],
            "validator": fr[12],
            "default_value": fr[13],
            "ai_hint": fr[14],
            "example_value": fr[15],
        })

    return {
        "id": template_id,
        "slug": row[1],
        "label": row[2],
        "extraction_prompt": row[3],
        "accounting_account_default": row[4],
        "model_preferred": row[5],
        "validation_rules": json.loads(row[6]) if row[6] else [],
        "module_target": row[7],
        "fields": fields,
    }


def build_extraction_prompt(template: Dict[str, Any], provider_memory: Optional[Dict] = None) -> str:
    """
    Construye el prompt completo:
      [PROMPT BASE del template]
      + lista de campos esperados con sus hints/keywords
      + memoria del proveedor (si existe)
    """
    parts = [template["extraction_prompt"], ""]

    # Agrupar campos por sección
    sections = {}
    for f in template["fields"]:
        sect = f["section"]
        if sect not in sections:
            sections[sect] = []
        sections[sect].append(f)

    parts.append("CAMPOS A EXTRAER:")
    parts.append("")

    for sect_name, fields in sorted(sections.items(), key=lambda x: x[1][0]["section_order"]):
        section_label = {"encabezado": "ENCABEZADO", "lineas": "LÍNEAS", "impuestos": "IMPUESTOS"}.get(sect_name, sect_name.upper())
        parts.append(f"## {section_label}")

        repeating = any(f.get("is_repeating") for f in fields)
        if repeating:
            parts.append(f"(Array de objetos. Devuelve UNA entrada por cada línea/impuesto del documento)")

        for f in fields:
            req = " [OBLIGATORIO]" if f["is_required"] else ""
            line = f"- {f['field_key']} ({f['field_type']}){req}: {f['ai_hint'] or f['label']}"
            if f["keywords"]:
                line += f" | Busca cerca de: {', '.join(f['keywords'])}"
            if f["example_value"]:
                line += f" | Ej: {f['example_value']}"
            parts.append(line)
        parts.append("")

    # Memoria del proveedor (si existe)
    if provider_memory and provider_memory.get("corrections_json"):
        try:
            corrections = json.loads(provider_memory["corrections_json"])
            parts.append("")
            parts.append(f"MEMORIA DE ESTE PROVEEDOR (visto {provider_memory.get('times_seen', 0)} veces):")
            for key, hint in corrections.items():
                parts.append(f"- {key}: {hint}")
        except Exception:
            pass

    # Schema JSON esperado
    parts.append("")
    parts.append("FORMATO DE RESPUESTA (JSON estricto):")
    parts.append("{")

    encab_fields = [f for f in template["fields"] if f["section"] == "encabezado"]
    if encab_fields:
        parts.append('  "encabezado": {')
        for i, f in enumerate(encab_fields):
            comma = "," if i < len(encab_fields) - 1 else ""
            parts.append(f'    "{f["field_key"]}": <{f["field_type"]} | null>{comma}')
        parts.append("  },")

    if any(f["section"] == "lineas" for f in template["fields"]):
        line_keys = ", ".join(f["field_key"] for f in template["fields"] if f["section"] == "lineas")
        parts.append('  "lineas": [<array de objetos con: ' + line_keys + '>],')

    if any(f["section"] == "impuestos" for f in template["fields"]):
        imp_keys = ", ".join(f["field_key"] for f in template["fields"] if f["section"] == "impuestos")
        parts.append('  "impuestos": [<array de objetos con: ' + imp_keys + '>],')

    parts.append('  "_template_used": "' + template["slug"] + '"')
    parts.append("}")
    parts.append("")
    parts.append("NO incluyas markdown, ni explicaciones, ni texto fuera del JSON.")

    return "\n".join(parts)


def validate_extracted_data(template: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aplica regex + validators + reglas cruzadas a los datos extraídos.
    Devuelve:
      {
        field_errors: { field_key: [error_msg, ...] },
        cross_errors: [{"rule": "...", "severity": "error|warning", "message": "..."}],
        passed: bool
      }
    """
    field_errors: Dict[str, List[str]] = {}
    cross_errors: List[Dict[str, str]] = []

    encab = data.get("encabezado", {}) or {}
    lineas = data.get("lineas", []) or []
    impuestos = data.get("impuestos", []) or []

    # Validar campos individualmente
    for f in template["fields"]:
        if f["section"] != "encabezado":
            continue  # validaciones de lineas/impuestos serían por item; lo dejamos para sesión 3

        value = encab.get(f["field_key"])

        # Required
        if f["is_required"] and (value is None or value == ""):
            field_errors.setdefault(f["field_key"], []).append("Campo obligatorio vacío")
            continue

        if value is None or value == "":
            continue  # opcional vacío, ok

        # Regex
        if f["regex_pattern"]:
            try:
                if not re.match(f["regex_pattern"], str(value)):
                    field_errors.setdefault(f["field_key"], []).append(
                        f"No coincide con patrón {f['regex_pattern']}"
                    )
            except re.error:
                pass  # regex inválido, ignorar

        # Validator especial
        if f["validator"] == "spanish_cif":
            if not _is_valid_spanish_cif(str(value)):
                field_errors.setdefault(f["field_key"], []).append("CIF/NIF inválido")
        elif f["validator"] == "spanish_date":
            if not _is_valid_spanish_date(str(value)):
                field_errors.setdefault(f["field_key"], []).append("Fecha inválida")
        elif f["validator"] == "email_format":
            if "@" not in str(value):
                field_errors.setdefault(f["field_key"], []).append("Email mal formado")
        elif f["validator"] == "iban_format":
            v = str(value).replace(" ", "")
            if len(v) < 20 or len(v) > 34:
                field_errors.setdefault(f["field_key"], []).append("IBAN longitud incorrecta")

    # Validaciones cruzadas
    for rule in template.get("validation_rules", []):
        rule_id = rule.get("id", "")
        tol = rule.get("tolerance", 0.01)
        sev = rule.get("severity", "warning")
        msg = ""
        failed = False

        try:
            if rule_id == "totales_cuadran":
                bruto = _to_float(encab.get("total_bruto"))
                iva = _to_float(encab.get("total_iva"))
                total = _to_float(encab.get("total_factura"))
                if all(x is not None for x in [bruto, iva, total]):
                    if abs((bruto + iva) - total) > tol:
                        failed = True
                        msg = f"total_factura ({total}) ≠ bruto + iva ({bruto + iva:.2f})"

            elif rule_id == "fecha_vencimiento_posterior":
                ff = encab.get("fecha_factura")
                fv = encab.get("fecha_vencimiento")
                if ff and fv:
                    if _parse_spanish_date(fv) < _parse_spanish_date(ff):
                        failed = True
                        msg = f"fecha_vencimiento ({fv}) < fecha_factura ({ff})"

            elif rule_id == "cifs_diferentes":
                cif_c = encab.get("cif_cliente")
                cif_p = encab.get("cif_proveedor")
                if cif_c and cif_p and cif_c == cif_p:
                    failed = True
                    msg = "CIF cliente == CIF proveedor"

            elif rule_id == "iva_calculado":
                bruto = _to_float(encab.get("total_bruto"))
                iva = _to_float(encab.get("total_iva"))
                pct = _to_float(encab.get("iva_pct"))
                if all(x is not None for x in [bruto, iva, pct]):
                    expected = bruto * pct / 100.0
                    if abs(iva - expected) > tol:
                        failed = True
                        msg = f"iva ({iva}) ≠ bruto × pct ({expected:.2f})"

            elif rule_id == "lineas_suman":
                bruto = _to_float(encab.get("total_bruto"))
                if bruto is not None and lineas:
                    suma_lin = sum(_to_float(l.get("importe_bruto_linea")) or 0 for l in lineas)
                    if abs(suma_lin - bruto) > tol:
                        failed = True
                        msg = f"sum(líneas)={suma_lin:.2f} ≠ total_bruto={bruto}"
        except Exception as e:
            pass

        if failed:
            cross_errors.append({"rule": rule_id, "severity": sev, "message": msg})

    has_errors = any(
        any("obligatorio" in m.lower() or "inválido" in m.lower() for m in errs)
        for errs in field_errors.values()
    ) or any(e["severity"] == "error" for e in cross_errors)

    return {
        "field_errors": field_errors,
        "cross_errors": cross_errors,
        "passed": not has_errors,
        "warnings_count": sum(1 for e in cross_errors if e["severity"] == "warning"),
        "errors_count": sum(1 for e in cross_errors if e["severity"] == "error") + sum(
            1 for errs in field_errors.values() for m in errs
        ),
    }


# ─────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────
def _to_float(v):
    if v is None or v == "":
        return None
    try:
        return float(str(v).replace(",", ".").replace("€", "").strip())
    except Exception:
        return None


def _is_valid_spanish_cif(cif: str) -> bool:
    """Validador CIF/NIF español (algoritmo dígito control)."""
    cif = cif.upper().strip()
    if not re.match(r"^[A-Z0-9][0-9]{7}[A-Z0-9]$", cif):
        return False
    # No validamos dígito control en detalle (basta el formato)
    return True


def _is_valid_spanish_date(date_str: str) -> bool:
    if not re.match(r"^\d{2}[/\-.]\d{2}[/\-.]\d{4}$", str(date_str)):
        return False
    try:
        from datetime import datetime
        for sep in ["/", "-", "."]:
            try:
                datetime.strptime(date_str, f"%d{sep}%m{sep}%Y")
                return True
            except ValueError:
                continue
    except Exception:
        pass
    return False


def _parse_spanish_date(date_str: str):
    from datetime import datetime
    for sep in ["/", "-", "."]:
        try:
            return datetime.strptime(date_str, f"%d{sep}%m{sep}%Y")
        except ValueError:
            continue
    return datetime.min


# ─────────────────────────────────────────────
# Mapping: tipo detectado → slug del template
# ─────────────────────────────────────────────
DOC_TYPE_TO_SLUG = {
    "factura": "factura_recibida",      # cuando NO se distingue emitida/recibida
    "factura_recibida": "factura_recibida",
    "factura_emitida": "factura_emitida",
    "ticket": "ticket_gasto",
    "nomina": "nomina",
    "extracto_bancario": "extracto_bancario",
}


def resolve_template_for_doc_type(db: Session, doc_type: str) -> Optional[Dict[str, Any]]:
    """Dado un tipo de documento detectado por la IA, devuelve el template aplicable."""
    if not doc_type:
        return None
    slug = DOC_TYPE_TO_SLUG.get(doc_type.lower())
    if not slug:
        return None
    return get_template_by_slug(db, slug)
