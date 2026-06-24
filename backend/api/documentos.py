"""
Backend Documentos v2 con doble guardado:
1. Memoria semántica (Chroma + Neo4j) — siempre que se apruebe
2. SQL estructurado — Vera decide qué tablas alimentar:
   - factura recibida → tabla expenses (contabilidad)
   - nómina → tabla payslips (HR)
   - contrato empleado → tabla contracts (HR)
   - presupuesto/quote → registro simple

Aplica al backend existente reemplazando api/documentos.py
"""
import os
import json
import uuid
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.document import Document
from services.parsers import parse_file

logger = logging.getLogger("vera.documentos")

# Flag-gated: use the evidence-extraction pipeline (vera/extraction) with legacy fallback.
USE_EVIDENCE_PIPELINE = os.getenv("USE_EVIDENCE_PIPELINE", "1") not in ("0", "false", "False")

router = APIRouter(prefix="/api/documentos", tags=["Documentos"])

UPLOAD_DIR = Path("uploads")
TEMP_DIR = Path("uploads/_temp")
UPLOAD_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True, parents=True)

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".xlsx", ".xls", ".docx", ".txt", ".jpg", ".jpeg", ".png"}


# Pending analyze→confirm state, persisted in the DB (was a process-global dict,
# which broke under multiple workers). Uses a short-lived engine transaction so
# it's independent of the request session and visible to any worker.
def _pending_put(temp_id: str, payload: dict):
    from core.database import engine
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM pending_documents WHERE temp_id=:t"), {"t": temp_id})
        conn.execute(text(
            "INSERT INTO pending_documents (temp_id, user_id, company_id, payload, expires_at) "
            "VALUES (:t, :u, :c, :p, :e)"
        ), {"t": temp_id, "u": payload.get("user_id"), "c": payload.get("company_id"),
            "p": json.dumps(payload), "e": payload.get("expires_at")})


def _pending_get(temp_id: str):
    from core.database import engine
    from sqlalchemy import text
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT payload, expires_at FROM pending_documents WHERE temp_id=:t"),
            {"t": temp_id},
        ).fetchone()
        if not row:
            return None
        payload, expires_at = row[0], row[1]
        if expires_at and expires_at < datetime.now().timestamp():
            conn.execute(text("DELETE FROM pending_documents WHERE temp_id=:t"), {"t": temp_id})
            return None
        return json.loads(payload)


def _pending_delete(temp_id: str):
    from core.database import engine
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM pending_documents WHERE temp_id=:t"), {"t": temp_id})


# ─────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────
class ConfirmRequest(BaseModel):
    temp_id: str
    approved: bool
    user_notes: Optional[str] = ""
    override_type: Optional[str] = None
    save_to_sql: bool = True  # si false solo memoria semántica


# ─────────────────────────────────────────────
# HELPER: clasificación + extracción SQL
# ─────────────────────────────────────────────
def analyze_with_vera(text_content: str, filename: str, db: Session) -> dict:
    sample = text_content[:6000] if text_content else ""

    try:
        from vera.llm_router import VeraRouter
        from models.prompt import SystemPrompt
        router_v = VeraRouter(db)

        # Leer prompt desde BD (editable en backoffice)
        prompt_record = db.query(SystemPrompt).filter(SystemPrompt.key == 'documentos_analyzer').first()
        if prompt_record and prompt_record.content:
            system_prompt = prompt_record.content
            logger.info(f"[Vera doc] prompt cargado desde BD ({len(system_prompt)} chars)")
        else:
            logger.info(f"[Vera doc] PROMPT BD NO ENCONTRADO. Usando fallback hardcoded.")
            # Fallback si no existe en BD
            system_prompt = """Eres Vera, asistente de gestión empresarial.

Analizas documentos en 2 niveles:
1. CLASIFICACIÓN: tipo de documento + resumen + datos extraídos
2. ACCIÓN SQL: si este documento debe crear automáticamente un registro en BD estructurada

Tablas disponibles para SQL:
- expenses (gastos): facturas recibidas de proveedores
- payslips (nóminas): documentos salariales de empleados
- contracts (contratos): contratos laborales nuevos o renovaciones
- (otros documentos: solo memoria semántica)

Responde SIEMPRE en JSON exacto:
{
  "document_type": "factura|contrato|nomina|legal|reporte|presupuesto|recibo|certificado|otro",
  "confidence": 0.95,
  "summary": "Resumen 1-2 frases",
  "extracted_data": {
    "importe": 299.00,
    "fecha": "2026-05-24",
    "vencimiento": null,
    "emisor": "Mailchimp Inc",
    "receptor": "Mi Empresa",
    "numero_documento": "INV-2026-001",
    "concepto": "Suscripción mensual",
    "iban": null,
    "nif_emisor": null
  },
  "warnings": ["alertas"],
  "suggested_module": "finance|hr|marketing|legal|general",
  "semantic_tags": ["tags"],
  "sql_action": {
    "should_create": true,
    "table": "expenses|payslips|contracts|null",
    "reason": "Esta es una factura de proveedor que debe registrarse como gasto",
    "preview_record": {
      "concept": "Suscripción Mailchimp",
      "amount": 299.00,
      "date": "2026-05-24",
      "supplier": "Mailchimp Inc",
      "category": "marketing_tools",
      "vat": 21.00
    },
    "confidence": 0.9
  }
}

REGLAS sql_action.should_create:
- factura recibida con importe claro → should_create: true, table: "expenses"
- nómina de empleado → should_create: true, table: "payslips"
- contrato laboral → should_create: true, table: "contracts"
- CV, certificado, presupuesto, legal, reporte → should_create: false (solo memoria semántica)
- duplicado detectado → should_create: false con warning
- si confidence < 0.7 → should_create: false (no crear sin estar seguro)

NO inventes datos. Si no hay importe claro, no propongas crear gasto."""

        question = f"""Analiza este documento:

NOMBRE: {filename}

CONTENIDO:
{sample}

Devuelve SOLO JSON, sin markdown."""

        # Llamada directa al cliente LLM con max_tokens=4000
        # (router no acepta max_tokens, por defecto LLM corta a ~1500 tokens)
        from vera.llm_router import LLMFactory
        from vera.llm_base import LLMRequest

        factory = LLMFactory(db)
        client = (factory.get('claude') or factory.get('openai')
                  or factory.get('gemini') or factory.get('claude_sonnet'))

        if client:
            try:
                req = LLMRequest(
                    user_message=question,
                    system_prompt=system_prompt,
                    max_tokens=4000,
                    temperature=0.3,
                )
                resp = client.generate(req)
                result = {'text': resp.text if hasattr(resp, 'text') else str(resp)}
            except Exception as ce:
                logger.info(f"[Vera doc] direct client failed: {ce}")
                result = router_v.route(question=question, system_prompt=system_prompt, module="documentos")
        else:
            logger.info("[Vera doc] no direct client, using router")
            result = router_v.route(question=question, system_prompt=system_prompt, module="documentos")

        text = (result.get('text') or result.get('error') or '').strip()

        # Limpiar markdown code fences
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text
            if text.endswith('```'):
                text = text.rsplit('```', 1)[0]
            text = text.strip()
            if text.startswith('json'):
                text = text[4:].strip()

        # Reparar JSON potencialmente cortado por max_tokens
        if '{' in text:
            first_brace = text.find('{')
            text = text[first_brace:]

            # Contar comillas para detectar string sin cerrar
            # Si hay número impar de comillas no escapadas, falta cerrar string
            unescaped_quotes = 0
            i = 0
            while i < len(text):
                if text[i] == '"' and (i == 0 or text[i-1] != '\\'):
                    unescaped_quotes += 1
                i += 1

            if unescaped_quotes % 2 != 0:
                # Hay string abierto sin cerrar
                # Cortar hasta la última coma o llave antes del corte
                last_complete = max(text.rfind(','), text.rfind('{'), text.rfind('['))
                if last_complete > 0:
                    text = text[:last_complete]

            # Cerrar arrays y objetos abiertos
            open_braces = text.count('{') - text.count('}')
            open_brackets = text.count('[') - text.count(']')
            text = text + (']' * open_brackets) + ('}' * open_braces)

        # Log para debug
        logger.info(f"[Vera doc analysis] text length: {len(text)}")
        logger.info(f"[Vera doc] LAST 500 chars: {text[-500:]}")

        try:
            analysis = json.loads(text)
        except json.JSONDecodeError as je:
            logger.info(f"[Vera doc analysis] JSON decode failed at char {je.pos}, full text: {text}")
            raise

        # Asegurar sql_action existe
        if 'sql_action' not in analysis:
            analysis['sql_action'] = {'should_create': False, 'table': None}

        # NUEVO: aplicar template si existe (SESIÓN 2)
        try:
            from vera.doc_template_service import resolve_template_for_doc_type, validate_extracted_data
            template = resolve_template_for_doc_type(db, analysis.get("document_type"))
            if template:
                validation = validate_extracted_data(template, {
                    "encabezado": analysis.get("extracted_data") or {},
                })
                analysis["template_used"] = template["slug"]
                analysis["template_label"] = template["label"]
                analysis["template_validation"] = validation
                # Añadir warnings de validación
                existing_warnings = list(analysis.get("warnings") or [])
                for ce in validation.get("cross_errors", []):
                    existing_warnings.append(f"[{ce['severity']}] {ce['message']}")
                for fkey, errs in validation.get("field_errors", {}).items():
                    for err in errs:
                        existing_warnings.append(f"[campo {fkey}] {err}")
                analysis["warnings"] = existing_warnings
                logger.info(f"[Vera doc] Template '{template['slug']}' aplicado. "
                      f"Errores: {validation['errors_count']}, "
                      f"Warnings: {validation['warnings_count']}")
            else:
                logger.info(f"[Vera doc] No hay template para tipo '{analysis.get('document_type')}'")
        except Exception as e:
            logger.info(f"[Vera doc] Template validation falló: {e}")

        return analysis

    except (json.JSONDecodeError, Exception) as e:
        return _heuristic_analysis(filename, sample, str(e))


def _heuristic_analysis(filename: str, content: str, error: str = "") -> dict:
    name = filename.lower()
    if "factura" in name or "invoice" in name:
        doc_type, module = "factura", "finance"
    elif "nomina" in name or "payslip" in name:
        doc_type, module = "nomina", "hr"
    elif "contrato" in name:
        doc_type, module = "contrato", "legal"
    elif "cv" in name or "curriculum" in name:
        doc_type, module = "otro", "hr"
    else:
        doc_type, module = "otro", "general"

    return {
        "document_type": doc_type,
        "confidence": 0.5,
        "summary": f"Análisis heurístico de {filename}",
        "extracted_data": {},
        "warnings": [f"Vera no pudo analizar: {error[:120]}" if error else "Análisis básico"],
        "suggested_module": module,
        "semantic_tags": [doc_type, module],
        "sql_action": {
            "should_create": False,
            "table": None,
            "reason": "Análisis heurístico, no crea registros SQL",
            "preview_record": {},
            "confidence": 0.3,
        }
    }


def check_duplicate(db: Session, company_id: int, filename: str, extracted_data: dict) -> Optional[str]:
    exact = db.query(Document).filter(
        Document.company_id == company_id,
        Document.filename == filename,
    ).first()
    if exact:
        return f"Ya existe un archivo con el mismo nombre (ID {exact.id})"
    numero = extracted_data.get('numero_documento')
    if numero:
        existing = db.query(Document).filter(
            Document.company_id == company_id,
            Document.ai_result.like(f'%"{numero}"%'),
        ).first()
        if existing:
            return f"Documento con número {numero} ya existe (ID {existing.id})"
    return None


def _account_names(db, company_id: int, codes: list) -> dict:
    """code -> name for the company's accounts (for asiento preview)."""
    from sqlalchemy import text as sql_text
    codes = [c for c in codes if c]
    if not codes:
        return {}
    params = {f"c{i}": c for i, c in enumerate(codes)}
    ph = ",".join(f":{k}" for k in params)
    rows = db.execute(sql_text(
        f"SELECT code, name FROM accounts WHERE company_id = :cid AND code IN ({ph})"
    ), {"cid": company_id, **params}).fetchall()
    return {r[0]: r[1] for r in rows}


def _find_vat_account(db, company_id: int, direction: str):
    """Locate the company's VAT account by name. direction='input' (soportado/
    acreditable/crédito fiscal/descontable, asset) or 'output' (repercutido/
    trasladado/débito fiscal, liability). Country-agnostic name heuristic."""
    from sqlalchemy import text as sql_text
    if direction == "input":
        acct_type, kws = "asset", ("soport", "acredit", "crédito fiscal", "credito fiscal", "descontable")
    else:
        acct_type, kws = "liability", ("repercut", "traslad", "débito fiscal", "debito fiscal", "por pagar")
    like = " OR ".join("lower(name) LIKE :k%d" % i for i in range(len(kws)))
    params = {"cid": company_id, "t": acct_type}
    params.update({f"k{i}": f"%{kw}%" for i, kw in enumerate(kws)})
    row = db.execute(sql_text(
        f"SELECT code FROM accounts WHERE company_id = :cid AND account_type = :t "
        f"AND (lower(name) LIKE '%iva%' OR lower(name) LIKE '%igv%') AND ({like}) LIMIT 1"
    ), params).first()
    return row[0] if row else None


def build_asiento_proposal(db, company_id: int, country: str, analysis: dict) -> dict:
    """Build the proposed asiento contable (double-entry lines with the company's
    own country accounts) from the extracted data, so the user can preview WHERE
    the document posts and approve before it's recorded. Returns a journal_entry
    dict consumable by post_asiento()."""
    from country.registry import get_entry_accounts, get_country_info

    ed = analysis.get("extracted_data", {}) or {}
    sql_action = analysis.get("sql_action", {}) or {}
    doc_type = (analysis.get("document_type") or "").lower()
    table = sql_action.get("table")
    country = (country or "es").lower()

    total = ed.get("importe") or ed.get("total") or (sql_action.get("preview_record") or {}).get("amount") or 0
    try:
        total = float(total)
    except (TypeError, ValueError):
        total = 0
    if total <= 0:
        return {"should_create": False, "reason": "Sin importe para generar asiento"}

    # Document type → semantic entry category
    if doc_type in ("nomina", "nómina") or table == "payslips":
        tipo, categoria = "gasto", "Personal"
    elif doc_type in ("factura_emitida", "venta", "ingreso") or table == "income":
        tipo, categoria = "ingreso", "Ventas"
    elif table == "expenses" or doc_type in ("factura", "recibo", "gasto", "ticket"):
        tipo, categoria = "gasto", "Compras"
    else:
        return {"should_create": False, "reason": "Tipo de documento sin asiento automático"}

    # Base + IVA: use extracted values, else split using the country's VAT rate
    base = ed.get("base_imponible") or ed.get("base")
    iva = ed.get("iva") or ed.get("iva_amount") or ed.get("cuota_iva")
    try:
        base = float(base) if base not in (None, "") else None
        iva = float(iva) if iva not in (None, "") else None
    except (TypeError, ValueError):
        base, iva = None, None
    if base is None or iva is None:
        rate = (get_country_info(country) or {}).get("vat_general", 0) or 0
        base = round(total / (1 + rate / 100), 2) if rate else total
        iva = round(total - base, 2)

    try:
        debe_code, haber_code = get_entry_accounts(country, tipo, categoria)
    except Exception:
        return {"should_create": False, "reason": f"País '{country}' sin cuentas configuradas"}

    iva_code = _find_vat_account(db, company_id, "input" if tipo == "gasto" else "output") if iva and iva > 0 else None
    names = _account_names(db, company_id, [debe_code, haber_code, iva_code])

    def line(code, debit, credit):
        return {"account_code": code, "account_name": names.get(code, code),
                "debit": round(debit, 2), "credit": round(credit, 2)}

    lines = []
    if tipo == "gasto":
        lines.append(line(debe_code, base, 0))               # DEBE gasto (base)
        if iva_code and iva > 0:
            lines.append(line(iva_code, iva, 0))             # DEBE IVA soportado
        lines.append(line(haber_code, 0, total))             # HABER proveedor (total)
    else:
        lines.append(line(debe_code, total, 0))              # DEBE cliente/total
        lines.append(line(haber_code, 0, base))              # HABER ventas (base)
        if iva_code and iva > 0:
            lines.append(line(iva_code, 0, iva))             # HABER IVA repercutido

    return {
        "should_create": True,
        "tipo": tipo,
        "categoria": categoria,
        "lines": lines,
        "base": round(base, 2),
        "iva": round(iva, 2),
        "total": round(total, 2),
        "date": ed.get("fecha") or ed.get("date"),
        "description": analysis.get("summary") or f"{categoria} - documento",
        "transaction_id_prefix": "DOC",
        "reference": ed.get("numero_documento") or ed.get("numero_factura"),
    }


def post_asiento(journal_entry: dict, db: Session, current_user: User, doc_id: int) -> dict:
    """Post an approved asiento (double entry) to journal_entries. Independent of
    sql_action so income docs (no domain row) still post their asiento."""
    from sqlalchemy import text as sql_text
    if not (journal_entry and journal_entry.get("should_create") and journal_entry.get("lines")):
        return {"journal_created": False, "reason": "sin asiento"}

    lines = journal_entry["lines"]
    codes = [l["account_code"] for l in lines if l.get("account_code")]
    code_params = {f"code_{i}": c for i, c in enumerate(codes)}
    ph = ",".join(f":{k}" for k in code_params)
    rows = db.execute(sql_text(
        f"SELECT id, code FROM accounts WHERE company_id = :cid AND code IN ({ph})"
    ), {"cid": current_user.company_id, **code_params}).fetchall()
    code_to_id = {r[1]: r[0] for r in rows}

    missing = [c for c in codes if c not in code_to_id]
    if missing:
        return {"journal_created": False, "journal_error": f"Cuentas no encontradas: {missing}"}

    total_debit = sum(float(l.get("debit", 0) or 0) for l in lines)
    total_credit = sum(float(l.get("credit", 0) or 0) for l in lines)
    if abs(total_debit - total_credit) > 0.01:
        return {"journal_created": False,
                "journal_error": f"Asiento no cuadra: debe={total_debit}, haber={total_credit}"}

    tx_id = f"{journal_entry.get('transaction_id_prefix', 'DOC')}{doc_id:06d}"
    fecha = journal_entry.get("date") or datetime.now().date().isoformat()
    desc_main = journal_entry.get("description", "Documento procesado")
    ref = journal_entry.get("reference") or f"DOC-{doc_id}"
    try:
        for l in lines:
            db.execute(sql_text("""
                INSERT INTO journal_entries
                (transaction_id, account_id, date, description, debit, credit, reference, module_source, company_id, created_at)
                VALUES (:tx, :acc, :date, :desc, :debit, :credit, :ref, 'documentos', :cid, :now)
            """), {
                "tx": tx_id, "acc": code_to_id[l["account_code"]], "date": fecha,
                "desc": l.get("description", desc_main),
                "debit": float(l.get("debit", 0) or 0), "credit": float(l.get("credit", 0) or 0),
                "ref": ref, "cid": current_user.company_id, "now": datetime.now(),
            })
        db.commit()
        return {"journal_created": True, "transaction_id": tx_id,
                "journal_lines": len(lines), "journal_total": round(total_debit, 2)}
    except Exception as e:
        db.rollback()
        return {"journal_created": False, "journal_error": str(e)[:200]}


def execute_sql_action(action: dict, db: Session, current_user: User, doc_id: int,
                       extracted_data: dict = None) -> dict:
    """Crea el registro SQL estructurado (gasto/nómina/contrato). El asiento contable
    se postea por separado vía post_asiento().

    Usa los datos VALIDADOS de `extracted_data` (que el pipeline de evidencia
    corrige/repara) con preferencia sobre `preview_record`, que es la conjetura
    pre-validación y puede estar desfasada — antes el gasto se guardaba con el
    importe stale del preview mientras el asiento usaba el importe validado."""
    if not action.get('should_create'):
        return {'created': False, 'reason': 'No se solicitó crear'}

    from sqlalchemy import text as sql_text
    import uuid

    table = action.get('table')
    record = action.get('preview_record', {}) or {}
    ed = extracted_data or {}

    def _num(v):
        try:
            return float(str(v).replace(",", ".")) if v not in (None, "") else None
        except (ValueError, TypeError):
            return None

    # Validated-first values (mirror build_asiento_proposal so gasto == asiento).
    val_amount   = _num(ed.get("importe")) or _num(ed.get("total")) or _num(record.get("amount")) or 0
    val_date     = ed.get("fecha") or ed.get("date") or record.get("date") or datetime.now().date().isoformat()
    val_supplier = ed.get("proveedor") or record.get("supplier")
    val_concept  = ed.get("concepto") or record.get("concept") or record.get("description") or "Gasto"
    val_invoice  = ed.get("numero_documento") or ed.get("numero_factura") or record.get("invoice_number")
    result = {'created': False}

    try:
        # ─── 1. INSERTAR REGISTRO ESTRUCTURADO ───
        if table == 'expenses':
            # Tabla cost_entries existe, lo registramos ahí como gasto general
            tables_check = db.execute(sql_text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('cost_entries', 'expenses')"
            )).fetchall()
            tnames = [t[0] for t in tables_check]

            if 'cost_entries' in tnames:
                # Insertar en cost_entries (estructura conocida)
                try:
                    # Schema real: description, amount, date, notes (no supplier/concept/document_id)
                    notes_parts = []
                    if val_supplier: notes_parts.append(f"Proveedor: {val_supplier}")
                    if val_invoice: notes_parts.append(f"Factura: {val_invoice}")
                    if record.get('iban'): notes_parts.append(f"IBAN: {record['iban']}")
                    notes_parts.append(f"Doc ID: {doc_id}")
                    notes_text = " | ".join(notes_parts)

                    db.execute(sql_text("""
                        INSERT INTO cost_entries (company_id, description, amount, date, notes, category_id, department_id, created_at)
                        VALUES (:cid, :desc, :amount, :date, :notes, NULL, NULL, :now)
                    """), {
                        'cid': current_user.company_id,
                        'desc': val_concept,
                        'amount': val_amount,
                        'date': val_date,
                        'notes': notes_text,
                        'now': datetime.now(),
                    })
                    db.commit()
                    result['expense_created'] = True
                except Exception as exp_err:
                    # Si falla, rollback solo esa transacción y seguir con el asiento
                    logger.info(f"[expense skip] {exp_err}")
                    try: db.rollback()
                    except Exception: pass
                    result['expense_created'] = False
                    result['expense_error'] = str(exp_err)[:200]
                else:
                    logger.info(f"[expense OK] {record.get('concept', 'gasto')} - {record.get('amount', 0)}€")
            result['table'] = 'cost_entries'

        elif table == 'payslips':
            from modules.hr.extended import Payslip
            ps = Payslip(
                company_id=current_user.company_id,
                employee_id=record.get('employee_id'),
                period_month=record.get('month', datetime.now().month),
                period_year=record.get('year', datetime.now().year),
                gross_amount=record.get('gross_amount', 0),
                net_amount=record.get('net_amount', 0),
                irpf=record.get('irpf', 0),
                ss_employee=record.get('ss_employee', 0),
                ss_company=record.get('ss_company', 0),
            )
            db.add(ps)
            db.commit()
            result['payslip_id'] = ps.id
            result['table'] = 'payslips'

        elif table == 'contracts':
            from modules.hr.extended import Contract
            ct = Contract(
                company_id=current_user.company_id,
                employee_id=record.get('employee_id'),
                contract_type=record.get('contract_type', 'indefinido'),
                start_date=record.get('start_date'),
                end_date=record.get('end_date'),
                salary_gross=record.get('salary_gross', 0),
                working_hours=record.get('working_hours', 40),
            )
            db.add(ct)
            db.commit()
            result['contract_id'] = ct.id
            result['table'] = 'contracts'

        # El asiento contable se postea por separado (post_asiento) tras la aprobación.
        result['created'] = True
        result['record'] = record
        return result

    except Exception as e:
        db.rollback()
        return {'created': False, 'error': str(e), 'reason': f'Error insertando: {e}'}


# ─────────────────────────────────────────────
# POST /analyze
# ─────────────────────────────────────────────
# NOTE: defined as a sync `def` (not `async`). The body does blocking work —
# synchronous SQLAlchemy calls, file parsing, and LLM requests — so running it
# on the event loop would stall every other request. FastAPI runs sync routes in
# a worker thread, keeping the server responsive under concurrent uploads.
@router.post("/analyze")
def analyze_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Tipo de archivo no permitido")

    temp_id = str(uuid.uuid4())
    temp_path = TEMP_DIR / f"{temp_id}{ext}"

    # Sync read of the underlying file object (route is no longer async).
    contents = file.file.read()
    file_size = len(contents)

    if file_size > 20 * 1024 * 1024:
        raise HTTPException(400, "Max 20MB")

    with open(temp_path, 'wb') as f:
        f.write(contents)

    text_content = ""
    try:
        # parse_file espera el tipo simple: pdf/csv/xlsx (no MIME)
        file_type_simple = ext.lstrip('.')
        parsed = parse_file(str(temp_path), file_type_simple)
        # parse_file devuelve dict; convertir a texto plano para el LLM
        if isinstance(parsed, dict):
            text_content = json.dumps(parsed, ensure_ascii=False, indent=2, default=str)
        else:
            text_content = str(parsed)
    except Exception as e:
        text_content = f"[No se pudo parsear el archivo: {e}]"

    # Evidence pipeline (schema-driven, VLM-capable, validated) with legacy fallback.
    if USE_EVIDENCE_PIPELINE:
        try:
            from vera.extraction import extract as evidence_extract
            analysis = evidence_extract(str(temp_path), file.filename, db,
                                        current_user.company_id, temp_id=temp_id)
        except Exception as e:
            logger.warning("Evidence pipeline failed, falling back to legacy: %s", e)
            analysis = analyze_with_vera(text_content, file.filename, db)
    else:
        analysis = analyze_with_vera(text_content, file.filename, db)

    # Duplicados
    warnings = analysis.get('warnings', [])
    dup = check_duplicate(db, current_user.company_id, file.filename, analysis.get('extracted_data', {}))
    if dup:
        warnings.insert(0, f"POSIBLE DUPLICADO: {dup}")
        # Si es duplicado, no crear en SQL
        if 'sql_action' in analysis:
            analysis['sql_action']['should_create'] = False
            analysis['sql_action']['reason'] = "No se creará por duplicado detectado"
    analysis['warnings'] = warnings

    # Proponer el asiento contable usando el plan de cuentas del país de la empresa,
    # para que el usuario vea DÓNDE se contabiliza y lo apruebe antes de registrarlo.
    country = (current_user.company.country if current_user.company else None) or 'es'
    try:
        analysis['journal_entry'] = build_asiento_proposal(db, current_user.company_id, country, analysis)
    except Exception as e:
        logger.warning("No se pudo construir el asiento propuesto: %s", e)
        analysis['journal_entry'] = {'should_create': False, 'reason': 'error construyendo asiento'}

    _pending_put(temp_id, {
        'path': str(temp_path),
        'filename': file.filename,
        'file_size': file_size,
        'file_type': ext.lstrip('.'),
        'analysis': analysis,
        'user_id': current_user.id,
        'company_id': current_user.company_id,
        'text_content': text_content[:10000],
        'expires_at': datetime.now().timestamp() + 3600,
    })

    return {
        "temp_id": temp_id,
        "filename": file.filename,
        "file_size": file_size,
        "document_type": analysis.get('document_type', 'otro'),
        "confidence": analysis.get('confidence', 0.5),
        "summary": analysis.get('summary', ''),
        "extracted_data": analysis.get('extracted_data', {}),
        "warnings": analysis.get('warnings', []),
        "suggested_module": analysis.get('suggested_module', 'general'),
        "semantic_tags": analysis.get('semantic_tags', []),
        "sql_action": analysis.get('sql_action', {'should_create': False}),
        "journal_entry": analysis.get('journal_entry', {'should_create': False}),
        # Evidence-pipeline additive fields (None/empty when legacy path used)
        "field_confidence": analysis.get('field_confidence', {}),
        "needs_review": analysis.get('needs_review', False),
        "run_id": analysis.get('run_id'),
        "evidence_pipeline": analysis.get('_evidence_pipeline', False),
    }


# ─────────────────────────────────────────────
# POST /confirm
# ─────────────────────────────────────────────
# Sync `def` for the same reason as /analyze: the body does blocking DB + I/O.
@router.post("/confirm")
def confirm_document(
    body: ConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pending = _pending_get(body.temp_id)
    if not pending:
        raise HTTPException(404, "Documento temporal no encontrado o caducado")

    if pending['user_id'] != current_user.id:
        raise HTTPException(403, "No autorizado")

    if not body.approved:
        try: os.remove(pending['path'])
        except Exception: pass
        _pending_delete(body.temp_id)
        return {"approved": False, "message": "Documento rechazado y eliminado"}

    analysis = pending['analysis']
    if body.override_type:
        analysis['document_type'] = body.override_type

    suggested_module = analysis.get('suggested_module', 'general')
    if suggested_module not in ['finance', 'hr', 'marketing', 'legal', 'general']:
        suggested_module = 'general'

    # Mover archivo (sanitize stored name to prevent traversal out of the company dir)
    from core.files import safe_filename
    final_dir = UPLOAD_DIR / str(current_user.company_id)
    final_dir.mkdir(exist_ok=True, parents=True)
    final_path = final_dir / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_filename(pending['filename'])}"
    try:
        shutil.move(pending['path'], final_path)
    except Exception as e:
        raise HTTPException(500, f"Error guardando: {e}")

    # SQL action result
    sql_result = {'created': False}
    if body.save_to_sql:
        # Crear primero el documento para tener doc_id
        pass  # creamos abajo y luego ejecutamos sql_action

    ai_result_full = {
        "document_type": analysis.get('document_type'),
        "confidence": analysis.get('confidence'),
        "summary": analysis.get('summary'),
        "extracted_data": analysis.get('extracted_data', {}),
        "warnings": analysis.get('warnings', []),
        "semantic_tags": analysis.get('semantic_tags', []),
        "user_notes": body.user_notes,
        "sql_action": analysis.get('sql_action', {}),
        "approved_at": datetime.now().isoformat(),
    }

    # SQL: tabla documents
    doc = Document(
        filename=pending['filename'],
        file_type=pending['file_type'],
        file_path=str(final_path),
        status='processed',
        module=suggested_module,
        ai_result=json.dumps(ai_result_full, ensure_ascii=False),
        company_id=current_user.company_id,
        uploaded_by=current_user.id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Coarse extraction feedback for the accuracy loop (field-level corrections: Phase 3).
    if analysis.get('run_id') and getattr(body, 'approved', True):
        try:
            from sqlalchemy import text as _t
            db.execute(_t(
                "INSERT INTO extraction_feedback (company_id, document_id, run_id, was_correct, created_at) "
                "VALUES (:cid, :doc, :run, 1, :now)"
            ), {"cid": current_user.company_id, "doc": doc.id, "run": analysis['run_id'],
                "now": datetime.now().isoformat()})
            db.commit()
        except Exception as e:
            db.rollback()
            logger.info("extraction_feedback log skipped: %s", e)

    # Phase 3: queue low-confidence / unvalidated docs for human review.
    if analysis.get('needs_review'):
        try:
            from sqlalchemy import text as _t
            low = [k for k, v in (analysis.get('field_confidence') or {}).items() if v < 0.6]
            db.execute(_t(
                "INSERT INTO extraction_review_queue (company_id, document_id, run_id, doc_template_slug, "
                "status, reason, low_conf_fields_json, created_at) "
                "VALUES (:cid, :doc, :run, :slug, 'pending', :reason, :low, :now)"
            ), {"cid": current_user.company_id, "doc": doc.id, "run": analysis.get('run_id'),
                "slug": analysis.get('_template'), "reason": "Baja confianza o validación no superada",
                "low": json.dumps(low), "now": datetime.now().isoformat()})
            db.commit()
        except Exception as e:
            db.rollback()
            logger.info("review enqueue skipped: %s", e)

    # 1) Registro estructurado (gasto / nómina / contrato) si aplica
    if body.save_to_sql and analysis.get('sql_action', {}).get('should_create'):
        sql_result = execute_sql_action(analysis['sql_action'], db, current_user, doc.id,
                                        extracted_data=analysis.get('extracted_data', {}))
        ai_result_full['sql_action_result'] = sql_result
        doc.ai_result = json.dumps(ai_result_full, ensure_ascii=False)
        db.commit()

    # 2) Asiento contable aprobado → se postea por separado (también para ingresos
    #    que no generan registro estructurado). Usa las cuentas del país de la empresa.
    journal_entry = analysis.get('journal_entry') or {}
    if body.save_to_sql and journal_entry.get('should_create'):
        journal_result = post_asiento(journal_entry, db, current_user, doc.id)
        ai_result_full['journal_result'] = journal_result
        doc.ai_result = json.dumps(ai_result_full, ensure_ascii=False)
        db.commit()

    # NEO4J (vía graph_store)
    try:
        from services.graph.neo4j_store import graph_store
        graph_store.run("""
            MERGE (d:Document {id: $id})
            SET d.filename = $filename, d.type = $type, d.module = $module,
                d.company_id = $company_id, d.summary = $summary
        """, id=doc.id, filename=doc.filename,
            type=analysis.get('document_type'),
            module=suggested_module,
            company_id=str(current_user.company_id),
            summary=analysis.get('summary', ''))

        emisor = analysis.get('extracted_data', {}).get('emisor')
        if emisor:
            graph_store.run("""
                MERGE (p:Provider {name: $name, company_id: $company_id})
                WITH p
                MATCH (d:Document {id: $doc_id})
                MERGE (d)-[:FROM]->(p)
            """, name=emisor, company_id=str(current_user.company_id), doc_id=doc.id)
        logger.info(f"[Neo4j OK] Document {doc.id} indexado")
    except Exception as e:
        logger.info(f"[Neo4j skip] {e}")

    # CHROMA (vía vector_store)
    try:
        from services.vector.store import vector_store
        doc_text = f"{analysis.get('summary', '')}\n\n{pending.get('text_content', '')[:3000]}"
        # Intentamos varios métodos posibles del vector_store
        if hasattr(vector_store, 'add_document'):
            vector_store.add_document(
                collection="documents",
                doc_id=f"doc_{doc.id}",
                text=doc_text,
                metadata={
                    "doc_id": doc.id,
                    "filename": doc.filename,
                    "type": analysis.get('document_type', 'otro'),
                    "module": suggested_module,
                    "company_id": current_user.company_id,
                },
            )
        elif hasattr(vector_store, 'add'):
            vector_store.add(
                collection="documents",
                ids=[f"doc_{doc.id}"],
                documents=[doc_text],
                metadatas=[{
                    "doc_id": doc.id,
                    "filename": doc.filename,
                    "type": analysis.get('document_type', 'otro'),
                    "module": suggested_module,
                    "company_id": current_user.company_id,
                }],
            )
        elif hasattr(vector_store, 'upsert'):
            vector_store.upsert(
                collection="documents",
                doc_id=f"doc_{doc.id}",
                text=doc_text,
                metadata={
                    "doc_id": doc.id,
                    "filename": doc.filename,
                    "type": analysis.get('document_type', 'otro'),
                    "company_id": str(current_user.company_id),
                    "fingerprint": analysis.get('fingerprint') or "",
                    "confidence": float(analysis.get('confidence') or 0),
                    "needs_review": bool(analysis.get('needs_review', False)),
                },
            )
        logger.info(f"[Chroma OK] Document {doc.id} embedded")
    except Exception as e:
        logger.info(f"[Chroma skip] {e}")

    _pending_delete(body.temp_id)

    return {
        "approved": True,
        "id": doc.id,
        "filename": doc.filename,
        "document_type": analysis.get('document_type'),
        "module": suggested_module,
        "sql_action_result": sql_result,
        "message": "Documento guardado en memoria de Vera" + (
            f" + registro creado en {sql_result.get('table')}" if sql_result.get('created') else ""
        ),
    }


# ─────────────────────────────────────────────
# GET / list
# ─────────────────────────────────────────────
@router.get("/")
def list_documents(
    module: Optional[str] = None,
    doc_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(Document.company_id == current_user.company_id)
    if module:
        query = query.filter(Document.module == module)
    docs = query.order_by(Document.created_at.desc()).all()

    result = []
    for d in docs:
        parsed = {}
        try: parsed = json.loads(d.ai_result) if d.ai_result else {}
        except Exception: pass
        if doc_type and parsed.get('document_type') != doc_type:
            continue
        result.append({
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "status": d.status,
            "module": d.module,
            "document_type": parsed.get('document_type', 'otro'),
            "summary": parsed.get('summary', ''),
            "extracted_data": parsed.get('extracted_data', {}),
            "semantic_tags": parsed.get('semantic_tags', []),
            "sql_action_result": parsed.get('sql_action_result'),
            "journal_result": parsed.get('journal_result'),
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return {"total": len(result), "documents": result}


@router.get("/types/stats")
def stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = db.query(Document).filter(Document.company_id == current_user.company_id).all()
    by_type, by_module = {}, {}
    for d in docs:
        try:
            parsed = json.loads(d.ai_result) if d.ai_result else {}
            t = parsed.get('document_type', 'otro')
            by_type[t] = by_type.get(t, 0) + 1
        except Exception: pass
        m = d.module or 'general'
        by_module[m] = by_module.get(m, 0) + 1
    return {"total": len(docs), "by_type": by_type, "by_module": by_module}


@router.get("/{doc_id}")
def get_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.company_id == current_user.company_id).first()
    if not doc: raise HTTPException(404, "Documento no encontrado")
    parsed = {}
    try: parsed = json.loads(doc.ai_result) if doc.ai_result else {}
    except Exception: pass
    return {
        "id": doc.id, "filename": doc.filename, "file_type": doc.file_type,
        "file_path": doc.file_path, "status": doc.status, "module": doc.module,
        "document_type": parsed.get('document_type', 'otro'),
        "summary": parsed.get('summary', ''),
        "extracted_data": parsed.get('extracted_data', {}),
        "warnings": parsed.get('warnings', []),
        "semantic_tags": parsed.get('semantic_tags', []),
        "sql_action": parsed.get('sql_action', {}),
        "sql_action_result": parsed.get('sql_action_result'),
        "journal_result": parsed.get('journal_result'),
        "user_notes": parsed.get('user_notes', ''),
        "approved_at": parsed.get('approved_at'),
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.company_id == current_user.company_id).first()
    if not doc: raise HTTPException(404, "Documento no encontrado")
    try:
        if os.path.exists(doc.file_path): os.remove(doc.file_path)
    except Exception: pass
    try:
        from services.graph.neo4j_store import graph_store
        graph_store.run("MATCH (d:Document {id: $id}) DETACH DELETE d", id=doc_id)
    except Exception: pass
    try:
        from services.vector.store import vector_store
        if hasattr(vector_store, 'delete'):
            vector_store.delete(collection="documents", ids=[f"doc_{doc_id}"])
    except Exception: pass
    db.delete(doc)
    db.commit()
    return {"deleted": True, "id": doc_id}
