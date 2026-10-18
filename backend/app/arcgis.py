"""Paginated ArcGIS FeatureServer downloads (GeoJSON, WGS84)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

USER_AGENT = "PathWise-UW-MVP/1.0 (student navigation research)"


def fetch_arcgis_layer(
    layer_url: str,
    bbox: tuple[float, float, float, float],
    timeout_s: float = 60.0,
    page_size: int = 1000,
) -> dict[str, Any]:
    """Return GeoJSON FeatureCollection clipped to bbox, plus fetch metadata."""
    west, south, east, north = bbox
    envelope = f"{west},{south},{east},{north}"
    features: list[dict[str, Any]] = []
    offset = 0
    fetched_at = datetime.now(timezone.utc).isoformat()
    error: str | None = None

    params_base = {
        "where": "1=1",
        "geometry": envelope,
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
        "resultRecordCount": str(page_size),
    }

    try:
        with httpx.Client(timeout=timeout_s, headers={"User-Agent": USER_AGENT}) as client:
            while True:
                params = {**params_base, "resultOffset": str(offset)}
                response = client.get(f"{layer_url}/query", params=params)
                response.raise_for_status()
                payload = response.json()
                if payload.get("error"):
                    raise RuntimeError(str(payload["error"]))
                batch = payload.get("features") or []
                features.extend(batch)
                exceeded = bool(payload.get("exceededTransferLimit")) or payload.get(
                    "properties", {}
                ).get("exceededTransferLimit")
                if not batch or (len(batch) < page_size and not exceeded):
                    break
                offset += len(batch)
                if offset > 200_000:
                    break
    except Exception as exc:  # noqa: BLE001 — ingestion must continue with other layers
        error = f"{type(exc).__name__}: {exc}"
        features = []

    return {
        "type": "FeatureCollection",
        "features": features,
        "pathwise_meta": {
            "source_url": layer_url,
            "fetched_at": fetched_at,
            "feature_count": len(features),
            "bbox": list(bbox),
            "error": error,
            "ok": error is None,
        },
    }
