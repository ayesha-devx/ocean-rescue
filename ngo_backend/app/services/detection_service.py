"""
Detection Service — YOLOv8 fishing gear and marine debris detection service.

Loads the trained segmentation checkpoint (models/best.pt) trained on TrashCAN 1.0.
Exposes thread-safe inference, candidate segmentation extraction, and automated
persistence into the PostgreSQL `ai_detections` table linked to `gear_reports`.
"""

import os
import io
import base64
import logging
from decimal import Decimal
from pathlib import Path
from threading import Lock
from typing import Optional, List, Dict, Any, Union, Tuple
from PIL import Image, ImageOps
import numpy as np
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.gear_report import GearReport
from app.models.ai_detection import AiDetection

logger = logging.getLogger(__name__)

_model_lock = Lock()
_yolo_model = None
_model_load_error: Optional[str] = None
_model_loaded: bool = False

DISCLAIMER = (
    "These are candidate detections from an automated YOLOv8-seg model trained on "
    "marine debris imagery (TrashCAN). Visual detections do not confirm that an object "
    "is an abandoned, lost, or discarded fishing gear (ALDFG) incident without NGO field review. "
    "Geographic coordinates are NOT inferred from image content alone."
)


def _resolve_model_path() -> Path:
    """Finds the model file, checking settings.MODEL_PATH and common fallbacks."""
    candidates = [
        settings.MODEL_PATH,
        Path("models/best.pt"),
        Path("../models/best.pt"),
        Path(__file__).resolve().parent.parent.parent.parent / "models" / "best.pt",
        Path(__file__).resolve().parent.parent.parent / "models" / "best.pt",
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return p
    return settings.MODEL_PATH


def load_model(force_reload: bool = False) -> bool:
    """
    Loads the YOLOv8-seg model into memory safely.
    Thread-safe and idempotent unless force_reload is True.
    """
    global _yolo_model, _model_load_error, _model_loaded

    with _model_lock:
        if _model_loaded and not force_reload and _yolo_model is not None:
            return True

        model_path = _resolve_model_path()
        logger.info(f"Loading YOLOv8-seg fishing gear detection model from: {model_path}")

        if not model_path.exists():
            _model_load_error = f"Model file not found at: {model_path}"
            logger.warning(_model_load_error)
            _model_loaded = False
            _yolo_model = None
            return False

        try:
            from ultralytics import YOLO
            model = YOLO(str(model_path))
            model.to(settings.MODEL_DEVICE)
            _yolo_model = model
            _model_loaded = True
            _model_load_error = None
            logger.info(
                f"YOLOv8-seg model loaded successfully. Classes: {_yolo_model.names}"
            )
            return True
        except Exception as e:
            _model_load_error = f"Failed to load YOLO model: {type(e).__name__}: {str(e)}"
            logger.error(_model_load_error, exc_info=True)
            _model_loaded = False
            _yolo_model = None
            return False


def get_yolo_model():
    """Returns the loaded YOLO instance, attempting a lazy load if not yet initialized."""
    if not _model_loaded:
        load_model()
    return _yolo_model


def get_model_status() -> Dict[str, Any]:
    """Returns a status dictionary describing the model state and supported classes."""
    model = get_yolo_model()
    model_path = _resolve_model_path()

    if _model_loaded and model is not None:
        names = model.names
        classes_dict = names if isinstance(names, dict) else dict(enumerate(names))
        return {
            "loaded": True,
            "model_name": settings.MODEL_NAME,
            "model_path": str(model_path),
            "classes": classes_dict,
            "device": settings.MODEL_DEVICE,
            "confidence_threshold": settings.MODEL_CONFIDENCE_THRESHOLD,
            "iou_threshold": settings.MODEL_IOU_THRESHOLD,
            "agnostic_nms": settings.MODEL_AGNOSTIC_NMS,
            "retina_masks": settings.MODEL_RETINA_MASKS,
            "error": None,
            "disclaimer": DISCLAIMER,
        }

    return {
        "loaded": False,
        "model_name": settings.MODEL_NAME,
        "model_path": str(model_path),
        "classes": None,
        "device": settings.MODEL_DEVICE,
        "confidence_threshold": settings.MODEL_CONFIDENCE_THRESHOLD,
        "iou_threshold": settings.MODEL_IOU_THRESHOLD,
        "agnostic_nms": settings.MODEL_AGNOSTIC_NMS,
        "retina_masks": settings.MODEL_RETINA_MASKS,
        "error": _model_load_error or "Model is not loaded. Verify models/best.pt exists.",
        "disclaimer": DISCLAIMER,
    }


def _bbox_to_list(box, max_w: float, max_h: float) -> List[float]:
    """Converts a YOLO xyxy bounding box tensor to [x1, y1, x2, y2] strictly clamped to image boundaries."""
    try:
        coords = box.xyxy[0].tolist()
        x1 = max(0.0, min(float(coords[0]), max_w))
        y1 = max(0.0, min(float(coords[1]), max_h))
        x2 = max(0.0, min(float(coords[2]), max_w))
        y2 = max(0.0, min(float(coords[3]), max_h))
        return [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)]
    except Exception:
        return []


def _mask_to_polygon(mask_xy, max_w: float, max_h: float) -> List[List[float]]:
    """Converts a YOLO segmentation xy-polygon to [[x, y], ...] strictly clamped to image bounds."""
    try:
        if mask_xy is None:
            return []
        arr = np.array(mask_xy)
        if arr.ndim != 2 or arr.shape[1] != 2:
            return []
        polygon = []
        for x, y in arr:
            px = max(0.0, min(float(x), max_w))
            py = max(0.0, min(float(y), max_h))
            polygon.append([round(px, 2), round(py, 2)])
        return polygon
    except Exception:
        return []


def _annotated_image_b64(result) -> Optional[str]:
    """Renders the annotated frame (boxes + segmentation masks) and returns base64 JPEG."""
    try:
        # Use pil=True to let Ultralytics render cleanly in RGB with proper anti-aliasing
        try:
            pil_annotated = result.plot(pil=True, conf=True, labels=True, boxes=True, masks=True)
        except Exception:
            annotated_bgr = result.plot(conf=True, labels=True, boxes=True, masks=True)
            import cv2
            rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
            pil_annotated = Image.fromarray(rgb)

        buf = io.BytesIO()
        pil_annotated.save(buf, format="JPEG", quality=90)
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception as e:
        logger.warning(f"Could not render annotated image base64: {e}")
        return None


def run_inference(
    image_input: Union[Image.Image, bytes, str, Path],
    conf: Optional[float] = None
) -> Dict[str, Any]:
    """
    Executes YOLOv8-seg inference on image_input.
    image_input can be PIL Image, bytes, or file path.
    Applies EXIF transpose, agnostic NMS, and high-resolution retina masks.
    """
    model = get_yolo_model()
    conf_thresh = conf if conf is not None else settings.MODEL_CONFIDENCE_THRESHOLD

    if model is None:
        return {
            "success": False,
            "detections": [],
            "detection_count": 0,
            "annotated_image_b64": None,
            "model_classes": {},
            "confidence_threshold": conf_thresh,
            "error": _model_load_error or "Detection model is not available.",
            "disclaimer": DISCLAIMER,
        }

    # Open and validate image input
    try:
        if isinstance(image_input, bytes):
            pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, (str, Path)):
            pil_img = Image.open(str(image_input)).convert("RGB")
        elif isinstance(image_input, Image.Image):
            pil_img = image_input.convert("RGB")
        else:
            return {
                "success": False,
                "image_width": None,
                "image_height": None,
                "detections": [],
                "detection_count": 0,
                "annotated_image_b64": None,
                "model_classes": {},
                "confidence_threshold": conf_thresh,
                "error": f"Unsupported image input type: {type(image_input).__name__}",
                "disclaimer": DISCLAIMER,
            }

        # Apply EXIF transpose to guarantee image orientation matches browser rendering
        try:
            pil_img = ImageOps.exif_transpose(pil_img)
        except Exception:
            pass

        img_w, img_h = pil_img.size
        if img_w < 10 or img_h < 10:
            return {
                "success": False,
                "image_width": img_w,
                "image_height": img_h,
                "detections": [],
                "detection_count": 0,
                "annotated_image_b64": None,
                "model_classes": {},
                "confidence_threshold": conf_thresh,
                "error": f"Image dimensions too small ({img_w}x{img_h}px). Minimum 10x10 required.",
                "disclaimer": DISCLAIMER,
            }
        if img_w > 10000 or img_h > 10000:
            return {
                "success": False,
                "image_width": img_w,
                "image_height": img_h,
                "detections": [],
                "detection_count": 0,
                "annotated_image_b64": None,
                "model_classes": {},
                "confidence_threshold": conf_thresh,
                "error": f"Image dimensions too large ({img_w}x{img_h}px). Maximum supported: 10000x10000.",
                "disclaimer": DISCLAIMER,
            }
    except Exception as e:
        return {
            "success": False,
            "image_width": None,
            "image_height": None,
            "detections": [],
            "detection_count": 0,
            "annotated_image_b64": None,
            "model_classes": {},
            "confidence_threshold": conf_thresh,
            "error": f"Invalid or unreadable image file: {str(e)}",
            "disclaimer": DISCLAIMER,
        }

    try:
        results = model.predict(
            source=pil_img,
            conf=conf_thresh,
            iou=settings.MODEL_IOU_THRESHOLD,
            agnostic_nms=settings.MODEL_AGNOSTIC_NMS,
            retina_masks=settings.MODEL_RETINA_MASKS,
            device=settings.MODEL_DEVICE,
            verbose=False,
        )
    except Exception as e:
        logger.error(f"Inference execution failed: {e}", exc_info=True)
        return {
            "success": False,
            "image_width": img_w,
            "image_height": img_h,
            "detections": [],
            "detection_count": 0,
            "annotated_image_b64": None,
            "model_classes": getattr(model, "names", {}),
            "confidence_threshold": conf_thresh,
            "error": f"Model inference execution failed: {str(e)}",
            "disclaimer": DISCLAIMER,
        }

    result = results[0]
    detections: List[Dict[str, Any]] = []
    boxes = result.boxes
    masks = result.masks

    class_names = model.names if isinstance(model.names, dict) else dict(enumerate(model.names))

    for i, box in enumerate(boxes):
        cls_id = int(box.cls[0].item())
        c = round(float(box.conf[0].item()), 4)
        bbox = _bbox_to_list(box, float(img_w), float(img_h))

        polygon: List[List[float]] = []
        if masks is not None and i < len(masks.xy):
            polygon = _mask_to_polygon(masks.xy[i], float(img_w), float(img_h))

        detections.append({
            "detection_index": i,
            "class_id": cls_id,
            "class_name": class_names.get(cls_id, f"class_{cls_id}"),
            "confidence": c,
            "confidence_percent": round(c * 100.0, 1),
            "bbox_xyxy": bbox,
            "segmentation_polygon": polygon,
            "has_mask": len(polygon) > 0,
        })

    annotated_b64 = _annotated_image_b64(result)

    return {
        "success": True,
        "image_width": img_w,
        "image_height": img_h,
        "detections": detections,
        "detection_count": len(detections),
        "annotated_image_b64": annotated_b64,
        "model_classes": class_names,
        "confidence_threshold": conf_thresh,
        "error": None,
        "disclaimer": DISCLAIMER,
    }


def resolve_report_photo_path(image_url: str) -> Optional[Path]:
    """Resolves relative or stored image_url to an absolute local filesystem path."""
    if not image_url:
        return None

    # Strip URL query or host if full URL
    clean_path = image_url.split("?")[0].replace("http://127.0.0.1:8000", "").replace("http://localhost:8000", "")
    rel_clean = clean_path.lstrip("/").replace("uploads/reports/", "").replace("uploads/", "")

    candidates = [
        settings.UPLOAD_DIR / rel_clean,
        settings.UPLOAD_ROOT / rel_clean,
        settings.UPLOAD_ROOT / "reports" / rel_clean,
        Path(clean_path.lstrip("/")),
        Path(__file__).resolve().parent.parent.parent / "uploads" / "reports" / rel_clean,
        Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "reports" / rel_clean,
    ]

    for c in candidates:
        if c.exists() and c.is_file():
            return c

    return None


def run_detection_for_report(
    db: Session,
    report_id: int,
    conf: Optional[float] = None
) -> Tuple[List[AiDetection], Dict[str, Any]]:
    """
    Executes YOLO inference on the attached photo of a specific report,
    persists candidate detections into PostgreSQL `ai_detections`,
    and links them to `gear_reports`.
    Re-running inference cleans prior detections for the report within the transaction
    so duplicate records never accumulate.
    """
    report = db.get(GearReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report ID {report_id} does not exist."
        )

    if not report.image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report #{report_id} has no photographic evidence attached for AI inference."
        )

    photo_path = resolve_report_photo_path(report.image_url)
    if not photo_path or not photo_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attached evidence photograph file for report #{report_id} not found on server disk ({report.image_url})."
        )

    inference_result = run_inference(photo_path, conf=conf)
    if not inference_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=inference_result.get("error") or "Model inference failed on attached photograph."
        )

    detections_data = inference_result.get("detections", [])
    saved_records: List[AiDetection] = []

    try:
        # Prevent duplicate detections on re-running inference for this report
        db.query(AiDetection).filter(AiDetection.report_id == report.id).delete()

        for d in detections_data:
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
            saved_records.append(rec)

        db.commit()
        for rec in saved_records:
            db.refresh(rec)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to persist AI detection records for report #{report_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist AI detections to database: {str(e)}"
        )

    return saved_records, inference_result
