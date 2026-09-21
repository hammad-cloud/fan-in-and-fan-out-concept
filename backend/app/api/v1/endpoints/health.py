from fastapi import APIRouter

from app.api.health import build_health_response
from app.api.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return build_health_response()
