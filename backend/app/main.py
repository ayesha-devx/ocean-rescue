"""
OceanRescue FastAPI application entry point.

Startup:
  - Loads the YOLOv8-seg model once (lifespan context manager).
  - Registers CORS middleware.
  - Mounts all API v1 routes.

Run from the project root:
  uvicorn backend.app.main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.services.model_service import load_model
from backend.app.api.v1.router import api_v1_router

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Load the YOLOv8-seg model at startup; nothing to clean up on shutdown."""
    logger.info("=== OceanRescue API starting up ===")
    logger.info("Model path: %s", settings.model_path)
    load_model(settings.model_path, device=settings.model_device)
    yield
    logger.info("=== OceanRescue API shutting down ===")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-driven geospatial decision-support API for detecting potential "
        "Abandoned, Lost, and Discarded Fishing Gear (ALDFG). "
        "Detections are candidate predictions requiring human review. "
        "Geographic coordinates are never inferred from image content alone."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS -- allow the React dev server and any configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all versioned routes
app.include_router(api_v1_router)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "OceanRescue API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health",
    }
