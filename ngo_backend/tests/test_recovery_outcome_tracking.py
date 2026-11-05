"""
Automated backend verification for OceanRescue Recovery Outcome Tracking.

Validates:
1. Recovery workflow: Planned -> In Progress (Start Operation) -> Outcome Submission.
2. Three recovery outcomes:
   - Successfully Recovered (mission: successfully_recovered, incident: recovered)
   - Partially Recovered (mission: partially_recovered, incident: partially_recovered)
   - Recovery Unsuccessful (mission: unsuccessful, incident: recovery_unsuccessful)
3. Database persistence of RecoveryOutcome records (mission_id, incident_id, outcome, notes, submitted_by, submitted_at, evidence_url).
4. Outcome history preservation and ordering (newest first).
5. Dynamic summary statistics via GET /api/v1/recovery-missions/stats.
6. Optional evidence photo upload and format validation.
7. Validation on invalid outcomes and illegal status transitions.
"""

import io
from datetime import datetime, timezone, timedelta
from fastapi import status
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from app.models.gear_report import GearReport
from app.models.recovery_mission import RecoveryMission
from app.models.recovery_outcome import RecoveryOutcome


def _create_test_report_and_mission(db_session, gear_type="gillnet", initial_status="planned"):
    """Helper to create an incident and recovery mission for testing."""
    report = GearReport(
        gear_type=gear_type,
        description="Discarded net snagged on rocky reef",
        reported_location=ST_SetSRID(ST_MakePoint(73.28, 16.98), 4326),
        status="verified",
    )
    db_session.add(report)
    db_session.flush()

    mission = RecoveryMission(
        report_id=report.id,
        title=f"Test {gear_type.capitalize()} Recovery Mission",
        departure_port="Mirkarwada Fishing Harbour, Ratnagiri",
        target_sector="Arabian Sea – Ratnagiri Outer Sector",
        assigned_to="Salvage Cutter Sagar Ratna",
        status=initial_status,
        priority="HIGH",
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=2),
    )
    db_session.add(mission)
    db_session.flush()
    return report, mission


def test_start_recovery_operation(client, db_session):
    """
    Verify starting recovery operation transitions mission status from 'planned' to 'in_progress'.
    """
    report, mission = _create_test_report_and_mission(db_session)

    res = client.post(f"/api/v1/recovery-missions/{mission.id}/start")
    assert res.status_code == status.HTTP_200_OK, res.text
    data = res.json()

    assert data["id"] == mission.id
    assert data["status"] == "in_progress"

    # Verify DB persistence
    get_res = client.get(f"/api/v1/recovery-missions/{mission.id}")
    assert get_res.status_code == status.HTTP_200_OK
    assert get_res.json()["status"] == "in_progress"


def test_submit_successfully_recovered_outcome(client, db_session):
    """
    Verify submitting 'successfully_recovered' outcome:
    - Mission status becomes 'successfully_recovered'
    - Linked incident status becomes 'recovered'
    - RecoveryOutcome record is created with timestamp and officer
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    payload = {
        "outcome": "successfully_recovered",
        "notes": "150m nylon gillnet completely retrieved from seabed. No marine fauna entrapped.",
        "submitted_by": "Officer Ananya Sen",
        "evidence_url": "/uploads/evidence/test_retrieval.jpg",
    }
    res = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json=payload)
    assert res.status_code == status.HTTP_200_OK, res.text
    data = res.json()

    assert data["status"] == "successfully_recovered"
    assert data["latest_outcome"] is not None
    assert data["latest_outcome"]["outcome"] == "successfully_recovered"
    assert data["latest_outcome"]["notes"] == payload["notes"]
    assert data["latest_outcome"]["submitted_by"] == "Officer Ananya Sen"
    assert data["latest_outcome"]["evidence_url"] == payload["evidence_url"]

    # Verify linked incident status synchronized to 'recovered'
    assert data["incident_status"] == "recovered"
    db_session.refresh(report)
    assert report.status == "recovered"


def test_submit_partially_recovered_outcome(client, db_session):
    """
    Verify submitting 'partially_recovered' outcome:
    - Mission status becomes 'partially_recovered'
    - Linked incident status becomes 'partially_recovered'
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    payload = {
        "outcome": "partially_recovered",
        "notes": "Retrieved 60m of headrope; remaining codend embedded in deep crevice.",
        "submitted_by": "Coordinator Vikram Rao",
    }
    res = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json=payload)
    assert res.status_code == status.HTTP_200_OK, res.text
    data = res.json()

    assert data["status"] == "partially_recovered"
    assert data["latest_outcome"]["outcome"] == "partially_recovered"
    assert data["incident_status"] == "partially_recovered"
    db_session.refresh(report)
    assert report.status == "partially_recovered"


def test_submit_unsuccessful_outcome(client, db_session):
    """
    Verify submitting 'unsuccessful' outcome:
    - Mission status becomes 'unsuccessful'
    - Linked incident status becomes 'recovery_unsuccessful'
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    payload = {
        "outcome": "unsuccessful",
        "notes": "Target gear could not be located; high swells and underwater turbidity prevented grapple lock.",
        "submitted_by": "Lead Salvage Officer Nair",
    }
    res = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json=payload)
    assert res.status_code == status.HTTP_200_OK, res.text
    data = res.json()

    assert data["status"] == "unsuccessful"
    assert data["latest_outcome"]["outcome"] == "unsuccessful"
    assert data["incident_status"] == "recovery_unsuccessful"
    db_session.refresh(report)
    assert report.status == "recovery_unsuccessful"


def test_recovery_outcome_history_and_ordering(client, db_session):
    """
    Verify that subsequent outcome corrections preserve history without overwriting,
    ordered newest first.
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    # 1. First record: partially_recovered
    res1 = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "partially_recovered",
        "notes": "First operational dive: partial retrieval",
        "submitted_by": "Diver Team Alpha",
    })
    assert res1.status_code == status.HTTP_200_OK

    # Attempting normal duplicate submission on concluded mission must be rejected
    dup_res = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
    })
    assert dup_res.status_code == status.HTTP_400_BAD_REQUEST

    # 2. Second record: authorized correction to successfully_recovered
    res2 = client.post(
        f"/api/v1/recovery-missions/{mission.id}/corrections",
        json={
            "outcome": "successfully_recovered",
            "correction_reason": "Follow-up operational dive retrieved remaining codend fragment.",
            "notes": "Second operational dive: full retrieval completed",
            "submitted_by": "Diver Team Beta",
        },
        headers={"X-Officer-Role": "ngo_officer"},
    )
    assert res2.status_code == status.HTTP_200_OK

    # 3. Query history endpoint GET /outcomes
    hist_res = client.get(f"/api/v1/recovery-missions/{mission.id}/outcomes")
    assert hist_res.status_code == status.HTTP_200_OK
    history = hist_res.json()
    assert len(history) == 2
    # Newest first
    assert history[0]["outcome"] == "successfully_recovered"
    assert history[0]["is_correction"] is True
    assert history[0]["correction_reason"] == "Follow-up operational dive retrieved remaining codend fragment."
    assert history[0]["submitted_by"] == "Diver Team Beta"
    assert history[1]["outcome"] == "partially_recovered"
    assert history[1]["is_correction"] is False
    assert history[1]["submitted_by"] == "Diver Team Alpha"

    # 4. Query single latest outcome endpoint GET /outcome
    latest_res = client.get(f"/api/v1/recovery-missions/{mission.id}/outcome")
    assert latest_res.status_code == status.HTTP_200_OK
    latest = latest_res.json()
    assert latest["outcome"] == "successfully_recovered"
    assert latest["submitted_by"] == "Diver Team Beta"
    assert latest["is_correction"] is True


def test_duplicate_submission_blocked_server_side(client, db_session):
    """
    Test Requirement 4 & 5:
    When a mission status is 'successfully_recovered':
    - Attempting duplicate submission via POST /outcomes is blocked by the backend API with HTTP 400.
    - Specific clear message returned:
      "This mission has already been successfully recovered. A new outcome cannot be submitted unless an authorized correction is required."
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    # Initial successful recovery
    res = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
        "notes": "Net retrieved.",
        "submitted_by": "Officer A",
    })
    assert res.status_code == status.HTTP_200_OK

    # Direct duplicate submission attempt
    dup_res = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
        "notes": "Attempting second identical record.",
        "submitted_by": "Officer B",
    })
    assert dup_res.status_code == status.HTTP_400_BAD_REQUEST
    err_data = dup_res.json()
    assert "detail" in err_data
    assert "This mission has already been successfully recovered. A new outcome cannot be submitted unless an authorized correction is required." in err_data["detail"]

    # History count remains exactly 1
    hist_res = client.get(f"/api/v1/recovery-missions/{mission.id}/outcomes")
    assert len(hist_res.json()) == 1


def test_unauthorized_correction_rejected(client, db_session):
    """
    Test Requirement 6:
    When an unauthorized user (e.g. public or fisherman) attempts a correction,
    the request must be rejected with HTTP 403 Forbidden.
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")
    client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
        "notes": "Initial recovery.",
    })

    # Unauthorized role
    unauth_res = client.post(
        f"/api/v1/recovery-missions/{mission.id}/corrections",
        json={
            "outcome": "partially_recovered",
            "correction_reason": "Bypassing restriction",
        },
        headers={"X-Officer-Role": "fisherman"},
    )
    assert unauth_res.status_code == status.HTTP_403_FORBIDDEN


def test_correction_mandatory_reason_validation(client, db_session):
    """
    Verify correction requires a mandatory, non-empty correction reason (HTTP 422).
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")
    client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
        "notes": "Initial recovery.",
    })

    # Missing reason
    no_reason_res = client.post(
        f"/api/v1/recovery-missions/{mission.id}/corrections",
        json={
            "outcome": "partially_recovered",
            "correction_reason": "",
        },
        headers={"X-Officer-Role": "ngo_officer"},
    )
    assert no_reason_res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_authorized_correction_workflow_and_incident_synchronization(client, db_session):
    """
    Test Requirement 7, 8, 9:
    - Authorized correction with valid reason is saved without deleting original history.
    - Linked original_outcome_id is set.
    - Mission status and linked incident status are synchronized.
    - Refreshing state confirms consistency.
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    # Initial outcome: successfully_recovered
    res1 = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
        "notes": "Original haul completed.",
        "submitted_by": "Officer Elena Rostova",
    })
    assert res1.status_code == status.HTTP_200_OK

    db_session.refresh(report)
    assert report.status == "recovered"

    # Authorized correction: revised to partially_recovered
    res2 = client.post(
        f"/api/v1/recovery-missions/{mission.id}/corrections",
        json={
            "outcome": "partially_recovered",
            "correction_reason": "Submerged diver post-inspection discovered 20m of trailing gillnet entangled on underwater ledge.",
            "notes": "Revised to partial recovery pending second dive sweep.",
            "submitted_by": "Lead Recovery Officer Elena Rostova",
        },
        headers={"X-Officer-Role": "ngo_officer"},
    )
    assert res2.status_code == status.HTTP_200_OK
    data2 = res2.json()

    assert data2["status"] == "partially_recovered"
    assert data2["incident_status"] == "partially_recovered"

    # Verify incident synchronized
    db_session.refresh(report)
    assert report.status == "partially_recovered"

    # Verify history is append-only
    hist_res = client.get(f"/api/v1/recovery-missions/{mission.id}/outcomes")
    history = hist_res.json()
    assert len(history) == 2

    # Verify record fields
    correction_record = history[0]
    original_record = history[1]

    assert correction_record["is_correction"] is True
    assert correction_record["correction_reason"] == "Submerged diver post-inspection discovered 20m of trailing gillnet entangled on underwater ledge."
    assert correction_record["original_outcome_id"] == original_record["id"]
    assert original_record["is_correction"] is False
    assert original_record["outcome"] == "successfully_recovered"


def test_planned_mission_submit_successfully_recovered(client, db_session):
    """
    Test Requirement 1:
    Planned mission -> submit Successfully Recovered -> accepted.
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="planned")

    res = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
        "notes": "Direct haul from planned mission.",
        "submitted_by": "Recovery Specialist",
    })
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["status"] == "successfully_recovered"
    assert data["incident_status"] == "recovered"


def test_dynamic_dashboard_statistics(client, db_session):
    """
    Verify GET /recovery-missions/stats returns dynamic database counts.
    """
    # Create known test missions in different states
    _create_test_report_and_mission(db_session, initial_status="planned")
    _create_test_report_and_mission(db_session, initial_status="in_progress")
    _, m_rec = _create_test_report_and_mission(db_session, initial_status="in_progress")
    client.post(f"/api/v1/recovery-missions/{m_rec.id}/outcomes", json={
        "outcome": "successfully_recovered",
        "notes": "Retrieved cleanly",
    })

    res = client.get("/api/v1/recovery-missions/stats")
    assert res.status_code == status.HTTP_200_OK, res.text
    stats = res.json()

    assert "total_missions" in stats
    assert "planned" in stats
    assert "in_progress" in stats
    assert "successfully_recovered" in stats
    assert "partially_recovered" in stats
    assert "unsuccessful" in stats
    assert "cancelled" in stats

    assert stats["total_missions"] >= 3
    assert stats["planned"] >= 1
    assert stats["in_progress"] >= 1
    assert stats["successfully_recovered"] >= 1


def test_evidence_photo_upload_and_multipart_submission(client, db_session):
    """
    Verify uploading evidence photo:
    - Direct upload via POST /evidence
    - Multipart submission with file via POST /outcomes
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    # 1. Direct photo upload
    fake_img = io.BytesIO(b"fake image raw bytes")
    fake_img.name = "salvaged_net.jpg"
    files = {"photo": ("salvaged_net.jpg", fake_img, "image/jpeg")}
    up_res = client.post(f"/api/v1/recovery-missions/{mission.id}/evidence", files=files)
    assert up_res.status_code == status.HTTP_200_OK, up_res.text
    up_data = up_res.json()
    assert "evidence_url" in up_data
    assert "/uploads/evidence/" in up_data["evidence_url"]

    # 2. Multipart submission directly with outcome
    fake_img2 = io.BytesIO(b"another fake image raw bytes")
    fake_img2.name = "recovered_trawl.png"
    form_data = {
        "outcome": "successfully_recovered",
        "notes": "Multipart retrieval submission with evidence photo",
        "submitted_by": "Field Officer Patil",
    }
    files2 = {"photo": ("recovered_trawl.png", fake_img2, "image/png")}
    multi_res = client.post(
        f"/api/v1/recovery-missions/{mission.id}/outcomes",
        data=form_data,
        files=files2
    )
    assert multi_res.status_code == status.HTTP_200_OK, multi_res.text
    multi_data = multi_res.json()
    assert multi_data["status"] == "successfully_recovered"
    assert multi_data["latest_outcome"]["evidence_url"] is not None
    assert "/uploads/evidence/" in multi_data["latest_outcome"]["evidence_url"]


def test_outcome_validation_errors(client, db_session):
    """
    Verify validation rejections:
    - Invalid outcome string -> 422
    - Starting a concluded mission -> 400
    - Non-existent mission -> 404
    - Invalid photo format -> 400
    """
    report, mission = _create_test_report_and_mission(db_session, initial_status="in_progress")

    # 1. Invalid outcome
    res_bad = client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "totally_lost_forever",
    })
    assert res_bad.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Conclude mission
    client.post(f"/api/v1/recovery-missions/{mission.id}/outcomes", json={
        "outcome": "successfully_recovered",
    })

    # 2. Cannot restart concluded mission
    restart_res = client.post(f"/api/v1/recovery-missions/{mission.id}/start")
    assert restart_res.status_code == status.HTTP_400_BAD_REQUEST

    # 3. Non-existent mission
    res_404 = client.post("/api/v1/recovery-missions/999999/outcomes", json={
        "outcome": "successfully_recovered",
    })
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

    # 4. Invalid file extension
    fake_file = io.BytesIO(b"malicious payload")
    fake_file.name = "script.exe"
    files = {"photo": ("script.exe", fake_file, "application/octet-stream")}
    bad_file_res = client.post(f"/api/v1/recovery-missions/{mission.id}/evidence", files=files)
    assert bad_file_res.status_code == status.HTTP_400_BAD_REQUEST
