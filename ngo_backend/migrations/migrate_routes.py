"""
Database migration script: creates mission_routes table and spatial indexes.
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
    print("Running migration: creating mission_routes table if not exists...")
    with engine.connect() as conn:
        # Create table using Base.metadata
        Base.metadata.create_all(bind=engine)
        
        # Verify spatial index on route_geometry
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_mission_routes_geom 
            ON mission_routes USING GIST (route_geometry);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_mission_routes_mission_id 
            ON mission_routes (mission_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_mission_routes_report_id 
            ON mission_routes (report_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_mission_routes_is_selected 
            ON mission_routes (is_selected);
        """))
        conn.commit()
    print("Migration successful! mission_routes table and indexes verified.")


if __name__ == "__main__":
    run_migration()
