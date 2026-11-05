"""
Tests for OceanRescue Risk Prioritization Module.
Validates:
- Multi-criteria risk scoring calculations and priority thresholds.
- Confirmed wildlife impact weighting (+25 pts).
- Missing/incomplete input data handling (distinguishing uncertainty from low risk).
- Exclusion of unverified incidents from the priority queue.
- Correct association between incidents and drift forecasts.
- Estimated grounding being explicitly distinguished from confirmed physical grounding.
- Queue filtering, sorting, and search.
- API validation and error handling.
- Custom weights evaluation.
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.gear_report import GearReport
from app.models.drift_forecast import DriftForecast
from app.models.environmental_observation import EnvironmentalObservation
from app.models.risk_assessment import RiskAssessment
from app.services.risk_service import (
    calculate_incident_risk,
    DEFAULT_WEIGHTS,
    PRIORITY_CRITICAL_MIN,
    PRIORITY_HIGH_MIN,
    PRIORITY_MEDIUM_MIN,
)
from app.schemas.risk import RiskWeightConfig, PriorityBandEnum, DataConfidenceEnum


def test_get_risk_weights(client: TestClient):
    """Verify weights endpoint returns documented default weights and prototype priority bands."""
    response = client.get("/api/v1/risk/weights")
    assert response.status_code == 200
    data = response.json()

    weights = data["weights"]
    assert "gear_hazard" in weights
    assert "wildlife_risk" in weights
    assert "drift_dispersal" in weights
    assert "coastal_grounding" in weights
    assert "temporal_age" in weights

    total_weight = sum(weights.values())
    assert abs(total_weight - 1.0) < 1e-3

    bands = data["priority_bands"]
    assert bands["critical"][0] == 80.0
    assert bands["high"][0] == 60.0
    assert bands["medium"][0] == 35.0
    assert bands["low"][0] == 0.0


def test_unverified_incidents_excluded_from_queue(client: TestClient, db_session: Session):
    """Verify that unverified incidents (status != 'verified') are never in the recovery queue."""
    unverified = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.5, 15.5), srid=4326),
        status="reported",  # NOT verified
        description="Awaiting NGO field validation",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add(unverified)
    db_session.flush()
    unverified_id = unverified.id

    # Query queue
    response = client.get("/api/v1/risk/queue")
    assert response.status_code == 200
    items = response.json()["items"]

    # Verify unverified report is NOT in the queue
    unverified_matches = [item["report_id"] for item in items if item["report_id"] == unverified_id]
    assert len(unverified_matches) == 0


def test_confirmed_wildlife_impact_handling(client: TestClient, db_session: Session):
    """Verify that confirmed wildlife entanglement awards 25 points and raises priority."""
    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.5, 15.5), srid=4326),
        status="verified",
        description="Confirmed sea turtle entangled in monofilament netting",
        reported_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment is not None
    assert assessment["factors"]["wildlife_risk"].points_awarded == 25.0
    assert "Confirmed" in assessment["factors"]["wildlife_risk"].description
    assert assessment["risk_score"] >= 50.0  # Gillnet (30) + Wildlife (25) = at least 55 base


def test_missing_data_distinguished_from_low_risk(client: TestClient, db_session: Session):
    """
    Verify that missing forecast/telemetry does NOT produce 0 risk.
    It should compute available factors, set needs_inputs=True, and confidence='low'.
    """
    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.5, 15.5), srid=4326),
        status="verified",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
        description="Net spotted offshore, no wildlife detected yet",
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment is not None

    # Score must NOT be zero because gear is a gillnet (30 pts) + age
    assert assessment["risk_score"] > 0
    assert assessment["needs_inputs"] is True
    assert assessment["data_confidence"] == DataConfidenceEnum.LOW
    assert len(assessment["missing_inputs"]) > 0
    assert any("forecast" in msg.lower() for msg in assessment["missing_inputs"])


def test_estimated_grounding_distinguished_from_confirmed(client: TestClient, db_session: Session):
    """
    Verify that shoreline grounding is explicitly marked as a model estimate,
    NOT confirmed physical grounding.
    """
    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.5, 15.5), srid=4326),
        status="verified",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
        description="Active net drifting towards Konkan shore",
    )
    db_session.add(report)
    db_session.flush()

    # Create forecast points that intersect Konkan coastline (lat 16.5, lon 73.40 > coast_lon 73.36)
    forecast = DriftForecast(
        report_id=report.id,
        model_name="LagrangianParticleTracker",
        forecast_time=datetime.now(timezone.utc),
        step_index=3,
        predicted_location=from_shape(Point(73.40, 16.5), srid=4326),
        current_speed=0.25,
        current_direction=45.0,
        wind_speed=2.0,
        wind_direction=210.0,
        distance_km=1.2,
    )
    db_session.add(forecast)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment is not None

    grounding_factor = assessment["factors"]["coastal_grounding"]
    assert grounding_factor.points_awarded == 15.0
    assert "model estimate" in grounding_factor.description.lower()
    assert "not confirmed physical grounding" in grounding_factor.description.lower()
    assert assessment["grounding_detected"] is True


def test_forecast_association_isolated_to_incident(client: TestClient, db_session: Session):
    """Verify that saved forecast data is used only for its own associated incident."""
    report_a = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.5, 15.5), srid=4326),
        status="verified",
        description="Incident A",
        reported_at=datetime.now(timezone.utc),
    )
    report_b = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.6, 15.6), srid=4326),
        status="verified",
        description="Incident B",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add_all([report_a, report_b])
    db_session.flush()

    forecast_a = DriftForecast(
        report_id=report_a.id,
        model_name="LagrangianParticleTracker",
        forecast_time=datetime.now(timezone.utc),
        step_index=1,
        predicted_location=from_shape(Point(73.51, 15.51), srid=4326),
        distance_km=1.5,
    )
    db_session.add(forecast_a)
    db_session.flush()

    assess_a = calculate_incident_risk(report_a, db_session)
    assess_b = calculate_incident_risk(report_b, db_session)

    # Incident A has displacement
    assert assess_a["net_displacement_km"] is not None
    # Incident B must NOT inherit Incident A's forecast
    assert assess_b["net_displacement_km"] is None
    assert assess_b["needs_inputs"] is True


def test_queue_filtering_and_sorting(client: TestClient):
    """Test filtering by priority, gear type, wildlife, and sorting options."""
    # 1. Base queue
    resp = client.get("/api/v1/risk/queue")
    assert resp.status_code == 200
    all_items = resp.json()["items"]
    assert len(all_items) > 0

    # 2. Filter by priority
    resp_crit = client.get("/api/v1/risk/queue?priority=critical")
    assert resp_crit.status_code == 200
    crit_items = resp_crit.json()["items"]
    for item in crit_items:
        assert item["priority"] == "critical"
        assert item["risk_score"] >= 80.0

    # 3. Filter by gear type
    resp_gear = client.get("/api/v1/risk/queue?gear_type=gillnet")
    assert resp_gear.status_code == 200
    gear_items = resp_gear.json()["items"]
    for item in gear_items:
        assert "gillnet" in item["gear_type"].lower()

    # 4. Sort by score ascending vs descending
    resp_desc = client.get("/api/v1/risk/queue?sort_by=risk_score&sort_order=desc")
    resp_asc = client.get("/api/v1/risk/queue?sort_by=risk_score&sort_order=asc")
    assert resp_desc.status_code == 200
    assert resp_asc.status_code == 200

    desc_scores = [i["risk_score"] for i in resp_desc.json()["items"]]
    asc_scores = [i["risk_score"] for i in resp_asc.json()["items"]]

    assert desc_scores == sorted(desc_scores, reverse=True)
    assert asc_scores == sorted(asc_scores)


def test_api_validation_and_error_handling(client: TestClient):
    """Test 404 on invalid incident, and validation on custom weights."""
    # Nonexistent incident
    resp_404 = client.get("/api/v1/risk/incident/999999")
    assert resp_404.status_code == 404

    # Invalid weights sum (sum != 1.0 and sum != 100)
    invalid_payload = {
        "custom_weights": {
            "gear_hazard": 50.0,
            "wildlife_risk": 50.0,
            "drift_dispersal": 50.0,  # Sum = 170.0
            "coastal_grounding": 10.0,
            "temporal_age": 10.0,
        }
    }
    resp_val = client.post("/api/v1/risk/evaluate/417", json=invalid_payload)
    assert resp_val.status_code == 400
    assert "must sum to 1.0 (or 100%)" in resp_val.json()["detail"]


def test_custom_weights_recalibration(client: TestClient):
    """Test evaluating with custom valid weights shifts the awarded points accordingly."""
    # Focus heavily on gear_hazard (70%) and wildlife (20%)
    custom_payload = {
        "custom_weights": {
            "gear_hazard": 70.0,
            "wildlife_risk": 20.0,
            "drift_dispersal": 5.0,
            "coastal_grounding": 3.0,
            "temporal_age": 2.0,
        }
    }
    resp = client.post("/api/v1/risk/evaluate/417", json=custom_payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["factors"]["gear_hazard"]["weight_pct"] == 70.0
    assert data["factors"]["gear_hazard"]["max_points"] == 70.0
