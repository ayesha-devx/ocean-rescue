"""
Database migration script: creates recovery_outcomes table, indexes,
and updates status check constraints on recovery_missions and gear_reports.
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
from app.db.base import Base
import app.models  # noqa: F401


def run_migration():
    print("Running migration: creating recovery_outcomes table if not exists...")
    with engine.connect() as conn:
        # Create table using Base.metadata
        Base.metadata.create_all(bind=engine)
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_mission_id 
            ON recovery_outcomes (mission_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_incident_id 
            ON recovery_outcomes (incident_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_outcome 
            ON recovery_outcomes (outcome);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_submitted_at 
            ON recovery_outcomes (submitted_at);
        """))

        # Update status check constraint for recovery_missions to include outcome statuses
        conn.execute(text("""
            ALTER TABLE recovery_missions 
            DROP CONSTRAINT IF EXISTS recovery_missions_status_check;
        """))
        conn.execute(text("""
            ALTER TABLE recovery_missions 
            ADD CONSTRAINT recovery_missions_status_check 
            CHECK (status IN ('planned', 'assigned', 'in_progress', 'completed', 'successfully_recovered', 'partially_recovered', 'unsuccessful', 'cancelled'));
        """))

        # Update status check constraint for gear_reports to include recovery outcome statuses
        conn.execute(text("""
            ALTER TABLE gear_reports 
            DROP CONSTRAINT IF EXISTS gear_reports_status_check;
        """))
        conn.execute(text("""
            ALTER TABLE gear_reports 
            ADD CONSTRAINT gear_reports_status_check 
            CHECK (status IN ('reported', 'verified', 'in_review', 'under_review', 'scheduled_recovery', 'resolved', 'recovered', 'partially_recovered', 'recovery_unsuccessful', 'rejected', 'cancelled'));
        """))

        conn.commit()
    print("Migration successful! recovery_outcomes table, indexes, and updated status constraints verified.")


if __name__ == "__main__":
    run_migration()
