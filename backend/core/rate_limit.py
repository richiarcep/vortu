"""Lightweight, dependency-free rate limiting for sensitive endpoints.

This is an in-memory, per-process sliding-window limiter — enough to blunt
credential / 2FA brute-force from a single client. It is NOT shared across
processes or hosts, so for a multi-worker / multi-instance deployment replace
the backing store with Redis (or adopt `slowapi`). Limits are intentionally
generous enough not to lock out a human retrying a few times.
"""

import time
import threading
from collections import defaultdict, deque

from fastapi import Request, HTTPException, status

# key -> deque[float] of recent request timestamps (monotonic seconds)
_WINDOWS: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    # Honour the first hop of X-Forwarded-For when behind a reverse proxy.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(max_calls: int, window_seconds: int, scope: str):
    """Build a FastAPI dependency enforcing `max_calls` per `window_seconds` per client IP.

    Usage:
        @router.post("/login", dependencies=[Depends(rate_limit(8, 60, "login"))])
    """

    def dependency(request: Request) -> None:
        key = f"{scope}:{_client_ip(request)}"
        now = time.monotonic()
        cutoff = now - window_seconds
        with _lock:
            dq = _WINDOWS[key]
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= max_calls:
                retry_after = int(window_seconds - (now - dq[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demasiados intentos. Inténtalo de nuevo en unos momentos.",
                    headers={"Retry-After": str(retry_after)},
                )
            dq.append(now)
            if not dq:                       # never true here, but keeps the map tidy
                del _WINDOWS[key]

    return dependency
