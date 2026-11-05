"""
Pydantic Schemas for AI Detections.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class AiDetectionBase(BaseModel):
    report_id: int = Field(..., ge=1, description="Associated gear report ID")
    model_name: str = Field(..., min_length=1, max_length=100, description="Name and version of detection model")
    detected_class: str = Field(..., min_length=1, max_length=100, description="Detected gear or debris class")
    confidence: Decimal = Field(..., ge=0.0, le=1.0, description="Model confidence score between 0.0 and 1.0")
    review_status: str = Field("pending", description="Review status: pending, confirmed, rejected")
    reviewed_by: Optional[str] = Field(None, max_length=100, description="Reviewing officer identifier")
    reviewed_at: Optional[datetime] = Field(None, description="Timestamp of review decision")
    review_notes: Optional[str] = Field(None, max_length=1000, description="Optional notes from reviewing officer")
    bbox: Optional[list[float]] = Field(None, description="Bounding box [x1, y1, x2, y2] in original pixels")
    polygon: Optional[list[list[float]]] = Field(None, description="Segmentation polygon vertices in original pixels")


class AiDetectionCreate(AiDetectionBase):
    pass


class AiDetectionResponse(AiDetectionBase):
    id: int
    detected_at: datetime
    confidence_percent: Optional[float] = None
    incident_title: Optional[str] = None
    incident_image_url: Optional[str] = None
    incident_gear_type: Optional[str] = None

    model_config = {"from_attributes": True}


class DetectionReviewAction(BaseModel):
    reviewed_by: Optional[str] = Field("NGO Field Officer", max_length=100, description="Name or identifier of reviewing officer")
    review_notes: Optional[str] = Field(None, max_length=1000, description="Optional notes or reason for decision")


class DetectionReviewUpdate(BaseModel):
    review_status: str = Field(..., pattern="^(pending|confirmed|rejected)$", description="New review status")
    reviewed_by: Optional[str] = Field("NGO Field Officer", max_length=100, description="Name or identifier of reviewing officer")
    review_notes: Optional[str] = Field(None, max_length=1000, description="Optional notes or reason for decision")


class ModelInfoResponse(BaseModel):
    loaded: bool
    model_name: str
    model_path: str
    classes: Optional[dict] = None
    device: str
    confidence_threshold: float
    iou_threshold: float
    agnostic_nms: Optional[bool] = True
    retina_masks: Optional[bool] = True
    error: Optional[str] = None
    disclaimer: str


class DetectionItem(BaseModel):
    detection_index: int
    class_id: int
    class_name: str
    confidence: float
    confidence_percent: Optional[float] = None
    bbox_xyxy: list[float] = Field(default_factory=list)
    segmentation_polygon: list[list[float]] = Field(default_factory=list)
    has_mask: bool = False


class PredictResponse(BaseModel):
    success: bool
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    detections: list[DetectionItem] = Field(default_factory=list)
    detection_count: int
    annotated_image_b64: Optional[str] = None
    model_classes: dict = Field(default_factory=dict)
    confidence_threshold: float
    error: Optional[str] = None
    disclaimer: str
    saved_detections: Optional[list[AiDetectionResponse]] = None


class ReportInferenceResponse(BaseModel):
    report_id: int
    detections_count: int
    saved_detections: list[AiDetectionResponse]
    inference_summary: PredictResponse
