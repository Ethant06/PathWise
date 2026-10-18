"""Ask a model for a walking suggestion. The first version forwards the question as given."""

from __future__ import annotations

import httpx

from app.config import settings

_OPENAI = "https://api.openai.com/v1/chat/completions"
_MODEL = "gpt-4o-mini"


def suggest_walk(question: str, lat: float, lng: float) -> tuple[str | None, str | None]:
    """Return (answer, error). Exact coordinates go to the model."""
    if not settings.openai_api_key:
        return None, "Walk Buddy needs an OpenAI API key on the server."
    try:
        response = httpx.post(
            _OPENAI,
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You suggest walking routes around the University of Washington campus.",
                    },
                    {"role": "user", "content": f"I'm at {lat}, {lng}. {question}"},
                ],
            },
            timeout=30,
        )
    except httpx.HTTPError:
        return None, "The model could not be reached."
    if response.status_code != 200:
        return None, "The model did not answer."
    try:
        answer = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError):
        return None, "The model did not answer."
    if not isinstance(answer, str) or not answer.strip():
        return None, "The model did not answer."
    return answer.strip(), None
