"""Send a walk alert into the iMessage thread the watcher already opened."""

from __future__ import annotations

import httpx

from app.config import settings

_API = "https://api.photon.codes"


def line_label() -> str:
    """The PathWise iMessage number, formatted for the phone screen."""
    digits = _digits(settings.photon_agent_handle)
    if len(digits) == 11 and digits.startswith("1"):
        return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    return settings.photon_agent_handle or "the PathWise number"


def send_alert(text: str, idempotency_key: str) -> str | None:
    """Return a short notice when the text could not be handed to Photon."""
    thread, problem = _thread()
    if problem or thread is None:
        return problem
    space_id, sender_id, _parent_id = thread
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


def _thread() -> tuple[tuple[str, str, str] | None, str | None]:
    if not settings.photon_api_key or not settings.photon_project_id:
        return None, "Photon is not configured on the server."
    try:
        response = httpx.get(
            f"{_API}/v1/projects/{settings.photon_project_id}/messages",
            headers={"Authorization": f"Bearer {settings.photon_api_key}"},
            params={"pageSize": 20, "platform": "imessage", "direction": "received", "order": "desc"},
            timeout=20,
        )
    except httpx.HTTPError:
        return None, "Photon could not be reached. The alert is still saved in the app."
    if response.status_code != 200:
        return None, _problem(response) or "Photon did not return the iMessage thread."
    wanted = _digits(settings.photon_agent_handle)
    fallback: tuple[str, str, str] | None = None
    for item in response.json().get("items", []):
        found = _direct_reply(item)
        if found is None:
            continue
        space_id, sender_id, parent_id, handle = found
        if wanted and _digits(handle) == wanted:
            return (space_id, sender_id, parent_id), None
        if fallback is None:
            fallback = (space_id, sender_id, parent_id)
    if fallback is not None:
        return fallback, None
    return None, "Text the PathWise number from your iPhone once. Alerts reply in that thread."


def _direct_reply(item: dict) -> tuple[str, str, str, str] | None:
    if item.get("status") != "received" or item.get("platform") != "imessage":
        return None
    sent = item.get("sentBy") or {}
    received = item.get("receivedBy") or {}
    space = item.get("space") or {}
    if sent.get("kind") != "human" or received.get("kind") != "agent" or space.get("kind") != "direct":
        return None
    space_id = space.get("id")
    sender_id = received.get("id")
    parent_id = item.get("id")
    handle = received.get("handle") or ""
    if not space_id or not sender_id or not parent_id:
        return None
    return space_id, sender_id, parent_id, handle


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
