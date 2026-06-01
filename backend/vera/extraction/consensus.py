"""ConsensusEngine — run perspectives in parallel and collect per-perspective results.

Bounded fan-out (ThreadPoolExecutor capped at the number of perspectives). Each
perspective is an independent extraction; the FieldTournament then votes per field.
"""
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from vera.extraction.cheap_extractor import run_pass

logger = logging.getLogger("vera.extraction.consensus")


def run(db, company_id: int, template: dict, perspectives: list, provider: str,
        images: list, max_workers: int = 3) -> list:
    """Returns a list of pass-results, each tagged with its perspective name."""
    results = []

    def _one(persp):
        res = run_pass(db, company_id, template, provider, images=images,
                       prompt_override=persp.get("prompt_override"),
                       extra_instructions=persp.get("extra_instructions", ""))
        res["perspective"] = persp["name"]
        return res

    if not perspectives:
        return results
    workers = min(max_workers, len(perspectives))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(_one, p) for p in perspectives]
        for fut in as_completed(futures):
            try:
                results.append(fut.result())
            except Exception as e:
                logger.warning("perspective failed: %s", e)
    return results
