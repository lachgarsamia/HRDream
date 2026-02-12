"""
Health Check Endpoints
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str
    timestamp: datetime
    version: str
    environment: str


class DetailedHealthResponse(HealthResponse):
    """Detailed health check with component status."""

    components: dict[str, Any]


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Basic health check endpoint.
    Returns service status for load balancer/orchestrator health probes.
    """
    from app import __version__
    from app.config import get_settings

    settings = get_settings()

    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        version=__version__,
        environment=settings.environment,
    )


@router.get("/health/detailed", response_model=DetailedHealthResponse)
async def detailed_health_check() -> DetailedHealthResponse:
    """
    Detailed health check with component status.
    Checks database and Redis connectivity.
    """
    from app import __version__
    from app.config import get_settings

    settings = get_settings()

    components: dict[str, Any] = {
        "api": {"status": "healthy"},
        "database": {"status": "unknown"},
        "redis": {"status": "unknown"},
    }

    # TODO: Add actual database and Redis checks in later slices
    # For now, mark as unknown until we wire up connections

    overall_status = "healthy"
    if any(c.get("status") == "unhealthy" for c in components.values()):
        overall_status = "unhealthy"

    return DetailedHealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        version=__version__,
        environment=settings.environment,
        components=components,
    )
