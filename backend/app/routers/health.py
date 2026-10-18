from fastapi import APIRouter

from app.mocks.health import mock_health
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return mock_health()
