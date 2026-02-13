"""Health check routes."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, bool]:
    """Unprotected health check endpoint."""
    return {"ok": True}
