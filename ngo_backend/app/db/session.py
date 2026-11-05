"""
Database engine and session management.
Provides connection pooling and dependency-injected session generator.
"""

import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create connection pool engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,  # Test connection health before using
    echo=settings.DEBUG,
)

# Thread-safe session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session per request
    and guarantees safe closure upon completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict:
    """
    Safely tests database connectivity and PostGIS extension availability
    without exposing credentials or sensitive internal connection parameters.
    """
    try:
        with engine.connect() as conn:
            # Check basic query execution
            conn.execute(text("SELECT 1"))
            
            # Check PostGIS extension version
            postgis_res = conn.execute(text("SELECT PostGIS_Version();")).scalar()
            
            # Check table counts safely
            tables_count = conn.execute(text("""
                SELECT count(*) FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('gear_reports', 'ai_detections', 'environmental_observations', 'drift_forecasts', 'recovery_missions');
            """)).scalar()

            return {
                "connected": True,
                "database": "PostgreSQL 18 + PostGIS",
                "postgis_version": postgis_res,
                "verified_tables": tables_count,
                "status": "healthy"
            }
    except Exception as e:
        logger.error(f"Database health check failed: {type(e).__name__}")
        return {
            "connected": False,
            "error": "Database connectivity check failed",
            "status": "unhealthy"
        }
