"""Add profile_signature_json to candidates

Revision ID: 005
Revises: 004
Create Date: 2026-02-16 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add profile_signature_json column to candidates table
    op.add_column(
        'candidates',
        sa.Column('profile_signature_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    # Remove profile_signature_json column from candidates table
    op.drop_column('candidates', 'profile_signature_json')
