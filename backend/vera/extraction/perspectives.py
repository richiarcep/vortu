"""PerspectiveGenerator — distinct extraction "lenses" for consensus.

Each perspective is an independent view designed to catch different error modes.
Sources: built-in focus lenses + any admin-configured prompt variants
(doc_template_prompts). Capped to keep cost bounded.
"""
import logging
from sqlalchemy import text

logger = logging.getLogger("vera.extraction.perspectives")

MAX_PERSPECTIVES = 3

# Built-in lenses: same schema, different attention. They attack the classic confusions.
BUILTIN_LENSES = [
    {"name": "base", "extra": ""},
    {"name": "totales",
     "extra": "Concéntrate en separar BASE IMPONIBLE, IVA y TOTAL. No confundas el subtotal con el total. "
              "Verifica que base + IVA = total."},
    {"name": "partes",
     "extra": "Concéntrate en distinguir el PROVEEDOR (emisor de la factura) del CLIENTE (receptor). "
              "Asigna cada CIF/nombre a la parte correcta."},
]


def build(db, template: dict) -> list:
    """Return up to MAX_PERSPECTIVES perspective configs:
       {name, prompt_override|None, extra_instructions}."""
    perspectives = []

    # Admin-configured prompt variants take priority (they encode learned strategies).
    try:
        rows = db.execute(text(
            "SELECT label, prompt_text FROM doc_template_prompts "
            "WHERE template_id = :tid AND is_active = 1 ORDER BY is_default DESC, accuracy_score DESC"
        ), {"tid": template["id"]}).fetchall()
        for label, prompt_text in rows:
            if prompt_text and len(prompt_text.strip()) > 20:
                perspectives.append({"name": f"prompt:{label}", "prompt_override": prompt_text,
                                     "extra_instructions": ""})
            if len(perspectives) >= MAX_PERSPECTIVES:
                break
    except Exception as e:
        logger.info("doc_template_prompts lookup skipped: %s", e)

    # Fill remaining slots with built-in lenses.
    for lens in BUILTIN_LENSES:
        if len(perspectives) >= MAX_PERSPECTIVES:
            break
        perspectives.append({"name": lens["name"], "prompt_override": None,
                             "extra_instructions": lens["extra"]})

    return perspectives[:MAX_PERSPECTIVES]
