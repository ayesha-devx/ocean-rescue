"""
Tests for POST /api/v1/predict.

Covers:
  - Rejection of empty uploads
  - Rejection of non-image uploads
  - Rejection of oversized files
  - Acceptance of a valid PNG image (zero detections is acceptable)
  - Correct schema of a successful response

Run from the project root:
  python -m pytest backend/tests/ -v
"""
from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app

client = TestClient(app)


def _make_png_bytes(width: int = 64, height: int = 64) -> bytes:
    """Create a tiny solid-colour PNG image in memory."""
    img = Image.new("RGB", (width, height), color=(30, 80, 120))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── invalid-input tests (must not depend on model being loaded) ───────────────

def test_predict_empty_file_rejected():
    """An empty upload must return 422."""
    response = client.post(
        "/api/v1/predict",
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert response.status_code == 422


def test_predict_non_image_rejected():
    """A plain-text upload must return 422."""
    response = client.post(
        "/api/v1/predict",
        files={"file": ("doc.txt", b"hello world", "text/plain")},
    )
    assert response.status_code == 422


def test_predict_oversized_file_rejected():
    """A file exceeding the size limit must return 422."""
    big = b"X" * (21 * 1024 * 1024)   # 21 MB
    response = client.post(
        "/api/v1/predict",
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert response.status_code == 422


def test_predict_corrupt_image_rejected():
    """A file with a valid extension but corrupt content must return 422."""
    response = client.post(
        "/api/v1/predict",
        files={"file": ("bad.png", b"notanimage", "image/png")},
    )
    assert response.status_code == 422


# ── valid-image test (depends on model state) ─────────────────────────────────

def test_predict_valid_png_schema():
    """
    A small valid PNG must either succeed (200) or fail with a clear model
    error (500). The response schema must be consistent in both cases.
    """
    png_bytes = _make_png_bytes()
    response = client.post(
        "/api/v1/predict",
        files={"file": ("test.png", png_bytes, "image/png")},
    )
    assert response.status_code in (200, 500)
    data = response.json()

    if response.status_code == 200:
        assert "detections" in data
        assert "detection_count" in data
        assert "disclaimer" in data
        assert isinstance(data["detections"], list)
        assert data["detection_count"] == len(data["detections"])
        # Disclaimer must always be present (per PRD)
        assert len(data["disclaimer"]) > 10

        # Validate individual detection structure
        for det in data["detections"]:
            assert "class_name" in det
            assert "confidence" in det
            assert 0.0 <= det["confidence"] <= 1.0
            assert "bbox_xyxy" in det
            assert "segmentation_polygon" in det
    else:
        # Model not loaded -- still a JSON body
        assert "detail" in data
