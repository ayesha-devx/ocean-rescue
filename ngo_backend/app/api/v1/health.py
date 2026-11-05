"""
Health check endpoints for service and database readiness.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db, check_database_connection
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK)
def get_health():
    """
    Basic liveness check.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }


@router.get("/health/db", status_code=status.HTTP_200_OK)
def get_db_health():
    """
    Database and PostGIS connectivity check without exposing sensitive connection credentials.
    """
    result = check_database_connection()
    if not result.get("connected"):
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "message": "Database connectivity check failed"
        }
    return {
        "status": "healthy",
        "database": result.get("database"),
        "postgis_version": result.get("postgis_version"),
        "verified_tables": result.get("verified_tables"),
    }
