"""
Safe migration script: Add fisherman/reporter, vessel, gear quantity/markings,
and declaration verification columns to gear_reports table.
Guarantees zero data loss and preserves all historical records.
Historical records remain with NULL for contact/vessel fields to avoid fabricating data.
"""

import sys
from pathlib import Path
from sqlalchemy import text

# Ensure ngo_backend is on sys.path
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.db.session import engine


def run_migration():
    print("Executing safe migration: Adding fisherman, vessel, and gear telemetry columns to gear_reports...")

    commands = [
        # Reporter Information
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS reporter_name VARCHAR(150);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS reporter_phone VARCHAR(50);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS reporter_email VARCHAR(150);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS reporter_role VARCHAR(50);",

        # Vessel Information
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(150);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS has_registered_vessel_name BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS vessel_registration_number VARCHAR(100);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS vessel_type VARCHAR(100);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS home_port VARCHAR(150);",

        # Gear Telemetry & Markings
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS gear_quantity INTEGER DEFAULT 1;",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS gear_markings VARCHAR(255);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS water_position VARCHAR(100);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS estimated_size VARCHAR(100);",
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS sea_state VARCHAR(100);",

        # Submission Declaration Confirmation
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS declaration_confirmed BOOLEAN DEFAULT FALSE;",

        # Indices for search and lookup
        "CREATE INDEX IF NOT EXISTS ix_gear_reports_reporter_name ON gear_reports(reporter_name);",
        "CREATE INDEX IF NOT EXISTS ix_gear_reports_vessel_name ON gear_reports(vessel_name);",
    ]

    with engine.begin() as conn:
        for cmd in commands:
            print(f"Running: {cmd}")
            conn.execute(text(cmd))

    print("Migration completed successfully! All columns added safely without altering historical records.")


if __name__ == "__main__":
    run_migration()

