"""Adaptive evidence-extraction pipeline (Phase 1).

Evidence-first document extraction: cheap pass → validate → budget-gated single VLM
escalation → targeted repair → record. All schema/prompt/model/budget config comes
from the admin backoffice tables (doc_templates, doc_template_fields, vera_models_config,
vera_plans). Entry point: orchestrator.extract().
"""
from vera.extraction.orchestrator import extract

__all__ = ["extract"]
