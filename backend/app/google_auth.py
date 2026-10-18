"""Check a Google ID token with Google before creating a session."""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.config import settings

_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    name: str


def _client_ids() -> set[str]:
    return {item.strip() for item in settings.google_client_ids.split(",") if item.strip()}


def verify_google_id_token(id_token: str) -> GoogleIdentity:
    """Require a real Google sign-in. The demo token is not accepted."""
    if id_token == "mock-google-token":
        raise ValueError("Google sign-in must use your Google account. The demo token is not accepted.")
    audiences = _client_ids()
    if not audiences:
        raise ValueError("Google sign-in is not configured on the server.")

    try:
        response = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise ValueError("Could not reach Google to check this sign-in.") from exc
    if response.status_code != 200:
        raise ValueError("Google did not accept this sign-in.")

    data = response.json()
    if data.get("aud") not in audiences:
        raise ValueError("This Google sign-in was issued for a different app.")
    if data.get("iss") not in _GOOGLE_ISSUERS:
        raise ValueError("This sign-in did not come from Google.")
    if str(data.get("email_verified")).lower() != "true":
        raise ValueError("Google has not verified this email address.")

    email = data.get("email")
    subject = data.get("sub")
    if not isinstance(email, str) or not email or not isinstance(subject, str) or not subject:
        raise ValueError("Google did not share an email address. Allow email access to sign in.")

    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        name = email.split("@", 1)[0]
    return GoogleIdentity(sub=subject, email=email.lower(), name=name.strip())
