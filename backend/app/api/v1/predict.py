"""
POST /api/v1/predict  -- upload an image, run YOLOv8-seg inference

File validation rules (from PRD / SAD):
  - Only JPEG, PNG, and WebP are accepted.
  - Maximum file size: 20 MB (configurable).
  - The file must be readable as a valid image by Pillow.
  - Invalid files are rejected with a 422 response; inference errors with 500.

Limitations (communicated in every response):
  - Detections are candidate visual predictions, not confirmed ALDFG incidents.
  - Geographic coordinates are NEVER inferred from image pixels alone.
  - The model has preliminary validation scores (mAP@50 ~0.35 bbox).
"""
from __future__ import annotations

import io
import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from starlette import status
from PIL import Image, UnidentifiedImageError

from backend.app.core.config import settings
from backend.app.models.schemas import ErrorResponse, PredictResponse
from backend.app.services.prediction_service import run_prediction

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Detection"])

_ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _validate_upload(file: UploadFile, raw: bytes) -> None:
    """
    Raise HTTPException(422) if the upload fails any validation rule.
    Checks: content-type header, file extension, byte size, and Pillow
    readability.  Does NOT trust the content-type header alone.
    """
    # 1. Content-type header check (informational; Pillow is authoritative)
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct and ct not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Unsupported content type '{ct}'. "
                f"Accepted: {sorted(_ALLOWED_CONTENT_TYPES)}"
            ),
        )

    # 2. File extension check
    suffix = Path(file.filename or "").suffix.lower()
    if suffix and suffix not in _ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Unsupported file extension '{suffix}'. "
                f"Accepted: {sorted(_ALLOWED_SUFFIXES)}"
            ),
        )

    # 3. Size check
    if len(raw) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded file is empty.",
        )
    if len(raw) > settings.max_upload_bytes:
        mb = settings.max_upload_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"File too large. Maximum allowed size is {mb:.0f} MB.",
        )

    # 4. Pillow readability (actual image format verification)
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()
    except (UnidentifiedImageError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"File is not a valid image: {type(exc).__name__}",
        ) from exc


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Run YOLOv8-seg inference on an uploaded image",
    responses={
        200: {"description": "Prediction results (may include zero detections)"},
        422: {"model": ErrorResponse, "description": "Invalid or unsupported file"},
        500: {"model": ErrorResponse, "description": "Inference or server error"},
    },
)
async def predict(
    file: UploadFile = File(
        ...,
        description="Image file (JPEG, PNG, or WebP; max 20 MB)",
    ),
) -> PredictResponse:
    """
    Upload an image and receive YOLOv8-seg detection results.

    Returns class names, confidence scores, bounding boxes, and segmentation
    polygon coordinates when masks are present. Also returns a base-64 JPEG of
    the annotated result image.

    **Limitation:** detections are candidate visual predictions only. The model
    does not infer GPS coordinates from image content.
    """
    # Read the upload into memory
    try:
        raw = await file.read()
    except Exception as exc:
        logger.exception("Failed to read upload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not read uploaded file.",
        ) from exc

    # Validate before doing any inference
    _validate_upload(file, raw)

    # Re-open as PIL Image for inference
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Could not decode image: {type(exc).__name__}",
        ) from exc

    # Run inference
    result = run_prediction(image)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Inference failed."),
        )

    return PredictResponse(**result)
