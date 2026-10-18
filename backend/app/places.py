"""Search cached public places. Success JSON matches PlaceHit."""

from __future__ import annotations

import json

from app.config import POIS_PATH, UW_CENTER_LAT, UW_CENTER_LNG
from app.schemas.places import PlaceHit

_MISSING = {"nan", "none", "<na>", "nat", ":"}
_SKIP_WORDS = {"the", "at", "of", "and", "a", "an", "in", "on"}


def search_places(query: str, limit: int = 20) -> list[PlaceHit]:
    q = query.strip().lower()
    scored: list[tuple[int, float, str, PlaceHit]] = []
    for place in _load_places():
        rank = _rank(q, place)
        if rank is None:
            continue
        scored.append((rank, _campus_distance(place), place.name, place))
    scored.sort(key=lambda item: (item[0], item[1], item[2]))
    return [item[3] for item in scored[:limit]]


def _rank(query: str, place: PlaceHit) -> int | None:
    name = place.name.lower()
    category = place.category.lower()
    if query in name:
        return 0 if name.startswith(query) else 1
    words = [word for word in query.split() if len(word) >= 3 and word not in _SKIP_WORDS]
    if words and all(word in name for word in words):
        return 2
    if category and query in category:
        return 3
    return None


def _campus_distance(place: PlaceHit) -> float:
    """Squared distance from campus, with longitude scaled to roughly match latitude."""
    dlat = place.lat - UW_CENTER_LAT
    dlng = (place.lng - UW_CENTER_LNG) * 0.67
    return dlat * dlat + dlng * dlng


def places_cache_error() -> str | None:
    if not POIS_PATH.exists():
        return "Cached places not found. Run: python scripts/ingest.py"
    return None


def _load_places() -> list[PlaceHit]:
    loaded = json.loads(POIS_PATH.read_text(encoding="utf-8"))
    features = loaded.get("features") if isinstance(loaded, dict) else None
    if not isinstance(features, list):
        return []
    places: list[PlaceHit] = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        props = feature.get("properties") or {}
        point = _point(feature.get("geometry"))
        if point is None:
            continue
        lng, lat = point
        name = _label(props.get("name")) or "Place"
        places.append(
            PlaceHit(
                name=name,
                lat=lat,
                lng=lng,
                category=_label(props.get("category")),
                osm_id=_label(props.get("osm_id")) or f"{lat:.5f},{lng:.5f}",
                opening_hours=_hours(props.get("opening_hours")),
            )
        )
    return places


def _point(geometry: object) -> tuple[float, float] | None:
    if not isinstance(geometry, dict):
        return None
    coordinates = geometry.get("coordinates")
    if geometry.get("type") == "Point" and isinstance(coordinates, list) and len(coordinates) >= 2:
        return float(coordinates[0]), float(coordinates[1])
    found = _first_pair(coordinates)
    if found is None:
        return None
    return found


def _first_pair(value: object) -> tuple[float, float] | None:
    if isinstance(value, list) and len(value) >= 2 and isinstance(value[0], (int, float)):
        return float(value[0]), float(value[1])
    if isinstance(value, list):
        for item in value:
            found = _first_pair(item)
            if found is not None:
                return found
    return None


def _label(value: object) -> str:
    text = str(value or "").strip()
    if text.lower() in _MISSING:
        return ""
    return text


def _hours(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None
