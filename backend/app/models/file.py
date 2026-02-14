"""Uploaded file model scoped to a project/job."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class File(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    warnings_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    per_page_text_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    batch_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    job: Mapped["Project"] = relationship("Project", back_populates="files")
    candidate: Mapped[Optional["Candidate"]] = relationship(
        "Candidate", back_populates="file", uselist=False, cascade="all, delete-orphan"
    )


from app.models.candidate import Candidate  # noqa: E402, F401
from app.models.project import Project  # noqa: E402, F401
