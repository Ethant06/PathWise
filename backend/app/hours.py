"""Parse a practical subset of OSM opening_hours in America/Los_Angeles.

Unsupported or missing formats return None (unknown), never guessed closed/open.
"""

from __future__ import annotations

import re
from datetime import datetime, time, timedelta
from typing import Optional

from app.config import PACIFIC_TZ

_DAY = {"mo": 0, "tu": 1, "we": 2, "th": 3, "fr": 4, "sa": 5, "su": 6}
_UNSUPPORTED = re.compile(
    r"\b(ph|sh|week|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|"
    r"sunrise|sunset|dawn|dusk|\+|open|\?)\b",
    re.IGNORECASE,
)
_TIME = re.compile(r"^(\d{1,2}):(\d{2})$")


def is_open_at(opening_hours: Optional[str], when: datetime) -> Optional[bool]:
    """True/False if evaluable, None if missing or unsupported."""
    if opening_hours is None:
        return None
    raw = str(opening_hours).strip()
    if not raw:
        return None
    lowered = raw.lower()
    if lowered in {"24/7", "24-7", "24h"}:
        return True
    if lowered in {"closed", "off"}:
        return False
    if _UNSUPPORTED.search(lowered):
        return None

    local = when.astimezone(PACIFIC_TZ)
    weekday = local.weekday()  # Monday=0
    minutes = local.hour * 60 + local.minute

    rules = [part.strip() for part in raw.split(";") if part.strip()]
    if not rules:
        return None

    matched: Optional[bool] = None
    parsed_any = False
    for rule in rules:
        result = _eval_rule(rule, weekday, minutes)
        if result is None:
            return None
        parsed_any = True
        # later rules override earlier ones (OSM convention)
        if result["applies"]:
            matched = result["open"]

    if not parsed_any:
        return None
    if matched is None:
        return False
    return matched


def _eval_rule(rule: str, weekday: int, minutes: int) -> Optional[dict]:
    text = rule.strip()
    if not text:
        return None
    low = text.lower()
    if low == "off":
        return {"applies": True, "open": False}

    days, times_part = _split_days_times(text)
    if days is None:
        return None
    if weekday not in days:
        return {"applies": False, "open": False}

    if times_part is None or times_part.lower() in {"off", "closed"}:
        return {"applies": True, "open": False}
    if times_part.lower() in {"24/7", "open"}:
        return {"applies": True, "open": True}

    intervals = _parse_intervals(times_part)
    if intervals is None:
        return None
    for start, end in intervals:
        if _in_interval(minutes, start, end):
            return {"applies": True, "open": True}
    return {"applies": True, "open": False}


def _split_days_times(rule: str) -> tuple[Optional[set[int]], Optional[str]]:
    low = rule.lower().strip()
    tokens = low.split()
    if not tokens:
        return None, None

    if _TIME.match(tokens[0]) or tokens[0][0].isdigit():
        return set(range(7)), rule.strip()

    day_token = tokens[0]
    rest = " ".join(tokens[1:]) if len(tokens) > 1 else None
    days = _parse_days(day_token)
    if days is None:
        return None, None
    return days, rest


def _parse_days(token: str) -> Optional[set[int]]:
    days: set[int] = set()
    for chunk in token.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            a, b = chunk.split("-", 1)
            if a not in _DAY or b not in _DAY:
                return None
            start, end = _DAY[a], _DAY[b]
            if start <= end:
                days.update(range(start, end + 1))
            else:
                days.update(list(range(start, 7)) + list(range(0, end + 1)))
        else:
            if chunk not in _DAY:
                return None
            days.add(_DAY[chunk])
    return days or None


def _parse_intervals(times_part: str) -> Optional[list[tuple[int, int]]]:
    intervals: list[tuple[int, int]] = []
    for chunk in times_part.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" not in chunk:
            return None
        a, b = chunk.split("-", 1)
        start = _parse_hhmm(a.strip())
        end = _parse_hhmm(b.strip())
        if start is None or end is None:
            return None
        intervals.append((start, end))
    return intervals or None


def _parse_hhmm(value: str) -> Optional[int]:
    match = _TIME.match(value)
    if not match:
        return None
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour == 24 and minute == 0:
        return 24 * 60
    if hour > 23 or minute > 59:
        return None
    return hour * 60 + minute


def _in_interval(minutes: int, start: int, end: int) -> bool:
    if start == end:
        return False
    if start < end:
        return start <= minutes < end
    return minutes >= start or minutes < end


def as_pacific(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=PACIFIC_TZ)
    return dt.astimezone(PACIFIC_TZ)
