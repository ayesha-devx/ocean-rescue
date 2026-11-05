"""
Regression and consistency tests for OceanRescue Risk Prioritization Module.
Specifically validates:
1. Grounding at step 0 awards 0 drift dispersal points, preserving hypothetical metrics.
2. Grounding at intermediate steps truncates drift calculation at grounding point.
3. Score arithmetic and 1-decimal rounding consistency (composite score == sum of factor points).
4. Fishing gear/debris classes (e.g., 'fishing_net', 'rope', 'monofilament_line') are NEVER classified as marine fauna.
5. Candidate animal detections are separated from confirmed wildlife entanglement.
6. Confirmed wildlife impact requires valid verified evidence.
7. Confidence and missing-input indicators are logically consistent and specific.
8. Risk assessments between different incident IDs are strictly isolated.
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.gear_report import GearReport
from app.models.drift_forecast import DriftForecast
from app.models.ai_detection import AiDetection
from app.models.environmental_observation import EnvironmentalObservation
from app.services.risk_service import (
    calculate_incident_risk,
    assess_wildlife_impact,
    is_marine_fauna,
    is_gear_or_debris,
    DEFAULT_WEIGHTS,
)
from app.schemas.risk import DataConfidenceEnum, PriorityBandEnum


def test_grounding_at_step_0_no_drift_distance(client: TestClient, db_session: Session):
    """
    If grounding is detected at step 0 (e.g., initial location is already within the coastal zone),
    the incident must NOT receive maximum drift dispersal points based on hypothetical post-grounding movement.
    Drift dispersal points awarded must be 0.0, while hypothetical metrics are preserved for audit.
    """
    report = GearReport(
        gear_type="gillnet",
        # Coastal zone near Konkan: lon 73.40, lat 16.5 (east of coast_lon 73.36)
        reported_location=from_shape(Point(73.40, 16.5), srid=4326),
        status="verified",
        description="Discarded net stranded near coastal rocks",
        reported_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    db_session.add(report)
    db_session.flush()

    # Step 0 is already in coastal zone (lon 73.40, lat 16.5)
    # Hypothetical steps 1..24 move far away into the ocean (hypothetical dispersal)
    forecasts = [
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=0,
            predicted_location=from_shape(Point(73.40, 16.5), srid=4326),
            current_speed=0.1,
            current_direction=45.0,
            distance_km=0.0,
        ),
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=1,
            predicted_location=from_shape(Point(73.20, 16.4), srid=4326),
            current_speed=0.5,
            current_direction=220.0,
            distance_km=15.0,
        ),
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=24,
            predicted_location=from_shape(Point(72.50, 15.8), srid=4326),
            current_speed=0.8,
            current_direction=200.0,
            distance_km=110.0,
        ),
    ]
    db_session.add_all(forecasts)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment is not None

    # Coastal grounding should be detected at step 0
    assert assessment["grounding_detected"] is True
    assert assessment["grounding_step"] == 0

    # Drift dispersal points must be 0.0 because the object is already grounded at step 0
    drift_factor = assessment["factors"]["drift_dispersal"]
    assert drift_factor.points_awarded == 0.0
    assert "step 0" in drift_factor.description.lower()

    # Valid displacement is 0.0 km
    assert assessment["net_displacement_km"] == 0.0
    assert assessment["valid_trajectory_points_count"] == 1

    # Hypothetical displacement and points must be preserved for audit
    assert assessment["hypothetical_net_displacement_km"] is not None
    assert assessment["hypothetical_net_displacement_km"] > 50.0
    assert assessment["hypothetical_trajectory_points_count"] == 3


def test_grounding_at_intermediate_step_excludes_post_grounding_points(
    client: TestClient, db_session: Session
):
    """
    If grounding occurs at step 3, only trajectory steps 0..3 are valid.
    Post-grounding hypothetical points (steps 4..24) must never be used in calculating drift dispersal risk.
    """
    report = GearReport(
        gear_type="trawl",
        # Offshore location: lon 72.80, lat 16.0
        reported_location=from_shape(Point(72.80, 16.0), srid=4326),
        status="verified",
        description="Trawl net drifting toward shore",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report)
    db_session.flush()

    # Steps 0..2 offshore; step 3 enters coastal buffer (lon 73.35, lat 16.5); step 24 hypothetical
    forecasts = [
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=0,
            predicted_location=from_shape(Point(72.80, 16.0), srid=4326),
            current_speed=0.3,
            current_direction=60.0,
            distance_km=0.0,
        ),
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=1,
            predicted_location=from_shape(Point(72.95, 16.15), srid=4326),
            current_speed=0.4,
            current_direction=60.0,
            distance_km=18.0,
        ),
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=2,
            predicted_location=from_shape(Point(73.15, 16.35), srid=4326),
            current_speed=0.4,
            current_direction=60.0,
            distance_km=38.0,
        ),
        # Grounding step:
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=3,
            predicted_location=from_shape(Point(73.40, 16.5), srid=4326),
            current_speed=0.3,
            current_direction=60.0,
            distance_km=58.0,
        ),
        # Post-grounding hypothetical step 24 (should be EXCLUDED from risk score):
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianParticleTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=24,
            predicted_location=from_shape(Point(74.50, 17.5), srid=4326),
            current_speed=0.9,
            current_direction=60.0,
            distance_km=220.0,
        ),
    ]
    db_session.add_all(forecasts)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment is not None

    assert assessment["grounding_detected"] is True
    assert assessment["grounding_step"] == 3

    # Valid points count should be 4 (steps 0, 1, 2, 3)
    assert assessment["valid_trajectory_points_count"] == 4
    assert assessment["hypothetical_trajectory_points_count"] == 5

    # Valid displacement must be from step 0 to step 3 (~65-75 km), NOT step 24 (>200 km)
    assert assessment["net_displacement_km"] < 100.0
    assert assessment["hypothetical_net_displacement_km"] > 200.0

    # Coastal grounding factor reflects step 3
    grounding_factor = assessment["factors"]["coastal_grounding"]
    assert "step +3h" in grounding_factor.description.lower() or "step 3" in grounding_factor.description.lower()


def test_score_arithmetic_and_rounding_consistency(client: TestClient, db_session: Session):
    """
    Ensure the composite score equals the EXACT sum of displayed factor contributions.
    Consistent 1-decimal rounding must be used across all factors.
    """
    report = GearReport(
        gear_type="longline",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Discarded monofilament longline with baited hooks",
        reported_at=datetime.now(timezone.utc) - timedelta(days=5, hours=12),
    )
    db_session.add(report)
    db_session.flush()

    # Add forecast with modest drift
    forecast = DriftForecast(
        report_id=report.id,
        model_name="LagrangianParticleTracker",
        forecast_time=datetime.now(timezone.utc),
        step_index=1,
        predicted_location=from_shape(Point(73.05, 15.08), srid=4326),
        distance_km=10.5,
        current_speed=0.22,
        current_direction=45.0,
    )
    db_session.add(forecast)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment is not None

    factors = assessment["factors"]
    factor_sum = round(sum(f.points_awarded for f in factors.values()), 1)

    # Arithmetic exact equality
    assert assessment["risk_score"] == factor_sum

    # Each individual factor must be rounded to 1 decimal place
    for fname, fval in factors.items():
        assert fval.points_awarded == round(fval.points_awarded, 1)

    # Test via API response
    resp = client.get(f"/api/v1/risk/incident/{report.id}")
    assert resp.status_code == 200
    api_data = resp.json()

    api_factors = api_data["factors"]
    api_sum = round(sum(f["points_awarded"] for f in api_factors.values()), 1)
    assert api_data["risk_score"] == api_sum


def test_gear_detections_not_classified_as_marine_fauna():
    """
    Verify that fishing gear, nets, and ropes are NEVER classified as marine fauna.
    Regression test for substring bugs like 'fish' in 'fishing_net'.
    """
    # Direct utility test
    assert is_gear_or_debris("fishing_net") is True
    assert is_gear_or_debris("rope") is True
    assert is_gear_or_debris("ghost_net") is True
    assert is_gear_or_debris("monofilament_line") is True

    assert is_marine_fauna("fishing_net") is False
    assert is_marine_fauna("rope") is False
    assert is_marine_fauna("ghost_net") is False
    assert is_marine_fauna("trawl_gear") is False

    # Actual fauna
    assert is_marine_fauna("sea_turtle") is True
    assert is_marine_fauna("dolphin") is True
    assert is_marine_fauna("whale") is True
    assert is_marine_fauna("olive_ridley_turtle") is True


def test_candidate_animal_detections_not_confirmed_entanglement(
    client: TestClient, db_session: Session
):
    """
    A candidate animal detection (pending NGO verification) must NOT be described as confirmed entanglement
    nor award confirmed entanglement points (25.0). It should be categorized as candidate animal detection (8.8 pts).
    """
    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Monofilament gillnet sighted offshore",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report)
    db_session.flush()

    # AI detection of animal with status 'pending' (NOT confirmed by NGO)
    detection = AiDetection(
        report_id=report.id,
        model_name="YOLOv8-MarineLife",
        detected_class="sea_turtle",
        confidence=0.82,
        review_status="pending",
    )
    db_session.add(detection)
    db_session.flush()

    ratio, status, confirmed, desc = assess_wildlife_impact(report.description, [detection])

    # Must be candidate, NOT confirmed
    points_awarded = round(ratio * 25.0, 1)
    assert points_awarded == 8.8  # 35% of 25.0 rounded to 1 dec
    assert "Candidate animal detection" in desc
    assert "Unverified by NGO" in desc
    assert "pending" in desc.lower()
    assert confirmed is False
    assert status == "model_estimate"


def test_confirmed_wildlife_impact_requires_valid_evidence(
    client: TestClient, db_session: Session
):
    """
    Only verified evidence (NGO reviewed 'confirmed' detection or verified narrative)
    should award confirmed wildlife impact points (25.0).
    Negative narrative ("no marine mammals or sea turtles observed") must NOT award wildlife points.
    """
    # 1. Negative narrative should not award wildlife risk
    report_neg = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Abandoned trawl net. No marine mammals or sea turtles were observed entangled.",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report_neg)
    db_session.flush()

    ratio_neg, status_neg, conf_neg, desc_neg = assess_wildlife_impact(report_neg.description, [])
    # Should use unassessed/no wildlife baseline: 5.0 pts (0.20 ratio)
    assert round(ratio_neg * 25.0, 1) == 5.0
    assert "No wildlife entanglement reported" in desc_neg
    assert status_neg == "unassessed"
    assert conf_neg is False

    # 2. Verified NGO confirmed detection awards full 25.0 points
    report_conf = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Trawl net floating offshore",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report_conf)
    db_session.flush()

    detection_conf = AiDetection(
        report_id=report_conf.id,
        model_name="YOLOv8-MarineLife",
        detected_class="olive_ridley_turtle",
        confidence=0.91,
        review_status="confirmed",
        reviewed_by="Marine Biologist Team",
    )
    db_session.add(detection_conf)
    db_session.flush()

    ratio_conf, status_conf, conf_pos, desc_conf = assess_wildlife_impact(report_conf.description, [detection_conf])
    assert round(ratio_conf * 25.0, 1) == 25.0
    assert conf_pos is True
    assert "Confirmed wildlife entanglement" in desc_conf
    assert "olive_ridley_turtle" in desc_conf


def test_data_confidence_and_missing_inputs_consistency(
    client: TestClient, db_session: Session
):
    """
    Confidence measures evidence quality, while needs_inputs indicates missing operational inputs.
    When needs_inputs is True, missing_inputs list must explicitly name what is missing.
    """
    report = GearReport(
        gear_type="unknown",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Debris spotted from vessel",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment is not None

    # Missing forecast and environmental data
    assert assessment["needs_inputs"] is True
    assert len(assessment["missing_inputs"]) > 0
    # Must explicitly state which inputs are missing
    assert any("forecast" in inp.lower() for inp in assessment["missing_inputs"])
    assert any("telemetry" in inp.lower() or "current" in inp.lower() for inp in assessment["missing_inputs"])
    assert assessment["data_confidence"] == DataConfidenceEnum.LOW


def test_isolation_of_risk_assessments_between_incident_ids(
    client: TestClient, db_session: Session
):
    """
    Risk assessments for distinct incident IDs must be strictly isolated.
    A forecast or detection belonging to incident A must never affect incident B.
    """
    report_a = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.1, 15.1), srid=4326),
        status="verified",
        description="Incident A with active drift",
        reported_at=datetime.now(timezone.utc) - timedelta(days=3),
    )
    report_b = GearReport(
        gear_type="pot",
        reported_location=from_shape(Point(73.9, 15.9), srid=4326),
        status="verified",
        description="Incident B without drift",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add_all([report_a, report_b])
    db_session.flush()

    # Add forecast only for incident A
    forecast_a = DriftForecast(
        report_id=report_a.id,
        model_name="LagrangianParticleTracker",
        forecast_time=datetime.now(timezone.utc),
        step_index=2,
        predicted_location=from_shape(Point(73.2, 15.2), srid=4326),
        distance_km=14.0,
        current_speed=0.35,
    )
    db_session.add(forecast_a)
    db_session.flush()

    assess_a = calculate_incident_risk(report_a, db_session)
    assess_b = calculate_incident_risk(report_b, db_session)

    # A has forecast displacement
    assert assess_a["net_displacement_km"] is not None
    assert assess_a["factors"]["drift_dispersal"].points_awarded > 0

    # B must have NO forecast displacement and must flag missing forecast
    assert assess_b["net_displacement_km"] is None
    assert assess_b["needs_inputs"] is True
    assert any("forecast" in m.lower() for m in assess_b["missing_inputs"])


def test_grounding_consistency_incident_607(client: TestClient):
    """
    Requirement 4: Verify Incident #607 grounding status is identical between
    Risk Prioritization and Drift Forecasting. Both must use the same persisted
    forecast and land-mask check (is_land_coordinate); no separate ad-hoc calculation.
    """
    # 1. Fetch from Drift Forecasting module
    drift_resp = client.get("/api/v1/drift-forecasts/latest/607")
    assert drift_resp.status_code == 200
    drift_data = drift_resp.json()

    # 2. Fetch from Risk Prioritization module
    risk_resp = client.get("/api/v1/risk/incident/607")
    assert risk_resp.status_code == 200
    risk_data = risk_resp.json()

    # Both modules must strictly agree on grounding status
    assert drift_data["grounding_detected"] == risk_data["grounding_detected"]
    assert risk_data["grounding_detected"] is False
    assert risk_data["grounding_step"] is None
    assert "offshore" in risk_data["factors"]["coastal_grounding"]["description"].lower()


def test_completeness_and_confidence_filter_semantics(client: TestClient):
    """
    Requirement 2 & 5: Audit Data Completeness and Confidence filter semantics.
    Confirms that:
    - needs_inputs filters by operational completeness (needs_inputs=True),
      including BOTH high-confidence and low-confidence incidents.
    - low_confidence filters strictly by data_confidence='low'.
    - high_confidence filters strictly by data_confidence='high'.
    - complete filters strictly by needs_inputs=False.
    - An incident with HIGH confidence and needs_inputs=True is NOT classified as LOW confidence.
    """
    # 1. Needs inputs filter
    resp_inputs = client.get("/api/v1/risk/queue?completeness=needs_inputs")
    assert resp_inputs.status_code == 200
    input_items = resp_inputs.json()["items"]
    assert len(input_items) > 0
    for item in input_items:
        assert item["needs_inputs"] is True

    # Must contain both high confidence (#292 or #607) and low confidence (#156)
    confidences = {item["data_confidence"] for item in input_items}
    assert "high" in confidences
    assert "low" in confidences

    # 2. Low confidence filter
    resp_low = client.get("/api/v1/risk/queue?completeness=low_confidence")
    assert resp_low.status_code == 200
    low_items = resp_low.json()["items"]
    for item in low_items:
        assert item["data_confidence"] == "low"
    assert any(item["report_id"] == 156 for item in low_items)
    # High confidence incidents must NEVER appear under low_confidence
    assert not any(item["report_id"] in [292, 417, 607, 326] for item in low_items)

    # 3. High confidence filter
    resp_high = client.get("/api/v1/risk/queue?completeness=high_confidence")
    assert resp_high.status_code == 200
    high_items = resp_high.json()["items"]
    for item in high_items:
        assert item["data_confidence"] == "high"
    assert any(item["report_id"] == 292 for item in high_items)
    assert any(item["report_id"] == 417 for item in high_items)
    assert not any(item["report_id"] == 156 for item in high_items)

    # 4. Complete operational inputs filter
    resp_comp = client.get("/api/v1/risk/queue?completeness=complete")
    assert resp_comp.status_code == 200
    comp_items = resp_comp.json()["items"]
    for item in comp_items:
        assert item["needs_inputs"] is False
    assert any(item["report_id"] == 417 for item in comp_items)


def test_priority_filtering_critical_and_medium(client: TestClient):
    """
    Requirement 5: Test Priority filtering, zero results filtering, and Medium/High filter,
    verifying global summary counts remain intact.
    """
    # 1. Critical filter (80-100) -> returns verified critical items (0 in current verified baseline)
    resp_crit = client.get("/api/v1/risk/queue?priority=critical")
    assert resp_crit.status_code == 200
    crit_data = resp_crit.json()
    for item in crit_data["items"]:
        assert item["priority"] == "critical"
        assert item["risk_score"] >= 80.0

    # Summary counts must still reflect complete global verified queue (5 items)
    summary = crit_data["summary"]
    assert summary["total_assessed"] == 5
    assert summary["critical_count"] == 0
    assert summary["high_count"] == 4
    assert summary["medium_count"] == 1
    assert summary["low_count"] == 0
    assert summary["needs_inputs_count"] == 4

    # 2. Priority filter with zero results (Low priority has 0 items in verified baseline)
    resp_zero = client.get("/api/v1/risk/queue?priority=low")
    assert resp_zero.status_code == 200
    zero_data = resp_zero.json()
    assert len(zero_data["items"]) == 0
    assert zero_data["summary"]["total_assessed"] == 5
    assert zero_data["summary"]["low_count"] == 0

    # 3. Medium filter (35-59) -> includes Incident #156
    resp_med = client.get("/api/v1/risk/queue?priority=medium")
    assert resp_med.status_code == 200
    med_items = resp_med.json()["items"]
    assert len(med_items) > 0
    for item in med_items:
        assert item["priority"] == "medium"
        assert 35.0 <= item["risk_score"] < 60.0
    med_ids = [item["report_id"] for item in med_items]
    assert 156 in med_ids

    # 4. High filter (60-79) -> includes Incident #292, #607, #326, #417
    resp_high = client.get("/api/v1/risk/queue?priority=high")
    assert resp_high.status_code == 200
    high_items = resp_high.json()["items"]
    assert len(high_items) >= 4
    for item in high_items:
        assert item["priority"] == "high"
        assert 60.0 <= item["risk_score"] < 80.0
    high_ids = [item["report_id"] for item in high_items]
    assert 292 in high_ids
    assert 607 in high_ids
    assert 326 in high_ids
    assert 417 in high_ids


def test_system_wide_summary_independence_and_dynamic_counts(client: TestClient, db_session: Session):
    """
    Validate:
    1. All filters cleared: filtered count == system-wide count.
    2. Critical-only filter: filtered count == 0, system-wide summary remains 5.
    3. Needs Inputs filter: filtered count == 4, system-wide summary remains 5.
    4. Filtered queue count changes independently from system-wide summary.
    5. Counts are dynamic (not hardcoded): adding a new verified incident increments
       system-wide total and appropriate priority, while an unverified report is ignored.
    """
    # 1. All filters cleared
    resp_all = client.get("/api/v1/risk/queue")
    assert resp_all.status_code == 200
    all_data = resp_all.json()
    summary_baseline = all_data["summary"]
    initial_total = summary_baseline["total_assessed"]
    assert initial_total == 5
    assert len(all_data["items"]) == 5
    assert summary_baseline["critical_count"] == 0
    assert summary_baseline["high_count"] == 4
    assert summary_baseline["medium_count"] == 1
    assert summary_baseline["low_count"] == 0
    assert summary_baseline["needs_inputs_count"] == 4

    # 2. Critical-only filter
    resp_crit = client.get("/api/v1/risk/queue?priority=critical")
    assert resp_crit.status_code == 200
    crit_data = resp_crit.json()
    assert len(crit_data["items"]) == 0
    # System-wide summary must remain identical to baseline
    assert crit_data["summary"] == summary_baseline

    # 3. Needs Inputs filter
    resp_needs = client.get("/api/v1/risk/queue?completeness=needs_inputs")
    assert resp_needs.status_code == 200
    needs_data = resp_needs.json()
    assert len(needs_data["items"]) == 4
    # System-wide summary must remain identical to baseline
    assert needs_data["summary"] == summary_baseline

    # 4. Filtered queue count changes independently
    resp_search = client.get("/api/v1/risk/queue?search=417")
    assert resp_search.status_code == 200
    search_data = resp_search.json()
    assert len(search_data["items"]) == 1
    assert search_data["summary"] == summary_baseline

    # 5. Dynamic count updates:
    # A) Add an UNVERIFIED report (status='reported') -> MUST NOT be included in verified summary
    unverified_report = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.1, 15.2), srid=4326),
        status="reported",
        description="Unverified citizen report of net",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add(unverified_report)
    db_session.flush()

    resp_after_unverified = client.get("/api/v1/risk/queue")
    assert resp_after_unverified.json()["summary"]["total_assessed"] == initial_total

    # B) Add a VERIFIED report (status='verified') with low risk (e.g. traps/pots, fresh, no wildlife)
    new_verified = GearReport(
        gear_type="traps",
        reported_location=from_shape(Point(73.1, 15.2), srid=4326),
        status="verified",
        description="Recovered crab pot intact near harbour. No marine mammals or turtles observed.",
        reported_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db_session.add(new_verified)
    db_session.flush()

    resp_after_new = client.get("/api/v1/risk/queue")
    new_summary = resp_after_new.json()["summary"]
    assert new_summary["total_assessed"] == initial_total + 1
    # Check that priority cards dynamically adjusted (e.g., total_assessed increased by 1)
    assert sum([
        new_summary["critical_count"],
        new_summary["high_count"],
        new_summary["medium_count"],
        new_summary["low_count"]
    ]) == new_summary["total_assessed"]

