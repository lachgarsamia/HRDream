"""Test configuration and shared fixtures."""

import asyncio

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.main import app
from app.core.database import async_session_maker
from app.models.project import Project
from app.models.user import User


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Use one event loop for the full test session to avoid asyncpg loop binding issues."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def clean_database() -> None:
    """Ensure tests run with a clean database state."""
    async with async_session_maker() as session:
        await session.execute(delete(Project))
        await session.execute(delete(User))
        await session.commit()
    yield
    async with async_session_maker() as session:
        await session.execute(delete(Project))
        await session.execute(delete(User))
        await session.commit()


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """Create an async test client for FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client


@pytest_asyncio.fixture
async def get_user_by_email():
    """Fetch a user row by email for assertions."""

    async def _get(email: str) -> User | None:
        async with async_session_maker() as session:
            result = await session.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()

    return _get
