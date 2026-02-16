"""Unit tests for profile signature and role taxonomy improvements."""

from app.services.parsing import deterministic_extract
from app.services.scoring import compute_profile_signature, compute_score


def test_engineer_cv_has_high_engineering_score() -> None:
    """Lucas-like CV with python/fastapi/postgres must have engineering score > 0.7."""
    # Simulate a backend engineer CV
    signature = compute_profile_signature(
        headline="Senior Backend Engineer",
        profile_text="Backend engineer specializing in Python, distributed systems, and data pipelines.",
        skills=["python", "fastapi", "postgresql", "redis", "docker"],
        experience_titles=["Senior Backend Engineer", "Backend Engineer"],
        full_text="Python FastAPI PostgreSQL Redis Docker Kubernetes",
    )
    
    assert signature["role_family_scores"]["engineering"] > 0.7
    assert signature["confidence"] > 0.65
    assert signature["ambiguous"] is False
    # Should have backend and/or devops clusters
    cluster_names = [skill["cluster"] for skill in signature.get("skill_clusters", [])]
    assert "backend" in cluster_names or "devops" in cluster_names


def test_talent_acquisition_cv_has_high_hr_score_low_engineering() -> None:
    """Talent Acquisition CV must have hr score > 0.7 and engineering score < 0.3."""
    signature = compute_profile_signature(
        headline="Senior Talent Acquisition Specialist",
        profile_text="HR professional with 6+ years in tech hiring, structured interviews, and ATS workflows.",
        skills=["sourcing", "interviewing", "ats", "stakeholder management"],
        experience_titles=["Talent Acquisition Specialist", "Recruiter"],
        full_text="Technical recruiter hiring manager collaboration sourcing candidates",
    )
    
    assert signature["role_family_scores"]["hr"] > 0.7
    assert signature["role_family_scores"]["engineering"] < 0.3
    assert signature["confidence"] > 0.65
    assert signature["ambiguous"] is False


def test_ambiguous_cv_sets_ambiguous_flag() -> None:
    """Ambiguous CV (no titles) sets ambiguous=true and is not excluded by family."""
    signature = compute_profile_signature(
        headline="Professional",
        profile_text="Experienced professional with diverse background.",
        skills=["communication", "problem solving"],
        experience_titles=[],
        full_text="Professional experience diverse background",
    )
    
    assert signature["ambiguous"] is True
    assert signature["confidence"] < 0.65
    # Should not be hard-rejected, but marked as uncertain
    assert max(signature["role_family_scores"].values()) < 0.5


def test_engineering_role_excludes_recruiter_without_engineering_anchors() -> None:
    """Engineering role shortlist should not include recruiter profiles without engineering skills."""
    criteria = {
        "role_title": "Software Engineer",
        "role_family": "engineering",
        "role_titles": ["Software Engineer", "Backend Engineer"],
        "must_have_technical_skills": ["python"],
        "nice_to_have_skills": ["docker"],
        "hard_filter_toggles": {
            "reject_if_missing_must_have": False,
        },
    }
    
    candidate = {
        "headline": "Technical Recruiter",
        "profile_text": "Tech hiring specialist for software teams",
        "skills": ["sourcing", "interviewing"],
        "frameworks": [],
        "tools": [],
        "years_experience": 5,
        "keywords": ["recruiter", "hiring"],
        "embedding_similarity": 0.42,
        "languages": [],
        "profile_signature": {
            "role_family_scores": {"hr": 0.85, "engineering": 0.12},
            "confidence": 0.88,
            "ambiguous": False,
        },
    }
    
    result = compute_score(criteria, candidate)
    # Should be rejected or heavily penalized
    assert result["rejected"] is True or result["score"] < 30.0
    if not result["rejected"]:
        # If not rejected, must have clear explanation of profile mismatch
        assert "profile_mismatch_penalty" in result.get("breakdown", {})


def test_email_phone_extraction_with_confidence() -> None:
    """Email/phone extraction works with confidence metadata."""
    mock_pdf = b"%PDF-1.4 stub\nJohn Doe\nEmail: john.doe@gmail.com\nPhone: +1 555-123-4567"
    
    result = deterministic_extract(mock_pdf, "john_doe_cv.pdf", "application/pdf")
    
    # Should extract email with high confidence
    assert result["email"] == "john.doe@gmail.com"
    email_contact = result["extracted_contacts_json"]["email"]
    assert email_contact is not None
    assert email_contact["confidence"] > 0.8
    assert "evidence" in email_contact
    
    # Should extract and normalize phone
    assert result["phone"] is not None
    assert result["phone"].startswith("+1")
    phone_contact = result["extracted_contacts_json"]["phone"]
    assert phone_contact["confidence"] > 0.8


def test_experience_title_extraction_from_experience_section() -> None:
    """Parse CV and extract job titles from Experience section with evidence."""
    mock_cv_text = """
    John Doe
    Software Engineer
    
    EXPERIENCE
    Senior Backend Engineer — Komet Labs (2023–2026)
    Designed API platform and implemented async workers.
    
    Backend Engineer — Riverstone (2020–2023)
    Built ETL services and monitoring dashboards.
    
    EDUCATION
    M.Sc. Computer Science — Tech University (2020)
    """
    
    from app.services.parsing import _extract_experience_titles
    
    titles = _extract_experience_titles(mock_cv_text)
    
    assert len(titles) >= 2
    assert any("Senior Backend Engineer" in title["title"] for title in titles)
    assert any("Backend Engineer" in title["title"] for title in titles)
    # Each title should have evidence
    for title in titles:
        assert "evidence_snippet" in title
        assert "confidence" in title
        assert title["confidence"] > 0.6
