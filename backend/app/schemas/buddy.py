from pydantic import BaseModel, Field

from app.schemas.places import PlaceHit


class WalkBuddyRequest(BaseModel):
    question: str = Field(min_length=1)
    lat: float
    lng: float


class WalkBuddyResponse(BaseModel):
    answer: str
    places: list[PlaceHit] = []
