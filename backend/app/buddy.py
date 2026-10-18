"""Ask a model for a walking suggestion, then name a destination the map can search."""

from __future__ import annotations

import json

import httpx

from app.config import settings
from app.places import search_places
from app.schemas.places import PlaceHit
from app.veyzl import record_walk_buddy

_OPENAI = "https://api.openai.com/v1/chat/completions"
_MODEL = "gpt-4o-mini"
_SYSTEM = (
    "You help people walk around the University of Washington. "
    "They are already at the coordinates in the user message. Never ask where they are starting. "
    "Reply with JSON only. "
    'If they name one specific place, use {"action":"route","destination":"that place name","reply":"one or two sentences"}. '
    'If the destination is missing, or they say something general like "the library", "a cafe", or "somewhere quiet", '
    'use {"action":"clarify","reply":"one short question that offers two real campus places"}.'
)


def suggest_walk(question: str, lat: float, lng: float) -> tuple[str | None, list[PlaceHit], str | None]:
    """Return (answer, matching places, error). Exact coordinates go to the model."""
    if not settings.openai_api_key:
        return None, [], "Walk Buddy needs an OpenAI API key on the server."
    prompt = _user_prompt(question, lat, lng)
    try:
        response = httpx.post(
            _OPENAI,
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=30,
        )
    except httpx.HTTPError:
        return None, [], "The model could not be reached."
    if response.status_code != 200:
        return None, [], "The model did not answer."
    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError):
        return None, [], "The model did not answer."
    if not isinstance(content, str) or not content.strip():
        return None, [], "The model did not answer."
    answer, places = _read_reply(content)
    record_walk_buddy(prompt, answer)
    return answer, places, None


def _read_reply(content: str) -> tuple[str, list[PlaceHit]]:
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return content.strip(), []
    reply = payload.get("reply") if isinstance(payload, dict) else None
    answer = reply.strip() if isinstance(reply, str) and reply.strip() else content.strip()
    if not isinstance(payload, dict) or payload.get("action") != "route":
        return answer, []
    destination = payload.get("destination")
    if not isinstance(destination, str) or len(destination.strip()) < 2:
        return answer, []
    return answer, search_places(destination.strip(), limit=3)


def _user_prompt(question: str, lat: float, lng: float) -> str:
    return f"I'm at {lat}, {lng}. {question}"
