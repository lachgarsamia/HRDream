"""Shortlist run model scoped to one job."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ShortlistRun(Base):
    __tablename__ = "shortlist_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    criteria_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    scoring_config_version: Mapped[str] = mapped_column(String(64), nullable=False, default="v1")
    candidate_pool_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="completed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    job: Mapped["Project"] = relationship("Project", back_populates="runs")
    scores: Mapped[list["Score"]] = relationship("Score", back_populates="run", cascade="all, delete-orphan")


from app.models.project import Project  # noqa: E402, F401
from app.models.score import Score  # noqa: E402, F401
