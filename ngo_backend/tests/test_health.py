"""
Tests for Health and Database Connectivity Check.
"""

from fastapi import status


def test_top_level_health(client):
    res = client.get("/health")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_api_v1_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["status"] == "healthy"


def test_db_connectivity_check(client):
    res = client.get("/api/v1/health/db")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["status"] == "healthy"
    assert "PostGIS" in data["database"]
    assert data["verified_tables"] == 5
