"""Record one Walk Buddy exchange for a VEYZL live audit. Missing key or a failed post does not change the answer."""

from __future__ import annotations

import httpx

from app.config import settings

_LIVE_AUDITS = "https://api.veyzl.ai/v1/live-audits"


def record_walk_buddy(request_text: str, response_text: str) -> None:
    if not settings.veyzl_api_key:
        return
    try:
        httpx.post(
            _LIVE_AUDITS,
            headers={
                "Authorization": f"Bearer {settings.veyzl_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "request_text": request_text,
                "response_text": response_text,
                "feature_name": "walk-buddy",
                "route": "/api/walk-buddy",
            },
            timeout=8,
        )
    except httpx.HTTPError:
        return
