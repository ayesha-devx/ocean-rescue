"""
Automated backend verification for OceanRescue Recovery Mission – Edit Parameters Functionality.

Validates:
1. Updating editable mission parameters via PATCH /api/v1/recovery-missions/{id}.
2. Updating operational notes on OR-MSN-058.
3. Database persistence across subsequent GET requests.
4. Mission isolation: editing OR-MSN-058 does NOT modify OR-MSN-057.
5. Strict validation: empty strings for required fields and past dates are rejected.
6. Mission ID and Incident #417 foreign-key relationship integrity.
"""

from datetime import datetime, timezone, timedelta, date
from fastapi import status


def test_edit_parameters_notes_and_persistence_mission_58(client, db_session):
    """
    Update operational notes of OR-MSN-058.
    Verify response and DB persistence.
    """
    new_notes = "TEST: Edit Parameters functionality verified."

    # Send PATCH update
    res = client.patch("/api/v1/recovery-missions/58", json={
        "operational_notes": new_notes,
    })
    assert res.status_code == status.HTTP_200_OK, res.text
    data = res.json()

    # Verify updated notes returned
    assert data["id"] == 58
    assert data["report_id"] == 417
    assert data["operational_notes"] == new_notes
    assert data["notes"] == new_notes

    # Query GET to confirm DB persistence
    get_res = client.get("/api/v1/recovery-missions/58")
    assert get_res.status_code == status.HTTP_200_OK
    persisted = get_res.json()
    assert persisted["operational_notes"] == new_notes
    assert persisted["report_id"] == 417


def test_editing_mission_58_does_not_modify_mission_57(client, db_session):
    """
    Verify mission isolation: modifying OR-MSN-058 has zero effect on OR-MSN-057.
    """
    res_57 = client.get("/api/v1/recovery-missions/57")
    assert res_57.status_code == status.HTTP_200_OK, res_57.text
    m57 = res_57.json()

    assert m57["id"] == 57
    assert m57["report_id"] == 417
    assert m57["status"] == "planned"
    assert m57["operational_notes"] != "TEST: Edit Parameters functionality verified."


def test_edit_parameters_validation(client, db_session):
    """
    Verify validation rules on mission parameters update:
    - Empty title -> 422
    - Empty departure_port -> 422
    - Empty target_sector -> 422
    - Empty assigned_to -> 422
    - Past date -> 400
    - Non-existent mission ID -> 404
    """
    # 1. Non-existent mission
    res_404 = client.patch("/api/v1/recovery-missions/999999", json={"title": "Ghost Mission"})
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

    # 2. Empty title
    res_title = client.patch("/api/v1/recovery-missions/58", json={"title": "   "})
    assert res_title.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 3. Empty departure_port
    res_port = client.patch("/api/v1/recovery-missions/58", json={"departure_port": ""})
    assert res_port.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 4. Empty target_sector
    res_sec = client.patch("/api/v1/recovery-missions/58", json={"target_sector": "   "})
    assert res_sec.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 5. Empty assigned vessel
    res_vessel = client.patch("/api/v1/recovery-missions/58", json={"assigned_to": ""})
    assert res_vessel.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 6. Past date
    past_date = (date.today() - timedelta(days=5)).strftime("%Y-%m-%d")
    res_past = client.patch("/api/v1/recovery-missions/58", json={"target_date": past_date})
    assert res_past.status_code == status.HTTP_400_BAD_REQUEST
    assert "past" in res_past.json()["detail"].lower()


def test_mission_parameter_updates(client, db_session):
    """
    Verify title and vessel parameter updates.
    """
    upcoming = (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")
    res_safe = client.patch("/api/v1/recovery-missions/58", json={
        "title": "Ratnagiri Gillnet Recovery – Incident #417",
        "target_date": upcoming,
        "operational_notes": "TEST: Edit Parameters functionality verified.",
    })
    assert res_safe.status_code == status.HTTP_200_OK
    data = res_safe.json()
    assert data["title"] == "Ratnagiri Gillnet Recovery – Incident #417"

    # Restore vessel
    res_vessel = client.patch("/api/v1/recovery-missions/58", json={
        "assigned_to": "Demo Research Vessel 01",
    })
    assert res_vessel.status_code == status.HTTP_200_OK
    assert res_vessel.json()["assigned_to"] == "Demo Research Vessel 01"
