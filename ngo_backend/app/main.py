"""
FastAPI Main Application Entry Point for OceanRescue NGO Backend.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.session import check_database_connection
from app.api.v1.router import api_v1_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("oceanrescue.ngo_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown events.
    Verifies database connection on startup without destructive operations.
    """
    logger.info("Initializing OceanRescue NGO Operations Platform Backend...")
    
    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Check DB connection and ensure core schema tables exist
    from app.db.base import Base
    from app.db.session import engine
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    db_status = check_database_connection()
    if db_status.get("connected"):
        logger.info(
            f"Successfully connected to PostgreSQL (PostGIS {db_status.get('postgis_version')}). "
            f"Verified {db_status.get('verified_tables')}/6 core tables."
        )
    else:
        logger.warning(
            "Could not connect to PostgreSQL on startup. "
            "Please verify that PostgreSQL 18 is running and DATABASE_URL in .env is configured."
        )
    
    yield
    
    logger.info("Shutting down OceanRescue NGO Backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production REST API for OceanRescue NGO Conservation Operations Platform. "
        "Supports ALDFG incident intake, geospatial PostGIS queries, YOLOv8 detections ledger, "
        "environmental telemetry, drift forecast vectors, and recovery mission planning."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded evidence photos if directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_ROOT)), name="uploads")


# Top-level Health check endpoint
@app.get("/health", tags=["Health"])
def top_level_health():
    """Top-level health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }


# Include Master API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception during {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the request.",
            "path": request.url.path
        }
    )
