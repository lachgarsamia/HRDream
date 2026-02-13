"""Projects endpoint auth and scoping tests."""

import pytest
from httpx import AsyncClient


async def _register_and_login(
    client: AsyncClient, email: str, password: str = "StrongPass123"
) -> str:
    register = await client.post("/auth/register", json={"email": email, "password": password})
    assert register.status_code == 201

    login = await client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return login.json()["access_token"]


@pytest.mark.asyncio
async def test_projects_require_auth(client: AsyncClient) -> None:
    assert (await client.get("/projects")).status_code == 401
    assert (await client.post("/projects", json={"name": "Test"})).status_code == 401


@pytest.mark.asyncio
async def test_projects_scoped_to_authenticated_user(client: AsyncClient) -> None:
    token_user_1 = await _register_and_login(client, "owner@test.com")
    token_user_2 = await _register_and_login(client, "other@test.com")

    create = await client.post(
        "/projects",
        json={"name": "Owner Project", "description": "private"},
        headers={"Authorization": f"Bearer {token_user_1}"},
    )
    assert create.status_code == 201
    project_id = create.json()["id"]

    own_list = await client.get("/projects", headers={"Authorization": f"Bearer {token_user_1}"})
    assert own_list.status_code == 200
    assert any(item["id"] == project_id for item in own_list.json()["items"])

    other_list = await client.get("/projects", headers={"Authorization": f"Bearer {token_user_2}"})
    assert other_list.status_code == 200
    assert all(item["id"] != project_id for item in other_list.json()["items"])

    other_get = await client.get(
        f"/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_user_2}"},
    )
    assert other_get.status_code == 404
