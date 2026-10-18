"""Find people who texted PathWise, and send a walk alert back to one of them."""

from __future__ import annotations

from time import monotonic

import httpx

from app.config import settings

_API = "https://api.photon.codes"
_CACHE_SECONDS = 45.0
_cached_watchers: tuple[list[dict], str | None] | None = None
_cached_at = 0.0


def line_label() -> str:
    """The PathWise iMessage number, formatted for the phone screen."""
    return _format_phone(settings.photon_agent_handle) or "the PathWise number"


def list_watchers(fresh: bool = False) -> tuple[list[dict], str | None]:
    """People who have texted the PathWise number. A short capitalized text becomes their name."""
    global _cached_watchers, _cached_at
    if not fresh and _cached_watchers is not None and monotonic() - _cached_at < _CACHE_SECONDS:
        return _cached_watchers
    loaded = _load_watchers()
    if loaded[1] is None:
        _cached_watchers = loaded
        _cached_at = monotonic()
    return loaded


def _load_watchers() -> tuple[list[dict], str | None]:
    items, problem = _received_messages()
    if problem or items is None:
        return [], problem
    grouped: dict[str, dict] = {}
    for item in items:
        parsed = _inbound(item)
        if parsed is None:
            continue
        human, _agent, text = parsed
        key = _digits(human)
        row = grouped.get(key)
        if row is None:
            phone = _format_phone(human)
            row = {"handle": human, "phone": phone, "name": phone, "named": False}
            grouped[key] = row
        if not row["named"] and _looks_like_name(text):
            row["name"] = " ".join(text.split())
            row["named"] = True
    watchers = [
        {"name": row["name"], "handle": row["handle"], "phone": row["phone"]}
        for row in grouped.values()
    ]
    watchers.sort(key=lambda watcher: watcher["name"].lower())
    return watchers, None


def find_watcher(handle: str) -> tuple[dict | None, str | None]:
    watchers, problem = list_watchers()
    if problem:
        return None, problem
    wanted = _digits(handle)
    for watcher in watchers:
        if _digits(watcher["handle"]) == wanted:
            return watcher, None
    return None, None


def send_alert(text: str, idempotency_key: str, human_handle: str) -> str | None:
    """Return a short notice when the text could not be handed to Photon."""
    thread, problem = _thread_for(human_handle)
    if problem or thread is None:
        return problem
    space_id, sender_id = thread
    try:
        response = httpx.post(
            f"{_API}/v1/projects/{settings.photon_project_id}/messages",
            headers={
                "Authorization": f"Bearer {settings.photon_api_key}",
                "idempotency-key": idempotency_key[:255],
                "Content-Type": "application/json",
            },
            json={
                "spaceId": space_id,
                "senderId": sender_id,
                "content": {"type": "text", "format": "plain", "text": text},
            },
            timeout=20,
        )
    except httpx.HTTPError:
        return "Photon could not be reached. The alert is still saved in the app."
    if response.status_code == 202:
        return None
    detail = _problem(response)
    return detail or "Photon did not accept the alert."


def _thread_for(human_handle: str) -> tuple[tuple[str, str] | None, str | None]:
    items, problem = _received_messages()
    if problem or items is None:
        return None, problem
    wanted = _digits(human_handle)
    for item in items:
        parsed = _inbound(item)
        if parsed is None:
            continue
        human, _agent, _text = parsed
        if _digits(human) != wanted:
            continue
        space = item.get("space") or {}
        received = item.get("receivedBy") or {}
        space_id = space.get("id")
        sender_id = received.get("id")
        if space_id and sender_id:
            return (space_id, sender_id), None
    return None, "They need to text the number on their Photon assignment from their iPhone first."


def _received_messages() -> tuple[list[dict] | None, str | None]:
    if not settings.photon_api_key or not settings.photon_project_id:
        return None, "Photon is not configured on the server."
    items: list[dict] = []
    token: str | None = None
    for _ in range(5):
        params: dict[str, str | int] = {
            "pageSize": 50,
            "platform": "imessage",
            "direction": "received",
            "order": "desc",
        }
        if token:
            params["pageToken"] = token
        try:
            response = httpx.get(
                f"{_API}/v1/projects/{settings.photon_project_id}/messages",
                headers={"Authorization": f"Bearer {settings.photon_api_key}"},
                params=params,
                timeout=20,
            )
        except httpx.HTTPError:
            return None, "Photon could not be reached."
        if response.status_code != 200:
            return None, _problem(response) or "Photon did not return messages."
        body = response.json()
        items.extend(body.get("items") or [])
        token = body.get("nextPageToken")
        if not isinstance(token, str) or not token:
            break
    return items, None


def _inbound(item: dict) -> tuple[str, str, str] | None:
    if item.get("status") != "received" or item.get("platform") != "imessage":
        return None
    sent = item.get("sentBy") or {}
    received = item.get("receivedBy") or {}
    space = item.get("space") or {}
    if sent.get("kind") != "human" or received.get("kind") != "agent" or space.get("kind") != "direct":
        return None
    human = sent.get("handle") or ""
    agent = received.get("handle") or ""
    if not human or not agent:
        return None
    content = item.get("content") or {}
    text = content.get("text") if content.get("type") == "text" and isinstance(content.get("text"), str) else ""
    return human, agent, text


def _looks_like_name(text: str) -> bool:
    cleaned = " ".join(text.split())
    if not cleaned or len(cleaned) > 40:
        return False
    words = cleaned.split(" ")
    if not 1 <= len(words) <= 3:
        return False
    for word in words:
        body = word.replace("-", "").replace("'", "")
        if len(body) < 2 or not body.isalpha() or not word[0].isupper():
            return False
    return True


def _format_phone(value: str) -> str:
    digits = _digits(value)
    if len(digits) == 11 and digits.startswith("1"):
        return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    if len(digits) == 10:
        return f"+1 ({digits[0:3]}) {digits[3:6]}-{digits[6:]}"
    return value


def _digits(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def _problem(response: httpx.Response) -> str | None:
    try:
        body = response.json()
    except ValueError:
        return None
    detail = body.get("detail") or body.get("title")
    if isinstance(detail, str) and detail.strip():
        return detail.strip()
    return None
