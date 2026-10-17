from fastapi import APIRouter

from app.mocks.status import mock_data_status
from app.schemas.status import DataStatusResponse

router = APIRouter(tags=["data status"])


@router.get("/api/data-status", response_model=DataStatusResponse)
def data_status() -> DataStatusResponse:
    return mock_data_status()
