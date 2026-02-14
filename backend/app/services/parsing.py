"""Deterministic CV parsing with evidence/confidence metadata."""

from __future__ import annotations

import re
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from docx import Document
from pypdf import PdfReader

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")
URL_RE = re.compile(r"(?:https?://|www\.)[^\s]+|(?:linkedin\.com|github\.com)/[^\s]+", re.IGNORECASE)
YEARS_EXPLICIT_RE = re.compile(r"(\d{1,2})\+?\s+years?", re.IGNORECASE)
YEAR_RANGE_RE = re.compile(
    r"(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(20\d{2}|19\d{2})\s*[-–]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(Present|Current|20\d{2}|19\d{2})",
    re.IGNORECASE,
)
SKILLS = [
    "python",
    "typescript",
    "javascript",
    "react",
    "next.js",
    "fastapi",
    "django",
    "sql",
    "postgres",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "java",
    "node",
]
LOCATION_TOKENS = [
    "remote",
    "new york",
    "austin",
    "chicago",
    "san francisco",
    "london",
    "paris",
    "berlin",
    "amsterdam",
    "casablanca",
    "morocco",
    "united states",
    "usa",
    "uk",
]

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def infer_candidate_name(filename: str) -> str:
    stem = Path(filename).stem.replace("_", " ").replace("-", " ").strip()
    if not stem:
        return "Unknown Candidate"
    return " ".join(part.capitalize() for part in stem.split())


def _evidence(page_num: int, text: str, start: int, end: int) -> dict[str, Any]:
    lo = max(0, start - 40)
    hi = min(len(text), end + 60)
    return {
        "page_num": page_num,
        "snippet": text[lo:hi].strip(),
        "char_start": start,
        "char_end": end,
    }


def _parse_pdf_pages(blob: bytes) -> list[str]:
    reader = PdfReader(BytesIO(blob))
    pages: list[str] = []
    for page in reader.pages:
        pages.append((page.extract_text() or "").strip())
    return pages


def _parse_docx_pages(blob: bytes) -> list[str]:
    doc = Document(BytesIO(blob))
    text = "\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip())
    return [text]


def _parse_pages(blob: bytes, filename: str, mime_type: str) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    suffix = Path(filename).suffix.lower()

    try:
        if suffix == ".pdf" or "pdf" in mime_type.lower():
            pages = _parse_pdf_pages(blob)
        elif suffix == ".docx" or "word" in mime_type.lower():
            pages = _parse_docx_pages(blob)
        else:
            pages = [blob.decode("utf-8", errors="ignore")]
    except Exception:
        pages = [blob.decode("utf-8", errors="ignore")]
        warnings.append("fallback_text_decode")

    normalized = [page for page in pages if page is not None]
    if not normalized:
        normalized = [""]

    for idx, page in enumerate(normalized):
        lines = [line.strip() for line in page.splitlines() if line.strip()]
        if len(lines) > 20:
            avg_line = sum(len(line) for line in lines) / max(1, len(lines))
            if avg_line < 38:
                warnings.append(f"multi_column_suspected_page_{idx+1}")

    if sum(len(page.strip()) for page in normalized) < 50:
        warnings.append("low_text_extraction")

    return normalized, warnings


def _best_email(pages: list[str]) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    candidates: list[tuple[str, float, dict[str, Any]]] = []

    for page_num, page in enumerate(pages, start=1):
        for match in EMAIL_RE.finditer(page):
            value = match.group(0).strip().lower()
            if any(x in value for x in ["example.com", "test.com", "noreply", "sample"]):
                continue
            confidence = 0.93
            if value.endswith("@gmail.com") or value.endswith("@yahoo.com"):
                confidence = 0.87
            candidates.append((value, confidence, _evidence(page_num, page, match.start(), match.end())))

    links: list[dict[str, Any]] = []
    if not candidates:
        return None, links

    best = sorted(candidates, key=lambda item: item[1], reverse=True)[0]
    return {"value": best[0], "confidence": best[1], "evidence": best[2]}, links


def _normalize_phone(raw: str) -> str | None:
    digits = re.sub(r"[^\d+]", "", raw)
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if digits.startswith("+"):
        clean = "+" + re.sub(r"\D", "", digits)
    else:
        clean_digits = re.sub(r"\D", "", digits)
        if len(clean_digits) == 10:
            clean = "+1" + clean_digits
        elif len(clean_digits) == 11 and clean_digits.startswith("1"):
            clean = "+" + clean_digits
        elif 11 <= len(clean_digits) <= 15:
            clean = "+" + clean_digits
        else:
            return None

    if len(clean) < 11 or len(clean) > 16:
        return None
    return clean


def _best_phone(pages: list[str]) -> dict[str, Any] | None:
    candidates: list[tuple[str, float, dict[str, Any]]] = []
    for page_num, page in enumerate(pages, start=1):
        for match in PHONE_RE.finditer(page):
            normalized = _normalize_phone(match.group(0))
            if not normalized:
                continue
            confidence = 0.9 if len(normalized) >= 11 else 0.75
            candidates.append(
                (
                    normalized,
                    confidence,
                    _evidence(page_num, page, match.start(), match.end()),
                )
            )
    if not candidates:
        return None

    best = sorted(candidates, key=lambda item: item[1], reverse=True)[0]
    return {"value": best[0], "confidence": best[1], "evidence": best[2]}


def _extract_links(pages: list[str]) -> list[dict[str, Any]]:
    links: list[dict[str, Any]] = []
    seen: set[str] = set()
    for page_num, page in enumerate(pages, start=1):
        for match in URL_RE.finditer(page):
            raw = match.group(0).strip().rstrip(".,)")
            value = raw if raw.startswith("http") else f"https://{raw}"
            key = value.lower()
            if key in seen:
                continue
            seen.add(key)
            link_type = "portfolio"
            lowered = value.lower()
            if "linkedin.com" in lowered:
                link_type = "linkedin"
            elif "github.com" in lowered:
                link_type = "github"
            links.append(
                {
                    "value": value,
                    "type": link_type,
                    "confidence": 0.88,
                    "evidence": _evidence(page_num, page, match.start(), match.end()),
                }
            )
    return links


def _extract_location(pages: list[str]) -> dict[str, Any] | None:
    for page_num, page in enumerate(pages, start=1):
        lowered = page.lower()
        for token in LOCATION_TOKENS:
            idx = lowered.find(token)
            if idx >= 0:
                return {
                    "value": token.title(),
                    "confidence": 0.8 if token == "remote" else 0.72,
                    "evidence": _evidence(page_num, page, idx, idx + len(token)),
                }
    return None


def _to_month(month_token: str | None) -> int:
    if not month_token:
        return 1
    return MONTHS.get(month_token[:3].lower(), 1)


def _extract_experience(pages: list[str]) -> tuple[dict[str, Any] | None, bool]:
    explicit: list[tuple[float, dict[str, Any]]] = []
    ranges: list[tuple[datetime, datetime, dict[str, Any]]] = []

    for page_num, page in enumerate(pages, start=1):
        for match in YEARS_EXPLICIT_RE.finditer(page):
            value = float(match.group(1))
            explicit.append((value, _evidence(page_num, page, match.start(), match.end())))

        for match in YEAR_RANGE_RE.finditer(page):
            start_month = _to_month(match.group(1))
            start_year = int(match.group(2))
            end_month_raw = match.group(3)
            end_year_raw = match.group(4)
            if end_year_raw.lower() in {"present", "current"}:
                now = datetime.utcnow()
                end_year = now.year
                end_month = now.month
            else:
                end_year = int(end_year_raw)
                end_month = _to_month(end_month_raw) if end_month_raw else 12

            start = datetime(start_year, start_month, 1)
            end = datetime(end_year, end_month, 1)
            if end >= start:
                ranges.append((start, end, _evidence(page_num, page, match.start(), match.end())))

    if ranges:
        intervals = sorted([(s, e) for s, e, _ in ranges], key=lambda x: x[0])
        merged: list[tuple[datetime, datetime]] = []
        for start, end in intervals:
            if not merged or start > merged[-1][1]:
                merged.append((start, end))
            else:
                prev_start, prev_end = merged[-1]
                merged[-1] = (prev_start, max(prev_end, end))

        total_months = 0
        for start, end in merged:
            total_months += max(0, (end.year - start.year) * 12 + (end.month - start.month))

        years = round(total_months / 12, 1)
        evidence = ranges[0][2]
        return {
            "value": years,
            "confidence": 0.86,
            "evidence": evidence,
        }, False

    if explicit:
        value, evidence = sorted(explicit, key=lambda item: item[0], reverse=True)[0]
        return {
            "value": value,
            "confidence": 0.72,
            "evidence": evidence,
        }, False

    return None, True


def _extract_skills(pages: list[str]) -> list[str]:
    text = "\n".join(pages).lower()
    found = [skill for skill in SKILLS if skill in text]
    return found[:12]


def deterministic_extract(blob: bytes, filename: str, mime_type: str) -> dict[str, Any]:
    pages, warnings = _parse_pages(blob=blob, filename=filename, mime_type=mime_type)

    email = _best_email(pages)[0]
    phone = _best_phone(pages)
    links = _extract_links(pages)
    location = _extract_location(pages)
    experience, missing_dates = _extract_experience(pages)
    skills = _extract_skills(pages)

    if missing_dates:
        warnings.append("missing_dates")
    if not email or (email and email["confidence"] < 0.8):
        warnings.append("low_confidence_email")
    if not phone or (phone and phone["confidence"] < 0.8):
        warnings.append("low_confidence_phone")

    contacts_json: dict[str, Any] = {
        "email": email,
        "phone": phone,
        "links": links,
    }
    meta_json: dict[str, Any] = {
        "location_guess": location,
        "years_experience_est": experience,
    }

    # PASS B scaffold: structured profile without invented facts.
    structured_json = {
        "name": infer_candidate_name(filename),
        "skills": skills,
        "frameworks": [skill for skill in skills if skill in {"react", "next.js", "django", "fastapi"}],
        "tools": [skill for skill in skills if skill in {"docker", "kubernetes"}],
        "languages": [],
        "keywords": skills,
        "education": None,
        "experience_entries": [],
        "evidence_mode": "deterministic",
    }

    page_text_json = [
        {
            "page_num": idx,
            "text": page,
        }
        for idx, page in enumerate(pages, start=1)
    ]

    return {
        "full_name": infer_candidate_name(filename),
        "email": email["value"] if email else None,
        "phone": phone["value"] if phone else None,
        "location": location["value"] if location else None,
        "years_experience_est": experience["value"] if experience else None,
        "skills_top_json": {"items": skills[:8]},
        "structured_json": structured_json,
        "extracted_contacts_json": contacts_json,
        "extracted_meta_json": meta_json,
        "parsing_warnings_json": {"items": sorted(set(warnings))} if warnings else None,
        "per_page_text_json": page_text_json,
    }
