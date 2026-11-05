"""
Tests for Subsystems: Dashboard, AI Detections, Environmental, Forecasts, Missions.
"""

from datetime import datetime, timezone
from fastapi import status


def test_dashboard_stats_calculation(client, db_session):
    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "total_reports" in data
    assert "status_counts" in data
    assert "gear_type_distribution" in data
    assert "total_ai_detections" in data
    assert "total_recovery_missions" in data
    assert isinstance(data["recent_reports"], list)


def test_ai_detection_workflow_and_fk_validation(client, db_session):
    # FK failure on non-existent report
    bad_res = client.post("/api/v1/detections", json={
        "report_id": 999999,
        "model_name": "YOLOv8-seg-ALDFG-v2",
        "detected_class": "gillnet",
        "confidence": 0.94
    })
    assert bad_res.status_code == status.HTTP_404_NOT_FOUND

    # Create real report first
    rep_res = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 32.5,
        "longitude": -117.2,
        "description": "Net snag"
    })
    report_id = rep_res.json()["id"]

    # Successful detection link
    good_res = client.post("/api/v1/detections", json={
        "report_id": report_id,
        "model_name": "YOLOv8-seg-ALDFG-v2",
        "detected_class": "gillnet",
        "confidence": 0.92
    })
    assert good_res.status_code == status.HTTP_201_CREATED
    assert good_res.json()["report_id"] == report_id

    # List by report
    by_rep = client.get(f"/api/v1/detections/by-report/{report_id}")
    assert by_rep.status_code == status.HTTP_200_OK
    assert len(by_rep.json()) >= 1


def test_environmental_observation_workflow(client, db_session):
    now_iso = datetime.now(timezone.utc).isoformat()
    res = client.post("/api/v1/environmental-observations", json={
        "latitude": 33.8,
        "longitude": -119.2,
        "current_speed": 1.4,
        "current_direction": 45.0,
        "wind_speed": 12.5,
        "wind_direction": 220.0,
        "wave_height": 1.2,
        "observed_at": now_iso,
        "source": "NOAA Buoy 46025"
    })
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert abs(data["latitude"] - 33.8) < 0.0001
    assert data["source"] == "NOAA Buoy 46025"

    latest_res = client.get("/api/v1/environmental-observations/latest")
    assert latest_res.status_code == status.HTTP_200_OK


def test_drift_forecast_workflow(client, db_session):
    # Create report
    rep = client.post("/api/v1/reports", json={
        "gear_type": "trawl_net",
        "latitude": 34.1,
        "longitude": -119.4,
        "description": "Trawl net drifting"
    }).json()

    fc_res = client.post("/api/v1/drift-forecasts", json={
        "report_id": rep["id"],
        "latitude": 34.15,
        "longitude": -119.35,
        "forecast_time": datetime.now(timezone.utc).isoformat(),
        "risk_score": 85.5,
        "model_name": "Lagrangian-RK4-Hydrology-v3"
    })
    assert fc_res.status_code == status.HTTP_201_CREATED
    assert fc_res.json()["report_id"] == rep["id"]


def test_recovery_mission_workflow(client, db_session):
    # Create report
    rep = client.post("/api/v1/reports", json={
        "gear_type": "crab_pot",
        "latitude": 33.9,
        "longitude": -119.8,
        "description": "Snagged crab pot"
    }).json()

    msn_res = client.post("/api/v1/recovery-missions", json={
        "report_id": rep["id"],
        "assigned_to": "R/V Ocean Sentinel",
        "status": "planned",
        "route_waypoints": [
            {"latitude": 34.0, "longitude": -119.7},
            {"latitude": 33.9, "longitude": -119.8}
        ]
    })
    assert msn_res.status_code == status.HTTP_201_CREATED
    msn_id = msn_res.json()["id"]

    # Patch mission status
    patch_res = client.patch(f"/api/v1/recovery-missions/{msn_id}", json={
        "status": "in_progress"
    })
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["status"] == "in_progress"
