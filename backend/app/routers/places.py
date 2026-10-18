from fastapi import APIRouter, Query

from app.mocks.places import mock_places
from app.schemas.places import PlaceHit

router = APIRouter(tags=["places"])


@router.get("/api/places", response_model=list[PlaceHit])
def places(q: str = Query(..., min_length=2, max_length=80, examples=["odegaard"])) -> list[PlaceHit]:
    return mock_places(q)
