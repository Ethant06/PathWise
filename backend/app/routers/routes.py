from fastapi import APIRouter, HTTPException

from app.schemas.common import ErrorBody
from app.schemas.routes import RouteRequest, RouteResponse
from app.walk import build_route, graph_status

router = APIRouter(tags=["routes"])


@router.post(
    "/api/routes",
    response_model=RouteResponse,
    responses={400: {"model": ErrorBody}, 503: {"model": ErrorBody}},
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
    ready, error = graph_status()
    if not ready:
        raise HTTPException(status_code=503, detail=error or "Walk graph is not loaded.")
    try:
        return build_route(
            body.origin_lat,
            body.origin_lng,
            body.dest_lat,
            body.dest_lng,
            body.departure_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
