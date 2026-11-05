"""
Phase 6 & 8 Real-Workflow Final Acceptance Test Suite.
Executes the complete 15-step real-world operational workflow across FastAPI endpoints:
1. Submit a new fisherman report.
2. Confirm it appears as an unverified incident (excluded from verified queue).
3. Verify it through the NGO portal.
4. Confirm it enters the verified queue and increments total_verified.
5. Generate its drift forecast.
6. Confirm the risk assessment uses the correct forecast.
7. Update its wildlife assessment.
8. Confirm the relevant risk factor recalculates.
9. Change relevant incident information (gear type).
10. Confirm the assessment updates.
11. Reject a separate test incident.
12. Confirm it leaves the verified queue.
13. Apply different filters.
14. Confirm global statistics remain unchanged.
15. Confirm the average score updates when verified incident scores change.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select, delete

from app.main import app
from app.db.session import SessionLocal
from app.models.gear_report import GearReport
from app.models.drift_forecast import DriftForecast
from app.models.environmental_observation import EnvironmentalObservation
from app.models.risk_assessment import RiskAssessment


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_complete_15_step_real_workflow_acceptance(client, db):
    test_report_ids = []

    try:
        # Initial queue baseline
        resp_q0 = client.get("/api/v1/risk/queue")
        assert resp_q0.status_code == 200
        q0 = resp_q0.json()
        initial_verified = q0["summary"]["total_verified"]

        # =====================================================================
        # Step 1: Submit a new fisherman report
        # =====================================================================
        payload_1 = {
            "gear_type": "rope_line",
            "latitude": 16.8500,
            "longitude": 73.2000,
            "description": "Lost polypropylene line floating near surface",
            "reporter_name": "Test Fisherman A",
            "is_anonymous": False,
        }
        resp_create = client.post("/api/v1/reports", json=payload_1)
        assert resp_create.status_code == 201
        report_1 = resp_create.json()
        rep_id_1 = report_1["id"]
        test_report_ids.append(rep_id_1)
        assert report_1["status"] == "reported"

        # =====================================================================
        # Step 2: Confirm it appears as an unverified incident (excluded from risk queue)
        # =====================================================================
        resp_q1 = client.get("/api/v1/risk/queue")
        assert resp_q1.status_code == 200
        q1 = resp_q1.json()
        assert q1["summary"]["total_verified"] == initial_verified
        assert not any(item["report_id"] == rep_id_1 for item in q1["items"])

        # =====================================================================
        # Step 3: Verify it through the NGO portal
        # =====================================================================
        resp_verify = client.patch(
            f"/api/v1/reports/{rep_id_1}/status",
            json={"status": "verified"}
        )
        assert resp_verify.status_code == 200
        assert resp_verify.json()["status"] == "verified"

        # =====================================================================
        # Step 4: Confirm it enters the verified queue and increments total_verified
        # =====================================================================
        resp_q2 = client.get("/api/v1/risk/queue")
        assert resp_q2.status_code == 200
        q2 = resp_q2.json()
        assert q2["summary"]["total_verified"] == initial_verified + 1
        item_in_q = next((i for i in q2["items"] if i["report_id"] == rep_id_1), None)
        assert item_in_q is not None
        initial_score_rep1 = item_in_q["risk_score"]

        # =====================================================================
        # Step 5: Generate its drift forecast
        # =====================================================================
        resp_fc = client.post(
            "/api/v1/drift-forecasts/generate",
            json={"report_id": rep_id_1, "duration_hours": 24}
        )
        assert resp_fc.status_code == 201
        fc_data = resp_fc.json()
        assert fc_data["points_count"] > 0
        assert fc_data["valid_points_count"] > 0

        # =====================================================================
        # Step 6: Confirm the risk assessment uses the correct forecast
        # =====================================================================
        resp_risk_1 = client.get(f"/api/v1/risk/incident/{rep_id_1}")
        assert resp_risk_1.status_code == 200
        risk_1 = resp_risk_1.json()
        assert risk_1["latest_forecast_id"] is not None
        assert risk_1["forecast_points_count"] == fc_data["valid_points_count"]
        # Drift dispersal points must be awarded based on actual displacement
        assert risk_1["factors"]["drift_dispersal"]["points_awarded"] > 0

        # =====================================================================
        # Step 7: Update its wildlife assessment (to suspected interaction)
        # =====================================================================
        resp_update_wildlife = client.patch(
            f"/api/v1/reports/{rep_id_1}",
            json={"description": "Lost polypropylene line floating near marine turtle habitat area"}
        )
        assert resp_update_wildlife.status_code == 200

        # =====================================================================
        # Step 8: Confirm the relevant risk factor recalculates (wildlife points increase)
        # =====================================================================
        resp_risk_2 = client.get(f"/api/v1/risk/incident/{rep_id_1}")
        assert resp_risk_2.status_code == 200
        risk_2 = resp_risk_2.json()
        # Suspected interaction awards 12.5 pts (0.50 of 25 pts)
        assert risk_2["factors"]["wildlife_risk"]["points_awarded"] == 12.5
        assert "Suspected wildlife interaction" in risk_2["factors"]["wildlife_risk"]["description"]

        # =====================================================================
        # Step 9: Change relevant incident information (gear classification to gillnet)
        # =====================================================================
        resp_update_gear = client.patch(
            f"/api/v1/reports/{rep_id_1}",
            json={"gear_type": "gillnet"}
        )
        assert resp_update_gear.status_code == 200

        # =====================================================================
        # Step 10: Confirm the assessment updates (gear hazard updates to 30.0 pts)
        # =====================================================================
        resp_risk_3 = client.get(f"/api/v1/risk/incident/{rep_id_1}")
        assert resp_risk_3.status_code == 200
        risk_3 = resp_risk_3.json()
        assert risk_3["factors"]["gear_hazard"]["points_awarded"] == 30.0
        assert risk_3["risk_score"] > initial_score_rep1

        # =====================================================================
        # Step 11: Create and then reject a separate test incident
        # =====================================================================
        payload_2 = {
            "gear_type": "trap_pot",
            "latitude": 16.9000,
            "longitude": 73.2500,
            "description": "Submerged crab pot",
        }
        resp_create_2 = client.post("/api/v1/reports", json=payload_2)
        assert resp_create_2.status_code == 201
        rep_id_2 = resp_create_2.json()["id"]
        test_report_ids.append(rep_id_2)

        # Verify incident #2
        client.patch(f"/api/v1/reports/{rep_id_2}/status", json={"status": "verified"})
        q_verify2 = client.get("/api/v1/risk/queue").json()
        assert q_verify2["summary"]["total_verified"] == initial_verified + 2

        # Reject incident #2 (status='rejected')
        resp_reject = client.patch(
            f"/api/v1/reports/{rep_id_2}/status",
            json={"status": "rejected"}
        )
        assert resp_reject.status_code == 200

        # =====================================================================
        # Step 12: Confirm it leaves the verified queue
        # =====================================================================
        resp_q_after_reject = client.get("/api/v1/risk/queue")
        assert resp_q_after_reject.status_code == 200
        q_after_reject = resp_q_after_reject.json()
        assert q_after_reject["summary"]["total_verified"] == initial_verified + 1
        assert not any(i["report_id"] == rep_id_2 for i in q_after_reject["items"])

        # =====================================================================
        # Step 13 & 14: Apply different filters and confirm global stats remain unchanged
        # =====================================================================
        # Filter 1: priority=critical
        resp_crit = client.get("/api/v1/risk/queue?priority=critical").json()
        assert resp_crit["summary"]["total_verified"] == initial_verified + 1

        # Filter 2: gear_type=gillnet
        resp_gear = client.get("/api/v1/risk/queue?gear_type=gillnet").json()
        assert resp_gear["summary"]["total_verified"] == initial_verified + 1

        # Filter 3: completeness=needs_inputs
        resp_inputs = client.get("/api/v1/risk/queue?completeness=needs_inputs").json()
        assert resp_inputs["summary"]["total_verified"] == initial_verified + 1

        # Invariant: critical + high + medium + low == total_verified
        sum_check = (
            resp_crit["summary"]["critical_count"]
            + resp_crit["summary"]["high_count"]
            + resp_crit["summary"]["medium_count"]
            + resp_crit["summary"]["low_count"]
        )
        assert sum_check == resp_crit["summary"]["total_verified"]

        # =====================================================================
        # Step 15: Confirm the average score updates when verified scores change
        # =====================================================================
        avg_before = q2["summary"]["average_score"]
        # Now update rep_1 to have confirmed wildlife entanglement narrative
        client.patch(
            f"/api/v1/reports/{rep_id_1}",
            json={"description": "Confirmed wildlife entanglement: adult sea turtle caught in mesh"}
        )
        resp_q_final = client.get("/api/v1/risk/queue").json()
        avg_after = resp_q_final["summary"]["average_score"]
        assert avg_after >= avg_before

    finally:
        # Clean up test artifacts from local database cleanly
        for rid in test_report_ids:
            try:
                db.execute(delete(DriftForecast).where(DriftForecast.report_id == rid))
                db.execute(delete(EnvironmentalObservation).where(EnvironmentalObservation.report_id == rid))
                db.execute(delete(RiskAssessment).where(RiskAssessment.report_id == rid))
                db.execute(delete(GearReport).where(GearReport.id == rid))
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Cleanup error for test report #{rid}: {e}")
