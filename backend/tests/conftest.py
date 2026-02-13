"""Test configuration and shared fixtures."""

import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.core.database import async_session_maker
from app.main import app
from app.models.project import Project
from app.models.user import User


def run_async(coro):
    """Run async coroutine in sync pytest tests."""
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def clean_database() -> None:
    """Ensure tests run with a clean database state."""

    async def _clean() -> None:
        async with async_session_maker() as session:
            await session.execute(delete(Project))
            await session.execute(delete(User))
            await session.commit()

    run_async(_clean())
    yield
    run_async(_clean())


@pytest.fixture
def client() -> TestClient:
    """Create a test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def get_user_by_email():
    """Fetch a user row by email for assertions."""

    def _get(email: str) -> User | None:
        async def _fetch() -> User | None:
            async with async_session_maker() as session:
                result = await session.execute(select(User).where(User.email == email))
                return result.scalar_one_or_none()

        return run_async(_fetch())

    return _get
