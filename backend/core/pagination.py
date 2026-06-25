"""Shared pagination bounds.

A client-supplied ``limit`` that isn't capped lets a caller pass ``?limit=99999``
to any list endpoint and pull an entire table in one query — both a DoS vector
(unbounded scan + full materialization) and a bulk-exfiltration vector. These
helpers wrap pagination params with hard bounds so FastAPI rejects oversized
values with 422 before the query ever runs.

``MAX_PAGE_SIZE`` is a deliberate ceiling: high enough for dense single-screen
list views (the costes expense list legitimately requests 200), low enough that
table-dump attempts are refused. Endpoints that genuinely need to stream more
should paginate with ``offset``/cursor, not raise this cap.
"""
from fastapi import Query

MAX_PAGE_SIZE = 200


def LimitQuery(default: int = 50):
    """A bounded ``limit`` query param: 1 ≤ limit ≤ MAX_PAGE_SIZE."""
    return Query(default, ge=1, le=MAX_PAGE_SIZE, description=f"Items per page (max {MAX_PAGE_SIZE})")


def OffsetQuery(default: int = 0):
    """A non-negative ``offset`` query param."""
    return Query(default, ge=0, description="Number of items to skip")
