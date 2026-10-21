"""
Tests for GET /api/v1/health and GET /api/v1/model-info.

Run from the project root:
  python -m pytest backend/tests/ -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_endpoint_returns_200():
    """Health endpoint must always return HTTP 200."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_response_schema():
    """Health response must include required fields."""
    data = client.get("/api/v1/health").json()
    assert "status" in data
    assert "model_loaded" in data
    assert "app_name" in data
    assert "app_version" in data
    assert data["status"] in ("ok", "degraded")


def test_model_info_returns_200():
    """Model-info endpoint must return HTTP 200."""
    response = client.get("/api/v1/model-info")
    assert response.status_code == 200


def test_model_info_schema():
    """Model-info response must include expected fields."""
    data = client.get("/api/v1/model-info").json()
    assert "loaded" in data
    assert "model_path" in data
    assert "confidence_threshold" in data
    assert "iou_threshold" in data
    assert "model_notes" in data


def test_root_redirect():
    """Root / must return basic API info."""
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert "docs" in body
    assert "health" in body
