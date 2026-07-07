"""Rate limiting for sensitive endpoints.

Two backends behind one interface:

- **Redis** (preferred): a sliding-window log in a sorted set, mutated by an
  atomic Lua script so it is correct across multiple workers / instances — the
  single-process limitation of the old in-memory limiter multiplied the
  effective limit by the worker count.
- **In-memory** (fallback): the original per-process sliding window. Used when
  ``REDIS_URL`` is unset, when ``redis`` isn't installed, or when Redis is
  unreachable — so local dev and a Redis outage both degrade gracefully instead
  of failing closed on every request.

The ``rate_limit(max_calls, window_seconds, scope)`` dependency keeps its
original signature so no call site changes. ``account_throttle()`` adds the
per-account dimension the in-memory limiter never had (credential-stuffing that
rotates IPs against ONE account), callable from inside a handler that knows the
account identifier (e.g. login).

X-Forwarded-For: we honour the first hop. This is only trustworthy behind a
reverse proxy that overwrites the header (our Caddy deployment does); set
``TRUSTED_PROXY=false`` to fall back to the socket peer when not behind one.
"""
import time
import math
import logging
import threading
from collections import defaultdict, deque
from typing import Optional, Tuple

from fastapi import Request, HTTPException, status

from core.config import get_settings

logger = logging.getLogger("vela.ratelimit")
settings = get_settings()

_TRUSTED_PROXY = str(getattr(settings, "TRUSTED_PROXY", True)).lower() in ("1", "true", "yes")

# Kill-switch: disable all throttling for deterministic tests. Tripped either by
# RATE_LIMIT_ENABLED=false or by ENVIRONMENT=test/testing, so the security suite
# isn't flaky against shared sliding-window state.
_RATE_LIMIT_DISABLED = (
    str(getattr(settings, "RATE_LIMIT_ENABLED", True)).lower() in ("false", "0", "no")
) or ((getattr(settings, "ENVIRONMENT", "") or "").lower() in ("test", "testing"))


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if _TRUSTED_PROXY and forwarded:
        # Take the RIGHTMOST hop — the address our own reverse proxy (Caddy) appended,
        # i.e. the real peer Caddy actually saw. The LEFTMOST value is client-supplied:
        # an attacker sends `X-Forwarded-For: <fake>` and Caddy appends the real IP, so
        # keying the limiter on the leftmost let attackers rotate fake IPs to evade it
        # entirely (the documented brute-force bypass). With a single trusted proxy the
        # rightmost entry is the genuine client and is not client-spoofable.
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


# ── In-memory backend (fallback) ─────────────────────────────────────────────

class _InMemoryLimiter:
    def __init__(self):
        self._windows: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, max_calls: int, window_seconds: int) -> Tuple[bool, int]:
        """Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            dq = self._windows[key]
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= max_calls:
                retry_after = int(window_seconds - (now - dq[0])) + 1
                return False, max(retry_after, 1)
            dq.append(now)
            return True, 0


# ── Redis backend (preferred) ────────────────────────────────────────────────

# Atomic sliding-window: drop entries older than the window, count what's left,
# reject if at the cap (returning the oldest score so we can compute Retry-After),
# otherwise record this hit and refresh the TTL. All in one round-trip.
_SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local maxc = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= maxc then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {1, oldest[2]}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {0, '0'}
"""


class _RedisLimiter:
    def __init__(self, url: str):
        import redis  # imported lazily so the dep is optional
        self._redis = redis.Redis.from_url(url, socket_timeout=0.25, socket_connect_timeout=0.25)
        self._redis.ping()  # fail fast at construction so we can fall back
        self._script = self._redis.register_script(_SLIDING_WINDOW_LUA)
        self._counter = 0
        self._lock = threading.Lock()

    def hit(self, key: str, max_calls: int, window_seconds: int) -> Tuple[bool, int]:
        now_ms = int(time.time() * 1000)
        window_ms = window_seconds * 1000
        with self._lock:
            self._counter += 1
            member = f"{now_ms}:{self._counter}"
        limited, oldest = self._script(keys=[key], args=[now_ms, window_ms, max_calls, member])
        if int(limited) == 1:
            retry_after = math.ceil((int(oldest) + window_ms - now_ms) / 1000)
            return False, max(retry_after, 1)
        return True, 0


# ── Backend selection + resilient dispatch ───────────────────────────────────

_inmemory = _InMemoryLimiter()
_redis_limiter: Optional[_RedisLimiter] = None

if getattr(settings, "REDIS_URL", ""):
    try:
        _redis_limiter = _RedisLimiter(settings.REDIS_URL)
        logger.info("Rate limiting backed by Redis")
    except Exception as e:
        logger.warning("Redis rate-limit backend unavailable (%s); using in-memory fallback", e)


def _hit(key: str, max_calls: int, window_seconds: int) -> Tuple[bool, int]:
    """Dispatch to Redis, falling back to in-memory on any Redis error so a Redis
    blip never takes the API down."""
    if _redis_limiter is not None:
        try:
            return _redis_limiter.hit(key, max_calls, window_seconds)
        except Exception as e:
            logger.warning("Redis rate-limit hit failed (%s); falling back to in-memory", e)
    return _inmemory.hit(key, max_calls, window_seconds)


def _audit_rate_block(request: Optional[Request], scope: str, identifier: Optional[str] = None) -> None:
    """Best-effort: record a 429 in the security audit log so brute-force attempts
    the limiter already REJECTED become visible to /api/admin/security/threats
    (the most direct brute-force signal — it counts what never reached a handler).

    Opens its own short-lived worker session (the dependency only has `request`, no
    db Session) and swallows every error: an audit hiccup must NEVER change throttle
    behaviour or break the 429 path. Consistent with audit.py's best-effort contract
    EXCEPT it stays silent here — the throttle decision is already made and logged by
    the caller; we don't want a flood of audit-write errors during an active attack."""
    try:
        from core.database import worker_session
        from core.audit import audit_event
        db = worker_session()
        try:
            audit_event(
                db, "rate_limit_block",
                actor_email=identifier,          # email for account scope, None for IP scope
                target=f"scope:{scope}",
                request=request,                 # captures ip + user_agent when present
                detail={"scope": scope},
            )
        finally:
            db.close()
    except Exception:
        pass  # never break the 429 path on an audit hiccup


def rate_limit(max_calls: int, window_seconds: int, scope: str):
    """FastAPI dependency: at most `max_calls` per `window_seconds` per client IP.

    Usage:
        @router.post("/login", dependencies=[Depends(rate_limit(8, 60, "login"))])
    """
    def dependency(request: Request) -> None:
        if _RATE_LIMIT_DISABLED:
            return
        key = f"rl:{scope}:{_client_ip(request)}"
        allowed, retry_after = _hit(key, max_calls, window_seconds)
        if not allowed:
            _audit_rate_block(request, scope)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos. Inténtalo de nuevo en unos momentos.",
                headers={"Retry-After": str(retry_after)},
            )
    return dependency


def account_throttle(identifier: str, max_calls: int, window_seconds: int,
                     scope: str = "account", request: Optional[Request] = None) -> None:
    """Per-account throttle, independent of IP — call from inside a handler that
    knows the account id (e.g. login keys by submitted email). Raises 429 when the
    account exceeds the cap, blunting credential-stuffing that rotates source IPs
    against a single account. Identifier is lowercased; never include a secret.

    Pass ``request`` to capture the source IP/user-agent on the audit row emitted
    when the throttle trips (optional + best-effort; omitting it logs the email only)."""
    if _RATE_LIMIT_DISABLED:
        return
    key = f"rl:{scope}:{(identifier or '').strip().lower()}"
    allowed, retry_after = _hit(key, max_calls, window_seconds)
    if not allowed:
        _audit_rate_block(request, scope, identifier=(identifier or "").strip().lower() or None)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos para esta cuenta. Inténtalo de nuevo en unos minutos.",
            headers={"Retry-After": str(retry_after)},
        )
