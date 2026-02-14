"""Schemas for job upload/candidate/run workflow."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class FileResponse(BaseModel):
    id: int
    job_id: int
    original_filename: str
    storage_path: str
    mime_type: str
    status: str
    warnings_json: dict[str, Any] | None
    batch_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FileListResponse(BaseModel):
    items: list[FileResponse]
    total: int
    page: int
    page_size: int


class CandidateSummaryResponse(BaseModel):
    id: int
    job_id: int
    file_id: int
    full_name: str
    email: str | None
    phone: str | None
    location: str | None
    years_experience_est: float | None
    skills_top_json: dict[str, Any] | None
    extracted_contacts_json: dict[str, Any] | None
    extracted_meta_json: dict[str, Any] | None
    parsing_warnings_json: dict[str, Any] | None
    status: str
    batch_id: str
    file_status: str
    warnings_json: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CandidateListResponse(BaseModel):
    items: list[CandidateSummaryResponse]
    total: int
    page: int
    page_size: int


class UploadResponse(BaseModel):
    batch_id: str
    files_created: int
    candidate_ids: list[int]


class RunCreateRequest(BaseModel):
    candidate_ids: list[int] | None = None
    batch_ids: list[str] | None = None


class RunCreateResponse(BaseModel):
    id: int
    job_id: int
    status: str
    created_at: datetime
    included_candidate_count: int


class RunListItem(BaseModel):
    id: int
    job_id: int
    status: str
    created_at: datetime
    scoring_config_version: str

    model_config = {"from_attributes": True}


class RunListResponse(BaseModel):
    items: list[RunListItem]
    total: int
    page: int
    page_size: int


class RunResultItem(BaseModel):
    score_id: int
    candidate_id: int
    job_id: int
    run_id: int
    full_name: str
    email: str | None
    phone: str | None
    location: str | None
    years_experience_est: float | None
    skills_top_json: dict[str, Any] | None
    total_score: float
    breakdown_json: dict[str, Any]
    decision: str


class RunResultsResponse(BaseModel):
    provenance: dict[str, Any]
    items: list[RunResultItem]


class SaveCriteriaRequest(BaseModel):
    criteria_json: dict[str, Any] = Field(default_factory=dict)


class SaveCriteriaResponse(BaseModel):
    role_id: int
    project_id: int
    role_title: str
    criteria_json: dict[str, Any]
    updated_at: datetime
