"""Application entry point.

Run with:
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  python -m app
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import build_health_response
from app.api.schemas import HealthResponse
from app.api.v1.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Pakistani price comparison API",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/health", response_model=HealthResponse, tags=["health"])
    async def health() -> HealthResponse:
        return build_health_response()

    application.include_router(api_router, prefix="/api/v1")
    return application


app = create_app()
