"""Render/OCR helper — PDF→PNG via pypdfium2 (already installed; no new dep).

Used only on demand (native-PDF-first strategy): we render page images only when a
PDF has no usable text layer (scanned) or a field needs visual confirmation.
"""
import base64
import logging

logger = logging.getLogger("vera.extraction.render")

MAX_PAGES = 3          # cap vision token cost
RENDER_SCALE = 2.0     # ~144 DPI


def file_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def pdf_to_page_images(path: str, max_pages: int = MAX_PAGES) -> list:
    """Render the first `max_pages` PDF pages to base64 PNGs.
    Returns [] if pypdfium2 is unavailable or rendering fails (caller falls back)."""
    try:
        import pypdfium2 as pdfium
    except Exception as e:  # pragma: no cover
        logger.warning("pypdfium2 unavailable, cannot render PDF: %s", e)
        return []
    images = []
    try:
        pdf = pdfium.PdfDocument(path)
        n = min(len(pdf), max_pages)
        for i in range(n):
            page = pdf[i]
            pil = page.render(scale=RENDER_SCALE).to_pil()
            import io
            buf = io.BytesIO()
            pil.save(buf, format="PNG")
            images.append({
                "kind": "image",
                "media_type": "image/png",
                "data": base64.standard_b64encode(buf.getvalue()).decode("utf-8"),
                "page": i + 1,
            })
        pdf.close()
    except Exception as e:
        logger.warning("PDF render failed for %s: %s", path, e)
        return []
    return images
