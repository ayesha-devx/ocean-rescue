"""
API endpoints for AI Detections subsystem and YOLOv8 inference.
"""

import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.core.config import settings
from app.models.ai_detection import AiDetection
from app.models.gear_report import GearReport
from app.schemas.ai_detection import (
    AiDetectionCreate,
    AiDetectionResponse,
    DetectionReviewAction,
    DetectionReviewUpdate,
    ModelInfoResponse,
    PredictResponse,
    ReportInferenceResponse,
)
from app.schemas.common import PaginatedResponse
from app.services import detection_service

router = APIRouter(prefix="/detections", tags=["AI Detections"])


def _enrich_detection_response(detection: AiDetection, report: Optional[GearReport] = None) -> AiDetectionResponse:
    """Populates helper fields such as confidence_percent and incident metadata."""
    rep = report or getattr(detection, "report", None)
    conf_pct = round(float(detection.confidence) * 100.0, 1) if detection.confidence is not None else None
    title = f"Incident #{rep.id} - {rep.gear_type.replace('_', ' ').title()}" if rep else f"Incident #{detection.report_id}"
    img_url = rep.image_url if rep else None
    gear_type = rep.gear_type if rep else None

    return AiDetectionResponse(
        id=detection.id,
        report_id=detection.report_id,
        model_name=detection.model_name,
        detected_class=detection.detected_class,
        confidence=detection.confidence,
        confidence_percent=conf_pct,
        review_status=detection.review_status or "pending",
        reviewed_by=detection.reviewed_by,
        reviewed_at=detection.reviewed_at,
        review_notes=detection.review_notes,
        bbox=detection.bbox,
        polygon=detection.polygon,
        detected_at=detection.detected_at,
        incident_title=title,
        incident_image_url=img_url,
        incident_gear_type=gear_type,
    )


@router.get("/model-info", response_model=ModelInfoResponse)
def get_model_info():
    """
    Returns YOLOv8-seg model status, supported classes, architecture, and thresholds.
    """
    return detection_service.get_model_status()


@router.post("/predict", response_model=PredictResponse)
async def predict_image_endpoint(
    file: UploadFile = File(..., description="Image file to run YOLOv8 detection on"),
    report_id: Optional[int] = Form(None, description="Optional incident report ID to associate detections with"),
    conf: Optional[float] = Form(None, description="Optional confidence threshold (0.0 to 1.0)"),
    db: Session = Depends(get_db)
):
    """
    Run YOLOv8-seg fishing gear inference on an uploaded image.
    Optionally links genuine detection results to an existing gear report in PostgreSQL `ai_detections`.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image file provided for inference."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(allowed_exts)}"
        )

    # Validate MIME content-type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type '{file.content_type}'. Must be an image format."
        )

    # Validate file size
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size ({file_size / (1024*1024):.1f}MB) exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES / (1024*1024):.0f}MB."
        )

    if file_size <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is empty (0 bytes)."
        )

    image_bytes = file.file.read()
    result = detection_service.run_inference(image_bytes, conf=conf)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error") or "Inference failed on uploaded image."
        )

    saved_detections: Optional[List[AiDetectionResponse]] = None

    # If linked to a report, persist to ai_detections
    if report_id:
        report = db.get(GearReport, report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cannot link detections: Gear report ID {report_id} does not exist."
            )

        saved_list = []
        try:
            # Delete prior detections for this report within the transaction to prevent duplicates on re-run
            db.query(AiDetection).filter(AiDetection.report_id == report.id).delete()

            for d in result.get("detections", []):
                rec = AiDetection(
                    report_id=report.id,
                    model_name=settings.MODEL_NAME,
                    detected_class=d["class_name"],
                    confidence=Decimal(str(d["confidence"])),
                    review_status="pending",
                    bbox=d.get("bbox_xyxy"),
                    polygon=d.get("segmentation_polygon"),
                )
                db.add(rec)
                saved_list.append(rec)

            db.commit()
            for r in saved_list:
                db.refresh(r)
            saved_detections = [_enrich_detection_response(r, report=report) for r in saved_list]
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist linked detections to database: {str(e)}"
            )

    result["saved_detections"] = saved_detections
    return result


@router.post("/run/{report_id}", response_model=ReportInferenceResponse, status_code=status.HTTP_201_CREATED)
def run_detection_for_report_endpoint(
    report_id: int,
    conf: Optional[float] = Query(None, ge=0.0, le=1.0, description="Optional confidence threshold"),
    db: Session = Depends(get_db)
):
    """
    Executes YOLOv8 fishing gear detection on the attached photo of a specific report.
    Persists all candidate detections into PostgreSQL `ai_detections` linked to the report.
    """
    saved_records, inference_result = detection_service.run_detection_for_report(db, report_id, conf=conf)
    report = db.get(GearReport, report_id)
    enriched_records = [_enrich_detection_response(r, report=report) for r in saved_records]
    return {
        "report_id": report_id,
        "detections_count": len(saved_records),
        "saved_detections": enriched_records,
        "inference_summary": inference_result
    }


@router.post("", response_model=AiDetectionResponse, status_code=status.HTTP_201_CREATED)
def create_detection(data: AiDetectionCreate, db: Session = Depends(get_db)):
    """
    Manually log an AI detection result linked to an existing gear report.
    Validates that report_id points to an existing incident report.
    """
    report = db.get(GearReport, data.report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot associate detection: Gear report ID {data.report_id} does not exist."
        )

    detection = AiDetection(
        report_id=data.report_id,
        model_name=data.model_name.strip(),
        detected_class=data.detected_class.strip(),
        confidence=data.confidence,
        review_status=data.review_status or "pending",
        reviewed_by=data.reviewed_by,
        reviewed_at=data.reviewed_at,
        review_notes=data.review_notes,
        bbox=data.bbox,
        polygon=data.polygon,
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)
    return _enrich_detection_response(detection, report=report)


@router.get("", response_model=PaginatedResponse[AiDetectionResponse])
def list_detections(
    report_id: Optional[int] = Query(None, description="Filter by report ID"),
    review_status: Optional[str] = Query(None, description="Filter by review status (pending, confirmed, rejected)"),
    detected_class: Optional[str] = Query(None, description="Filter by class (fishing_net, rope_line)"),
    model_name: Optional[str] = Query(None, description="Filter by model name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List AI detection records with filtering (by status, class, incident) and pagination.
    """
    stmt = select(AiDetection).options(joinedload(AiDetection.report))
    if report_id:
        stmt = stmt.where(AiDetection.report_id == report_id)
    if review_status and review_status.lower() != "all":
        stmt = stmt.where(AiDetection.review_status == review_status.lower().strip())
    if detected_class and detected_class.lower() != "all":
        stmt = stmt.where(AiDetection.detected_class == detected_class.lower().strip())
    if model_name:
        stmt = stmt.where(AiDetection.model_name == model_name)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    offset = (page - 1) * page_size
    stmt = stmt.order_by(desc(AiDetection.detected_at)).offset(offset).limit(page_size)

    detections = db.scalars(stmt).all()
    items = [_enrich_detection_response(d) for d in detections]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )


@router.get("/by-report/{report_id}", response_model=List[AiDetectionResponse])
def get_detections_for_report(report_id: int, db: Session = Depends(get_db)):
    """
    Get all detections associated with a specific incident report.
    """
    report = db.get(GearReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report ID {report_id} does not exist."
        )

    stmt = select(AiDetection).where(AiDetection.report_id == report_id).order_by(desc(AiDetection.confidence))
    detections = db.scalars(stmt).all()
    return [_enrich_detection_response(d, report=report) for d in detections]


@router.get("/{detection_id}", response_model=AiDetectionResponse)
def get_detection_by_id(detection_id: int, db: Session = Depends(get_db)):
    """
    Retrieve an individual detection with complete review and incident metadata.
    """
    det = db.scalar(
        select(AiDetection).options(joinedload(AiDetection.report)).where(AiDetection.id == detection_id)
    )
    if not det:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Detection #{detection_id} not found."
        )
    return _enrich_detection_response(det)


@router.post("/{detection_id}/confirm", response_model=AiDetectionResponse)
def confirm_detection(
    detection_id: int,
    payload: Optional[DetectionReviewAction] = None,
    db: Session = Depends(get_db)
):
    """
    Confirm gear presence for an AI detection. Updates review_status to 'confirmed'
    and records reviewing officer and timestamp. Enforces valid state transitions.
    """
    det = db.scalar(
        select(AiDetection).options(joinedload(AiDetection.report)).where(AiDetection.id == detection_id)
    )
    if not det:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Detection #{detection_id} does not exist."
        )

    # State validation: duplicate review action
    if det.review_status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate review action: AI Detection #{detection_id} is already confirmed."
        )

    # State validation: contradictory review action
    if det.review_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contradictory review action: AI Detection #{detection_id} is currently rejected as a false positive. Use the review update endpoint to adjust."
        )

    action = payload or DetectionReviewAction()
    det.review_status = "confirmed"
    det.reviewed_by = (action.reviewed_by or "NGO Field Officer").strip()
    det.reviewed_at = datetime.now(timezone.utc)
    if action.review_notes is not None:
        det.review_notes = action.review_notes.strip()

    db.commit()
    db.refresh(det)
    return _enrich_detection_response(det)


@router.post("/{detection_id}/reject", response_model=AiDetectionResponse)
def reject_detection(
    detection_id: int,
    payload: Optional[DetectionReviewAction] = None,
    db: Session = Depends(get_db)
):
    """
    Flag detection as a false positive. Updates review_status to 'rejected'
    with optional reason / notes and records reviewing officer and timestamp.
    Enforces valid state transitions.
    """
    det = db.scalar(
        select(AiDetection).options(joinedload(AiDetection.report)).where(AiDetection.id == detection_id)
    )
    if not det:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Detection #{detection_id} does not exist."
        )

    # State validation: duplicate review action
    if det.review_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate review action: AI Detection #{detection_id} is already flagged as a false positive."
        )

    # State validation: contradictory review action
    if det.review_status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contradictory review action: AI Detection #{detection_id} is currently confirmed as gear presence. Use the review update endpoint to adjust."
        )

    action = payload or DetectionReviewAction()
    det.review_status = "rejected"
    det.reviewed_by = (action.reviewed_by or "NGO Field Officer").strip()
    det.reviewed_at = datetime.now(timezone.utc)
    if action.review_notes is not None:
        det.review_notes = action.review_notes.strip()

    db.commit()
    db.refresh(det)
    return _enrich_detection_response(det)


@router.patch("/{detection_id}/review", response_model=AiDetectionResponse)
def update_detection_review(
    detection_id: int,
    payload: DetectionReviewUpdate,
    db: Session = Depends(get_db)
):
    """
    Update review decision (confirmed, rejected, or pending) with reviewing officer and notes.
    """
    det = db.scalar(
        select(AiDetection).options(joinedload(AiDetection.report)).where(AiDetection.id == detection_id)
    )
    if not det:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Detection #{detection_id} does not exist."
        )

    target_status = payload.review_status.lower().strip()
    if target_status not in {"pending", "confirmed", "rejected"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review status '{target_status}'. Must be one of: pending, confirmed, rejected."
        )

    if det.review_status == target_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"AI Detection #{detection_id} is already in status '{target_status}'."
        )

    det.review_status = target_status
    det.reviewed_by = (payload.reviewed_by or "NGO Field Officer").strip()
    det.reviewed_at = datetime.now(timezone.utc)
    if payload.review_notes is not None:
        det.review_notes = payload.review_notes.strip()

    db.commit()
    db.refresh(det)
    return _enrich_detection_response(det)
