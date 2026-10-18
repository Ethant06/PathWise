from fastapi import APIRouter

from app.schemas.common import HealthResponse
from app.walk import graph_status

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    ready, _error = graph_status()
    return HealthResponse(ok=True, ready=ready, mock=False)
