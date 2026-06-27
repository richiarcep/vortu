"""Orchestrator — the evidence-extraction pipeline entry point.

extract(file_path, filename, db, company_id) -> dict with the SAME shape as the legacy
analyze_with_vera (document_type, confidence, summary, extracted_data, warnings,
suggested_module, semantic_tags, sql_action) PLUS additive keys: field_confidence,
evidence, validation, run_id, needs_review, _structured.

Pipeline: classify (reuse legacy) → resolve admin template → cheap pass → validate →
budget-gated single VLM escalation → targeted repair → record run. All config from admin
tables; falls back to the legacy path when no template resolves.
"""
import json
import logging
from datetime import datetime
from sqlalchemy import text

from vera.doc_template_service import resolve_template_for_doc_type
from vera.quota_manager import select_model_for_request
from vera.extraction import ingestor, budget, memory, critic, perspectives, consensus, tournament, routing
from vera.extraction.cheap_extractor import run_pass
from vera.extraction.repair import repair_fields

logger = logging.getLogger("vera.extraction.orchestrator")

# Map template encabezado field_keys → the flat extracted_data keys the rest of the
# flow (build_asiento_proposal, sql_action) expects. First present candidate wins.
FLAT_MAP = {
    "importe":         ["total_factura", "total", "importe", "total_cobrado", "total_pagado", "liquido_percibir"],
    "base_imponible":  ["total_bruto", "base_imponible", "base", "subtotal"],
    "iva":             ["total_iva", "iva", "cuota_iva", "importe_iva"],
    "iva_pct":         ["iva_pct", "tipo_iva", "porcentaje_iva"],
    "fecha":           ["fecha_factura", "fecha", "fecha_emision", "fecha_documento"],
    "numero_documento":["numero_factura", "numero", "num_factura", "numero_documento", "referencia"],
    "emisor":          ["nombre_proveedor", "proveedor", "emisor", "razon_social_proveedor"],
    "receptor":        ["nombre_cliente", "cliente", "receptor"],
    "proveedor_cif":   ["cif_proveedor", "nif_proveedor"],
}


def _flatten(encab: dict) -> dict:
    out = {}
    for flat_key, candidates in FLAT_MAP.items():
        for c in candidates:
            if encab.get(c) not in (None, ""):
                out[flat_key] = encab[c]
                break
    return out


def _doc_value(flat: dict) -> float:
    try:
        return float(str(flat.get("importe", 0)).replace(",", ".").replace("€", "").strip() or 0)
    except Exception:
        return 0.0


def _warnings_from_validation(validation: dict) -> list:
    w = []
    for k, errs in (validation.get("field_errors") or {}).items():
        for e in errs:
            w.append(f"{k}: {e}")
    for e in (validation.get("cross_errors") or []):
        w.append(f"[{e['severity']}] {e['message']}")
    return w


def _record_run(db, company_id, temp_id, fingerprint, slug, phase, cost, tokens,
                models_used, confidence, validation_passed, field_results, needs_review):
    try:
        res = db.execute(text("""
            INSERT INTO extraction_runs
            (company_id, temp_id, fingerprint, doc_template_slug, phase_reached, total_cost,
             total_tokens, models_used_json, overall_confidence, validation_passed,
             field_results_json, needs_review, created_at)
            VALUES (:cid, :temp, :fp, :slug, :phase, :cost, :tok, :models, :conf, :vpass,
                    :fields, :review, :now)
        """), {
            "cid": company_id, "temp": temp_id, "fp": fingerprint, "slug": slug, "phase": phase,
            "cost": cost, "tok": tokens, "models": json.dumps(models_used),
            "conf": confidence, "vpass": 1 if validation_passed else 0,
            "fields": json.dumps(field_results, ensure_ascii=False, default=str),
            "review": 1 if needs_review else 0, "now": datetime.now().isoformat(),
        })
        db.commit()
        return res.lastrowid
    except Exception as e:
        db.rollback()
        logger.warning("could not record extraction_run: %s", e)
        return None


def extract(file_path: str, filename: str, db, company_id: int, temp_id: str = None) -> dict:
    # 1) Ingest + fingerprint
    ing = ingestor.ingest(file_path)
    fp = ing["fingerprint"]

    # 2) Baseline classification (reuse the working classifier; lazy import avoids cycle)
    from api.documentos import analyze_with_vera
    analysis = analyze_with_vera(ing["text"] or f"[archivo: {filename}]", filename, db)

    doc_type = analysis.get("document_type", "otro")
    template = resolve_template_for_doc_type(db, doc_type)

    # No template → legacy behaviour (graceful fallback), but still fingerprint.
    if not template:
        memory.record_fingerprint(db, company_id, fp, slug=None)
        analysis["_evidence_pipeline"] = False
        return analysis

    # 3) Evidence pipeline
    try:
        quota = select_model_for_request(db, company_id)   # used for the 'degraded' signal
    except Exception:
        db.rollback()
        quota = {"degraded": True}
    # Capability-aware, cost-driven routing: cheapest text model for text steps
    # (DeepSeek if configured), cheapest vision-capable model for vision steps.
    text_provider = routing.pick_text(db)
    vision_provider = routing.pick_vision(db)
    primary = vision_provider                          # vision/escalation/critic/consensus
    cheap = text_provider                              # cheap first pass on the text layer

    models_used, total_cost, total_tokens = [], 0.0, 0
    best = None

    def _account(p):
        nonlocal total_cost, total_tokens
        models_used.append({"provider": p["provider"], "tokens_in": p["tokens_in"],
                             "tokens_out": p["tokens_out"], "cost": round(p["cost"], 6)})
        total_cost += p["cost"] or 0
        total_tokens += (p["tokens_in"] or 0) + (p["tokens_out"] or 0)

    # PASS 1 — cheap text pass (skip if scanned/no text → go straight to vision)
    has_text = len((ing["text"] or "").strip()) >= 40
    if has_text:
        best = run_pass(db, company_id, template, cheap, user_text=ing["text"])
        _account(best)

    decision = budget.decide(
        {"confidence": best["confidence"] if best else 0.0,
         "validation_passed": best["validation"]["passed"] if best else False,
         "doc_value": _doc_value(_flatten((best["data"] if best else {}).get("encabezado", {}) or {})),
         "calls_made": len(models_used), "cost": total_cost},
        template, quota) if best else "escalate"

    phase = "cheap"
    # Learning loop: once the cheap pass identifies the provider, pull its past human
    # corrections and feed them into the escalation prompt (build_extraction_prompt consumes them).
    provider_memory = None
    if best is not None:
        cif = _flatten((best["data"].get("encabezado", {}) or {})).get("proveedor_cif")
        provider_memory = memory.get_provider_corrections(db, company_id, cif)

    # PASS 2 — VLM escalation (native PDF doc block or rendered pages)
    if decision == "escalate":
        images = ingestor.vision_images(ing)
        vpass = run_pass(db, company_id, template, primary, images=images,
                         user_text=ing["text"], provider_memory=provider_memory)
        _account(vpass)
        phase = "vision"
        if best is None or vpass["confidence"] >= best["confidence"] or vpass["validation"]["passed"]:
            best = vpass
        decision = budget.decide(
            {"confidence": best["confidence"], "validation_passed": best["validation"]["passed"],
             "doc_value": _doc_value(_flatten(best["data"].get("encabezado", {}) or {})),
             "calls_made": len(models_used), "cost": total_cost},
            template, quota)

    # PASS 3 — targeted repair of failing/low-confidence fields
    if decision == "escalate" and best is not None:
        images = ingestor.vision_images(ing)
        rep = repair_fields(db, company_id, template, best["data"], best["validation"],
                            best["field_confidence"], primary, images=images)
        if rep:
            _account(rep)
            phase = "repair"
            if rep["confidence"] >= best["confidence"] or rep["validation"]["passed"]:
                best = rep
            decision = budget.decide(
                {"confidence": best["confidence"], "validation_passed": best["validation"]["passed"],
                 "doc_value": _doc_value(_flatten(best["data"].get("encabezado", {}) or {})),
                 "calls_made": len(models_used), "cost": total_cost},
                template, quota)

    # PASS 3.5 — Multi-perspective CONSENSUS + tournament.
    # Tightly gated: only when the single passes FAILED validation AND the doc is high-value,
    # and quota is not degraded. This is the expensive fan-out, so it runs rarely by design.
    t = budget.thresholds(template)
    if best is not None and not quota.get("degraded"):
        dval = _doc_value(_flatten(best["data"].get("encabezado", {}) or {}))
        if (not best["validation"]["passed"]) and dval >= t["high_value_threshold"]:
            persps = perspectives.build(db, template)
            images = ingestor.vision_images(ing)
            cons_results = consensus.run(db, company_id, template, persps, primary, images)
            for r in cons_results:
                _account(r)
            won = tournament.decide(template, cons_results)
            if won and (won["validation"]["passed"] or won["confidence"] >= best["confidence"]):
                best = won
                phase = "consensus"

    # PASS 4 — AdversarialCritic (gated to uncertain or high-value docs; bounded by call ceiling)
    if best is not None and len(models_used) < t["max_model_calls"]:
        encab_now = best["data"].get("encabezado", {}) or {}
        dval = _doc_value(_flatten(encab_now))
        uncertain = (not best["validation"]["passed"]) or best["confidence"] < t["auto_accept_conf"]
        if uncertain or dval >= t["high_value_threshold"]:
            images = ingestor.vision_images(ing)
            crit = critic.critique(db, company_id, template, encab_now, primary, images=images)
            total_cost += crit.get("cost", 0) or 0
            total_tokens += crit.get("tokens", 0) or 0
            models_used.append({"provider": crit.get("provider", "?"), "tokens_in": crit.get("tokens_in", 0),
                                "tokens_out": crit.get("tokens_out", 0), "cost": round(crit.get("cost", 0) or 0, 6)})
            phase = "critic"
            if crit["suspect_field_keys"] and len(models_used) < t["max_model_calls"]:
                rep = repair_fields(db, company_id, template, best["data"], best["validation"],
                                   best["field_confidence"], primary, images=images,
                                   force_keys=crit["suspect_field_keys"])
                if rep:
                    _account(rep)
                    phase = "critic_repair"
                    if rep["confidence"] >= best["confidence"] or rep["validation"]["passed"]:
                        best = rep

    needs_review = (decision == "review") or (best is None) or (not best["validation"]["passed"])

    # 4) Merge evidence results into the contract dict
    encab = (best["data"].get("encabezado", {}) if best else {}) or {}
    flat = _flatten(encab)
    if flat:
        merged_ed = dict(analysis.get("extracted_data", {}) or {})
        merged_ed.update(flat)               # template values override the baseline guesses
        analysis["extracted_data"] = merged_ed
    analysis["_structured"] = best["data"] if best else {}
    analysis["field_confidence"] = best["field_confidence"] if best else {}
    analysis["confidence"] = best["confidence"] if best else analysis.get("confidence", 0.5)
    analysis["validation"] = best["validation"] if best else {}
    analysis["needs_review"] = needs_review
    analysis["_evidence_pipeline"] = True
    analysis["_template"] = template["slug"]
    extra_warnings = _warnings_from_validation(best["validation"]) if best else []
    analysis["warnings"] = (analysis.get("warnings", []) or []) + extra_warnings

    # 5) Persist run + fingerprint
    provider_cif = flat.get("proveedor_cif")
    run_id = _record_run(db, company_id, temp_id, fp, template["slug"], phase,
                         total_cost, total_tokens, models_used,
                         analysis["confidence"], best["validation"]["passed"] if best else False,
                         best["field_confidence"] if best else {}, needs_review)
    analysis["run_id"] = run_id
    analysis["fingerprint"] = fp
    memory.record_fingerprint(db, company_id, fp, provider_cif=provider_cif, slug=template["slug"])

    return analysis
