"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# ---------------------------------------------------------------------------
# Metadata Revisi — JANGAN UBAH MANUAL
# ---------------------------------------------------------------------------
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    """
    Upgrade database ke revisi ini (jalankan perubahan ke depan).
    Dipanggil oleh: alembic upgrade head
    """
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    """
    Downgrade database dari revisi ini (rollback perubahan).
    Dipanggil oleh: alembic downgrade -1
    """
    ${downgrades if downgrades else "pass"}
