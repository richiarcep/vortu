"""Helpers for handling user-supplied filenames safely.

User-controlled filenames (upload names, path params) must never be interpolated
into a filesystem path without sanitizing, or a value like ``../../etc/passwd``
escapes the intended directory (path traversal — arbitrary read/write).
"""
import os
import re

_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")

# Default cap for in-memory uploads (DoS guard). Reads of whole files into RAM
# must be bounded so a huge upload can't exhaust memory.
MAX_UPLOAD_MB = 20


def enforce_upload_size(file, max_mb: int = MAX_UPLOAD_MB) -> None:
    """Reject an oversized UploadFile with HTTP 413 before it's read into memory.

    Uses the multipart-parser's reported ``size`` (from Content-Length); if that
    is unavailable the caller should still bound its own read.
    """
    size = getattr(file, "size", None)
    if size is not None and size > max_mb * 1024 * 1024:
        from fastapi import HTTPException
        raise HTTPException(status_code=413, detail=f"Archivo demasiado grande (máx {max_mb} MB)")


def safe_filename(name: str | None, default: str = "file") -> str:
    """Reduce an arbitrary string to a safe, single-path-segment filename.

    Strips any directory components and collapses unsafe characters, so the
    result can never traverse out of a target directory.
    """
    if not name:
        return default
    # Drop any directory part (handles both / and \ separators) and null bytes.
    name = os.path.basename(name.replace("\\", "/")).replace("\x00", "")
    name = _UNSAFE.sub("_", name).strip("._")
    # Reject pathological results (empty, or all-dots like ".." after stripping).
    if not name or set(name) <= {"."}:
        return default
    return name[:200]
