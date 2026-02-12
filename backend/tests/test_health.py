"""
Health Endpoint Tests
"""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    """Test basic health check endpoint returns healthy status."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "version" in data
    assert "environment" in data


def test_detailed_health_check(client: TestClient) -> None:
    """Test detailed health check endpoint returns component status."""
    response = client.get("/health/detailed")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "unhealthy"]
    assert "components" in data
    assert "api" in data["components"]
    assert data["components"]["api"]["status"] == "healthy"
