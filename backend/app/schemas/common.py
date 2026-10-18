from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    detail: str = Field(examples=["Origin and destination are the same point."])


class HealthResponse(BaseModel):
    ok: bool
    ready: bool
    mock: bool = True
