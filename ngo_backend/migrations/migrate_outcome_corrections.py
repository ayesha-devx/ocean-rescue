"""
Database migration script: adds is_correction, correction_reason, and original_outcome_id
columns and indexes to recovery_outcomes table.
Safe to execute idempotently on existing database.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy import text
from app.db.session import engine


def run_migration():
    print("Running migration: updating recovery_outcomes with correction tracking columns...")
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE recovery_outcomes 
            ADD COLUMN IF NOT EXISTS is_correction BOOLEAN NOT NULL DEFAULT FALSE;
        """))
        conn.execute(text("""
            ALTER TABLE recovery_outcomes 
            ADD COLUMN IF NOT EXISTS correction_reason TEXT NULL;
        """))
        conn.execute(text("""
            ALTER TABLE recovery_outcomes 
            ADD COLUMN IF NOT EXISTS original_outcome_id BIGINT NULL 
            REFERENCES recovery_outcomes(id) ON DELETE SET NULL;
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_is_correction 
            ON recovery_outcomes (is_correction);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_original_outcome_id 
            ON recovery_outcomes (original_outcome_id);
        """))

        conn.commit()
    print("Migration successful: recovery_outcomes columns and indexes verified!")


if __name__ == "__main__":
    run_migration()
