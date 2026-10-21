"""
Pydantic response schemas for OceanRescue API v1.

These define the JSON shapes returned by the API endpoints.
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="'ok' or 'degraded'")
    app_name: str
    app_version: str
    model_loaded: bool
    model_error: Optional[str] = None
    model_path: str
    device: str


class ModelInfoResponse(BaseModel):
    model_path: str
    classes: Optional[dict[int, str]] = None
    loaded: bool
    device: str
    confidence_threshold: float
    iou_threshold: float
    error: Optional[str] = None
    model_notes: str = (
        "YOLOv8-seg baseline trained on SeaClear and TrashCan data. "
        "Preliminary validation scores (bounding box mAP@50=0.353, "
        "segmentation mAP@50=0.286). Not validated for field deployment."
    )


class DetectionItem(BaseModel):
    detection_index: int
    class_id: int
    class_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox_xyxy: list[float] = Field(..., description="[x1, y1, x2, y2] in pixels")
    segmentation_polygon: list[list[float]] = Field(
        default_factory=list,
        description="List of [x, y] polygon vertices in pixels",
    )
    has_mask: bool


class PredictResponse(BaseModel):
    success: bool
    detection_count: int
    detections: list[DetectionItem]
    annotated_image_b64: Optional[str] = Field(
        None,
        description="Base-64-encoded JPEG of the annotated image",
    )
    model_classes: dict[int, str]
    confidence_threshold: float
    error: Optional[str] = None
    disclaimer: str


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
