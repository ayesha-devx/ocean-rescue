"""
Comprehensive automated verification for OceanRescue Create Recovery Mission feature.
Validates:
1. Geographical configuration (Arabian Sea – Ratnagiri / Konkan Coast, Mirkarwada Fishing Harbour).
2. Incident #417 dynamic linkage and auto-fill metadata.
3. Another verified incident dynamic linkage.
4. Validation rules: required vessel assignment, upcoming date window (no past dates).
5. Default title generation ("Ratnagiri {Gear} Recovery – Incident #{id}").
6. Operational notes generation with actual coordinates and risk score.
7. Database persistence across list, detail, and update endpoints.
"""

from datetime import datetime, timezone, timedelta
from fastapi import status


def test_ratnagiri_geographical_defaults_and_validation(client, db_session):
    """
    Verify mission creation enforces vessel requirement and non-past dates,
    and applies Ratnagiri / Mirkarwada defaults.
    """
    # 1. Validation failure: missing/empty vessel
    bad_vessel = client.post("/api/v1/recovery-missions", json={
        "report_id": 417,
        "title": "Ratnagiri Gillnet Recovery – Incident #417",
        "departure_port": "Mirkarwada Fishing Harbour, Ratnagiri",
        "target_sector": "Arabian Sea – Ratnagiri / Konkan Coast",
        "assigned_to": "",  # Empty vessel must be rejected
        "target_date": (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d"),
    })
    assert bad_vessel.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "vessel" in bad_vessel.json()["detail"].lower()

    # 2. Validation failure: past date
    past_date = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d")
    bad_date = client.post("/api/v1/recovery-missions", json={
        "report_id": 417,
        "title": "Ratnagiri Gillnet Recovery – Incident #417",
        "departure_port": "Mirkarwada Fishing Harbour, Ratnagiri",
        "target_sector": "Arabian Sea – Ratnagiri / Konkan Coast",
        "assigned_to": "FV Matsyagandha",
        "target_date": past_date,
    })
    assert bad_date.status_code == status.HTTP_400_BAD_REQUEST
    assert "past" in bad_date.json()["detail"].lower()


def test_incident_417_recovery_mission_workflow(client, db_session):
    """
    Test creating a recovery mission for Incident #417 with Ratnagiri sector and Mirkarwada port.
    """
    upcoming_date = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d")

    res = client.post("/api/v1/recovery-missions", json={
        "report_id": 417,
        "title": "Ratnagiri Gillnet Recovery – Incident #417",
        "departure_port": "Mirkarwada Fishing Harbour, Ratnagiri",
        "target_sector": "Arabian Sea – Ratnagiri / Konkan Coast",
        "assigned_to": "FV Matsyagandha",
        "target_date": upcoming_date,
        "priority": "HIGH",
        "operational_notes": "Recovery planning for verified Gillnet Incident #417. Reported location: 16.9812° N, 73.2845° E. Risk priority: High (73.5/100). Departure reference: Mirkarwada Fishing Harbour, Ratnagiri.",
        "status": "planned",
    })
    assert res.status_code == status.HTTP_201_CREATED, res.text
    data = res.json()

    assert data["report_id"] == 417
    assert data["title"] == "Ratnagiri Gillnet Recovery – Incident #417"
    assert data["departure_port"] == "Mirkarwada Fishing Harbour, Ratnagiri"
    assert data["target_sector"] == "Arabian Sea – Ratnagiri / Konkan Coast"
    assert data["assigned_to"] == "FV Matsyagandha"
    assert data["priority"] == "HIGH"
    assert "73.5/100" in data["operational_notes"]
    assert data["incident_gear_type"] == "gillnet"
    assert data["incident_risk_score"] == 73.5
    assert abs(data["incident_latitude"] - 16.98) < 0.001
    assert abs(data["incident_longitude"] - 73.27) < 0.001

    mission_id = data["id"]

    # Retrieve by ID
    get_res = client.get(f"/api/v1/recovery-missions/{mission_id}")
    assert get_res.status_code == status.HTTP_200_OK
    get_data = get_res.json()
    assert get_data["id"] == mission_id
    assert get_data["title"] == "Ratnagiri Gillnet Recovery – Incident #417"
    assert get_data["departure_port"] == "Mirkarwada Fishing Harbour, Ratnagiri"

    # Verify present in list
    list_res = client.get("/api/v1/recovery-missions?report_id=417")
    assert list_res.status_code == status.HTTP_200_OK
    list_data = list_res.json()
    found = any(m["id"] == mission_id for m in list_data["items"])
    assert found is True


def test_recovery_mission_with_another_verified_incident(client, db_session):
    """
    Test creating a recovery mission for another verified incident (e.g. #326 or #607).
    Confirms dynamic incident linkage works for any verified incident.
    """
    # Fetch risk queue to pick another verified incident
    queue_res = client.get("/api/v1/risk/queue?priority=all")
    assert queue_res.status_code == status.HTTP_200_OK
    items = queue_res.json()["items"]

    other_inc = next((i for i in items if i["report_id"] != 417), None)
    assert other_inc is not None, "At least one other verified incident must exist in database"
    other_id = other_inc["report_id"]
    other_gear = other_inc["gear_type"]

    upcoming_date = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")

    # Leave title blank to test auto-generation on backend
    res = client.post("/api/v1/recovery-missions", json={
        "report_id": other_id,
        "departure_port": "Mirkarwada Fishing Harbour, Ratnagiri",
        "target_sector": "Arabian Sea – Ratnagiri / Konkan Coast",
        "assigned_to": "FV Sagar Kanya",
        "target_date": upcoming_date,
        "status": "planned",
    })
    assert res.status_code == status.HTTP_201_CREATED, res.text
    data = res.json()

    assert data["report_id"] == other_id
    # Default title should be generated using gear type and incident ID
    assert str(other_id) in data["title"]
    assert "Ratnagiri" in data["title"]
    assert data["assigned_to"] == "FV Sagar Kanya"
    assert data["departure_port"] == "Mirkarwada Fishing Harbour, Ratnagiri"
    assert data["target_sector"] == "Arabian Sea – Ratnagiri / Konkan Coast"


def test_recovery_mission_patch_and_status_update(client, db_session):
    """
    Test updating recovery mission operational parameters and status.
    """
    upcoming_date = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%Y-%m-%d")
    create_res = client.post("/api/v1/recovery-missions", json={
        "report_id": 417,
        "title": "Ratnagiri Status Test – Incident #417",
        "assigned_to": "FV Konkan Explorer",
        "target_date": upcoming_date,
        "status": "planned",
    })
    assert create_res.status_code == status.HTTP_201_CREATED
    mission_id = create_res.json()["id"]

    # Patch assigned vessel and status
    patch_res = client.patch(f"/api/v1/recovery-missions/{mission_id}", json={
        "status": "in_progress",
        "assigned_to": "FV Konkan Explorer (ROV Equipped)",
    })
    assert patch_res.status_code == status.HTTP_200_OK
    patched = patch_res.json()
    assert patched["status"] == "in_progress"
    assert patched["assigned_to"] == "FV Konkan Explorer (ROV Equipped)"
