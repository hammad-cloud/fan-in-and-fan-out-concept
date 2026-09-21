from app.api.schemas import HealthResponse
from app.core.config import get_settings


def build_health_response() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
    )
