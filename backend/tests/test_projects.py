"""Projects endpoint auth and scoping tests."""

from fastapi.testclient import TestClient


def _register_and_login(client: TestClient, email: str, password: str = "StrongPass123") -> str:
    register = client.post("/auth/register", json={"email": email, "password": password})
    assert register.status_code == 201

    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return login.json()["access_token"]


def test_projects_require_auth(client: TestClient) -> None:
    assert client.get("/projects").status_code == 401
    assert client.post("/projects", json={"name": "Test"}).status_code == 401


def test_projects_scoped_to_authenticated_user(client: TestClient) -> None:
    token_user_1 = _register_and_login(client, "owner@test.com")
    token_user_2 = _register_and_login(client, "other@test.com")

    create = client.post(
        "/projects",
        json={"name": "Owner Project", "description": "private"},
        headers={"Authorization": f"Bearer {token_user_1}"},
    )
    assert create.status_code == 201
    project_id = create.json()["id"]

    own_list = client.get("/projects", headers={"Authorization": f"Bearer {token_user_1}"})
    assert own_list.status_code == 200
    assert any(item["id"] == project_id for item in own_list.json()["items"])

    other_list = client.get("/projects", headers={"Authorization": f"Bearer {token_user_2}"})
    assert other_list.status_code == 200
    assert all(item["id"] != project_id for item in other_list.json()["items"])

    other_get = client.get(
        f"/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_user_2}"},
    )
    assert other_get.status_code == 404
