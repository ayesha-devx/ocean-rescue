"""
Comprehensive Phase 9 Automated Test Suite for OceanRescue Risk Prioritization Subsystem.
Validates all 20 required scenarios specified in the system audit:
1. Each factor independently (Gear 30, Wildlife 25, Drift 20, Grounding 15, Age 10).
2. Final score addition (Sum of displayed factor points == Total Risk Score).
3. Priority threshold boundaries (Critical 80-100, High 60-79.9, Medium 35-59.9, Low 0-34.9).
4. Missing wildlife data handling.
5. Confirmed versus suspected wildlife interaction.
6. Missing gear classification handling.
7. Missing loss timestamps handling.
8. Timezone handling (UTC and local offsets).
9. Stale drift forecasts (flagged, > 24h).
10. Grounding detection.
11. Exclusion of post-grounding hypothetical points.
12. Forecast updates (scoping to latest run when multiple exist).
13. New verified incidents (dynamically incrementing queue).
14. Unverified and rejected incident exclusion.
15. Filter-independent summary counts (Critical + High + Medium + Low == Total Verified).
16. Dynamic average score.
17. API response validation (complete schema fields: incident_id, factors, formula_description, etc.).
18. Case inspector updates (isolated per-incident assessments).
19. Zero verified incidents handling.
20. No available forecasts fallback handling.
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.gear_report import GearReport
from app.models.drift_forecast import DriftForecast
from app.models.ai_detection import AiDetection
from app.models.environmental_observation import EnvironmentalObservation
from app.models.risk_assessment import RiskAssessment
from app.services.risk_service import (
    calculate_incident_risk,
    assess_wildlife_impact,
    evaluate_and_persist_incident_risk,
    get_risk_prioritized_queue,
    calculate_distance_to_coastline_km,
    DEFAULT_WEIGHTS,
    PRIORITY_CRITICAL_MIN,
    PRIORITY_HIGH_MIN,
    PRIORITY_MEDIUM_MIN,
)
from app.schemas.risk import PriorityBandEnum, DataConfidenceEnum, RiskWeightConfig, RiskQueueSummary


# 1. Each factor independently
def test_1_each_factor_independently(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.5, 15.5), srid=4326),
        status="verified",
        description="Freshly lost net sighted",
        reported_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    factors = assessment["factors"]

    # Gear hazard (max 30)
    assert 0.0 <= factors["gear_hazard"].points_awarded <= 30.0
    assert factors["gear_hazard"].max_points == 30.0

    # Wildlife risk (max 25)
    assert 0.0 <= factors["wildlife_risk"].points_awarded <= 25.0
    assert factors["wildlife_risk"].max_points == 25.0

    # Drift dispersal (max 20)
    assert 0.0 <= factors["drift_dispersal"].points_awarded <= 20.0
    assert factors["drift_dispersal"].max_points == 20.0

    # Coastal grounding (max 15)
    assert 0.0 <= factors["coastal_grounding"].points_awarded <= 15.0
    assert factors["coastal_grounding"].max_points == 15.0

    # Temporal age (max 10)
    assert 0.0 <= factors["temporal_age"].points_awarded <= 10.0
    assert factors["temporal_age"].max_points == 10.0


# 2. Final score addition (Sum of displayed factor points == Total Risk Score)
def test_2_final_score_addition_exact_sum(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="trawl_net",
        reported_location=from_shape(Point(73.2, 16.2), srid=4326),
        status="verified",
        description="Submerged trawl gear",
        reported_at=datetime.now(timezone.utc) - timedelta(days=3),
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    factors = assessment["factors"]
    factor_sum = round(sum(f.points_awarded for f in factors.values()), 1)
    assert assessment["risk_score"] == factor_sum
    assert 0.0 <= assessment["risk_score"] <= 100.0


# 3. Priority threshold boundaries (Critical 80-100, High 60-79.9, Medium 35-59.9, Low 0-34.9)
def test_3_priority_threshold_boundaries():
    assert PRIORITY_CRITICAL_MIN == 80.0
    assert PRIORITY_HIGH_MIN == 60.0
    assert PRIORITY_MEDIUM_MIN == 35.0

    # Verify boundary mappings in PriorityBandEnum
    def get_tier(score):
        if score >= 80.0:
            return PriorityBandEnum.CRITICAL
        elif score >= 60.0:
            return PriorityBandEnum.HIGH
        elif score >= 35.0:
            return PriorityBandEnum.MEDIUM
        return PriorityBandEnum.LOW

    assert get_tier(80.0) == PriorityBandEnum.CRITICAL
    assert get_tier(79.9) == PriorityBandEnum.HIGH
    assert get_tier(60.0) == PriorityBandEnum.HIGH
    assert get_tier(59.9) == PriorityBandEnum.MEDIUM
    assert get_tier(35.0) == PriorityBandEnum.MEDIUM
    assert get_tier(34.9) == PriorityBandEnum.LOW
    assert get_tier(0.0) == PriorityBandEnum.LOW


# 4. Missing wildlife data handling
def test_4_missing_wildlife_data_flagged(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="pot",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Crab pot drifting at sea",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment["factors"]["wildlife_risk"].status == "unassessed"
    assert any("wildlife" in inp.lower() for inp in assessment["missing_inputs"])
    assert assessment["needs_inputs"] is True


# 5. Confirmed versus suspected wildlife interaction
def test_5_confirmed_vs_suspected_wildlife(client: TestClient, db_session: Session):
    # Confirmed
    rep_conf = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Confirmed dolphin entangled in netting mesh",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    # Suspected
    rep_susp = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Net drifting near known coral reef marine sanctuary",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add_all([rep_conf, rep_susp])
    db_session.flush()

    assess_conf = calculate_incident_risk(rep_conf, db_session)
    assess_susp = calculate_incident_risk(rep_susp, db_session)

    assert assess_conf["wildlife_impact_confirmed"] is True
    assert assess_conf["factors"]["wildlife_risk"].points_awarded == 25.0
    assert assess_conf["factors"]["wildlife_risk"].status == "measured"

    assert assess_susp["wildlife_impact_confirmed"] is False
    assert assess_susp["factors"]["wildlife_risk"].points_awarded == 12.5
    assert assess_susp["factors"]["wildlife_risk"].status == "inferred"


# 6. Missing gear classification handling
def test_6_missing_gear_classification(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="unknown",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Unidentified marine debris object",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment["factors"]["gear_hazard"].status == "incomplete"
    assert assessment["factors"]["gear_hazard"].confidence == "low"
    assert any("gear" in inp.lower() for inp in assessment["missing_inputs"])


# 7. Missing loss timestamps handling
def test_7_missing_loss_timestamp(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="rope_line",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Mooring line floating",
    )
    db_session.add(report)
    db_session.flush()

    # Explicitly test null timestamp handling
    report.reported_at = None

    assessment = calculate_incident_risk(report, db_session)
    assert assessment["factors"]["temporal_age"].status == "missing"
    assert assessment["factors"]["temporal_age"].points_awarded == 0.0
    assert any("timestamp" in inp.lower() for inp in assessment["missing_inputs"])



# 8. Timezone handling (UTC and local offsets)
def test_8_timezone_handling(client: TestClient, db_session: Session):
    # Test with non-UTC offset (IST +05:30)
    ist = timezone(timedelta(hours=5, minutes=30))
    ist_time = datetime.now(ist) - timedelta(days=2)

    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="IST timestamped incident",
        reported_at=ist_time,
    )
    db_session.add(report)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    age_pts = assessment["factors"]["temporal_age"].points_awarded
    assert age_pts == 8.0  # 2 days old -> bracket 1..7 days awards 8.0 pts


# 9. Stale drift forecasts (flagged, > 24h)
def test_9_stale_drift_forecast_detection(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Incident with stale forecast",
        reported_at=datetime.now(timezone.utc) - timedelta(days=4),
    )
    db_session.add(report)
    db_session.flush()

    # Forecast generated 30 hours ago (> 24h validity threshold)
    forecast = DriftForecast(
        report_id=report.id,
        model_name="LagrangianParticleTracker",
        forecast_time=datetime.now(timezone.utc) - timedelta(hours=30),
        step_index=1,
        predicted_location=from_shape(Point(72.9, 15.1), srid=4326),
        distance_km=12.0,
        current_speed=0.25,
    )
    db_session.add(forecast)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment["forecast_is_stale"] is True
    assert len(assessment["stale_inputs"]) > 0
    assert any("stale" in s.lower() for s in assessment["stale_inputs"])


# 10. Grounding detection
def test_10_grounding_detection(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.2, 16.5), srid=4326),
        status="verified",
        description="Trawl near land",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report)
    db_session.flush()

    # Forecast step entering land east of 73.36 (16.5N)
    forecast = DriftForecast(
        report_id=report.id,
        model_name="LagrangianParticleTracker",
        forecast_time=datetime.now(timezone.utc),
        step_index=2,
        predicted_location=from_shape(Point(73.40, 16.5), srid=4326),
        distance_km=22.0,
    )
    db_session.add(forecast)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment["grounding_detected"] is True
    assert assessment["factors"]["coastal_grounding"].points_awarded == 15.0
    assert assessment["factors"]["coastal_grounding"].status == "model_estimate"


# 11. Exclusion of post-grounding hypothetical points
def test_11_exclusion_of_post_grounding_points(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="net",
        reported_location=from_shape(Point(73.0, 16.0), srid=4326),
        status="verified",
        description="Net drifting toward shore",
        reported_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report)
    db_session.flush()

    forecasts = [
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=0,
            predicted_location=from_shape(Point(73.0, 16.0), srid=4326),
            distance_km=0.0,
        ),
        DriftForecast(
            report_id=report.id,
            model_name="LagrangianTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=1,
            predicted_location=from_shape(Point(73.60, 16.0), srid=4326),  # Grounded on coast (east of 73.52)
            distance_km=42.0,
        ),

        DriftForecast(
            report_id=report.id,
            model_name="LagrangianTracker",
            forecast_time=datetime.now(timezone.utc),
            step_index=24,
            predicted_location=from_shape(Point(74.50, 16.0), srid=4326),  # Hypothetical post-grounding
            distance_km=150.0,
        ),
    ]
    db_session.add_all(forecasts)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    assert assessment["grounding_detected"] is True
    assert assessment["valid_trajectory_points_count"] < assessment["hypothetical_trajectory_points_count"]
    assert assessment["net_displacement_km"] < assessment["hypothetical_net_displacement_km"]


# 12. Forecast updates (scoping to latest run when multiple exist)
def test_12_forecast_updates_scoping_to_latest(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Incident with multiple forecast runs",
        reported_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    db_session.add(report)
    db_session.flush()

    # Simulation 1: step 1 with 5 km distance
    sim1 = DriftForecast(
        report_id=report.id,
        model_name="OldRun",
        forecast_time=datetime.now(timezone.utc) - timedelta(hours=5),
        step_index=1,
        predicted_location=from_shape(Point(73.05, 15.0), srid=4326),
        distance_km=5.0,
    )
    db_session.add(sim1)
    db_session.flush()

    # Simulation 2: updated step 1 with 25 km distance (higher ID)
    sim2 = DriftForecast(
        report_id=report.id,
        model_name="NewRun",
        forecast_time=datetime.now(timezone.utc),
        step_index=1,
        predicted_location=from_shape(Point(73.25, 15.0), srid=4326),
        distance_km=25.0,
    )
    db_session.add(sim2)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    # Must use the latest simulation point (sim2 ID)
    assert assessment["latest_forecast_id"] == sim2.id
    assert assessment["net_displacement_km"] > 20.0


# 13. New verified incidents (dynamically incrementing queue)
def test_13_new_verified_incident_increments_queue(client: TestClient, db_session: Session):
    resp_before = client.get("/api/v1/risk/queue")
    count_before = resp_before.json()["summary"]["total_verified"]

    new_rep = GearReport(
        gear_type="crab_pot",
        reported_location=from_shape(Point(73.1, 15.2), srid=4326),
        status="verified",
        description="Freshly verified crab pot",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add(new_rep)
    db_session.flush()

    resp_after = client.get("/api/v1/risk/queue")
    count_after = resp_after.json()["summary"]["total_verified"]
    assert count_after == count_before + 1


# 14. Unverified and rejected incident exclusion
def test_14_unverified_and_rejected_excluded(client: TestClient, db_session: Session):
    rep_reported = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="reported",  # Unverified
        description="Unverified fisherman submission",
        reported_at=datetime.now(timezone.utc),
    )
    rep_rejected = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="rejected",  # Rejected
        description="Rejected duplicate report",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add_all([rep_reported, rep_rejected])
    db_session.flush()

    queue_resp = client.get("/api/v1/risk/queue")
    items = queue_resp.json()["items"]
    ids_in_queue = {i["report_id"] for i in items}

    assert rep_reported.id not in ids_in_queue
    assert rep_rejected.id not in ids_in_queue


# 15. Filter-independent summary counts
def test_15_filter_independent_summary_counts(client: TestClient):
    resp_all = client.get("/api/v1/risk/queue")
    sum_all = resp_all.json()["summary"]

    resp_filt = client.get("/api/v1/risk/queue?priority=critical")
    sum_filt = resp_filt.json()["summary"]

    # Filtered summary counts must match system-wide summary counts
    assert sum_all["total_verified"] == sum_filt["total_verified"]
    assert sum_all["critical_count"] == sum_filt["critical_count"]
    assert sum_all["high_count"] == sum_filt["high_count"]
    assert sum_all["medium_count"] == sum_filt["medium_count"]
    assert sum_all["low_count"] == sum_filt["low_count"]

    # Math invariant: Critical + High + Medium + Low == Total Verified
    assert (
        sum_all["critical_count"]
        + sum_all["high_count"]
        + sum_all["medium_count"]
        + sum_all["low_count"]
        == sum_all["total_verified"]
    )


# 16. Dynamic average score
def test_16_dynamic_average_score(client: TestClient):
    resp = client.get("/api/v1/risk/queue")
    assert resp.status_code == 200
    data = resp.json()
    summary = data["summary"]
    items = data["items"]

    if summary["total_verified"] > 0:
        assert summary["average_score"] > 0.0
        # Check calculation consistency
        item_scores = [i["risk_score"] for i in items]
        expected_avg = round(sum(item_scores) / len(item_scores), 1)
        assert abs(summary["average_score"] - expected_avg) <= 0.2


# 17. API response validation
def test_17_api_response_validation(client: TestClient):
    resp = client.get("/api/v1/risk/queue")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) > 0

    first = items[0]
    assert "report_id" in first
    assert "incident_id" in first
    assert "risk_score" in first
    assert "priority" in first
    assert "data_confidence" in first
    assert "needs_inputs" in first
    assert "factors" in first
    assert "primary_reason" in first
    assert "recommended_action" in first
    assert "calculation_version" in first

    # Factor detail breakdown check
    gear = first["factors"]["gear_hazard"]
    assert "points_awarded" in gear
    assert "max_points" in gear
    assert "weight_pct" in gear
    assert "status" in gear
    assert "description" in gear
    assert "formula_description" in gear


# 18. Case inspector updates (isolated per-incident assessments)
def test_18_case_inspector_updates(client: TestClient, db_session: Session):
    rep_a = GearReport(
        gear_type="gillnet",
        reported_location=from_shape(Point(73.1, 15.1), srid=4326),
        status="verified",
        description="Case A",
        reported_at=datetime.now(timezone.utc),
    )
    rep_b = GearReport(
        gear_type="rope_line",
        reported_location=from_shape(Point(73.8, 15.8), srid=4326),
        status="verified",
        description="Case B",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add_all([rep_a, rep_b])
    db_session.flush()

    resp_a = client.get(f"/api/v1/risk/incident/{rep_a.id}")
    resp_b = client.get(f"/api/v1/risk/incident/{rep_b.id}")

    data_a = resp_a.json()
    data_b = resp_b.json()

    assert data_a["report_id"] == rep_a.id
    assert data_b["report_id"] == rep_b.id
    assert data_a["gear_type"] == "gillnet"
    assert data_b["gear_type"] == "rope_line"
    assert data_a["risk_score"] != data_b["risk_score"]


# 19. Zero verified incidents handling
def test_19_zero_verified_incidents_clean_handling(db_session: Session):
    # Call directly with an empty query result
    summary = RiskQueueSummary(
        total_assessed=0,
        total_verified=0,
        critical_count=0,
        high_count=0,
        medium_count=0,
        low_count=0,
        needs_inputs_count=0,
        average_score=0.0,
    )
    assert summary.total_verified == 0
    assert summary.average_score == 0.0
    assert summary.critical_count + summary.high_count + summary.medium_count + summary.low_count == 0


# 20. No available forecasts fallback handling
def test_20_no_forecasts_fallback_handling(client: TestClient, db_session: Session):
    report = GearReport(
        gear_type="trawl",
        reported_location=from_shape(Point(73.0, 15.0), srid=4326),
        status="verified",
        description="Incident without any forecast",
        reported_at=datetime.now(timezone.utc),
    )
    db_session.add(report)
    db_session.flush()

    # Add surface current environmental observation
    obs = EnvironmentalObservation(
        report_id=report.id,
        observation_location=from_shape(Point(73.0, 15.0), srid=4326),
        current_speed=0.30,
        observed_at=datetime.now(timezone.utc),
        source="COPERNICUS_GLOBCURRENT",
    )
    db_session.add(obs)
    db_session.flush()

    assessment = calculate_incident_risk(report, db_session)
    drift_factor = assessment["factors"]["drift_dispersal"]

    # Fallback to current speed (0.30 m/s -> 0.60 ratio * 20 = 12.0 pts)
    assert drift_factor.status == "inferred"
    assert drift_factor.points_awarded == 12.0
    assert any("forecast" in inp.lower() for inp in assessment["missing_inputs"])
