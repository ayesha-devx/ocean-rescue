"""
GET /api/v1/health     -- basic liveness + model-load status
GET /api/v1/model-info -- detailed model information
"""
from __future__ import annotations

from fastapi import APIRouter
from backend.app.services.model_service import get_model_status
from backend.app.models.schemas import HealthResponse, ModelInfoResponse
from backend.app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="API and model health check",
)
async def health() -> HealthResponse:
    """
    Returns the API status and whether the YOLOv8-seg model loaded
    successfully.  Returns HTTP 200 in all cases; inspect *model_loaded*
    to determine whether predictions are available.
    """
    status = get_model_status()
    return HealthResponse(
        status="ok" if status["loaded"] else "degraded",
        app_name=settings.app_name,
        app_version=settings.app_version,
        model_loaded=status["loaded"],
        model_error=status["error"],
        model_path=status["model_path"],
        device=status["device"],
    )


@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Detailed model metadata",
)
async def model_info() -> ModelInfoResponse:
    """
    Returns class names, confidence threshold, IoU threshold, and validation
    score summary for the loaded model.
    """
    status = get_model_status()
    return ModelInfoResponse(
        model_path=status["model_path"],
        classes=status["classes"],
        loaded=status["loaded"],
        device=status["device"],
        confidence_threshold=settings.model_confidence_threshold,
        iou_threshold=settings.model_iou_threshold,
        error=status["error"],
    )
