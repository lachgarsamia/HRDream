"""Candidate model derived from uploaded files."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    years_experience_est: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    skills_top_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    structured_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    extracted_contacts_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    extracted_meta_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    parsing_warnings_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    profile_signature_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # NEW: role_family_scores, top_titles, skill_clusters
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="indexed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    job: Mapped["Project"] = relationship("Project", back_populates="candidates")
    file: Mapped["File"] = relationship("File", back_populates="candidate")
    scores: Mapped[list["Score"]] = relationship("Score", back_populates="candidate", cascade="all, delete-orphan")


from app.models.file import File  # noqa: E402, F401
from app.models.project import Project  # noqa: E402, F401
from app.models.score import Score  # noqa: E402, F401
