"""Job-scoped upload/candidate/run flow tests."""

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
async def test_jobs_pagination_accepts_200(client: AsyncClient) -> None:
    token = await _register_and_login(client, "jobs-page@test.com")

    response = await client.get(
        "/jobs?page=1&page_size=200",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["page_size"] == 200


@pytest.mark.asyncio
async def test_job_candidates_are_scoped_to_job(client: AsyncClient) -> None:
    token = await _register_and_login(client, "scope@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    job_1 = await client.post("/jobs", json={"name": "Job A"}, headers=headers)
    job_2 = await client.post("/jobs", json={"name": "Job B"}, headers=headers)
    assert job_1.status_code == 201
    assert job_2.status_code == 201

    job_1_id = job_1.json()["id"]
    job_2_id = job_2.json()["id"]

    upload_1 = await client.post(
        f"/jobs/{job_1_id}/upload",
        files=[("files", ("alice_cv.pdf", b"Alice alice@example.com +1 555 000 1111 React 6 years", "application/pdf"))],
        headers=headers,
    )
    upload_2 = await client.post(
        f"/jobs/{job_2_id}/upload",
        files=[("files", ("bob_cv.pdf", b"Bob bob@example.com +1 555 000 2222 Python 4 years", "application/pdf"))],
        headers=headers,
    )
    assert upload_1.status_code == 200
    assert upload_2.status_code == 200

    candidates_1 = await client.get(f"/jobs/{job_1_id}/candidates", headers=headers)
    candidates_2 = await client.get(f"/jobs/{job_2_id}/candidates", headers=headers)

    assert candidates_1.status_code == 200
    assert candidates_2.status_code == 200

    names_1 = {item["full_name"] for item in candidates_1.json()["items"]}
    names_2 = {item["full_name"] for item in candidates_2.json()["items"]}
    assert "Alice Cv" in names_1
    assert "Bob Cv" not in names_1
    assert "Bob Cv" in names_2
    assert "Alice Cv" not in names_2


@pytest.mark.asyncio
async def test_job_run_snapshot_and_results_match_pool(client: AsyncClient) -> None:
    token = await _register_and_login(client, "run@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    job = await client.post("/jobs", json={"name": "Scoped Job"}, headers=headers)
    assert job.status_code == 201
    job_id = job.json()["id"]

    upload = await client.post(
        f"/jobs/{job_id}/upload",
        files=[
            ("files", ("candidate_one.pdf", b"Candidate One one@example.com React TypeScript 7 years", "application/pdf")),
            ("files", ("candidate_two.pdf", b"Candidate Two two@example.com Python SQL 5 years", "application/pdf")),
        ],
        headers=headers,
    )
    assert upload.status_code == 200

    run = await client.post(f"/jobs/{job_id}/runs", json={}, headers=headers)
    assert run.status_code == 201
    run_payload = run.json()
    assert run_payload["included_candidate_count"] == 2

    results = await client.get(f"/runs/{run_payload['id']}/results", headers=headers)
    assert results.status_code == 200
    payload = results.json()
    assert payload["provenance"]["job_id"] == job_id
    assert payload["provenance"]["included_candidate_count"] == 2
    assert len(payload["items"]) == 2
    assert all(item["job_id"] == job_id for item in payload["items"])


@pytest.mark.asyncio
async def test_uploads_append_candidates_in_same_job(client: AsyncClient) -> None:
    token = await _register_and_login(client, "append@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    job = await client.post("/jobs", json={"name": "Append Job"}, headers=headers)
    assert job.status_code == 201
    job_id = job.json()["id"]

    first_upload = await client.post(
        f"/jobs/{job_id}/upload",
        files=[("files", ("first.pdf", b"First first@example.com +1 202 555 0001 React 4 years", "application/pdf"))],
        headers=headers,
    )
    assert first_upload.status_code == 200

    second_upload = await client.post(
        f"/jobs/{job_id}/uploads",
        files=[("files", ("second.pdf", b"Second second@example.com +1 202 555 0002 Python 5 years", "application/pdf"))],
        headers=headers,
    )
    assert second_upload.status_code == 200

    candidates = await client.get(f"/jobs/{job_id}/candidates?page=1&page_size=200", headers=headers)
    assert candidates.status_code == 200
    payload = candidates.json()
    assert payload["total"] == 2
    names = {item["full_name"] for item in payload["items"]}
    assert names == {"First", "Second"}


@pytest.mark.asyncio
async def test_protected_job_endpoints_require_auth(client: AsyncClient) -> None:
    assert (await client.get("/jobs")).status_code == 401
    assert (await client.get("/jobs/1")).status_code == 401
    assert (await client.get("/jobs/1/candidates")).status_code == 401
    assert (await client.post("/jobs/1/runs", json={})).status_code == 401
    assert (await client.get("/runs/1/export.csv")).status_code == 401
    assert (await client.get("/runs/1/report.pdf")).status_code == 401


@pytest.mark.asyncio
async def test_exports_download_csv_and_pdf_for_completed_run(client: AsyncClient) -> None:
    token = await _register_and_login(client, "export@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    job = await client.post("/jobs", json={"name": "Export Job"}, headers=headers)
    job_id = job.json()["id"]

    upload = await client.post(
        f"/jobs/{job_id}/upload",
        files=[("files", ("candidate_export.pdf", b"Candidate export@test.com +1 202 555 0180 React 8 years", "application/pdf"))],
        headers=headers,
    )
    assert upload.status_code == 200

    run = await client.post(f"/jobs/{job_id}/runs", json={}, headers=headers)
    assert run.status_code == 201
    run_id = run.json()["id"]

    status_resp = await client.get(f"/runs/{run_id}/export/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["csv_ready"] is True
    assert status_resp.json()["pdf_ready"] is True

    csv_resp = await client.get(f"/runs/{run_id}/export.csv", headers=headers)
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=\"shortlist_run_" in csv_resp.headers["content-disposition"]
    assert "candidate_id,name,email" in csv_resp.text

    pdf_resp = await client.get(f"/runs/{run_id}/report.pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"].startswith("application/pdf")
    assert "attachment; filename=\"shortlist_report_run_" in pdf_resp.headers["content-disposition"]
    assert pdf_resp.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_candidate_details_and_cv_are_job_scoped(client: AsyncClient) -> None:
    token = await _register_and_login(client, "candidate-detail@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    job_a = await client.post("/jobs", json={"name": "Job A"}, headers=headers)
    job_b = await client.post("/jobs", json={"name": "Job B"}, headers=headers)
    assert job_a.status_code == 201
    assert job_b.status_code == 201
    job_a_id = job_a.json()["id"]
    job_b_id = job_b.json()["id"]

    upload = await client.post(
        f"/jobs/{job_a_id}/upload",
        files=[("files", ("alice_cv.pdf", b"Alice alice@example.com +1 555 000 1111 React 6 years", "application/pdf"))],
        headers=headers,
    )
    assert upload.status_code == 200

    candidates = await client.get(f"/jobs/{job_a_id}/candidates", headers=headers)
    assert candidates.status_code == 200
    candidate_id = candidates.json()["items"][0]["id"]

    detail_ok = await client.get(f"/jobs/{job_a_id}/candidates/{candidate_id}", headers=headers)
    assert detail_ok.status_code == 200
    payload = detail_ok.json()
    assert payload["job_id"] == job_a_id
    assert payload["file_name"] == "alice_cv.pdf"
    assert payload["cv_available"] is True

    cv_ok = await client.get(f"/jobs/{job_a_id}/candidates/{candidate_id}/cv", headers=headers)
    assert cv_ok.status_code == 200
    assert cv_ok.headers["content-disposition"].startswith("inline; filename=")
    assert cv_ok.content.startswith(b"Alice")

    detail_wrong_job = await client.get(f"/jobs/{job_b_id}/candidates/{candidate_id}", headers=headers)
    assert detail_wrong_job.status_code == 404

    cv_wrong_job = await client.get(f"/jobs/{job_b_id}/candidates/{candidate_id}/cv", headers=headers)
    assert cv_wrong_job.status_code == 404


@pytest.mark.asyncio
async def test_delete_job_removes_job_scoped_records(client: AsyncClient) -> None:
    token = await _register_and_login(client, "delete-job@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    job = await client.post("/jobs", json={"name": "Delete Me"}, headers=headers)
    assert job.status_code == 201
    job_id = job.json()["id"]

    upload = await client.post(
        f"/jobs/{job_id}/upload",
        files=[("files", ("delete_me.pdf", b"Delete Me delete@test.com +1 202 555 0199 React 3 years", "application/pdf"))],
        headers=headers,
    )
    assert upload.status_code == 200

    delete_resp = await client.delete(f"/jobs/{job_id}", headers=headers)
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/jobs/{job_id}", headers=headers)
    assert get_resp.status_code == 404

    candidates_resp = await client.get(f"/jobs/{job_id}/candidates", headers=headers)
    assert candidates_resp.status_code == 404
