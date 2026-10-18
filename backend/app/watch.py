"""Decide when a night walk should text the person watching."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from math import hypot
from uuid import uuid4

OFF_ROUTE_HOLD = timedelta(seconds=20)
STILL_HOLD = timedelta(seconds=20)
# Standing still jitters a few meters. Walking past this counts as moving again.
STILL_METERS = 12.0

_sessions: dict[str, "WatchSession"] = {}


@dataclass
class WatchMessage:
    kind: str
    text: str
    sent_at: datetime
    delivered: bool = False


@dataclass
class WatchSession:
    id: str
    walker_name: str
    watcher_name: str
    destination_name: str
    off_since: datetime | None = None
    still_since: datetime | None = None
    anchor_lat: float | None = None
    anchor_lng: float | None = None
    alerted_off: bool = False
    alerted_still: bool = False
    alerted_arrived: bool = False
    notice: str | None = None
    messages: list[WatchMessage] = field(default_factory=list)


def start_watch(walker_name: str, watcher_name: str, destination_name: str) -> WatchSession:
    session = WatchSession(
        id=uuid4().hex,
        walker_name=walker_name.strip() or "Someone",
        watcher_name=watcher_name.strip(),
        destination_name=destination_name.strip() or "the destination",
    )
    _sessions[session.id] = session
    return session


def get_watch(watch_id: str) -> WatchSession | None:
    return _sessions.get(watch_id)


def update_watch(
    session: WatchSession,
    *,
    off_route: bool,
    arrived: bool,
    street: str | None,
    lat: float | None = None,
    lng: float | None = None,
    now: datetime | None = None,
) -> list[WatchMessage]:
    """Return only the texts created by this update."""
    moment = now or datetime.now(timezone.utc)
    if arrived and not session.alerted_arrived:
        session.alerted_arrived = True
        return [_send(session, "arrived", f"{session.walker_name} got to {session.destination_name}.", moment)]
    if arrived or session.alerted_arrived:
        return []

    _note_motion(session, lat, lng, moment)
    if not off_route:
        session.off_since = None
        session.alerted_off = False
    elif session.off_since is None:
        session.off_since = moment

    off_held = (
        off_route
        and session.off_since is not None
        and moment - session.off_since >= OFF_ROUTE_HOLD
        and not session.alerted_off
    )
    still_held = (
        session.still_since is not None
        and moment - session.still_since >= STILL_HOLD
        and not session.alerted_still
        and not off_route
    )
    if off_held:
        session.alerted_off = True
        session.alerted_still = True
        place = _place(street)
        text = (
            f"{session.walker_name} stopped{place}. "
            f"They are not on the walk to {session.destination_name}."
        )
        return [_send(session, "off_route", text, moment)]
    if still_held:
        session.alerted_still = True
        place = _place(street)
        text = (
            f"{session.walker_name} stopped{place}. "
            f"They have not moved on the walk to {session.destination_name}."
        )
        return [_send(session, "still", text, moment)]
    return []


def _place(street: str | None) -> str:
    if street and street.strip():
        return f" on {street.strip()}"
    return ""


def _note_motion(session: WatchSession, lat: float | None, lng: float | None, moment: datetime) -> None:
    if lat is None or lng is None:
        return
    if session.anchor_lat is None or session.anchor_lng is None or session.still_since is None:
        session.anchor_lat = lat
        session.anchor_lng = lng
        session.still_since = moment
        return
    moved = _meters(session.anchor_lat, session.anchor_lng, lat, lng)
    if moved <= STILL_METERS:
        return
    session.anchor_lat = lat
    session.anchor_lng = lng
    session.still_since = moment
    session.alerted_still = False


def _meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dy = (lat1 - lat2) * 111_320
    dx = (lng1 - lng2) * 75_000
    return hypot(dx, dy)


def _send(session: WatchSession, kind: str, text: str, moment: datetime) -> WatchMessage:
    message = WatchMessage(kind=kind, text=text, sent_at=moment)
    session.messages.append(message)
    return message
