"""Authentication end-to-end tests."""

from fastapi.testclient import TestClient

from app.core.auth import verify_password


def test_register_creates_user(client: TestClient, get_user_by_email) -> None:
    response = client.post(
        "/auth/register",
        json={"email": "samia@test.com", "password": "StrongPass123"},
    )

    assert response.status_code == 201
    data = response.json()
    assert set(data.keys()) == {"id", "email"}
    assert data["email"] == "samia@test.com"

    user = get_user_by_email("samia@test.com")
    assert user is not None
    assert user.email == "samia@test.com"
    assert user.password_hash != "StrongPass123"
    assert verify_password("StrongPass123", user.password_hash) is True


def test_register_duplicate_email(client: TestClient) -> None:
    payload = {"email": "dup@test.com", "password": "StrongPass123"}
    first = client.post("/auth/register", json=payload)
    second = client.post("/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "Email already registered"


def test_login_success_returns_jwt(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={"email": "login@test.com", "password": "StrongPass123"},
    )

    response = client.post(
        "/auth/login",
        json={"email": "login@test.com", "password": "StrongPass123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 20


def test_login_wrong_password_401(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={"email": "wrong@test.com", "password": "StrongPass123"},
    )

    response = client.post(
        "/auth/login",
        json={"email": "wrong@test.com", "password": "bad-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_me_requires_auth(client: TestClient) -> None:
    response = client.get("/me")
    assert response.status_code == 401


def test_me_returns_user_with_valid_token(client: TestClient) -> None:
    register = client.post(
        "/auth/register",
        json={"email": "me@test.com", "password": "StrongPass123"},
    )
    user = register.json()

    login = client.post(
        "/auth/login",
        json={"email": "me@test.com", "password": "StrongPass123"},
    )
    token = login.json()["access_token"]

    me = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert me.status_code == 200
    profile = me.json()
    assert profile["id"] == user["id"]
    assert profile["email"] == "me@test.com"
    assert "created_at" in profile
