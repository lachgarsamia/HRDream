"""
Project Model
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Project(Base):
    """Project model - groups CVs for a hiring campaign."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    role: Mapped[Optional["Role"]] = relationship(
        "Role",
        back_populates="project",
        cascade="all, delete-orphan",
        uselist=False,
    )
    files: Mapped[list["File"]] = relationship(
        "File",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    candidates: Mapped[list["Candidate"]] = relationship(
        "Candidate",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    runs: Mapped[list["ShortlistRun"]] = relationship(
        "ShortlistRun",
        back_populates="job",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name={self.name})>"


# Import User at the end to avoid circular imports
from app.models.user import User  # noqa: E402, F401
from app.models.role import Role  # noqa: E402, F401
from app.models.file import File  # noqa: E402, F401
from app.models.candidate import Candidate  # noqa: E402, F401
from app.models.shortlist_run import ShortlistRun  # noqa: E402, F401
