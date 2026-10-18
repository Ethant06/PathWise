from datetime import datetime

from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    """Same body the PathWise prototype accepts on POST /api/routes."""

    origin_lat: float = Field(..., ge=47.0, le=48.5, examples=[47.6553])
    origin_lng: float = Field(..., ge=-123.5, le=-121.5, examples=[-122.3090])
    dest_lat: float = Field(..., ge=47.0, le=48.5, examples=[47.6565])
    dest_lng: float = Field(..., ge=-123.5, le=-121.5, examples=[-122.3104])
    departure_time: datetime = Field(..., examples=["2026-10-17T21:30:00-07:00"])


class LineStringGeometry(BaseModel):
    type: str = "LineString"
    coordinates: list[list[float]] = Field(
        description="GeoJSON positions as [longitude, latitude]."
    )


class RouteMetrics(BaseModel):
    distance_m: float
    duration_s: float
    duration_min: float
    extra_minutes_vs_fastest: float = 0.0


class RouteFactors(BaseModel):
    """Documented support along the path. Missing data stays null, not unsafe."""

    edge_count: int
    edges_near_streetlights: int
    edges_near_sidewalks: int
    edges_near_marked_crosswalks: int
    open_place_proximity_sum: int
    streetlight_coverage_share: float | None = None
    sidewalk_coverage_share: float | None = None
    safety_mix: float | None = Field(
        default=None,
        description="Internal mix strength used for the safety-focused path. Not a probability.",
    )

    model_config = {"extra": "allow"}


class RoutePayload(BaseModel):
    geometry: LineStringGeometry
    metrics: RouteMetrics
    explanation: str
    factors: RouteFactors


class DataCoverage(BaseModel):
    walking_network: bool
    streetlights: bool
    sidewalks: bool
    crosswalks: bool
    places: bool
    unavailable: list[str]
    notes: list[str]


class Provenance(BaseModel):
    layer: str
    source: str
    fetched_at: str
    ok: bool
    feature_count: int | None = None
    error: str | None = None

    model_config = {"extra": "allow"}


class RouteResponse(BaseModel):
    fastest: RoutePayload
    safety_focused: RoutePayload
    routes_identical: bool
    data_coverage: DataCoverage
    provenance: list[Provenance]
    departure_time_local: str
    mock: bool = True

    model_config = {"extra": "allow"}
