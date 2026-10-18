"""Load the cached walk graph once and build a route response."""

from __future__ import annotations

import pickle
from datetime import datetime
from typing import Any

import networkx as nx

from app.config import GRAPH_PATH
from app.layers import _coverage, _read_manifest
from app.places import _load_places
from app.routing import compute_routes
from app.schemas.routes import RouteResponse

_graph: nx.MultiDiGraph | None = None
_load_error: str | None = None
_loaded = False


def graph_status() -> tuple[bool, str | None]:
    _ensure_loaded()
    return _graph is not None, _load_error


def build_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    departure_time: datetime,
) -> RouteResponse:
    ready, error = graph_status()
    if not ready or _graph is None:
        raise RuntimeError(error or "Cached walk graph not found. Run: python scripts/ingest.py")
    manifest, manifest_error = _read_manifest()
    layers = (manifest or {}).get("layers") or {}
    coverage = _coverage(layers if manifest_error is None else {})
    payload = compute_routes(
        _graph,
        coverage,
        _poi_hours(),
        _provenance(layers),
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        departure_time,
    )
    return RouteResponse.model_validate(payload)


def _ensure_loaded() -> None:
    global _graph, _load_error, _loaded
    if _loaded:
        return
    _loaded = True
    if not GRAPH_PATH.exists():
        _load_error = "Cached walk graph not found. Run: python scripts/ingest.py"
        return
    try:
        with GRAPH_PATH.open("rb") as handle:
            loaded = pickle.load(handle)
        if not isinstance(loaded, nx.MultiDiGraph):
            raise TypeError("walk_graph.pkl is not a walk graph.")
        _graph = loaded
        _load_error = None
    except Exception as exc:  # noqa: BLE001
        _graph = None
        _load_error = f"{type(exc).__name__}: {exc}"


def _poi_hours() -> dict[str, str | None]:
    try:
        return {place.osm_id: place.opening_hours for place in _load_places()}
    except (OSError, ValueError):
        return {}


def _provenance(layers: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for name, meta in layers.items():
        if not isinstance(meta, dict):
            continue
        count = meta.get("feature_count")
        if count is None:
            count = meta.get("edges") or meta.get("nodes")
        rows.append(
            {
                "layer": name,
                "source": meta.get("source") or meta.get("source_url") or "",
                "fetched_at": meta.get("fetched_at") or "",
                "ok": bool(meta.get("ok")),
                "feature_count": count,
                "error": meta.get("error"),
            }
        )
    return rows
