"""
OceanRescue prediction service.

Accepts a PIL image, runs YOLOv8-seg inference, and returns structured
results. Returns bounding boxes and segmentation masks when present.

Segmentation masks are returned as polygon coordinate lists suitable for
JSON serialisation and frontend rendering.
"""
from __future__ import annotations

import base64
import io
import logging
from typing import Any, Optional

import numpy as np
from PIL import Image

from backend.app.core.config import settings
from backend.app.services.model_service import get_yolo_model

logger = logging.getLogger(__name__)


def _bbox_to_list(box) -> list[float]:
    """Convert a YOLO xyxy bounding box tensor to a [x1,y1,x2,y2] list."""
    try:
        return [round(float(v), 2) for v in box.xyxy[0].tolist()]
    except Exception:
        return []


def _mask_to_polygon(mask_xy) -> list[list[float]]:
    """
    Convert a YOLO segmentation xy-polygon to a [[x,y], ...] list.
    Returns an empty list if the mask data is unavailable.
    """
    try:
        if mask_xy is None:
            return []
        arr = np.array(mask_xy)
        if arr.ndim != 2 or arr.shape[1] != 2:
            return []
        return [[round(float(x), 2), round(float(y), 2)] for x, y in arr]
    except Exception:
        return []


def _annotated_image_b64(result) -> Optional[str]:
    """
    Render the annotated result frame and return it as a base-64 JPEG string.
    Returns None if rendering fails.
    """
    try:
        annotated = result.plot()     # returns numpy BGR array
        import cv2                    # noqa: PLC0415
        rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception as exc:
        logger.warning("Could not render annotated image: %s", exc)
        return None


def run_prediction(image: Image.Image) -> dict[str, Any]:
    """
    Run YOLOv8-seg inference on *image* and return structured results.

    Returns a dict with keys:
      - success (bool)
      - detections (list[dict])
      - detection_count (int)
      - annotated_image_b64 (str | None)  -- base-64 JPEG
      - model_classes (dict)
      - confidence_threshold (float)
      - error (str | None)
      - disclaimer (str)

    DISCLAIMER: detections are visual candidate predictions. They are not
    confirmed ALDFG incidents. No geographic coordinates are inferred from
    image content.
    """
    DISCLAIMER = (
        "These are candidate detections from a preliminary YOLOv8-seg model. "
        "A detection does not confirm that an object is abandoned, lost, or "
        "discarded fishing gear. Geographic coordinates are NOT inferred from "
        "image content alone."
    )

    model = get_yolo_model()
    if model is None:
        return {
            "success": False,
            "detections": [],
            "detection_count": 0,
            "annotated_image_b64": None,
            "model_classes": {},
            "confidence_threshold": settings.model_confidence_threshold,
            "error": "Model is not loaded. Check /api/v1/health for details.",
            "disclaimer": DISCLAIMER,
        }

    try:
        results = model.predict(
            source=image,
            conf=settings.model_confidence_threshold,
            iou=settings.model_iou_threshold,
            device=settings.model_device,
            verbose=False,
        )
    except Exception as exc:
        logger.exception("Inference failed: %s", exc)
        return {
            "success": False,
            "detections": [],
            "detection_count": 0,
            "annotated_image_b64": None,
            "model_classes": getattr(model, "names", {}),
            "confidence_threshold": settings.model_confidence_threshold,
            "error": f"Inference failed: {type(exc).__name__}",
            "disclaimer": DISCLAIMER,
        }

    result = results[0]
    detections: list[dict] = []

    boxes = result.boxes
    masks = result.masks   # may be None if no segmentation hits

    class_names: dict = model.names if isinstance(model.names, dict) else dict(enumerate(model.names))

    for i, box in enumerate(boxes):
        cls_id = int(box.cls[0].item())
        conf   = round(float(box.conf[0].item()), 4)
        bbox   = _bbox_to_list(box)

        polygon: list = []
        if masks is not None and i < len(masks.xy):
            polygon = _mask_to_polygon(masks.xy[i])

        detections.append({
            "detection_index": i,
            "class_id":        cls_id,
            "class_name":      class_names.get(cls_id, f"class_{cls_id}"),
            "confidence":      conf,
            "bbox_xyxy":       bbox,
            "segmentation_polygon": polygon,
            "has_mask":        len(polygon) > 0,
        })

    annotated_b64 = _annotated_image_b64(result)

    return {
        "success":            True,
        "detections":         detections,
        "detection_count":    len(detections),
        "annotated_image_b64": annotated_b64,
        "model_classes":      class_names,
        "confidence_threshold": settings.model_confidence_threshold,
        "error":              None,
        "disclaimer":         DISCLAIMER,
    }
