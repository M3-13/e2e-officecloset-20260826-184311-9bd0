from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

RATE_LIMIT = 10
WINDOW_SECONDS = 60

_lock = Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    if request.client is None:
        return "unknown"
    return request.client.host


def reset_rate_limit() -> None:
    with _lock:
        _hits.clear()


async def rate_limit(request: Request) -> None:
    ip = _client_ip(request)
    now = time.monotonic()
    with _lock:
        window = _hits[ip]
        while window and now - window[0] > WINDOW_SECONDS:
            window.popleft()
        if len(window) >= RATE_LIMIT:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        window.append(now)
