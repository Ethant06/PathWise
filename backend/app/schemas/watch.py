from datetime import datetime

from pydantic import BaseModel, Field


class WatchStartRequest(BaseModel):
    walker_name: str = Field(min_length=1, max_length=80)
    watcher_handle: str = Field(min_length=8, max_length=20)
    destination_name: str = Field(min_length=1, max_length=120)


class WatchUpdateRequest(BaseModel):
    off_route: bool
    arrived: bool = False
    street: str | None = Field(default=None, max_length=80)
    lat: float | None = None
    lng: float | None = None


class WatchMessageOut(BaseModel):
    kind: str
    text: str
    sent_at: datetime
    delivered: bool = False


class WatchResponse(BaseModel):
    id: str
    watcher_name: str
    notice: str | None = None
    messages: list[WatchMessageOut]


class WatcherOut(BaseModel):
    name: str
    handle: str
    phone: str


class WatchersResponse(BaseModel):
    line: str
    watchers: list[WatcherOut]
