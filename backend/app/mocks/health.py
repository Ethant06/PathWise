from app.schemas.common import HealthResponse


def mock_health() -> HealthResponse:
    return HealthResponse(ok=True, ready=True, mock=True)
