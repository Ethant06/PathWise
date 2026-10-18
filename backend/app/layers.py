"""Read the downloaded UW cache and report it in the mock data-status shape."""

from __future__ import annotations

import json
from typing import Any

from app.config import BBOX, GRAPH_PATH, MANIFEST_PATH, UW_CENTER_LAT, UW_CENTER_LNG
from app.schemas.status import DataStatusResponse, MapCenter

_LAYER_NAMES = (
    "walking_network",
    "streetlights",
    "sidewalks",
    "crosswalks",
    "places",
)


def live_data_status() -> DataStatusResponse:
    manifest, error = _read_manifest()
    graph_ready = GRAPH_PATH.exists()
    layers = (manifest or {}).get("layers") or {}
    coverage = _coverage(layers if error is None else {})
    if not graph_ready:
        coverage["walking_network"] = False
        if "walking_network" not in coverage["unavailable"]:
            coverage["unavailable"] = ["walking_network", *coverage["unavailable"]]
        missing = "walking_network: Cached walk graph not found. Run: python scripts/ingest.py"
        coverage["notes"] = [
            missing,
            *[note for note in coverage["notes"] if not str(note).startswith("walking_network:")],
        ]
        error = error or "Cached walk graph not found. Run: python scripts/ingest.py"
    ready = error is None and graph_ready and bool(manifest)

    message = "UW walk graph ready." if ready else (error or "Not ready.")
    return DataStatusResponse(
        ready=ready,
        message=message,
        center=MapCenter(lat=UW_CENTER_LAT, lng=UW_CENTER_LNG),
        bbox=list(BBOX),
        layers={
            **layers,
            "coverage": coverage,
            "fetched_at": (manifest or {}).get("fetched_at") if ready else None,
        },
        mock=False,
    )


def _read_manifest() -> tuple[dict[str, Any] | None, str | None]:
    if not MANIFEST_PATH.exists():
        return None, "Cached walk graph not found. Run: python scripts/ingest.py"
    try:
        loaded = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return None, f"{type(exc).__name__}: {exc}"
    if not isinstance(loaded, dict):
        return None, "manifest.json is not an object."
    return loaded, None


def _coverage(layers: dict[str, Any]) -> dict[str, Any]:
    unavailable: list[str] = []
    notes: list[str] = []
    flags: dict[str, Any] = {}
    for name in _LAYER_NAMES:
        meta = layers.get(name) or {}
        ok = bool(meta.get("ok"))
        flags[name] = ok
        if not ok:
            unavailable.append(name)
            notes.append(f"{name}: {meta.get('error') or 'not downloaded'}")
        elif name == "places":
            total = meta.get("feature_count") or 0
            hours = meta.get("with_opening_hours") or 0
            notes.append(
                f"places: {total} public POIs cached; {hours} have opening_hours tags. "
                "Missing hours are treated as unknown, not closed."
            )
    flags["unavailable"] = unavailable
    flags["notes"] = notes
    return flags
