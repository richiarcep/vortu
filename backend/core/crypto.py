"""Symmetric encryption for secrets stored at rest (e.g. fiscal signing-cert
passwords, tax-authority API secrets).

The key is derived deterministically from ``SECRET_KEY`` so no extra key
management/infra is required. ``SECRET_KEY`` is already validated at startup
(>=32 chars, no placeholders) in ``core.config``.

``decrypt()`` is tolerant of legacy plaintext: if a stored value is not a valid
token it is returned unchanged, so rows written before encryption was introduced
keep working and a one-time re-save transparently upgrades them.
"""
import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from core.config import get_settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    secret = get_settings().SECRET_KEY.encode("utf-8")
    # Fernet needs a 32-byte url-safe base64 key; derive it from SECRET_KEY.
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def encrypt(plaintext: str | None) -> str | None:
    """Encrypt a secret for storage. ``None``/empty passes through unchanged."""
    if not plaintext:
        return plaintext
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str | None) -> str | None:
    """Decrypt a stored secret. Legacy plaintext is returned as-is."""
    if not token:
        return token
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        # Value predates encryption (or is already plaintext) — return unchanged.
        return token
