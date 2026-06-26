"""Auth cookie helpers — one place for the environment-conditional flags so dev
(http, cross-origin :3001→:8000) and prod (https, same-origin behind Caddy)
behaviour is defined once and auditable.

The refresh token lives in an HttpOnly cookie scoped to ``/api/auth`` (so logout
can clear it and JS can never read it). In prod it is ``Secure`` + ``SameSite=Strict``
(same-origin → the Strict cookie is sent on /api/auth/* and CSRF is covered); in
dev it is ``SameSite=Lax`` and not Secure — it simply isn't attached on the
cross-origin XHR, which is fine because dev keeps using the bearer/localStorage
access token returned in the response body.

Fail-safe: if the request arrives over https we treat it as prod-grade and set
Secure even if ENVIRONMENT was left unset, so a missing ENVIRONMENT never
silently ships an insecure cookie in production.
"""
from core.config import get_settings

settings = get_settings()

REFRESH_COOKIE_NAME = getattr(settings, "REFRESH_COOKIE_NAME", "vela_refresh")
COOKIE_PATH = "/api/auth"


def _is_secure_context(request=None) -> bool:
    if (getattr(settings, "ENVIRONMENT", "") or "").lower() == "production":
        return True
    if request is not None and request.url.scheme == "https":
        return True  # fail-safe: https implies a secure context even if ENVIRONMENT unset
    return False


def set_refresh_cookie(response, token: str, request=None, max_age_days: int = None) -> None:
    secure = _is_secure_context(request)
    days = max_age_days if max_age_days is not None else settings.REFRESH_TOKEN_EXPIRE_DAYS
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=days * 86400,
        httponly=True,
        secure=secure,
        samesite="strict" if secure else "lax",
        path=COOKIE_PATH,
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=COOKIE_PATH)
