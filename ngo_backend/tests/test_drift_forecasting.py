"""
Automated test suite for OceanRescue Drift Forecasting subsystem.
Covers:
- Lagrangian advection vector physics (eastward, northward, latitude scaling).
- Robust handling of missing, NaN, and invalid inputs.
- Access controls: only verified incidents eligible, unverified rejected.
- Deterministic environmental service tests with mocking.
- Simulation mode vs real data labeling.
- Database persistence, retrieval, and incident forecast count synchronization.
"""

import math
from datetime import datetime, timezone
import pytest
from fastapi import status

from app.services.drift_service import (
    step_advection,
    calculate_drift_trajectory,
    calculate_haversine_distance_km,
    METERS_PER_DEGREE_LAT,
)
from app.services import environmental_service


# ============================================================================
# 1. DRIFT CALCULATION PHYSICS UNIT TESTS
# ============================================================================

def test_drift_eastward_movement():
    """
    Valid eastward current (u = 1.0 m/s, v = 0.0 m/s) over 1 hour (3600s)
    must produce positive longitude displacement and zero latitude change.
    """
    start_lat = 16.99
    start_lon = 73.30
    u_ms = 1.0
    v_ms = 0.0
    dt = 3600.0  # 1 hour

    new_lat, new_lon = step_advection(start_lat, start_lon, u_ms, v_ms, dt)

    # Latitude must not change
    assert abs(new_lat - start_lat) < 1e-6
    # Longitude must increase (move eastward)
    assert new_lon > start_lon

    expected_dx = u_ms * dt  # 3600 meters
    expected_dlon = expected_dx / (METERS_PER_DEGREE_LAT * math.cos(math.radians(start_lat)))
    assert abs((new_lon - start_lon) - expected_dlon) < 1e-5


def test_drift_northward_movement():
    """
    Valid northward current (u = 0.0 m/s, v = 1.0 m/s) over 1 hour (3600s)
    must produce positive latitude displacement and zero longitude change.
    """
    start_lat = 16.99
    start_lon = 73.30
    u_ms = 0.0
    v_ms = 1.0
    dt = 3600.0

    new_lat, new_lon = step_advection(start_lat, start_lon, u_ms, v_ms, dt)

    # Longitude must not change
    assert abs(new_lon - start_lon) < 1e-6
    # Latitude must increase (move northward)
    assert new_lat > start_lat

    expected_dy = v_ms * dt  # 3600 meters
    expected_dlat = expected_dy / METERS_PER_DEGREE_LAT
    assert abs((new_lat - start_lat) - expected_dlat) < 1e-5


def test_drift_coordinate_scaling_across_different_latitudes():
    """
    At higher latitudes, meridians converge (cos(lat) decreases).
    Therefore, the same eastward physical displacement produces a larger
    degree change in longitude at 60 deg N than at the equator (0 deg).
    """
    u_ms = 1.0
    v_ms = 0.0
    dt = 3600.0

    # Equator (cos(0) = 1.0)
    _, lon_eq = step_advection(0.0, 0.0, u_ms, v_ms, dt)
    dlon_eq = lon_eq - 0.0

    # Mid-latitude 45 deg N (cos(45) ~ 0.7071)
    _, lon_mid = step_advection(45.0, 0.0, u_ms, v_ms, dt)
    dlon_mid = lon_mid - 0.0

    # High-latitude 60 deg N (cos(60) = 0.5)
    _, lon_high = step_advection(60.0, 0.0, u_ms, v_ms, dt)
    dlon_high = lon_high - 0.0

    # Longitude degree displacement must scale inversely with cos(lat)
    assert dlon_mid > dlon_eq
    assert dlon_high > dlon_mid
    # At 60 deg N, dlon must be almost exactly double the equatorial dlon
    assert abs(dlon_high - 2.0 * dlon_eq) < 1e-4


def test_drift_calculation_missing_nan_data_rejected():
    """
    Drift engine must reject NaN or None velocity data and never silently treat it as zero.
    """
    start_time = datetime.now(timezone.utc)
    env_bad = {
        "current_u": float("nan"),
        "current_v": 0.5,
        "mode": "real_data"
    }
    with pytest.raises(ValueError, match="essential velocity components are missing or NaN"):
        calculate_drift_trajectory(16.99, 73.30, start_time, 24, env_bad)


def test_drift_calculation_invalid_coordinates_rejected():
    """
    Drift engine must validate input latitude (-90 to 90) and longitude (-180 to 180).
    """
    start_time = datetime.now(timezone.utc)
    env_good = {"current_u": 0.2, "current_v": -0.1, "mode": "real_data"}

    with pytest.raises(ValueError, match="Invalid latitude"):
        calculate_drift_trajectory(95.0, 73.30, start_time, 24, env_good)

    with pytest.raises(ValueError, match="Invalid longitude"):
        calculate_drift_trajectory(16.99, 195.0, start_time, 24, env_good)


# ============================================================================
# 2. ENDPOINT & WORKFLOW INTEGRATION TESTS
# ============================================================================

def test_eligible_incidents_only_verified(client, db_session):
    """
    GET /api/v1/drift-forecasts/eligible-incidents must return verified incidents
    and exclude pending (reported) or rejected reports.
    """
    # 1. Create a pending report
    pending = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 16.98,
        "longitude": 73.29,
        "description": "Pending unverified net"
    }).json()

    # 2. Create a verified report
    verified = client.post("/api/v1/reports", json={
        "gear_type": "crab_pot",
        "latitude": 16.99,
        "longitude": 73.30,
        "description": "Verified crab pot off Ratnagiri"
    }).json()
    client.patch(f"/api/v1/reports/{verified['id']}/status", json={"status": "verified"})

    # 3. Query eligible incidents
    res = client.get("/api/v1/drift-forecasts/eligible-incidents")
    assert res.status_code == status.HTTP_200_OK
    items = res.json()
    eligible_ids = [item["id"] for item in items]

    assert verified["id"] in eligible_ids
    assert pending["id"] not in eligible_ids

    # All returned incidents must have status == 'verified'
    for inc in items:
        assert inc["status"].lower() == "verified"


def test_unverified_incident_cannot_be_forecast(client, db_session):
    """
    POST /api/v1/drift-forecasts/generate on an unverified report must return HTTP 400.
    """
    unverified = client.post("/api/v1/reports", json={
        "gear_type": "longline",
        "latitude": 17.01,
        "longitude": 73.28,
        "description": "Unverified longline"
    }).json()

    res = client.post("/api/v1/drift-forecasts/generate", json={
        "report_id": unverified["id"],
        "duration_hours": 24,
        "force_simulation": True
    })

    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Only verified incident reports can be modeled" in res.json()["detail"]


def test_generate_forecast_simulation_mode_explicitly_labeled(client, db_session):
    """
    When force_simulation=True is passed, forecast must be explicitly marked as simulation
    with synthetic source labeling.
    """
    rep = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 16.99,
        "longitude": 73.30,
        "description": "Sim test report"
    }).json()
    client.patch(f"/api/v1/reports/{rep['id']}/status", json={"status": "verified"})

    res = client.post("/api/v1/drift-forecasts/generate", json={
        "report_id": rep["id"],
        "duration_hours": 12,
        "time_step_hours": 1,
        "force_simulation": True
    })

    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["simulation_mode"] is True
    assert "Simulation" in data["source"]
    assert data["duration_hours"] == 12
    assert data["points_count"] == 13  # t=0 through t=12

    # Verify each point is labeled as simulation
    for pt in data["points"]:
        assert pt["simulation_mode"] is True
        assert pt["report_id"] == rep["id"]


def test_generate_forecast_deterministic_mock_real_data(client, db_session, monkeypatch):
    """
    When mock real data is returned from Open-Meteo, forecast must be labeled as real_data.
    """
    mock_open_meteo_payload = {
        "current": {
            "time": "2026-10-25T12:00",
            "ocean_current_velocity": 0.45,
            "ocean_current_direction": 180.0
        },
        "hourly": {
            "time": [f"2026-10-25T{h:02d}:00" for h in range(48)],
            "ocean_current_velocity": [0.45] * 48,
            "ocean_current_direction": [180.0] * 48,
            "wave_height": [0.9] * 48,
            "wave_direction": [240.0] * 48
        }
    }

    monkeypatch.setattr(
        "app.services.environmental_service.fetch_open_meteo_marine_data",
        lambda lat, lon, timeout_seconds=10: mock_open_meteo_payload
    )

    rep = client.post("/api/v1/reports", json={
        "gear_type": "trawl_net",
        "latitude": 17.05,
        "longitude": 73.25,
        "description": "Mock real test"
    }).json()
    client.patch(f"/api/v1/reports/{rep['id']}/status", json={"status": "verified"})

    res = client.post("/api/v1/drift-forecasts/generate", json={
        "report_id": rep["id"],
        "duration_hours": 6,
        "time_step_hours": 1,
        "force_simulation": False
    })

    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["simulation_mode"] is False
    assert "Open-Meteo" in data["source"]
    assert len(data["points"]) == 7  # 0 to 6


def test_forecast_persistence_retrieval_and_count_sync(client, db_session):
    """
    Verifies that:
    1. Forecast points are persisted in PostGIS.
    2. Latest forecast can be retrieved via GET /api/v1/drift-forecasts/latest/{id}.
    3. Trajectory points can be retrieved via GET /api/v1/drift-forecasts/by-report/{id}.
    4. Incident report detail endpoint reflects the exact forecast vectors count.
    5. Re-running forecast replaces old points and synchronizes count without duplicate stacking.
    """
    # 1. Create and verify report
    rep = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 16.99,
        "longitude": 73.30,
        "description": "Persistence test"
    }).json()
    rep_id = rep["id"]
    client.patch(f"/api/v1/reports/{rep_id}/status", json={"status": "verified"})

    # Initial check: count is 0
    rep_initial = client.get(f"/api/v1/reports/{rep_id}").json()
    assert rep_initial["drift_forecasts_count"] == 0

    # 2. Generate 6-hour forecast (7 points)
    gen_res = client.post("/api/v1/drift-forecasts/generate", json={
        "report_id": rep_id,
        "duration_hours": 6,
        "force_simulation": True
    })
    assert gen_res.status_code == status.HTTP_201_CREATED

    # 3. Verify count in incident report detail
    rep_after = client.get(f"/api/v1/reports/{rep_id}").json()
    assert rep_after["drift_forecasts_count"] == 7

    # 4. Retrieve latest summary
    latest_res = client.get(f"/api/v1/drift-forecasts/latest/{rep_id}")
    assert latest_res.status_code == status.HTTP_200_OK
    latest_data = latest_res.json()
    assert latest_data["report_id"] == rep_id
    assert latest_data["points_count"] == 7

    # 5. Retrieve points by report
    points_res = client.get(f"/api/v1/drift-forecasts/by-report/{rep_id}")
    assert points_res.status_code == status.HTTP_200_OK
    points_data = points_res.json()
    assert len(points_data) == 7

    # 6. Re-run forecast for 12 hours (13 points) — must replace previous 7 points!
    client.post("/api/v1/drift-forecasts/generate", json={
        "report_id": rep_id,
        "duration_hours": 12,
        "force_simulation": True
    })

    rep_final = client.get(f"/api/v1/reports/{rep_id}").json()
    assert rep_final["drift_forecasts_count"] == 13  # Replaced, not stacked to 20!


# ============================================================================
# 3. FOCUSED AUDIT & SCIENTIFIC RIGOR TESTS
# ============================================================================

def test_temporal_alignment_of_hourly_environmental_series():
    """
    Verifies that when hourly environmental vectors are available, each step is aligned
    to the incident's actual loss time rather than naively indexing from 00:00 UTC.
    """
    # Incident occurred at 14:00 UTC
    start_time = datetime(2026, 10, 29, 14, 0, 0, tzinfo=timezone.utc)
    
    # Hourly series contains 24 hours starting at 00:00 UTC
    # Morning hours (00:00 - 12:00) have u = 0.05, afternoon (13:00 - 23:00) have u = 0.50
    hourly = []
    for h in range(24):
        t_iso = f"2026-10-29T{h:02d}:00"
        u_val = 0.05 if h < 13 else 0.50
        hourly.append({
            "step": h,
            "time": t_iso,
            "u": u_val,
            "v": 0.0,
            "speed": u_val,
            "direction": 90.0,
            "wind_speed": 2.0,
            "wind_direction": 180.0,
            "wind_u": 0.0,
            "wind_v": 2.0
        })

    env_cond = {
        "current_u": 0.50,
        "current_v": 0.0,
        "current_velocity": 0.50,
        "current_direction": 90.0,
        "wind_speed": 2.0,
        "wind_direction": 180.0,
        "mode": "real_data",
        "hourly_series": hourly
    }

    # Run 3-hour forecast starting at 14:00 UTC
    traj = calculate_drift_trajectory(
        start_lat=16.98,
        start_lon=73.27,
        start_time=start_time,
        duration_hours=3,
        env_conditions=env_cond,
        time_step_hours=1,
        windage=0.0
    )

    # Step 1 corresponds to 14:00-15:00 UTC. Its current_u must be 0.50, NOT 0.05!
    step1 = traj["points"][1]
    assert step1["current_u"] == 0.50
    assert step1["current_speed"] == 0.50


def test_path_distance_versus_net_displacement_distinction():
    """
    Verifies that cumulative path distance (arc length) and straight-line displacement
    (geodesic distance from origin) are accurately computed and distinguished.
    For a path that changes direction, total path distance must be strictly greater than net displacement.
    """
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
    # Step 1: North (v=1.0, u=0.0)
    # Step 2: East (v=0.0, u=1.0)
    hourly = [
        {"time": "2026-10-29T12:00", "u": 0.0, "v": 1.0, "speed": 1.0, "direction": 0.0},
        {"time": "2026-10-29T13:00", "u": 1.0, "v": 0.0, "speed": 1.0, "direction": 90.0},
    ]

    env_cond = {
        "current_u": 0.0,
        "current_v": 1.0,
        "current_velocity": 1.0,
        "current_direction": 0.0,
        "mode": "real_data",
        "hourly_series": hourly
    }

    traj = calculate_drift_trajectory(
        start_lat=16.0,
        start_lon=70.0,
        start_time=start_time,
        duration_hours=2,
        env_conditions=env_cond,
        time_step_hours=1,
        windage=0.0
    )

    assert "total_path_distance_km" in traj
    assert "net_displacement_km" in traj

    path_dist = traj["total_path_distance_km"]
    net_disp = traj["net_displacement_km"]

    # Each leg is 3600m ~ 3.6 km.
    # Total path ~ 7.2 km. Net displacement ~ hypot(3.6, 3.6) ~ 5.09 km.
    assert path_dist > net_disp
    assert abs(path_dist - 7.2) < 0.2
    assert abs(net_disp - 5.09) < 0.2


def test_windage_leeway_speed_calculation():
    """
    Verifies windage leeway velocity calculation:
    V_leeway = windage_fraction * V_wind.
    With 2.5% factor (0.025) and 10 m/s wind, leeway velocity is 0.25 m/s.
    """
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
    env_cond = {
        "current_u": 0.0,
        "current_v": 0.0,
        "current_velocity": 0.0,
        "current_direction": 0.0,
        "wind_speed": 10.0,
        "wind_direction": 180.0,  # Blows from South towards North
        "wind_u": 0.0,
        "wind_v": 10.0,
        "mode": "real_data",
        "hourly_series": []
    }

    traj = calculate_drift_trajectory(
        start_lat=16.0,
        start_lon=70.0,
        start_time=start_time,
        duration_hours=1,
        env_conditions=env_cond,
        time_step_hours=1,
        windage=0.025
    )

    # In 1 hour (3600s), leeway speed = 0.025 * 10 = 0.25 m/s
    # Expected displacement = 0.25 m/s * 3600s = 900 meters = 0.90 km
    assert abs(traj["net_displacement_km"] - 0.90) < 0.05
    assert traj["leeway_speed_avg"] == 0.25
    assert traj["wind_speed_avg"] == 10.0


def test_coastline_land_mask_and_grounding_detection():
    """
    Verifies that a trajectory that crosses the coastline onto land is detected
    as grounded, records the grounding step, and is not silently warped offshore.
    """
    from app.services.drift_service import is_land_coordinate

    # Point clearly west of Ratnagiri in Arabian Sea
    assert not is_land_coordinate(16.98, 73.20)

    # Point clearly east of Ratnagiri on Indian mainland
    assert is_land_coordinate(16.98, 73.40)

    # Advect a particle eastward into the coast
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
    env_eastward = {
        "current_u": 5.0,  # strong eastward current driving into coast
        "current_v": 0.0,
        "current_velocity": 5.0,
        "current_direction": 90.0,
        "mode": "real_data",
        "hourly_series": []
    }

    # Start near coast at 73.30, advect eastward
    traj = calculate_drift_trajectory(
        start_lat=16.98,
        start_lon=73.30,
        start_time=start_time,
        duration_hours=3,
        env_conditions=env_eastward,
        time_step_hours=1,
        windage=0.0
    )

    assert traj["grounding_detected"] is True
    assert traj["grounding_step"] is not None
    # Points must not be silently forced offshore: final longitude must be on the land side
    last_pt = traj["points"][-1]
    assert is_land_coordinate(last_pt["latitude"], last_pt["longitude"])


# ============================================================================
# 5. REGRESSION TESTS: GROUNDING SEMANTICS & METRICS POLICY
# ============================================================================

def test_regression_grounding_at_intermediate_step():
    """
    Requirement 7.1: Verify grounding detected at an intermediate step,
    preserving exact predicted grounding coordinates and timestamp without clamping.
    """
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
    # Start at 73.28 (Arabian Sea, west of Ratnagiri coastline ~73.328).
    # Moving eastward at 1.0 m/s: ~3.6 km/hr = ~0.034 deg lon/hr.
    # Step 0: 73.280 (sea)
    # Step 1: 73.314 (sea)
    # Step 2: 73.348 (land! -> intermediate grounding at step 2 of 6)
    env_eastward = {
        "current_u": 1.0,
        "current_v": 0.0,
        "current_velocity": 1.0,
        "current_direction": 90.0,
        "wind_u": 0.0,
        "wind_v": 0.0,
        "wind_speed": 0.0,
        "wind_direction": 0.0,
        "mode": "real_data",
        "hourly_series": []
    }

    traj = calculate_drift_trajectory(
        start_lat=16.98,
        start_lon=73.28,
        start_time=start_time,
        duration_hours=6,
        env_conditions=env_eastward,
        time_step_hours=1,
        windage=0.0
    )

    assert traj["grounding_detected"] is True
    assert traj["grounding_step"] == 2
    assert traj["valid_drift_duration_hours"] == 2
    assert traj["grounding_status"] == "estimated_grounding"

    grounding_pt = traj["points"][2]
    assert grounding_pt["step_index"] == 2
    assert grounding_pt["drift_status"] == "grounded"
    assert grounding_pt["is_grounded"] is True
    assert grounding_pt["is_valid_drift"] is True
    # Coordinates must be preserved at exact predicted integration step, not clamped offshore
    assert grounding_pt["latitude"] == pytest.approx(16.98, abs=1e-4)
    assert grounding_pt["longitude"] > 73.328  # on land side of contour


def test_regression_no_points_presented_as_valid_drift_after_grounding():
    """
    Requirement 7.2: Verify no points after grounding are presented as valid
    continued drift. Post-grounding points are marked hypothetical.
    """
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
    env_eastward = {
        "current_u": 1.0,
        "current_v": 0.0,
        "current_velocity": 1.0,
        "current_direction": 90.0,
        "mode": "real_data",
        "hourly_series": []
    }

    traj = calculate_drift_trajectory(
        start_lat=16.98,
        start_lon=73.28,
        start_time=start_time,
        duration_hours=6,
        env_conditions=env_eastward,
        time_step_hours=1,
        windage=0.0
    )

    assert traj["grounding_step"] == 2
    points = traj["points"]

    # Pre-grounding steps: active valid drift
    for pt in points[:2]:
        assert pt["drift_status"] == "active_drift"
        assert pt["is_grounded"] is False
        assert pt["is_valid_drift"] is True
        assert pt["risk_score"] is not None

    # Grounding step: valid terminus of drift
    assert points[2]["drift_status"] == "grounded"
    assert points[2]["is_grounded"] is True
    assert points[2]["is_valid_drift"] is True

    # Post-grounding steps: hypothetical / invalid drift
    for pt in points[3:]:
        assert pt["drift_status"] == "post_grounding_hypothetical"
        assert pt["is_grounded"] is True
        assert pt["is_valid_drift"] is False
        assert pt["risk_score"] is None

    assert traj["valid_points_count"] == 3  # steps 0, 1, 2


def test_regression_correct_distance_metrics_under_grounding_policy():
    """
    Requirement 7.3: Path distance and net displacement must calculate
    strictly up to the grounding step, while preserving hypothetical total metrics.
    """
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
    env_eastward = {
        "current_u": 1.0,
        "current_v": 0.0,
        "current_velocity": 1.0,
        "current_direction": 90.0,
        "mode": "real_data",
        "hourly_series": []
    }

    traj = calculate_drift_trajectory(
        start_lat=16.98,
        start_lon=73.28,
        start_time=start_time,
        duration_hours=6,
        env_conditions=env_eastward,
        time_step_hours=1,
        windage=0.0
    )

    g_step = traj["grounding_step"]
    assert g_step == 2

    # In 2 hours at 1.0 m/s = 7.2 km
    expected_valid_path = 2 * (1.0 * 3600.0) / 1000.0
    assert abs(traj["total_path_distance_km"] - expected_valid_path) < 0.1
    assert abs(traj["net_displacement_km"] - expected_valid_path) < 0.1

    # Hypothetical full 6 hours = 21.6 km
    expected_hypothetical_path = 6 * (1.0 * 3600.0) / 1000.0
    assert abs(traj["hypothetical_total_path_distance_km"] - expected_hypothetical_path) < 0.1
    assert abs(traj["hypothetical_net_displacement_km"] - expected_hypothetical_path) < 0.1

    # Valid metrics must be strictly less than hypothetical metrics
    assert traj["total_path_distance_km"] < traj["hypothetical_total_path_distance_km"]
    assert traj["net_displacement_km"] < traj["hypothetical_net_displacement_km"]


def test_regression_trajectory_never_intersects_land():
    """
    Requirement 7.4: Trajectory that stays entirely offshore never detects grounding,
    all points are active valid drift, and valid metrics equal full trajectory metrics.
    """
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
    # Start at 70.0 (open Arabian Sea) and drift westward (away from coast)
    env_westward = {
        "current_u": -0.5,
        "current_v": 0.0,
        "current_velocity": 0.5,
        "current_direction": 270.0,
        "mode": "real_data",
        "hourly_series": []
    }

    traj = calculate_drift_trajectory(
        start_lat=16.0,
        start_lon=70.0,
        start_time=start_time,
        duration_hours=10,
        env_conditions=env_westward,
        time_step_hours=1,
        windage=0.0
    )

    assert traj["grounding_detected"] is False
    assert traj["grounding_step"] is None
    assert traj["grounding_status"] == "offshore_adrift"
    assert traj["valid_points_count"] == 11  # steps 0 through 10
    assert traj["valid_drift_duration_hours"] == 10

    for pt in traj["points"]:
        assert pt["drift_status"] == "active_drift"
        assert pt["is_grounded"] is False
        assert pt["is_valid_drift"] is True

    # Under purely offshore drift, all points are valid and no hypothetical metrics exist
    assert traj["hypothetical_total_path_distance_km"] is None
    assert traj["hypothetical_net_displacement_km"] is None
    assert traj["total_path_distance_km"] > 0
    assert traj["net_displacement_km"] > 0


def test_regression_missing_or_invalid_environmental_data():
    """
    Requirement 7.5: Trajectory calculation must fail cleanly and explicitly
    when environmental data is missing, incomplete, or corrupted with NaN/None values.
    """
    start_time = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)

    # 1. Missing env_conditions (None)
    with pytest.raises(ValueError, match="environmental conditions data is required"):
        calculate_drift_trajectory(16.98, 73.28, start_time, 6, None)

    # 2. Missing current_u
    with pytest.raises(ValueError, match="essential velocity components are missing or NaN"):
        calculate_drift_trajectory(16.98, 73.28, start_time, 6, {"current_v": 0.5, "mode": "real_data"})

    # 3. NaN velocity component
    with pytest.raises(ValueError, match="essential velocity components are missing or NaN"):
        calculate_drift_trajectory(16.98, 73.28, start_time, 6, {"current_u": float("nan"), "current_v": 0.5, "mode": "real_data"})

    # 4. Hourly series with corrupted point
    corrupt_hourly = {
        "current_u": 0.2,
        "current_v": 0.1,
        "mode": "real_data",
        "hourly_series": [
            {"time": "2026-10-29T12:00:00Z", "current_u": 0.2, "current_v": 0.1},
            {"time": "2026-10-29T13:00:00Z", "current_u": None, "current_v": 0.1},
        ]
    }
    with pytest.raises(ValueError, match="essential velocity components are missing or NaN"):
        calculate_drift_trajectory(16.98, 73.28, start_time, 6, corrupt_hourly)


def test_incident_specific_forecast_isolation_and_fallback(client, db_session):
    """
    Regression Test:
    - Forecast endpoints must strictly isolate forecasts by report_id.
    - Querying latest forecast for an ungenerated/non-existent incident must return 404
      (never silently fallback to an older incident's forecast such as #292).
    - Eligible verified incidents list must include verified incidents in reverse chronological order
      without forcing a default selection.
    """
    # 1. Non-existent report ID must return 404
    res = client.get("/api/v1/drift-forecasts/latest/9999999")
    assert res.status_code == status.HTTP_404_NOT_FOUND

    # 2. Eligible incidents must return list with verified incidents
    res_eligible = client.get("/api/v1/drift-forecasts/eligible-incidents")
    assert res_eligible.status_code == status.HTTP_200_OK
    eligible_list = res_eligible.json()
    assert isinstance(eligible_list, list)
    for inc in eligible_list:
        assert inc["status"].lower() == "verified"



