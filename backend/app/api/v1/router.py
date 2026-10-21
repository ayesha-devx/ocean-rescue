"""
Aggregate router for API version 1.
Mounts sub-routers for health and detection endpoints.
"""
from fastapi import APIRouter
from backend.app.api.v1 import health, predict

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router)
api_v1_router.include_router(predict.router)
