from fastapi import APIRouter, HTTPException

from app.mocks.routes import mock_routes
from app.schemas.common import ErrorBody
from app.schemas.routes import RouteRequest, RouteResponse

router = APIRouter(tags=["routes"])


@router.post(
    "/api/routes",
    response_model=RouteResponse,
    responses={400: {"model": ErrorBody}},
)
def routes(body: RouteRequest) -> RouteResponse:
    same_point = (
        abs(body.origin_lat - body.dest_lat) < 0.00001
        and abs(body.origin_lng - body.dest_lng) < 0.00001
    )
    if same_point:
        raise HTTPException(
            status_code=400,
            detail="Origin and destination are the same point. Pick two different places.",
        )
    return mock_routes(body)
