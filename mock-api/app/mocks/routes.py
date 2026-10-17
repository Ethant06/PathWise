from app.schemas.routes import (
    DataCoverage,
    LineStringGeometry,
    Provenance,
    RouteFactors,
    RouteMetrics,
    RoutePayload,
    RouteRequest,
    RouteResponse,
)

# Short walk near Red Square and Odegaard. Coordinates are [lng, lat].
_FAST = [
    [-122.30905, 47.65555],
    [-122.30940, 47.65570],
    [-122.30985, 47.65595],
    [-122.31020, 47.65625],
    [-122.31042, 47.65647],
]
_SAFE = [
    [-122.30905, 47.65555],
    [-122.30870, 47.65580],
    [-122.30890, 47.65620],
    [-122.30960, 47.65645],
    [-122.31042, 47.65647],
]

_COVERAGE = DataCoverage(
    walking_network=True,
    streetlights=True,
    sidewalks=True,
    crosswalks=True,
    places=True,
    unavailable=[],
    notes=[
        "Mock data only. These counts are examples for the UI, not a live query.",
        "Missing layers, when present, are unknown rather than unsafe.",
    ],
)

_PROVENANCE = [
    Provenance(
        layer="walking_network",
        source="OpenStreetMap via OSMnx (network_type=walk)",
        fetched_at="2026-10-17T06:23:58+00:00",
        ok=True,
        feature_count=23474,
    ),
    Provenance(
        layer="places",
        source="OpenStreetMap amenities/shops/tourism",
        fetched_at="2026-10-17T06:25:02+00:00",
        ok=True,
        feature_count=754,
    ),
    Provenance(
        layer="streetlights",
        source="Seattle City Light Poles FeatureServer",
        fetched_at="2026-10-17T06:25:02+00:00",
        ok=True,
        feature_count=4081,
    ),
    Provenance(
        layer="sidewalks",
        source="SDOT Sidewalks FeatureServer",
        fetched_at="2026-10-17T06:25:04+00:00",
        ok=True,
        feature_count=2295,
    ),
    Provenance(
        layer="crosswalks",
        source="SDOT Marked Crosswalks FeatureServer",
        fetched_at="2026-10-17T06:25:06+00:00",
        ok=True,
        feature_count=437,
    ),
]


def mock_routes(body: RouteRequest) -> RouteResponse:
    local = body.departure_time.isoformat()
    fastest = RoutePayload(
        geometry=LineStringGeometry(coordinates=_FAST),
        metrics=RouteMetrics(
            distance_m=280.0,
            duration_s=207.0,
            duration_min=3.5,
            extra_minutes_vs_fastest=0.0,
        ),
        explanation=(
            "Fastest uses the pedestrian network and estimated walking time only "
            "(3 min, 0.28 km)."
        ),
        factors=RouteFactors(
            edge_count=8,
            edges_near_streetlights=3,
            edges_near_sidewalks=4,
            edges_near_marked_crosswalks=1,
            open_place_proximity_sum=2,
            streetlight_coverage_share=0.38,
            sidewalk_coverage_share=0.5,
        ),
    )
    safety = RoutePayload(
        geometry=LineStringGeometry(coordinates=_SAFE),
        metrics=RouteMetrics(
            distance_m=340.0,
            duration_s=252.0,
            duration_min=4.2,
            extra_minutes_vs_fastest=0.7,
        ),
        explanation=(
            "Safety-focused prefers walkways near documented Seattle City Light poles, "
            "public places expected to be open at the selected time, mapped sidewalks, "
            "and marked crosswalks. It adds about 1 min, staying within roughly 30% "
            "extra walking time. This is not a crime forecast or a guarantee of safety."
        ),
        factors=RouteFactors(
            edge_count=11,
            edges_near_streetlights=9,
            edges_near_sidewalks=10,
            edges_near_marked_crosswalks=4,
            open_place_proximity_sum=6,
            streetlight_coverage_share=0.82,
            sidewalk_coverage_share=0.91,
            safety_mix=4.0,
        ),
    )
    return RouteResponse(
        fastest=fastest,
        safety_focused=safety,
        routes_identical=False,
        data_coverage=_COVERAGE,
        provenance=_PROVENANCE,
        departure_time_local=local,
    )
