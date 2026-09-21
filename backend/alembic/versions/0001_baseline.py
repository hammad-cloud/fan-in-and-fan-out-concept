"""Initial empty schema baseline.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-09-08

No domain tables yet — establishes Alembic version tracking.
"""

from typing import Sequence, Union

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
