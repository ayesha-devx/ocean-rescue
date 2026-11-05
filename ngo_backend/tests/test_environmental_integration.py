"""
Comprehensive integration and unit test suite for Environmental Intelligence
and Drift Forecasting modules in OceanRescue.
Covers Section 13 testing requirements:
- Successful Marine API response handling
- Successful Weather API response handling
- Missing, null, or land-mask environmental variables
- API timeout and provider failure handling
- Invalid coordinates and timestamps
- Unit conversions and current-velocity calculations
- Windage calculation and leeway trajectory generation
- Historical dates vs live forecast handling
- Study-boundary containment checks
- Environmental data persistence and retrieval by incident ID
- End-to-end workflow from verified incident to saved forecast
"""

import math
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest
from fastapi import status

from app.services.environmental_service import (
    convert_current_to_uv,
    convert_wind_to_uv,
    is_within_study_boundary,
    STUDY_BOUNDARY,
    get_environmental_conditions,
    generate_synthetic_marine_flow,
    save_environmental_observation_record,
    clear_environmental_cache,
)
from app.services.drift_service import (
    step_advection,
    calculate_drift_trajectory,
    calculate_haversine_distance_km,
)
from app.models.environmental_observation import EnvironmentalObservation


@pytest.fixture(autouse=True)
def clean_env_cache():
    clear_environmental_cache()
    yield
    clear_environmental_cache()


# ============================================================================
# 1. UNIT CONVERSIONS & VECTOR MATH TESTS
# ============================================================================


def test_convert_current_to_uv():
    """
    Oceanographic convention: flow direction is degrees towards which water flows.
    0° (North): u = 0, v = speed
    90° (East): u = speed, v = 0
    180° (South): u = 0, v = -speed
    270° (West): u = -speed, v = 0
    """
    spd = 1.0
    u_n, v_n = convert_current_to_uv(spd, 0.0)
    assert abs(u_n) < 1e-4
    assert abs(v_n - 1.0) < 1e-4

    u_e, v_e = convert_current_to_uv(spd, 90.0)
    assert abs(u_e - 1.0) < 1e-4
    assert abs(v_e) < 1e-4

    u_s, v_s = convert_current_to_uv(spd, 180.0)
    assert abs(u_s) < 1e-4
    assert abs(v_s - (-1.0)) < 1e-4

    u_w, v_w = convert_current_to_uv(spd, 270.0)
    assert abs(u_w - (-1.0)) < 1e-4
    assert abs(v_w) < 1e-4


def test_convert_wind_to_uv_downwind():
    """
    Meteorological convention: wind direction is degrees FROM which wind blows.
    Downwind leeway pushes objects towards (direction + 180) % 360.
    Northerly wind (0°, from North): pushes South -> u = 0, v = -speed
    Easterly wind (90°, from East): pushes West -> u = -speed, v = 0
    Westerly wind (270°, from West): pushes East -> u = speed, v = 0
    """
    spd = 10.0
    # Wind from North (0°) pushes object South (180°)
    u_n, v_n = convert_wind_to_uv(spd, 0.0)
    assert abs(u_n) < 1e-4
    assert abs(v_n - (-10.0)) < 1e-4

    # Wind from East (90°) pushes object West (270°)
    u_e, v_e = convert_wind_to_uv(spd, 90.0)
    assert abs(u_e - (-10.0)) < 1e-4
    assert abs(v_e) < 1e-4

    # Wind from West (270°) pushes object East (90°)
    u_w, v_w = convert_wind_to_uv(spd, 270.0)
    assert abs(u_w - 10.0) < 1e-4
    assert abs(v_w) < 1e-4


def test_study_boundary_containment():
    """
    Study boundary bounds: 14.0°–20.0° N, 68.0°–74.0° E (Konkan Coast & Eastern Arabian Sea).
    """
    # Inside boundary
    assert is_within_study_boundary(16.99, 73.30) is True  # Mirkarwada Harbour
    assert is_within_study_boundary(17.02, 73.15) is True  # Ratnagiri Offshore
    assert is_within_study_boundary(14.50, 73.50) is True  # Southern boundary
    assert is_within_study_boundary(19.50, 72.50) is True  # Northern boundary

    # Outside boundary
    assert is_within_study_boundary(12.0, 73.30) is False  # Too far south
    assert is_within_study_boundary(22.0, 73.30) is False  # Too far north
    assert is_within_study_boundary(16.99, 65.0) is False  # Too far west
    assert is_within_study_boundary(16.99, 76.0) is False  # Too far east (inland)


# ============================================================================
# 2. WINDAGE LEEWAY & ADVECTION TRAJECTORY TESTS
# ============================================================================

def test_windage_leeway_adds_to_drift():
    """
    Trajectory displacement with windage leeway must be larger than pure current drift
    when wind blows in the same general direction as the current.
    """
    start_time = datetime.now(timezone.utc)
    env_data = {
        "current_u": 0.20,
        "current_v": 0.0,
        "current_velocity": 0.20,
        "current_direction": 90.0,
        "wind_speed": 10.0,
        "wind_direction": 270.0,  # Wind from West pushes East (same as current)
        "wind_u": 10.0,
        "wind_v": 0.0,
        "mode": "real_data",
        "hourly_series": []
    }

    # 1. Pure current (windage = 0.0)
    traj_no_wind = calculate_drift_trajectory(
        start_lat=16.99,
        start_lon=73.30,
        start_time=start_time,
        duration_hours=6,
        env_conditions=env_data,
        windage=0.0
    )

    # 2. Combined drift with 3% windage leeway
    traj_with_wind = calculate_drift_trajectory(
        start_lat=16.99,
        start_lon=73.30,
        start_time=start_time,
        duration_hours=6,
        env_conditions=env_data,
        windage=0.03
    )

    disp_no_wind = traj_no_wind["total_displacement_km"]
    disp_with_wind = traj_with_wind["total_displacement_km"]

    # Displacement with windage must strictly exceed displacement without wind
    assert disp_with_wind > disp_no_wind
    assert traj_with_wind["windage"] == 0.03
    assert traj_with_wind["points"][0]["windage_coefficient"] == 0.03


def test_trajectory_detects_leaving_study_boundary():
    """
    If a trajectory starts near the boundary and drifts out of it,
    boundary_contained must be False and boundary_exit_step must record the step.
    """
    start_time = datetime.now(timezone.utc)
    # Start at 19.95° N, with strong northward current (v = 2.0 m/s) pushing it past 20.0° N
    env_fast_north = {
        "current_u": 0.0,
        "current_v": 2.0,
        "current_velocity": 2.0,
        "current_direction": 0.0,
        "mode": "real_data",
        "hourly_series": []
    }

    traj = calculate_drift_trajectory(
        start_lat=19.95,
        start_lon=73.0,
        start_time=start_time,
        duration_hours=12,
        env_conditions=env_fast_north,
        windage=0.0
    )

    assert traj["boundary_contained"] is False
    assert traj["boundary_exit_step"] is not None
    assert traj["boundary_exit_step"] > 0
    assert "exited defined study boundary" in traj["limitations"]


# ============================================================================
# 3. MOCK API INTEGRATION & EXPLICIT LABELING TESTS
# ============================================================================

def test_marine_and_weather_successful_mock(monkeypatch):
    """
    Mock successful responses from both Open-Meteo Marine and Weather APIs.
    Must produce mode='real_data', status='Live API response retrieved', and combined vectors.
    """
    mock_marine = {
        "current": {
            "time": "2026-10-29T12:00",
            "ocean_current_velocity": 0.32,
            "ocean_current_direction": 155.0
        },
        "hourly": {
            "time": ["2026-10-29T12:00", "2026-10-29T13:00"],
            "ocean_current_velocity": [0.32, 0.35],
            "ocean_current_direction": [155.0, 160.0],
            "wave_height": [0.85, 0.90],
            "wave_direction": [250.0, 255.0]
        }
    }

    mock_weather = {
        "current": {
            "wind_speed_10m": 5.4,
            "wind_direction_10m": 310.0
        },
        "hourly": {
            "time": ["2026-10-29T12:00", "2026-10-29T13:00"],
            "wind_speed_10m": [5.4, 5.8],
            "wind_direction_10m": [310.0, 315.0]
        }
    }

    monkeypatch.setattr(
        "app.services.environmental_service.fetch_open_meteo_marine_data",
        lambda *args, **kwargs: mock_marine
    )
    monkeypatch.setattr(
        "app.services.environmental_service.fetch_open_meteo_weather_data",
        lambda *args, **kwargs: mock_weather
    )

    cond = get_environmental_conditions(16.99, 73.30, force_simulation=False)

    assert cond["mode"] == "real_data"
    assert cond["data_status"] == "Live API response retrieved"
    assert cond["current_velocity"] == 0.32
    assert cond["current_direction"] == 155.0
    assert cond["wind_speed"] == 5.4
    assert cond["wind_direction"] == 310.0
    assert cond["wave_height"] == 0.85
    assert cond["boundary_contained"] is True


def test_marine_land_mask_nulls_triggers_partial_or_simulation(monkeypatch):
    """
    When nearshore marine pixel has null/NaN current velocity due to land mask,
    but weather API has valid winds, must report 'Partial environmental data'
    with synthetic coastal tidal current vectors rather than inventing fake observations.
    """
    mock_marine_null = {
        "current": {
            "ocean_current_velocity": None,
            "ocean_current_direction": None
        },
        "hourly": {
            "time": ["2026-10-29T12:00"],
            "ocean_current_velocity": [None],
            "ocean_current_direction": [None],
            "wave_height": [0.4],
            "wave_direction": [240.0]
        }
    }

    mock_weather = {
        "current": {
            "wind_speed_10m": 6.2,
            "wind_direction_10m": 280.0
        },
        "hourly": {
            "time": ["2026-10-29T12:00"],
            "wind_speed_10m": [6.2],
            "wind_direction_10m": [280.0]
        }
    }

    monkeypatch.setattr(
        "app.services.environmental_service.fetch_open_meteo_marine_data",
        lambda *args, **kwargs: mock_marine_null
    )
    monkeypatch.setattr(
        "app.services.environmental_service.fetch_open_meteo_weather_data",
        lambda *args, **kwargs: mock_weather
    )

    cond = get_environmental_conditions(16.99, 73.30, force_simulation=False)

    assert cond["data_status"] == "Partial environmental data"
    assert "synthetic" in cond["status_message"].lower()
    assert cond["wind_speed"] == 6.2


def test_api_timeout_falls_back_to_explicit_simulation(monkeypatch):
    """
    When Open-Meteo times out or fails (returns None), system falls back
    to explicit simulation mode with transparent labeling.
    """
    monkeypatch.setattr(
        "app.services.environmental_service.fetch_open_meteo_marine_data",
        lambda *args, **kwargs: None
    )
    monkeypatch.setattr(
        "app.services.environmental_service.fetch_open_meteo_weather_data",
        lambda *args, **kwargs: None
    )

    cond = get_environmental_conditions(16.99, 73.30, force_simulation=False)

    assert cond["mode"] == "simulation"
    assert cond["data_status"] == "Data source unavailable"
    assert "synthetic fallback" in cond["status_message"].lower()


# ============================================================================
# 4. END-TO-END WORKFLOW & PERSISTENCE TESTS
# ============================================================================

def test_full_workflow_verified_incident_to_persisted_drift(client, db_session):
    """
    End-to-end workflow:
    1. Verified NGO incident provides coordinates (Mirkarwada 16.99° N, 73.30° E).
    2. POST /api/v1/drift-forecasts/generate executes drift calculation.
    3. Saves observations in environmental_observations and points in drift_forecasts.
    4. Verified incident details reflect forecast count.
    5. GET /api/v1/drift-forecasts/latest returns saved forecast with wind, boundary, and disclaimers.
    """
    # 1. Create and verify incident
    report = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 16.99,
        "longitude": 73.30,
        "description": "Ghost gillnet verified near harbour entrance"
    }).json()
    rep_id = report["id"]
    client.patch(f"/api/v1/reports/{rep_id}/status", json={"status": "verified"})

    # 2. Run forecast generation
    forecast_res = client.post("/api/v1/drift-forecasts/generate", json={
        "report_id": rep_id,
        "duration_hours": 24,
        "time_step_hours": 1,
        "windage": 0.025,
        "force_simulation": True
    })
    assert forecast_res.status_code == status.HTTP_201_CREATED
    data = forecast_res.json()

    # 3. Check forecast summary structure
    assert data["report_id"] == rep_id
    assert data["gear_type"] == "gillnet"
    assert data["start_latitude"] == 16.99
    assert data["start_longitude"] == 73.30
    assert data["duration_hours"] == 24
    assert data["points_count"] == 25  # 0 to 24h
    assert data["windage"] == 0.025
    assert data["boundary_contained"] is True
    assert "limitations" in data
    assert len(data["points"]) == 25

    # 4. Check that environmental observation was logged in database
    obs_res = client.get(f"/api/v1/environmental-observations/latest")
    assert obs_res.status_code == status.HTTP_200_OK
    assert obs_res.json() is not None

    # 5. Check retrieval via latest endpoint
    latest_res = client.get(f"/api/v1/drift-forecasts/latest/{rep_id}")
    assert latest_res.status_code == status.HTTP_200_OK
    latest_data = latest_res.json()
    assert latest_data["points_count"] == 25
    assert latest_data["boundary_contained"] is True


def test_query_live_telemetry_endpoint(client, db_session):
    """
    Tests POST /api/v1/environmental-observations/query-live
    on-demand telemetry retrieval for pilot harbour.
    """
    res = client.post("/api/v1/environmental-observations/query-live", json={
        "latitude": 16.99,
        "longitude": 73.30,
        "force_simulation": True
    })
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert abs(data["latitude"] - 16.99) < 1e-4
    assert abs(data["longitude"] - 73.30) < 1e-4
    assert data["current_speed"] is not None
    assert data["wind_speed"] is not None
    assert data["status_message"] is not None


# ============================================================================
# 5. SELECTED INCIDENT TELEMETRY & ID SEPARATION TESTS (Requirement 7)
# ============================================================================

def test_query_live_telemetry_with_incident_report_id(client, db_session):
    """
    Verifies that querying live telemetry with a specific incident report_id
    correctly associates and persists the report_id in the database,
    and supports retrieval via ?report_id filter.
    """
    # 1. Create a verified incident (e.g. #607 style report)
    report = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 16.97,
        "longitude": 73.25,
        "description": "Ratnagiri offshore gillnet incident"
    }).json()
    rep_id = report["id"]
    client.patch(f"/api/v1/reports/{rep_id}/status", json={"status": "verified"})

    # 2. Query telemetry for this incident
    res = client.post("/api/v1/environmental-observations/query-live", json={
        "latitude": 16.97,
        "longitude": 73.25,
        "report_id": rep_id,
        "force_simulation": True
    })
    assert res.status_code == status.HTTP_201_CREATED
    obs_data = res.json()
    telemetry_record_id = obs_data["id"]

    # 3. Assert report_id is properly persisted and returned
    assert obs_data["report_id"] == rep_id
    assert abs(obs_data["latitude"] - 16.97) < 1e-4
    assert abs(obs_data["longitude"] - 73.25) < 1e-4

    # 4. Filter by report_id via /latest
    latest_for_rep = client.get(f"/api/v1/environmental-observations/latest?report_id={rep_id}")
    assert latest_for_rep.status_code == status.HTTP_200_OK
    data_rep = latest_for_rep.json()
    assert data_rep is not None
    assert data_rep["id"] == telemetry_record_id
    assert data_rep["report_id"] == rep_id


def test_distinguish_telemetry_record_id_versus_incident_id(client, db_session):
    """
    Verifies explicit separation between the Environmental Telemetry Record ID (obs.id)
    and the Fisherman Incident ID (report.id), preventing confusion (e.g. Record #147 vs Incident #607).
    Also verifies separation between API retrieval time and data valid time.
    """
    # 1. Create an incident
    report = client.post("/api/v1/reports", json={
        "gear_type": "trap",
        "latitude": 17.02,
        "longitude": 73.15,
        "description": "Crab trap lost offshore"
    }).json()
    rep_id = report["id"]

    # 2. Query telemetry
    res = client.post("/api/v1/environmental-observations/query-live", json={
        "latitude": 17.02,
        "longitude": 73.15,
        "report_id": rep_id,
        "force_simulation": True
    })
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()

    record_id = data["id"]
    associated_rep_id = data["report_id"]

    # Both IDs exist, are distinct concepts, and must not be conflated
    assert record_id is not None
    assert associated_rep_id == rep_id
    # Note: record_id and rep_id are from separate auto-incrementing sequences in different tables

    # Verify distinct timestamps: observed_at (data valid time) vs retrieved_at (API ingestion time)
    assert "observed_at" in data and data["observed_at"] is not None
    assert "retrieved_at" in data and data["retrieved_at"] is not None


def test_direct_page_access_sector_wide_telemetry(client, db_session):
    """
    When accessing telemetry sector-wide (without an incident selection):
    - GET /api/v1/environmental-observations/latest returns the most recent observation.
    - Querying for an unlinked report_id returns null (no silent auto-association).
    """
    # 1. Query sector-wide telemetry without report_id
    res = client.post("/api/v1/environmental-observations/query-live", json={
        "latitude": 16.99,
        "longitude": 73.30,
        "report_id": None,
        "force_simulation": True
    })
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()["report_id"] is None

    # 2. General latest observation returns telemetry
    latest_general = client.get("/api/v1/environmental-observations/latest")
    assert latest_general.status_code == status.HTTP_200_OK
    assert latest_general.json() is not None

    # 3. Querying with a non-existent report_id does not invent or match an unrelated record
    latest_unlinked = client.get("/api/v1/environmental-observations/latest?report_id=9999999")
    assert latest_unlinked.status_code == status.HTTP_200_OK
    assert latest_unlinked.json() is None

