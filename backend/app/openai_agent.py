"""OpenAI chat agent for Walk Buddy. Called by POST /api/walk-buddy."""

from __future__ import annotations

import httpx

from app.config import settings

OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"


def openai_chat(api_key: str, system: str, user: str) -> tuple[str | None, str | None]:
    """Return (assistant text, error) from the OpenAI chat completions API."""
    if not api_key:
        return None, "Walk Buddy needs an OpenAI API key on the server."
    try:
        response = httpx.post(
            OPENAI_CHAT_COMPLETIONS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=30,
        )
    except httpx.HTTPError:
        return None, "The model could not be reached."
    if response.status_code != 200:
        return None, "The model did not answer."
    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError):
        return None, "The model did not answer."
    if not isinstance(content, str) or not content.strip():
        return None, "The model did not answer."
    return content, None


def configured_api_key() -> str:
    return settings.openai_api_key
