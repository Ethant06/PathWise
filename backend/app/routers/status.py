from fastapi import APIRouter

from app.layers import live_data_status
from app.schemas.status import DataStatusResponse

router = APIRouter(tags=["data status"])


@router.get("/api/data-status", response_model=DataStatusResponse)
def data_status() -> DataStatusResponse:
    return live_data_status()
