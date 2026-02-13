"""Role intake endpoint tests."""

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


def _role_payload(role_title: str = "Senior Frontend Engineer") -> dict:
    return {
        "role_title": role_title,
        "seniority": "senior",
        "role_category": "engineering",
        "employment_type": "full_time",
        "work_mode": "hybrid",
        "allowed_cities": ["London"],
        "allowed_countries": ["UK"],
        "relocation_accepted": False,
        "location_strictness": "soft_preference",
        "must_have_technical_skills": ["typescript", "react"],
        "must_have_frameworks": ["next.js"],
        "must_have_tools": ["git"],
        "nice_to_have_skills": ["accessibility"],
        "nice_to_have_frameworks": [],
        "nice_to_have_tools": ["figma"],
        "soft_skills_required": ["communication"],
        "soft_skills_preferred": ["leadership"],
        "min_years_experience": 5,
        "domain_experience": ["fintech"],
        "career_stability_rule": False,
        "required_languages": [{"language": "English", "level": "professional"}],
        "education_requirement": "Bachelors",
        "keywords_boost": ["ownership"],
        "keywords_penalize": ["intern"],
        "scoring_preset": "balanced",
        "hard_filter_toggles": {
            "reject_if_missing_must_have": True,
            "reject_if_location_mismatch": False,
            "reject_if_min_exp_not_met": True,
            "reject_if_missing_language": False,
        },
    }


@pytest.mark.asyncio
async def test_upsert_role_for_project(client: AsyncClient) -> None:
    token = await _register_and_login(client, "roleowner@test.com")

    project = await client.post(
        "/projects",
        json={"name": "Hiring Q2", "description": "Frontend"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert project.status_code == 201
    project_id = project.json()["id"]

    create = await client.post(
        f"/projects/{project_id}/roles",
        json=_role_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create.status_code == 201
    assert create.json()["role_title"] == "Senior Frontend Engineer"

    update = await client.post(
        f"/projects/{project_id}/roles",
        json=_role_payload("Staff Frontend Engineer"),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update.status_code == 201
    assert update.json()["role_title"] == "Staff Frontend Engineer"

    fetch = await client.get(
        f"/projects/{project_id}/roles",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert fetch.status_code == 200
    assert fetch.json()["criteria_json"]["role_title"] == "Staff Frontend Engineer"


@pytest.mark.asyncio
async def test_role_endpoint_scoped_to_owner(client: AsyncClient) -> None:
    owner_token = await _register_and_login(client, "ownerroles@test.com")
    other_token = await _register_and_login(client, "otherroles@test.com")

    project = await client.post(
        "/projects",
        json={"name": "Private Job", "description": ""},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    project_id = project.json()["id"]

    forbidden = await client.post(
        f"/projects/{project_id}/roles",
        json=_role_payload(),
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert forbidden.status_code == 404


@pytest.mark.asyncio
async def test_roles_suggest_stub(client: AsyncClient) -> None:
    token = await _register_and_login(client, "suggest@test.com")

    response = await client.post(
        "/roles/suggest",
        json={
            "role_title": "Frontend Engineer",
            "job_description": "We need a React and TypeScript engineer who can own dashboards.",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "stub"
    assert payload["suggestion"]["role_title"] == "Frontend Engineer"
