"""Ask a model for a walking suggestion, then name a destination the map can search."""

from __future__ import annotations

import json

from app.openai_agent import configured_api_key, openai_chat
from app.places import search_places
from app.schemas.places import PlaceHit
from app.veyzl import record_walk_buddy
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
    prompt = _user_prompt(question, lat, lng)
    content, error = openai_chat(configured_api_key(), _SYSTEM, prompt)
    if error is not None or content is None:
        return None, [], error or "The model did not answer."
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
