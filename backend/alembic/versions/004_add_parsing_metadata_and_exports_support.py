"""Add parsing metadata columns for files and candidates

Revision ID: 004
Revises: 003
Create Date: 2026-02-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "files",
        sa.Column("per_page_text_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.add_column(
        "candidates",
        sa.Column("extracted_contacts_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("extracted_meta_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("parsing_warnings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidates", "parsing_warnings_json")
    op.drop_column("candidates", "extracted_meta_json")
    op.drop_column("candidates", "extracted_contacts_json")
    op.drop_column("files", "per_page_text_json")
