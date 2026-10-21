"""
OceanRescue model service.

Loads models/best.pt once at startup and exposes a thread-safe prediction
method used by the prediction service.

The model is a YOLOv8 segmentation checkpoint trained to detect two classes:
  Class 0: fishing_net
  Class 1: rope_line

IMPORTANT: Visual detections are candidate predictions, not confirmed ALDFG
incidents. Never invent geographic coordinates from image content alone.
"""
from __future__ import annotations

import logging
from pathlib import Path
from threading import Lock
from typing import Optional

logger = logging.getLogger(__name__)

_model_lock = Lock()
_yolo_model = None          # ultralytics YOLO instance
_model_load_error: Optional[str] = None
_model_loaded: bool = False


def load_model(model_path: Path, device: str = "cpu") -> None:
    """
    Load the YOLOv8-seg model from *model_path*.

    Called once during application startup (lifespan). Subsequent calls are
    no-ops if the model is already loaded.
    """
    global _yolo_model, _model_load_error, _model_loaded

    with _model_lock:
        if _model_loaded:
            return

        logger.info("Loading YOLOv8-seg model from: %s", model_path)

        if not model_path.exists():
            msg = f"Model file not found: {model_path}"
            logger.error(msg)
            _model_load_error = msg
            return

        try:
            from ultralytics import YOLO          # noqa: PLC0415
            _yolo_model = YOLO(str(model_path))
            _yolo_model.to(device)
            # Warm-up: ultralytics does this internally on first predict call.
            _model_loaded = True
            logger.info(
                "Model loaded successfully. Classes: %s",
                _yolo_model.names,
            )
        except Exception as exc:                  # noqa: BLE001
            msg = f"Failed to load model: {exc}"
            logger.exception(msg)
            _model_load_error = msg


def get_model_status() -> dict:
    """Return a status dict describing the current model state."""
    from backend.app.core.config import settings  # noqa: PLC0415

    if _model_loaded and _yolo_model is not None:
        names = _yolo_model.names
        return {
            "loaded": True,
            "model_path": str(settings.model_path),
            "classes": names if isinstance(names, dict) else dict(enumerate(names)),
            "device": settings.model_device,
            "error": None,
        }
    return {
        "loaded": False,
        "model_path": str(settings.model_path),
        "classes": None,
        "device": settings.model_device,
        "error": _model_load_error,
    }


def get_yolo_model():
    """Return the loaded YOLO instance, or None if not loaded."""
    return _yolo_model
