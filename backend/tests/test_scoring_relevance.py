"""Unit tests for role relevance gating in scoring."""

from app.services.scoring import compute_score


def _base_criteria() -> dict:
    return {
        "role_title": "Software Engineer",
        "role_family": "engineering",
        "role_titles": ["Software Engineer", "Backend Engineer"],
        "allow_cross_family_matches": False,
        "must_have_technical_skills": ["python"],
        "nice_to_have_skills": ["docker"],
        "hard_filter_toggles": {
            "reject_if_missing_must_have": False,
            "reject_if_location_mismatch": False,
            "reject_if_min_exp_not_met": False,
            "reject_if_missing_language": False,
        },
    }


def test_engineer_query_rejects_talent_acquisition_title() -> None:
    result = compute_score(
        _base_criteria(),
        {
            "headline": "Senior Talent Acquisition Specialist",
            "profile_text": "Technical recruiter for software teams and hiring manager collaboration",
            "skills": ["sourcing", "interviewing"],
            "frameworks": [],
            "tools": [],
            "years_experience": 6,
            "keywords": ["recruiter", "talent acquisition"],
            "embedding_similarity": 0.4,
            "languages": [],
        },
    )
    assert result["rejected"] is True
    assert "Excluded" in str(result["reason"])


def test_engineer_query_rejects_product_manager_title() -> None:
    result = compute_score(
        _base_criteria(),
        {
            "headline": "Senior Product Manager",
            "profile_text": "Roadmap ownership and stakeholder alignment across teams",
            "skills": ["roadmap", "analytics"],
            "frameworks": [],
            "tools": [],
            "years_experience": 7,
            "keywords": ["product manager"],
            "embedding_similarity": 0.45,
            "languages": [],
        },
    )
    assert result["rejected"] is True
    assert "Excluded" in str(result["reason"])

