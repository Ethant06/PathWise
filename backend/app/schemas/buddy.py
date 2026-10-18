from pydantic import BaseModel, Field


class WalkBuddyRequest(BaseModel):
    question: str = Field(min_length=1)
    lat: float
    lng: float


class WalkBuddyResponse(BaseModel):
    answer: str
