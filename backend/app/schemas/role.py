"""Schemas for structured role intake and suggestions."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Seniority = Literal["intern", "junior", "mid", "senior", "lead", "principal"]
RoleCategory = Literal[
    "engineering",
    "data",
    "product",
    "design",
    "operations",
    "marketing",
    "sales",
    "finance",
    "other",
]
RoleFamily = Literal["engineering", "product", "design", "data", "sales", "hr", "ops", "finance", "legal", "other"]
EmploymentType = Literal["full_time", "part_time", "contract", "temporary", "internship"]
WorkMode = Literal["remote", "hybrid", "onsite"]
LocationStrictness = Literal["hard_filter", "soft_preference"]
LanguageLevel = Literal["basic", "conversational", "professional", "native"]
ScoringPreset = Literal[
    "strict",
    "balanced",
    "exploratory",
    "skills_first",
    "exp_first",
]


class LanguageRequirement(BaseModel):
    language: str = Field(..., min_length=1, max_length=80)
    level: LanguageLevel = "professional"


class HardFilterToggles(BaseModel):
    reject_if_missing_must_have: bool = True
    reject_if_location_mismatch: bool = False
    reject_if_min_exp_not_met: bool = True
    reject_if_missing_language: bool = False


class RoleCriteriaIntake(BaseModel):
    role_title: str = Field(..., min_length=2, max_length=255)
    role_family: RoleFamily = "engineering"
    role_titles: list[str] = Field(default_factory=list)
    exclude_role_families: list[RoleFamily] = Field(default_factory=list)
    allow_cross_family_matches: bool = False
    seniority: Seniority
    role_category: RoleCategory
    employment_type: EmploymentType
    work_mode: WorkMode
    allowed_cities: list[str] = Field(default_factory=list)
    allowed_countries: list[str] = Field(default_factory=list)
    relocation_accepted: bool = False
    location_strictness: LocationStrictness = "soft_preference"

    must_have_technical_skills: list[str] = Field(default_factory=list)
    must_have_frameworks: list[str] = Field(default_factory=list)
    must_have_tools: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    nice_to_have_frameworks: list[str] = Field(default_factory=list)
    nice_to_have_tools: list[str] = Field(default_factory=list)

    soft_skills_required: list[str] = Field(default_factory=list)
    soft_skills_preferred: list[str] = Field(default_factory=list)
    min_years_experience: int = Field(0, ge=0, le=40)
    domain_experience: list[str] = Field(default_factory=list)
    career_stability_rule: bool = False

    required_languages: list[LanguageRequirement] = Field(default_factory=list)
    education_requirement: str | None = Field(default=None, max_length=255)
    keywords_boost: list[str] = Field(default_factory=list)
    keywords_penalize: list[str] = Field(default_factory=list)

    scoring_preset: ScoringPreset = "balanced"
    hard_filter_toggles: HardFilterToggles = Field(default_factory=HardFilterToggles)


class RoleResponse(BaseModel):
    id: int
    project_id: int
    role_title: str
    criteria_json: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RoleSuggestRequest(BaseModel):
    role_title: str = Field(..., min_length=2, max_length=255)
    job_description: str = Field(..., min_length=20)


class RoleSuggestResponse(BaseModel):
    suggestion: RoleCriteriaIntake
    source: Literal["stub"] = "stub"
