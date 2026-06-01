"""DocumentIngestor — fingerprint + parse + decide native-PDF vs render."""
import hashlib
import logging
from pathlib import Path

from services.parsers import parse_file
from vera.extraction import render

logger = logging.getLogger("vera.extraction.ingestor")

IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
MIN_TEXT_LAYER = 40   # chars; below this a PDF is treated as scanned


def fingerprint(file_bytes: bytes, text: str) -> str:
    """Stable id for dedupe/memory: bytes + normalized text."""
    h = hashlib.sha256()
    h.update(file_bytes)
    h.update((text or "").strip().lower()[:5000].encode("utf-8", "ignore"))
    return h.hexdigest()


def ingest(file_path: str) -> dict:
    """Returns {ext, text, file_bytes, fingerprint, images, vision_mode}.

    vision_mode: 'none' (good text layer) | 'document' (send native PDF) | 'image' (rendered/photo).
    Native-PDF-first: we attach the document/image only when escalation needs it, but we
    decide here whether vision is even possible and how.
    """
    ext = Path(file_path).suffix.lower()
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    text = ""
    try:
        parsed = parse_file(file_path, ext.lstrip("."))
        import json
        text = json.dumps(parsed, ensure_ascii=False, default=str) if isinstance(parsed, dict) else str(parsed)
    except Exception as e:
        logger.info("parse_file failed for %s: %s", file_path, e)
        text = ""

    fp = fingerprint(file_bytes, text)

    # Decide vision availability/mode
    images = []
    vision_mode = "none"
    if ext in IMAGE_EXTS:
        vision_mode = "image"
        images = [{
            "kind": "image",
            "media_type": f"image/{'jpeg' if ext in ('.jpg', '.jpeg') else 'png'}",
            "data": render.file_to_base64(file_path),
            "page": 1,
        }]
    elif ext == ".pdf":
        if len(text.strip()) >= MIN_TEXT_LAYER:
            # Born-digital: prefer the native PDF document block on escalation (cheap).
            vision_mode = "document"
        else:
            # Scanned: render pages to images.
            vision_mode = "image"

    return {
        "ext": ext,
        "text": text,
        "file_bytes": file_bytes,
        "fingerprint": fp,
        "images": images,           # pre-rendered for image files; PDFs render lazily
        "vision_mode": vision_mode,
        "file_path": file_path,
    }


def vision_images(ingested: dict) -> list:
    """Build the image/document blocks for a VLM escalation (lazy for PDFs)."""
    mode = ingested["vision_mode"]
    if mode == "none":
        # still allow a native-PDF document block as a fallback for born-digital PDFs
        if ingested["ext"] == ".pdf":
            return [{"kind": "document", "media_type": "application/pdf",
                     "data": render.file_to_base64(ingested["file_path"])}]
        return []
    if mode == "document":
        return [{"kind": "document", "media_type": "application/pdf",
                 "data": render.file_to_base64(ingested["file_path"])}]
    # image mode
    if ingested["images"]:
        return ingested["images"]
    if ingested["ext"] == ".pdf":
        imgs = render.pdf_to_page_images(ingested["file_path"])
        if imgs:
            return imgs
        # last resort: native PDF block
        return [{"kind": "document", "media_type": "application/pdf",
                 "data": render.file_to_base64(ingested["file_path"])}]
    return []
