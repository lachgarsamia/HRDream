"""Deterministic scoring helpers based on structured role criteria."""

from collections.abc import Iterable


def _normalize(values: Iterable[str]) -> set[str]:
    return {v.strip().lower() for v in values if v and v.strip()}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def _score_experience(min_years: int, years: int) -> float:
    if min_years <= 0:
        return 1.0
    if years >= min_years:
        return min(1.0, years / (min_years * 1.5))
    return max(0.0, years / min_years)


def compute_score(criteria: dict, candidate: dict) -> dict:
    """Apply hard filters then weighted deterministic score.

    candidate expected keys:
    - skills: list[str]
    - frameworks: list[str]
    - tools: list[str]
    - location_city: str|None
    - location_country: str|None
    - years_experience: int
    - keywords: list[str]
    - embedding_similarity: float (0-1)
    - languages: list[str]
    """
    toggles = criteria.get("hard_filter_toggles", {})

    must_have = (
        _normalize(criteria.get("must_have_technical_skills", []))
        | _normalize(criteria.get("must_have_frameworks", []))
        | _normalize(criteria.get("must_have_tools", []))
    )
    candidate_skills = (
        _normalize(candidate.get("skills", []))
        | _normalize(candidate.get("frameworks", []))
        | _normalize(candidate.get("tools", []))
    )

    missing_must_have = sorted(must_have - candidate_skills)
    if toggles.get("reject_if_missing_must_have", True) and missing_must_have:
        return {
            "rejected": True,
            "reason": "missing_must_have",
            "score": 0.0,
            "breakdown": {},
            "missing_must_have": missing_must_have,
        }

    min_years = int(criteria.get("min_years_experience", 0) or 0)
    cand_years = int(candidate.get("years_experience", 0) or 0)
    if toggles.get("reject_if_min_exp_not_met", True) and cand_years < min_years:
        return {
            "rejected": True,
            "reason": "min_experience_not_met",
            "score": 0.0,
            "breakdown": {},
            "missing_must_have": missing_must_have,
        }

    if toggles.get("reject_if_location_mismatch", False):
        allowed_cities = _normalize(criteria.get("allowed_cities", []))
        allowed_countries = _normalize(criteria.get("allowed_countries", []))
        city = (candidate.get("location_city") or "").strip().lower()
        country = (candidate.get("location_country") or "").strip().lower()
        if allowed_cities and city and city not in allowed_cities:
            return {
                "rejected": True,
                "reason": "location_mismatch",
                "score": 0.0,
                "breakdown": {},
                "missing_must_have": missing_must_have,
            }
        if allowed_countries and country and country not in allowed_countries:
            return {
                "rejected": True,
                "reason": "location_mismatch",
                "score": 0.0,
                "breakdown": {},
                "missing_must_have": missing_must_have,
            }

    required_languages = _normalize([l.get("language", "") for l in criteria.get("required_languages", [])])
    candidate_languages = _normalize(candidate.get("languages", []))
    if toggles.get("reject_if_missing_language", False) and required_languages - candidate_languages:
        return {
            "rejected": True,
            "reason": "missing_required_language",
            "score": 0.0,
            "breakdown": {},
            "missing_must_have": missing_must_have,
        }

    nice_to_have = (
        _normalize(criteria.get("nice_to_have_skills", []))
        | _normalize(criteria.get("nice_to_have_frameworks", []))
        | _normalize(criteria.get("nice_to_have_tools", []))
    )

    skills_score = _jaccard(must_have | nice_to_have, candidate_skills)
    embedding_score = float(candidate.get("embedding_similarity", 0.0) or 0.0)
    exp_score = _score_experience(min_years, cand_years)

    keywords_boost = _normalize(criteria.get("keywords_boost", []))
    keywords_penalize = _normalize(criteria.get("keywords_penalize", []))
    candidate_keywords = _normalize(candidate.get("keywords", []))
    keyword_score = 0.5
    if keywords_boost:
        keyword_score += min(0.3, len(candidate_keywords & keywords_boost) * 0.05)
    if keywords_penalize:
        keyword_score -= min(0.4, len(candidate_keywords & keywords_penalize) * 0.08)
    keyword_score = max(0.0, min(1.0, keyword_score))

    location_score = 1.0
    allowed_cities = _normalize(criteria.get("allowed_cities", []))
    allowed_countries = _normalize(criteria.get("allowed_countries", []))
    city = (candidate.get("location_city") or "").strip().lower()
    country = (candidate.get("location_country") or "").strip().lower()
    if allowed_cities and city and city not in allowed_cities:
        location_score = 0.5
    if allowed_countries and country and country not in allowed_countries:
        location_score = min(location_score, 0.5)

    preset_weights = {
        "strict": {"skills": 0.4, "embedding": 0.2, "experience": 0.2, "location": 0.1, "keyword": 0.1},
        "balanced": {"skills": 0.3, "embedding": 0.25, "experience": 0.2, "location": 0.15, "keyword": 0.1},
        "exploratory": {"skills": 0.22, "embedding": 0.35, "experience": 0.13, "location": 0.1, "keyword": 0.2},
        "skills_first": {"skills": 0.45, "embedding": 0.2, "experience": 0.15, "location": 0.1, "keyword": 0.1},
        "exp_first": {"skills": 0.2, "embedding": 0.2, "experience": 0.4, "location": 0.1, "keyword": 0.1},
    }

    weights = preset_weights.get(criteria.get("scoring_preset", "balanced"), preset_weights["balanced"])

    weighted = (
        skills_score * weights["skills"]
        + embedding_score * weights["embedding"]
        + exp_score * weights["experience"]
        + location_score * weights["location"]
        + keyword_score * weights["keyword"]
    )

    return {
        "rejected": False,
        "reason": None,
        "score": round(weighted * 100, 2),
        "breakdown": {
            "skills": round(skills_score * 100, 2),
            "embedding": round(embedding_score * 100, 2),
            "experience": round(exp_score * 100, 2),
            "location": round(location_score * 100, 2),
            "keyword": round(keyword_score * 100, 2),
        },
        "missing_must_have": missing_must_have,
    }
