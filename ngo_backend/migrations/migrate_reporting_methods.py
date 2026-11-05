"""
Safe migration script: Add reporting method and manual location fields to gear_reports table.
Guarantees zero data loss and preserves all historical records.
Does NOT backfill legacy records with 'gps' or 'exact' so historical provenance remains truthful.
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
    print("Executing safe migration: Adding reporting method and location metadata columns to gear_reports...")
    
    commands = [
        # 1. Reporting method: 'gps' or 'manual' (nullable for historical records)
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS reporting_method VARCHAR(50);",
        
        # 2. Location type: 'exact' or 'estimated' (nullable for historical records)
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS location_type VARCHAR(50);",
        
        # 3. Location uncertainty radius in meters (for manual estimated reports)
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS location_uncertainty_radius_m FLOAT;",
        
        # 4. Actual loss date and time reported by fisherman
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS loss_date_time TIMESTAMPTZ;",
        
        # 5. Approximate fishing area or harbor sector description
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS approximate_area VARCHAR(150);",
        
        # 6. Approximate distance from coastline in kilometers
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS distance_from_coast_km FLOAT;",
        
        # 7. Nearby landmark reference name
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS nearby_landmark VARCHAR(150);",
        
        # 8. Compass direction from landmark
        "ALTER TABLE gear_reports ADD COLUMN IF NOT EXISTS direction_from_landmark VARCHAR(50);",
        
        # Indices for efficient filtering in NGO All Reports
        "CREATE INDEX IF NOT EXISTS ix_gear_reports_reporting_method ON gear_reports(reporting_method);",
        "CREATE INDEX IF NOT EXISTS ix_gear_reports_location_type ON gear_reports(location_type);",
    ]
    
    with engine.begin() as conn:
        for cmd in commands:
            print(f"Running: {cmd}")
            conn.execute(text(cmd))
            
    print("Migration completed successfully! All columns added safely without altering historical records.")


if __name__ == "__main__":
    run_migration()

