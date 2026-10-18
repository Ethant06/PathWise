from fastapi import APIRouter, HTTPException, Query

from app.places import places_cache_error, search_places
from app.schemas.common import ErrorBody
from app.schemas.places import PlaceHit

router = APIRouter(tags=["places"])


@router.get(
    "/api/places",
    response_model=list[PlaceHit],
    responses={503: {"model": ErrorBody}},
)
def places(q: str = Query(..., min_length=2, max_length=80, examples=["odegaard"])) -> list[PlaceHit]:
    error = places_cache_error()
    if error is not None:
        raise HTTPException(status_code=503, detail=error)
    return search_places(q)
