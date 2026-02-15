from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


OUT_DIR = Path(__file__).resolve().parents[1] / "sample_data" / "cvs"


@dataclass(frozen=True)
class Candidate:
    full_name: str
    title: str
    location: str
    email: str
    phone: str
    summary: str
    skills: list[str]
    experience: list[str]
    education: list[str]
    languages: list[str]
    certifications: list[str]


def _seed_candidates() -> list[Candidate]:
    # All fictional identities, fake contact info and employers.
    return [
        Candidate(
            full_name="Amina El Idrissi",
            title="Talent Acquisition Specialist",
            location="Casablanca, Morocco",
            email="amina.elidrissi@example.com",
            phone="+212 555 010 101",
            summary="HR professional with 6+ years in tech hiring, structured interviews, and ATS workflows. Focused on speed, fairness, and evidence-based selection.",
            skills=[
                "ATS (Greenhouse-like)",
                "Structured interviews",
                "Stakeholder management",
                "Sourcing",
                "Offer negotiation",
                "Reporting & dashboards",
            ],
            experience=[
                "Talent Acquisition Specialist — AtlasWorks (2022–2026): scaled engineering hiring; built scorecards and calibrated panels.",
                "Recruiter — Northshore Digital (2020–2022): owned end-to-end hiring for product + design roles.",
            ],
            education=["B.A. Business Administration — Fictional University of Casablanca (2019)"],
            languages=["Arabic (native)", "French (fluent)", "English (fluent)"],
            certifications=["Interviewing for Inclusion (I4I) — Internal Program"],
        ),
        Candidate(
            full_name="Lucas Meyer",
            title="Senior Backend Engineer",
            location="Berlin, Germany",
            email="lucas.meyer@example.com",
            phone="+49 555 010 202",
            summary="Backend engineer specializing in Python, distributed systems, and data pipelines. Enjoys building reliable APIs with strong observability.",
            skills=[
                "Python",
                "FastAPI",
                "PostgreSQL",
                "Redis",
                "Docker",
                "CI/CD",
                "Observability",
            ],
            experience=[
                "Senior Backend Engineer — Komet Labs (2023–2026): designed API platform, implemented async workers, improved p95 latency by 35%.",
                "Backend Engineer — Riverstone (2020–2023): built ETL services and monitoring dashboards.",
            ],
            education=["M.Sc. Computer Science — Fictional Tech University (2020)"],
            languages=["German (native)", "English (fluent)"],
            certifications=["AWS Practitioner (fictional)"],
        ),
        Candidate(
            full_name="Priya Nair",
            title="Data Analyst",
            location="Bengaluru, India",
            email="priya.nair@example.com",
            phone="+91 555 010 303",
            summary="Data analyst focused on operational reporting and experimentation. Comfortable with SQL-first analytics and clear stakeholder narratives.",
            skills=["SQL", "Python", "dbt", "Looker-like BI", "A/B testing", "Data quality"],
            experience=[
                "Data Analyst — Sunbeam Retail (2022–2026): built KPI layer; automated weekly exec reporting; improved metric consistency.",
                "Analytics Intern — Harbor Insights (2021–2022): supported cohort analysis and funnel tracking.",
            ],
            education=["B.Tech. Information Science — Fictional Institute of Technology (2021)"],
            languages=["English (fluent)", "Hindi (fluent)", "Malayalam (native)"],
            certifications=["Google Data Analytics (fictional)"],
        ),
        Candidate(
            full_name="Sofia Alvarez",
            title="Product Manager",
            location="Madrid, Spain",
            email="sofia.alvarez@example.com",
            phone="+34 555 010 404",
            summary="Product manager with experience shipping B2B workflows and internal tools. Prioritizes clarity, iteration speed, and measurable outcomes.",
            skills=["Roadmapping", "Discovery", "PRDs", "UX collaboration", "Metrics", "Stakeholder alignment"],
            experience=[
                "Product Manager — Nimbus Tools (2021–2026): shipped ATS integrations; led redesign of review workflow to reduce time-to-decision.",
                "Associate PM — PaperTrail (2019–2021): ran experiments across onboarding and search.",
            ],
            education=["M.Sc. Management — Fictional Business School (2019)"],
            languages=["Spanish (native)", "English (fluent)"],
            certifications=["Product Strategy (fictional)"],
        ),
        Candidate(
            full_name="Noah Carter",
            title="Full-Stack Engineer",
            location="Toronto, Canada",
            email="noah.carter@example.com",
            phone="+1 555 010 505",
            summary="Full-stack engineer building clean UI + reliable services. Prefers calm, structured interfaces and accessibility-first UX.",
            skills=["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Testing"],
            experience=[
                "Full-Stack Engineer — Maple Systems (2022–2026): built dashboards for HR ops; implemented tables with filtering and bulk actions.",
                "Frontend Engineer — Coastline Apps (2020–2022): owned component library and design tokens.",
            ],
            education=["B.Sc. Software Engineering — Fictional University of Ontario (2020)"],
            languages=["English (native)", "French (intermediate)"],
            certifications=["Accessibility Foundations (fictional)"],
        ),
        Candidate(
            full_name="Hana Sato",
            title="HR Operations Coordinator",
            location="Tokyo, Japan",
            email="hana.sato@example.com",
            phone="+81 555 010 606",
            summary="HR operations coordinator supporting high-volume recruiting processes, scheduling, and compliance. Known for precision and speed.",
            skills=["Scheduling", "Vendor coordination", "Compliance", "Process documentation", "Excel/Sheets"],
            experience=[
                "HR Ops Coordinator — Sakura Holdings (2023–2026): managed interview loops; maintained audit-ready records.",
                "Operations Assistant — MetroWorks (2021–2023): supported HR reporting and employee onboarding.",
            ],
            education=["B.A. Sociology — Fictional Tokyo City College (2021)"],
            languages=["Japanese (native)", "English (fluent)"],
            certifications=["HR Ops Essentials (fictional)"],
        ),
        Candidate(
            full_name="Fatou Diop",
            title="People Analytics Specialist",
            location="Dakar, Senegal",
            email="fatou.diop@example.com",
            phone="+221 555 010 707",
            summary="People analytics specialist delivering dashboards, attrition analysis, and headcount planning models. Clear communication and data rigor.",
            skills=["SQL", "Python", "Workforce planning", "Dashboarding", "Data governance"],
            experience=[
                "People Analytics Specialist — BlueKite (2022–2026): built headcount forecasting; standardized reporting definitions.",
                "Analyst — Horizon Partners (2020–2022): delivered monthly workforce insights to leadership.",
            ],
            education=["B.Sc. Statistics — Fictional Dakar Institute (2020)"],
            languages=["French (fluent)", "Wolof (native)", "English (intermediate)"],
            certifications=["People Analytics (fictional)"],
        ),
        Candidate(
            full_name="Maya Johnson",
            title="Recruiting Manager",
            location="Austin, TX, USA",
            email="maya.johnson@example.com",
            phone="+1 555 010 808",
            summary="Recruiting leader with 9+ years leading teams and improving hiring funnels. Strong focus on structured evaluation and bias reduction.",
            skills=["Team leadership", "Funnel metrics", "Process design", "Coaching", "Workforce planning"],
            experience=[
                "Recruiting Manager — BrightDesk (2021–2026): managed 5-person team; improved time-to-hire by standardizing scorecards.",
                "Senior Recruiter — Stonebridge (2017–2021): owned GTM and engineering pipelines.",
            ],
            education=["B.A. Psychology — Fictional State University (2017)"],
            languages=["English (native)"],
            certifications=["Structured Hiring Playbook (fictional)"],
        ),
        Candidate(
            full_name="Omar Haddad",
            title="DevOps Engineer",
            location="Dubai, UAE",
            email="omar.haddad@example.com",
            phone="+971 555 010 909",
            summary="DevOps engineer focused on secure deployments, automation, and scalable infrastructure. Practical and reliability-driven.",
            skills=["Kubernetes", "Terraform", "AWS", "CI/CD", "Monitoring", "Security baselines"],
            experience=[
                "DevOps Engineer — Crescent Cloud (2022–2026): built IaC modules; improved deploy reliability with canary releases.",
                "Systems Engineer — HarborGrid (2019–2022): managed Linux fleet and incident response.",
            ],
            education=["B.Eng. Computer Engineering — Fictional Gulf Tech (2019)"],
            languages=["Arabic (native)", "English (fluent)"],
            certifications=["Kubernetes Admin (fictional)"],
        ),
        Candidate(
            full_name="Ella Thompson",
            title="Customer Support Lead",
            location="London, UK",
            email="ella.thompson@example.com",
            phone="+44 555 011 010",
            summary="Support leader with experience building knowledge bases and triage workflows. Calm communicator in high-volume environments.",
            skills=["Escalations", "Knowledge management", "Process improvement", "Zendesk-like tools", "Training"],
            experience=[
                "Support Lead — CloudPaper (2022–2026): led triage; reduced resolution time via playbooks and macros.",
                "Support Specialist — Orion SaaS (2019–2022): handled B2B tickets and onboarding.",
            ],
            education=["B.A. Communications — Fictional London College (2019)"],
            languages=["English (native)", "Spanish (intermediate)"],
            certifications=["Service Excellence (fictional)"],
        ),
        Candidate(
            full_name="Diego Santos",
            title="UX Designer",
            location="São Paulo, Brazil",
            email="diego.santos@example.com",
            phone="+55 555 011 111",
            summary="UX designer focused on calm, efficient enterprise workflows. Loves tables, dense views, and reducing cognitive load.",
            skills=["Figma", "Design systems", "UX research", "Information architecture", "Prototyping"],
            experience=[
                "UX Designer — CalmFlow (2021–2026): redesigned review screens; improved decision speed for HR teams.",
                "Product Designer — Studio Nine (2019–2021): shipped B2B admin surfaces with refined typography.",
            ],
            education=["B.Des. Interaction Design — Fictional São Paulo Arts (2019)"],
            languages=["Portuguese (native)", "English (fluent)"],
            certifications=["Design Systems (fictional)"],
        ),
        Candidate(
            full_name="Grace Chen",
            title="Machine Learning Engineer",
            location="Singapore",
            email="grace.chen@example.com",
            phone="+65 555 011 212",
            summary="ML engineer building retrieval and ranking systems with strong evaluation discipline. Comfortable collaborating with product and data.",
            skills=["Python", "NLP", "Vector search", "Evaluation", "MLOps", "Experimentation"],
            experience=[
                "ML Engineer — VectorWorks (2023–2026): built candidate ranking models with measurable lift; implemented monitoring.",
                "Data Scientist — Skylane (2020–2023): shipped text classification and search relevance improvements.",
            ],
            education=["M.Sc. Data Science — Fictional Singapore Institute (2020)"],
            languages=["English (fluent)", "Mandarin (fluent)"],
            certifications=["MLOps Fundamentals (fictional)"],
        ),
    ]


def _make_doc(path: Path, candidate: Candidate) -> None:
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        textColor=colors.HexColor("#475569"),
        fontSize=10,
        leading=14,
        spaceAfter=14,
    )

    h_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading3"],
        fontSize=11,
        leading=14,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor("#0f172a"),
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
    )

    doc = SimpleDocTemplate(
        str(path),
        pagesize=LETTER,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
        title=f"CV - {candidate.full_name}",
        author=candidate.full_name,
    )

    story: list[object] = []

    story.append(Paragraph(candidate.full_name, title_style))
    story.append(
        Paragraph(
            f"{candidate.title} • {candidate.location} • {candidate.email} • {candidate.phone}",
            subtitle_style,
        )
    )

    story.append(Paragraph("Summary", h_style))
    story.append(Paragraph(candidate.summary, body_style))

    story.append(Paragraph("Skills", h_style))
    skills_table = Table(
        [[" • ".join(candidate.skills[i : i + 3])] for i in range(0, len(candidate.skills), 3)],
        colWidths=[6.2 * inch],
    )
    skills_table.setStyle(
        TableStyle(
            [
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("LEADING", (0, 0), (-1, -1), 14),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(skills_table)

    story.append(Paragraph("Experience", h_style))
    for line in candidate.experience:
        story.append(Paragraph(f"• {line}", body_style))

    story.append(Paragraph("Education", h_style))
    for line in candidate.education:
        story.append(Paragraph(f"• {line}", body_style))

    if candidate.certifications:
        story.append(Paragraph("Certifications", h_style))
        for line in candidate.certifications:
            story.append(Paragraph(f"• {line}", body_style))

    story.append(Paragraph("Languages", h_style))
    story.append(Paragraph(" • ".join(candidate.languages), body_style))

    story.append(Spacer(1, 14))
    story.append(
        Paragraph(
            f"Generated (fictional) on {date.today().isoformat()} for testing purposes.",
            ParagraphStyle(
                "Footnote",
                parent=styles["Normal"],
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#64748b"),
            ),
        )
    )

    doc.build(story)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    candidates = _seed_candidates()

    # Add a bit more variety by duplicating with slight skill tweaks.
    extra_locations = [
        "New York, NY, USA",
        "Paris, France",
        "Nairobi, Kenya",
        "Sydney, Australia",
        "Lagos, Nigeria",
        "Stockholm, Sweden",
    ]
    extra_titles = [
        "HR Generalist",
        "Technical Recruiter",
        "Frontend Engineer",
        "Data Engineer",
        "Office Manager",
        "Operations Analyst",
    ]

    rng = random.Random(1337)
    expanded: list[Candidate] = list(candidates)

    for idx in range(12):
        base = rng.choice(candidates)
        new_name = f"{base.full_name.split()[0]} {base.full_name.split()[-1]}-{idx + 1}"  # still fictional
        expanded.append(
            Candidate(
                full_name=new_name,
                title=rng.choice(extra_titles),
                location=rng.choice(extra_locations),
                email=f"{new_name.lower().replace(' ', '.')}@example.com",
                phone=base.phone,
                summary=base.summary,
                skills=rng.sample(base.skills, k=min(5, len(base.skills))),
                experience=base.experience,
                education=base.education,
                languages=base.languages,
                certifications=base.certifications,
            )
        )

    for candidate in expanded:
        filename = (
            candidate.full_name.lower()
            .replace(" ", "_")
            .replace("-", "_")
            .replace("'", "")
            + "_cv.pdf"
        )
        path = OUT_DIR / filename
        _make_doc(path, candidate)

    print(f"Generated {len(expanded)} fictional CV PDFs in: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
