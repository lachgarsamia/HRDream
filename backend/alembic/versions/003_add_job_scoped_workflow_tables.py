"""Add files, candidates, shortlist_runs, and scores tables

Revision ID: 003
Revises: 002
Create Date: 2026-02-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "files",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("mime_type", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("warnings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("batch_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_files_job_id"), "files", ["job_id"], unique=False)
    op.create_index(op.f("ix_files_batch_id"), "files", ["batch_id"], unique=False)

    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("years_experience_est", sa.Float(), nullable=True),
        sa.Column("skills_top_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("structured_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_id"),
    )
    op.create_index(op.f("ix_candidates_file_id"), "candidates", ["file_id"], unique=True)
    op.create_index(op.f("ix_candidates_job_id"), "candidates", ["job_id"], unique=False)

    op.create_table(
        "shortlist_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("criteria_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("scoring_config_version", sa.String(length=64), nullable=False),
        sa.Column("candidate_pool_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shortlist_runs_job_id"), "shortlist_runs", ["job_id"], unique=False)

    op.create_table(
        "scores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("total_score", sa.Float(), nullable=False),
        sa.Column("breakdown_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("decision", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["run_id"], ["shortlist_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_scores_candidate_id"), "scores", ["candidate_id"], unique=False)
    op.create_index(op.f("ix_scores_run_id"), "scores", ["run_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_scores_run_id"), table_name="scores")
    op.drop_index(op.f("ix_scores_candidate_id"), table_name="scores")
    op.drop_table("scores")

    op.drop_index(op.f("ix_shortlist_runs_job_id"), table_name="shortlist_runs")
    op.drop_table("shortlist_runs")

    op.drop_index(op.f("ix_candidates_job_id"), table_name="candidates")
    op.drop_index(op.f("ix_candidates_file_id"), table_name="candidates")
    op.drop_table("candidates")

    op.drop_index(op.f("ix_files_batch_id"), table_name="files")
    op.drop_index(op.f("ix_files_job_id"), table_name="files")
    op.drop_table("files")
