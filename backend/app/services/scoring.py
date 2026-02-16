"""Deterministic scoring helpers based on structured role criteria."""

from collections.abc import Iterable
import re
from typing import Any


# Role family taxonomy with title keywords (strong/weak), negative keywords, and skill anchors
ROLE_TAXONOMY: dict[str, dict[str, Any]] = {
    "engineering": {
        "title_keywords_strong": {"engineer", "developer", "software", "backend", "frontend", "fullstack", "devops", "sre", "architect", "programmer"},
        "title_keywords_weak": {"technical", "tech", "infrastructure", "platform", "systems"},
        "negative_title_keywords": {"recruiter", "talent acquisition", "hr", "human resources", "people ops", "product manager", "scrum master", "designer"},
        "skill_anchors": {"python", "javascript", "typescript", "java", "c++", "go", "rust", "react", "vue", "angular", "node", "django", "flask", "fastapi", "spring", "sql", "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes", "aws", "gcp", "azure", "git", "ci/cd", "api", "microservices"},
    },
    "product": {
        "title_keywords_strong": {"product manager", "pm", "product owner", "product lead", "head of product"},
        "title_keywords_weak": {"product", "roadmap", "strategy"},
        "negative_title_keywords": {"engineer", "developer", "designer", "analyst", "recruiter"},
        "skill_anchors": {"roadmap", "prd", "user stories", "metrics", "analytics", "a/b testing", "stakeholder management", "agile", "scrum", "jira", "confluence"},
    },
    "design": {
        "title_keywords_strong": {"designer", "ux", "ui", "ux/ui", "product designer", "graphic designer", "visual designer"},
        "title_keywords_weak": {"design", "creative"},
        "negative_title_keywords": {"engineer", "developer", "product manager", "analyst"},
        "skill_anchors": {"figma", "sketch", "adobe", "photoshop", "illustrator", "prototyping", "wireframes", "user research", "usability", "design systems"},
    },
    "data": {
        "title_keywords_strong": {"data analyst", "data scientist", "data engineer", "ml engineer", "machine learning", "analytics"},
        "title_keywords_weak": {"data", "analyst", "scientist", "ml"},
        "negative_title_keywords": {"product manager", "recruiter", "designer"},
        "skill_anchors": {"sql", "python", "r", "pandas", "numpy", "sklearn", "tensorflow", "pytorch", "jupyter", "tableau", "looker", "power bi", "spark", "hadoop", "airflow", "dbt"},
    },
    "sales": {
        "title_keywords_strong": {"account executive", "sales", "business development", "bdm", "sales manager", "account manager"},
        "title_keywords_weak": {"revenue", "sales", "business"},
        "negative_title_keywords": {"engineer", "developer", "analyst", "product manager"},
        "skill_anchors": {"salesforce", "crm", "pipeline", "forecasting", "negotiation", "cold calling", "prospecting"},
    },
    "hr": {
        "title_keywords_strong": {"hr", "recruiter", "talent acquisition", "human resources", "people ops", "people partner", "recruiting"},
        "title_keywords_weak": {"people", "talent", "hr"},
        "negative_title_keywords": {"engineer", "developer", "product manager", "analyst", "designer"},
        "skill_anchors": {"ats", "greenhouse", "lever", "workday", "sourcing", "interviewing", "onboarding", "hris", "recruiting", "talent management"},
    },
    "ops": {
        "title_keywords_strong": {"operations", "ops manager", "program manager", "coordinator", "operations manager"},
        "title_keywords_weak": {"operations", "ops", "program"},
        "negative_title_keywords": {"engineer", "developer", "product manager"},
        "skill_anchors": {"process improvement", "project management", "coordination", "logistics", "supply chain"},
    },
    "finance": {
        "title_keywords_strong": {"finance", "accountant", "controller", "fp&a", "financial analyst", "cfo"},
        "title_keywords_weak": {"finance", "accounting", "financial"},
        "negative_title_keywords": {"engineer", "developer", "product manager"},
        "skill_anchors": {"quickbooks", "excel", "financial modeling", "budgeting", "forecasting", "gaap", "ifrs"},
    },
    "legal": {
        "title_keywords_strong": {"lawyer", "attorney", "counsel", "legal", "compliance"},
        "title_keywords_weak": {"legal", "compliance"},
        "negative_title_keywords": {"engineer", "developer", "product manager"},
        "skill_anchors": {"contracts", "litigation", "compliance", "regulatory", "legal research"},
    },
}

# Legacy compatibility
ROLE_FAMILY_KEYWORDS: dict[str, set[str]] = {
    family: taxonomy["title_keywords_strong"] | taxonomy["title_keywords_weak"]
    for family, taxonomy in ROLE_TAXONOMY.items()
}

NEGATIVE_KEYWORDS_BY_FAMILY: dict[str, set[str]] = {
    family: taxonomy["negative_title_keywords"]
    for family, taxonomy in ROLE_TAXONOMY.items()
}

ENGINEERING_SYNONYMS: dict[str, set[str]] = {
    "engineer": {"engineer", "engineering", "developer", "software", "programmer"},
    "developer": {"developer", "engineer", "software"},
    "backend": {"backend", "back-end", "api", "server"},
    "frontend": {"frontend", "front-end", "ui"},
}


def _tokens(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9][a-z0-9.+-]*", value.lower()))


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


def _expand_synonyms(tokens: set[str]) -> set[str]:
    expanded = set(tokens)
    for token in list(tokens):
        expanded |= ENGINEERING_SYNONYMS.get(token, set())
    return expanded


def _infer_role_family(headline: str, profile_text: str) -> tuple[str | None, float, dict[str, int]]:
    probe = f"{headline} {profile_text}".lower()
    scores: dict[str, int] = {}
    for family, keywords in ROLE_FAMILY_KEYWORDS.items():
        scores[family] = sum(1 for keyword in keywords if keyword in probe)
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    if not ranked or ranked[0][1] == 0:
        return None, 0.0, scores
    best_family, best_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0
    confidence = min(0.98, 0.45 + best_score * 0.15 + (best_score - second_score) * 0.12)
    return best_family, max(0.0, confidence), scores


def compute_profile_signature(
    headline: str,
    profile_text: str,
    skills: list[str],
    experience_titles: list[str],
    full_text: str,
) -> dict[str, Any]:
    """
    Build profile signature with role_family_scores, top_titles, skill_clusters, confidence, and ambiguous flag.
    
    This replaces brittle role_family gating with nuanced scoring:
    - role_family_scores: {family: 0..1} based on deterministic taxonomy
    - top_titles: extracted titles with confidence + evidence
    - skill_clusters: {cluster: 0..1} based on normalized skills
    - confidence: overall 0..1
    - ambiguous: True if confidence < 0.65
    """
    headline_lower = headline.lower()
    profile_lower = profile_text.lower()
    full_lower = full_text.lower()
    skills_normalized = _normalize(skills)
    titles_normalized = _normalize(experience_titles)
    
    # Compute role family scores using taxonomy
    role_family_scores: dict[str, float] = {}
    
    for family, taxonomy in ROLE_TAXONOMY.items():
        title_score = 0.0
        skill_score = 0.0
        keyword_score = 0.0
        
        # Title score (from experience titles + headline, not full text)
        title_text = " ".join(titles_normalized) + " " + headline_lower + " " + profile_lower
        strong_title_matches = sum(1 for keyword in taxonomy["title_keywords_strong"] if keyword in title_text)
        weak_title_matches = sum(1 for keyword in taxonomy["title_keywords_weak"] if keyword in title_text)
        negative_title_matches = sum(1 for keyword in taxonomy["negative_title_keywords"] if keyword in title_text)
        
        # More generous scoring: 1 strong match = 0.5, 2+ strong = 0.8+, weak adds 0.2 each
        title_score = min(1.0, strong_title_matches * 0.5 + weak_title_matches * 0.2)
        title_score = max(0.0, title_score - (negative_title_matches * 0.3))
        
        # Skill score (from normalized skills) - more generous
        skill_matches = len(skills_normalized & taxonomy["skill_anchors"])
        # For engineering: 3 skills = 0.6, 5 skills = 1.0
        skill_score = min(1.0, skill_matches * 0.2)
        
        # Keyword score (from full text) - boost for frequent mentions
        all_keywords = taxonomy["title_keywords_strong"] | taxonomy["title_keywords_weak"]
        keyword_matches = sum(1 for keyword in all_keywords if keyword in full_lower)
        keyword_score = min(1.0, keyword_matches * 0.15)
        
        # Weighted combination: 50% title, 40% skill, 10% keyword
        role_family_scores[family] = max(0.0, min(1.0, 
            0.50 * title_score + 0.40 * skill_score + 0.10 * keyword_score
        ))
    
    # Determine top family and confidence
    ranked_families = sorted(role_family_scores.items(), key=lambda x: x[1], reverse=True)
    top_family = ranked_families[0][0] if ranked_families and ranked_families[0][1] > 0.0 else None
    top_score = ranked_families[0][1] if ranked_families else 0.0
    second_score = ranked_families[1][1] if len(ranked_families) > 1 else 0.0
    
    # Confidence: based on top score and margin from second
    margin = top_score - second_score
    confidence = min(0.98, top_score * 0.7 + margin * 0.3)
    ambiguous = confidence < 0.65
    
    # Top titles with confidence
    top_titles = []
    for title in experience_titles[:5]:
        title_confidence = 0.8  # Base confidence for extracted titles
        # Boost if contains strong keywords from top family
        if top_family:
            taxonomy = ROLE_TAXONOMY[top_family]
            if any(keyword in title.lower() for keyword in taxonomy["title_keywords_strong"]):
                title_confidence = 0.92
        
        top_titles.append({
            "title": title,
            "confidence": title_confidence,
            "evidence_page": None,  # Will be populated during parsing
        })
    
    # Skill clusters
    skill_clusters = []
    cluster_definitions = {
        "backend": {"python", "java", "go", "rust", "node", "django", "flask", "fastapi", "spring", "api", "sql", "postgresql", "mysql", "mongodb", "redis"},
        "frontend": {"javascript", "typescript", "react", "vue", "angular", "html", "css", "webpack", "next.js"},
        "devops": {"docker", "kubernetes", "ci/cd", "aws", "gcp", "azure", "terraform", "ansible", "jenkins"},
        "data": {"sql", "python", "pandas", "numpy", "spark", "airflow", "tableau", "looker", "ml", "tensorflow", "pytorch"},
        "product": {"roadmap", "prd", "metrics", "analytics", "jira", "confluence", "agile"},
    }
    
    for cluster_name, cluster_skills in cluster_definitions.items():
        matches = len(skills_normalized & cluster_skills)
        cluster_score = min(1.0, matches / max(1, len(cluster_skills) * 0.2))
        if cluster_score > 0.1:
            skill_clusters.append({
                "cluster": cluster_name,
                "score": round(cluster_score, 2),
            })
    
    return {
        "role_family_scores": {k: round(v, 2) for k, v in role_family_scores.items()},
        "top_titles": top_titles,
        "skill_clusters": skill_clusters,
        "confidence": round(confidence, 2),
        "ambiguous": ambiguous,
        "top_family": top_family,
    }


def _infer_role_family(headline: str, profile_text: str) -> tuple[str | None, float, dict[str, int]]:
    probe = f"{headline} {profile_text}".lower()
    scores: dict[str, int] = {}
    for family, keywords in ROLE_FAMILY_KEYWORDS.items():
        scores[family] = sum(1 for keyword in keywords if keyword in probe)
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    if not ranked or ranked[0][1] == 0:
        return None, 0.0, scores
    best_family, best_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0
    confidence = min(0.98, 0.45 + best_score * 0.15 + (best_score - second_score) * 0.12)
    return best_family, max(0.0, confidence), scores


def _collect_role_terms(criteria: dict) -> set[str]:
    terms = _tokens(str(criteria.get("role_title", "")))
    for item in criteria.get("role_titles", []) or []:
        terms |= _tokens(str(item))
    if (criteria.get("role_family") or "").lower() == "engineering":
        terms |= {"engineer", "developer", "backend", "frontend", "software"}
    return _expand_synonyms(terms)


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
    - profile_signature: dict (optional, new) with role_family_scores
    """
    toggles = criteria.get("hard_filter_toggles", {})
    role_family = (criteria.get("role_family") or "").strip().lower()
    role_titles = [str(item).strip().lower() for item in (criteria.get("role_titles") or []) if str(item).strip()]
    exclude_role_families = _normalize(criteria.get("exclude_role_families", []))
    allow_cross_family = bool(criteria.get("allow_cross_family_matches", False))
    headline = str(candidate.get("headline") or "").strip().lower()
    profile_text = str(candidate.get("profile_text") or "").strip().lower()
    candidate_keywords = _normalize(candidate.get("keywords", []))
    candidate_skills = (
        _normalize(candidate.get("skills", []))
        | _normalize(candidate.get("frameworks", []))
        | _normalize(candidate.get("tools", []))
    )
    matched_title_tokens: list[str] = []
    
    # Use profile signature if available (new approach)
    profile_signature = candidate.get("profile_signature")
    if profile_signature:
        role_family_scores = profile_signature.get("role_family_scores", {})
        signature_confidence = profile_signature.get("confidence", 0.0)
        is_ambiguous = profile_signature.get("ambiguous", False)
        
        # Check for excluded families
        for family in exclude_role_families:
            if role_family_scores.get(family, 0.0) > 0.6:
                return {
                    "rejected": True,
                    "reason": f"Excluded: high {family.title()} profile score ({role_family_scores[family]:.2f})",
                    "score": 0.0,
                    "breakdown": {},
                    "missing_must_have": [],
                    "matched_title_tokens": [],
                    "matched_skills": [],
                    "profile_signature": profile_signature,
                }
        
        # If target family specified, check if candidate matches
        if role_family and not allow_cross_family:
            target_family_score = role_family_scores.get(role_family, 0.0)
            
            # For ambiguous profiles, don't hard-reject but let scoring decide
            if not is_ambiguous and target_family_score < 0.45:
                # Check if another family dominates
                max_other_family = max([score for fam, score in role_family_scores.items() if fam != role_family], default=0.0)
                if max_other_family > target_family_score + 0.25:
                    dominant_family = max(role_family_scores.items(), key=lambda x: x[1])[0]
                    return {
                        "rejected": True,
                        "reason": f"Excluded: profile is {dominant_family.title()} ({role_family_scores[dominant_family]:.2f}) not {role_family.title()} ({target_family_score:.2f})",
                        "score": 0.0,
                        "breakdown": {},
                        "missing_must_have": [],
                        "matched_title_tokens": [],
                        "matched_skills": [],
                        "profile_signature": profile_signature,
                    }
        
        # Use profile signature scores
        inferred_family = profile_signature.get("top_family")
        inferred_confidence = signature_confidence
        family_scores = {k: int(v * 100) for k, v in role_family_scores.items()}
    else:
        # Fallback to old inference method
        inferred_family, inferred_confidence, family_scores = _infer_role_family(
            headline=headline,
            profile_text=profile_text,
        )

    if inferred_family and inferred_family in exclude_role_families:
        return {
            "rejected": True,
            "reason": f"Excluded: role family {inferred_family.title()} is excluded",
            "score": 0.0,
            "breakdown": {},
            "missing_must_have": [],
            "matched_title_tokens": [],
            "matched_skills": [],
            "inferred_role_family": inferred_family,
            "inferred_role_family_confidence": round(inferred_confidence, 2),
        }

    # Role family hard gate before ranking unless explicitly overridden.
    if role_family and not allow_cross_family:
        low_conf_threshold = float(criteria.get("role_family_confidence_threshold", 0.55) or 0.55)
        if not inferred_family or inferred_confidence < low_conf_threshold:
            return {
                "rejected": True,
                "reason": f"Excluded: role family confidence too low ({inferred_confidence:.2f})",
                "score": 0.0,
                "breakdown": {},
                "missing_must_have": [],
                "matched_title_tokens": [],
                "matched_skills": [],
                "inferred_role_family": inferred_family,
                "inferred_role_family_confidence": round(inferred_confidence, 2),
            }
        if inferred_family != role_family:
            return {
                "rejected": True,
                "reason": f"Excluded: role family {inferred_family.title()} \u2260 {role_family.title()}",
                "score": 0.0,
                "breakdown": {},
                "missing_must_have": [],
                "matched_title_tokens": [],
                "matched_skills": [],
                "inferred_role_family": inferred_family,
                "inferred_role_family_confidence": round(inferred_confidence, 2),
            }

    # Role title lexical gate on headline/title context before semantic score.
    role_terms = _collect_role_terms(criteria)
    headline_tokens = _expand_synonyms(_tokens(headline))
    matched_title_tokens = sorted(headline_tokens & role_terms)

    if role_titles:
        if not any(title in headline for title in role_titles):
            # if canonical title not matched, still allow if strong role token exists.
            if not matched_title_tokens:
                return {
                    "rejected": True,
                    "reason": "Excluded: no strong role title token match",
                    "score": 0.0,
                    "breakdown": {},
                    "missing_must_have": [],
                    "matched_title_tokens": [],
                    "matched_skills": [],
                    "inferred_role_family": inferred_family,
                    "inferred_role_family_confidence": round(inferred_confidence, 2),
                }
    elif role_terms and not matched_title_tokens:
        return {
            "rejected": True,
            "reason": "Excluded: no strong role title token match",
            "score": 0.0,
            "breakdown": {},
            "missing_must_have": [],
            "matched_title_tokens": [],
            "matched_skills": [],
            "inferred_role_family": inferred_family,
            "inferred_role_family_confidence": round(inferred_confidence, 2),
        }

    # Negative lexical gate (e.g., recruiter titles for engineering).
    negative_keywords = set(_normalize(criteria.get("negative_keywords", [])))
    if role_family and not negative_keywords:
        negative_keywords = NEGATIVE_KEYWORDS_BY_FAMILY.get(role_family, set())
    for keyword in negative_keywords:
        if keyword in headline:
            return {
                "rejected": True,
                "reason": f"Excluded: title contains {keyword.title()}",
                "score": 0.0,
                "breakdown": {},
                "missing_must_have": [],
                "matched_title_tokens": matched_title_tokens,
                "matched_skills": sorted((candidate_skills & role_terms))[:3],
                "inferred_role_family": inferred_family,
                "inferred_role_family_confidence": round(inferred_confidence, 2),
            }

    must_have = (
        _normalize(criteria.get("must_have_technical_skills", []))
        | _normalize(criteria.get("must_have_frameworks", []))
        | _normalize(criteria.get("must_have_tools", []))
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

    # Semantic confidence gate: if profile is weakly related to target role, keep as uncertain/rejected.
    semantic_threshold = float(criteria.get("semantic_similarity_threshold", 0.22) or 0.22)
    semantic_margin = float(criteria.get("semantic_similarity_margin", 0.08) or 0.08)
    family_signal = min(1.0, max(0.0, inferred_confidence))
    secondary_signal = sorted(family_scores.values(), reverse=True)[1] / max(1, sorted(family_scores.values(), reverse=True)[0]) if len(family_scores) > 1 and sorted(family_scores.values(), reverse=True)[0] > 0 else 0.0
    semantic_effective = (embedding_score * 0.65) + (family_signal * 0.35)
    if semantic_effective < semantic_threshold and (semantic_effective - secondary_signal) < semantic_margin:
        return {
            "rejected": True,
            "reason": "Excluded: uncertain low semantic match",
            "score": 0.0,
            "breakdown": {
                "skills": round(skills_score * 100, 2),
                "embedding": round(embedding_score * 100, 2),
                "semantic_effective": round(semantic_effective * 100, 2),
            },
            "missing_must_have": missing_must_have,
            "matched_title_tokens": matched_title_tokens,
            "matched_skills": sorted((candidate_skills & (must_have | _normalize(criteria.get("nice_to_have_skills", [])))))[:3],
            "inferred_role_family": inferred_family,
            "inferred_role_family_confidence": round(inferred_confidence, 2),
        }

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
            "semantic_effective": round(semantic_effective * 100, 2),
        },
        "missing_must_have": missing_must_have,
        "matched_title_tokens": matched_title_tokens,
        "matched_skills": sorted((candidate_skills & (must_have | _normalize(criteria.get("nice_to_have_skills", [])))))[:3],
        "inferred_role_family": inferred_family,
        "inferred_role_family_confidence": round(inferred_confidence, 2),
    }
