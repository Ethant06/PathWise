"""Ask a model for a walking suggestion grounded in places we actually found."""

from __future__ import annotations

import json
import re

from app.openai_agent import cited_source, configured_api_key, openai_chat
from app.places import search_places
from app.schemas.places import PlaceHit
from app.veyzl import record_walk_buddy

_SYSTEM = (
    "You help people walk around the University of Washington. "
    "They are already at the coordinates in the user message. Never ask where they are starting. "
    "Reply with JSON only. "
    "State a place only when it appears in the Sources list. "
    "Every factual sentence must cite that place as [Source: Exact Name]. "
    "Do not invent streets, distances, or buildings. "
    'If one source fits, use {"action":"route","destination":"Exact Name","reply":"one sentence [Source: Exact Name]"}. '
    'If none fit or several might, use {"action":"clarify","reply":"one short question [Source: Exact Name]"} '
    "and mention only names from Sources."
)
_SKIP = {"walk", "quiet", "from", "this", "that", "take", "with", "your", "near", "campus", "somewhere", "please", "route", "going", "want", "need"}


def suggest_walk(question: str, lat: float, lng: float) -> tuple[str | None, list[PlaceHit], str | None]:
    """Return (answer, matching places, error). Exact coordinates go to the model."""
    sources = _retrieve(question)
    prompt = _user_prompt(question, lat, lng, sources)
    if not sources:
        answer = "Name a campus building or landmark. I won't guess a place that isn't in the directory."
        record_walk_buddy(prompt, answer)
        return answer, [], None
    content, error = openai_chat(configured_api_key(), _SYSTEM, prompt)
    if error is not None or content is None:
        return None, [], error or "The model did not answer."
    answer, places = _read_reply(content, sources)
    record_walk_buddy(prompt, answer)
    return answer, places, None


def _retrieve(question: str) -> list[PlaceHit]:
    words = [word for word in re.findall(r"[A-Za-z0-9']+", question) if len(word) >= 4 and word.lower() not in _SKIP]
    found: list[PlaceHit] = []
    seen: set[str] = set()
    for word in words:
        for place in search_places(word, limit=3):
            if place.osm_id in seen:
                continue
            seen.add(place.osm_id)
            found.append(place)
    return found[:5]


def _read_reply(content: str, sources: list[PlaceHit]) -> tuple[str, list[PlaceHit]]:
    """Keep a route only when the reply cites a retrieved place. Otherwise drop the claim."""
    by_name = {place.name.casefold(): place for place in sources}
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return _reject(sources), sources[:3]
    reply = payload.get("reply") if isinstance(payload, dict) else None
    answer = reply.strip() if isinstance(reply, str) and reply.strip() else ""
    destination = payload.get("destination") if isinstance(payload, dict) else None
    cited = cited_source(answer, [place.name for place in sources])
    if (
        isinstance(payload, dict)
        and payload.get("action") == "route"
        and isinstance(destination, str)
        and destination.strip().casefold() in by_name
        and cited is not None
        and cited.casefold() == destination.strip().casefold()
        and cited.casefold() in by_name
    ):
        return answer, [by_name[cited.casefold()]]
    if cited is not None and payload.get("action") == "clarify":
        return answer, []
    return _reject(sources), sources[:3]


def _reject(sources: list[PlaceHit]) -> str:
    names = ", ".join(place.name for place in sources[:3])
    return f"I won't state a route I can't cite. Places we found: {names}."


def _user_prompt(question: str, lat: float, lng: float, sources: list[PlaceHit]) -> str:
    lines = "\n".join(f"- {place.name}" for place in sources) or "- none"
    return f"I'm at {lat}, {lng}. {question}\n\nSources:\n{lines}"
