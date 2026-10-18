from typing import Any

from pydantic import BaseModel, Field


class MapCenter(BaseModel):
    lat: float
    lng: float


class DataStatusResponse(BaseModel):
    ready: bool
    layers: dict[str, Any]
    center: MapCenter
    bbox: list[float] = Field(description="[west, south, east, north]")
    message: str
    mock: bool = True
