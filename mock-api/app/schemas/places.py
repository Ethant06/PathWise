from pydantic import BaseModel


class PlaceHit(BaseModel):
    name: str
    lat: float
    lng: float
    category: str
    osm_id: str
    opening_hours: str | None = None
