from fastapi import APIRouter, HTTPException

from app.buddy import suggest_walk
from app.schemas.buddy import WalkBuddyRequest, WalkBuddyResponse
from app.schemas.common import ErrorBody

router = APIRouter(tags=["buddy"])


@router.post(
    "/api/walk-buddy",
    response_model=WalkBuddyResponse,
    responses={503: {"model": ErrorBody}},
)
def walk_buddy(body: WalkBuddyRequest) -> WalkBuddyResponse:
    answer, places, error = suggest_walk(body.question, body.lat, body.lng)
    if error is not None or answer is None:
        raise HTTPException(status_code=503, detail=error or "The model did not answer.")
    return WalkBuddyResponse(answer=answer, places=places)
