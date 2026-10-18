from app.schemas.status import DataStatusResponse, MapCenter


def mock_data_status() -> DataStatusResponse:
    return DataStatusResponse(
        ready=True,
        message="Mock UW data is ready. No live download has run.",
        center=MapCenter(lat=47.6553, lng=-122.3035),
        bbox=[-122.332, 47.645, -122.280, 47.672],
        layers={
            "fetched_at": "2026-10-17T06:25:15+00:00",
            "coverage": {
                "walking_network": True,
                "streetlights": True,
                "sidewalks": True,
                "crosswalks": True,
                "places": True,
                "unavailable": [],
                "notes": ["Mock coverage. Treat unavailable layers as unknown, not unsafe."],
            },
            "walking_network": {"ok": True, "edges": 23474, "nodes": 8577},
            "places": {"ok": True, "feature_count": 754, "with_opening_hours": 520},
            "streetlights": {"ok": True, "feature_count": 4081},
            "sidewalks": {"ok": True, "feature_count": 2295},
            "crosswalks": {"ok": True, "feature_count": 437},
        },
    )
