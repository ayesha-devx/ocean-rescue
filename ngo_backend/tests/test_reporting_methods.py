"""
Unit tests for GPS-Based Reporting and Manual Location Reporting workflows,
database schema persistence, and filtering in the NGO backend.
"""

from datetime import datetime, timezone
from fastapi import status
from app.models.gear_report import GearReport


def test_gps_report_submission(client, db_session):
    """Test submission of a GPS-based report with exact waypoint and loss date/time."""
    loss_time = datetime(2026, 11, 3, 14, 30, tzinfo=timezone.utc).isoformat()
    payload = {
        "gear_type": "gillnet",
        "latitude": 17.025,
        "longitude": 73.280,
        "reporting_method": "gps",
        "location_type": "exact",
        "loss_date_time": loss_time,
        "description": "Lost gillnet 4 NM west of Mirkarwada breakwater.",
        "water_position": "Submerged",
        "estimated_size": "Medium (10 - 50 meters)"
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["id"] > 0
    assert data["gear_type"] == "gillnet"
    assert data["status"] == "reported"
    assert data["reporting_method"] == "gps"
    assert data["location_type"] == "exact"
    assert abs(data["latitude"] - 17.025) < 0.0001
    assert abs(data["longitude"] - 73.280) < 0.0001
    assert data["loss_date_time"] is not None
    assert data["location_uncertainty_radius_m"] is None


def test_manual_location_report_submission(client, db_session):
    """Test submission of a manual location report with estimated coordinates and uncertainty."""
    loss_time = datetime(2026, 11, 2, 9, 15, tzinfo=timezone.utc).isoformat()
    payload = {
        "gear_type": "crab_pot",
        "latitude": 16.985,
        "longitude": 73.275,
        "reporting_method": "manual",
        "location_type": "estimated",
        "location_uncertainty_radius_m": 1500.0,
        "loss_date_time": loss_time,
        "approximate_area": "Mirkarwada Outer Banks",
        "distance_from_coast_km": 3.5,
        "nearby_landmark": "Ratnagiri Lighthouse",
        "direction_from_landmark": "West-Northwest",
        "description": "Trap line snapped in rough swell."
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["id"] > 0
    assert data["gear_type"] == "crab_pot"
    assert data["status"] == "reported"
    assert data["reporting_method"] == "manual"
    assert data["location_type"] == "estimated"
    assert data["location_uncertainty_radius_m"] == 1500.0
    assert data["approximate_area"] == "Mirkarwada Outer Banks"
    assert data["distance_from_coast_km"] == 3.5
    assert data["nearby_landmark"] == "Ratnagiri Lighthouse"
    assert data["direction_from_landmark"] == "West-Northwest"


def test_manual_location_report_optional_landmarks(client, db_session):
    """Test that landmark, distance, and area are completely optional for manual reports."""
    payload = {
        "gear_type": "longline",
        "latitude": 16.950,
        "longitude": 73.260,
        "reporting_method": "manual",
        "location_type": "estimated",
        "location_uncertainty_radius_m": 3000.0,
        "description": "Approximate location marked on map; fisherman unsure of exact distance."
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["reporting_method"] == "manual"
    assert data["location_type"] == "estimated"
    assert data["location_uncertainty_radius_m"] == 3000.0
    assert data["nearby_landmark"] is None
    assert data["distance_from_coast_km"] is None


def test_filter_reports_by_reporting_method(client, db_session):
    """Test querying reports filtered by reporting_method (gps vs manual)."""
    # 1. Create a GPS report
    res_gps = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 17.01,
        "longitude": 73.28,
        "reporting_method": "gps",
        "location_type": "exact"
    })
    gps_id = res_gps.json()["id"]

    # 2. Create a manual report
    res_manual = client.post("/api/v1/reports", json={
        "gear_type": "trawl_net",
        "latitude": 17.02,
        "longitude": 73.29,
        "reporting_method": "manual",
        "location_type": "estimated",
        "location_uncertainty_radius_m": 2000.0
    })
    manual_id = res_manual.json()["id"]

    # 3. Query only GPS reports
    get_gps = client.get("/api/v1/reports?reporting_method=gps")
    assert get_gps.status_code == status.HTTP_200_OK
    gps_items = get_gps.json()["items"]
    gps_ids = [item["id"] for item in gps_items]
    assert gps_id in gps_ids
    assert manual_id not in gps_ids

    # 4. Query only Manual reports
    get_manual = client.get("/api/v1/reports?reporting_method=manual")
    assert get_manual.status_code == status.HTTP_200_OK
    manual_items = get_manual.json()["items"]
    manual_ids = [item["id"] for item in manual_items]
    assert manual_id in manual_ids
    assert gps_id not in manual_ids


def test_both_reporting_methods_enter_verification_queue(client, db_session):
    """Verify that both GPS and Manual reports enter the standard NGO verification queue."""
    res_m = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 16.99,
        "longitude": 73.29,
        "reporting_method": "manual",
        "location_type": "estimated",
        "location_uncertainty_radius_m": 1000.0
    })
    m_id = res_m.json()["id"]
    assert res_m.json()["status"] == "reported"

    # Verify manual report in the queue
    verify_res = client.patch(f"/api/v1/reports/{m_id}/status", json={
        "status": "verified",
        "notes": "Verified manual location report via harbour officer review."
    })
    assert verify_res.status_code == status.HTTP_200_OK
    assert verify_res.json()["status"] == "verified"

    # Confirm verified manual report appears in eligible incidents for downstream subsystems
    eligible_res = client.get("/api/v1/drift-forecasts/eligible-incidents")
    assert eligible_res.status_code == status.HTTP_200_OK
    eligible_ids = [item["id"] for item in eligible_res.json()]
    assert m_id in eligible_ids

    # Clean up verified test report to maintain global test database count purity
    rep = db_session.get(GearReport, m_id)
    if rep:
        db_session.delete(rep)
        db_session.commit()


def test_gps_report_with_fisherman_and_vessel_details(client, db_session):
    """Test GPS report submission with full fisherman contact and vessel specifications."""
    payload = {
        "gear_type": "gillnet",
        "latitude": 17.035,
        "longitude": 73.285,
        "reporting_method": "gps",
        "location_type": "exact",
        "reporter_name": "Ramesh Kadam",
        "reporter_phone": "+91 9823456789",
        "reporter_email": "ramesh.kadam@oceanrescue-test.org",
        "reporter_role": "Captain / Skipper",
        "vessel_name": "Matsya Sagar III",
        "has_registered_vessel_name": True,
        "vessel_registration_number": "IND-MH-RT-4029",
        "vessel_type": "Trawler",
        "home_port": "Mirkarwada Fishing Harbour",
        "gear_quantity": 4,
        "gear_markings": "Orange fluorescent buoys with 'MK-4029' etched tag",
        "water_position": "Submerged / Snagged",
        "estimated_size": "Medium (10 - 50 meters)",
        "sea_state": "Moderate (2-4 ft chop)",
        "declaration_confirmed": True,
        "description": "Lost string of bottom gillnets during heavy tidal surge."
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    report_id = data["id"]
    assert data["reporter_name"] == "Ramesh Kadam"
    assert data["reporter_phone"] == "+91 9823456789"
    assert data["reporter_email"] == "ramesh.kadam@oceanrescue-test.org"
    assert data["reporter_role"] == "Captain / Skipper"
    assert data["vessel_name"] == "Matsya Sagar III"
    assert data["vessel_registration_number"] == "IND-MH-RT-4029"
    assert data["vessel_type"] == "Trawler"
    assert data["home_port"] == "Mirkarwada Fishing Harbour"
    assert data["gear_quantity"] == 4
    assert data["gear_markings"] == "Orange fluorescent buoys with 'MK-4029' etched tag"
    assert data["declaration_confirmed"] is True

    # Confirm retrieval via GET /api/v1/reports/{id}
    fetch_res = client.get(f"/api/v1/reports/{report_id}")
    assert fetch_res.status_code == status.HTTP_200_OK
    fetched = fetch_res.json()
    assert fetched["reporter_name"] == "Ramesh Kadam"
    assert fetched["vessel_name"] == "Matsya Sagar III"
    assert fetched["gear_quantity"] == 4


def test_manual_report_with_fisherman_and_vessel_details(client, db_session):
    """Test manual location report with fisherman and vessel telemetry."""
    payload = {
        "gear_type": "crab_pot",
        "latitude": 16.972,
        "longitude": 73.268,
        "reporting_method": "manual",
        "location_type": "estimated",
        "location_uncertainty_radius_m": 1500.0,
        "reporter_name": "Suresh Tandel",
        "reporter_phone": "+91-9422012345",
        "reporter_role": "Vessel Owner",
        "vessel_name": "Ganga Mai",
        "has_registered_vessel_name": True,
        "vessel_type": "Mechanized Fishing Boat",
        "home_port": "Ratnagiri Port",
        "gear_quantity": 2,
        "gear_markings": "Yellow marker flag with black cross",
        "declaration_confirmed": True
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["reporting_method"] == "manual"
    assert data["location_type"] == "estimated"
    assert data["reporter_name"] == "Suresh Tandel"
    assert data["reporter_phone"] == "+91-9422012345"
    assert data["vessel_name"] == "Ganga Mai"
    assert data["gear_quantity"] == 2


def test_phone_validation_with_country_code(client, db_session):
    """Test mobile number validation requiring valid country code / phone digits."""
    # Invalid phone: random text
    bad_payload = {
        "gear_type": "gillnet",
        "latitude": 17.0,
        "longitude": 73.2,
        "reporter_phone": "invalid-phone-num"
    }
    res_bad = client.post("/api/v1/reports", json=bad_payload)
    assert res_bad.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Invalid phone: too short (less than 7 digits)
    bad_short = {
        "gear_type": "gillnet",
        "latitude": 17.0,
        "longitude": 73.2,
        "reporter_phone": "+91 123"
    }
    res_short = client.post("/api/v1/reports", json=bad_short)
    assert res_short.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Valid phone: International format
    good_payload = {
        "gear_type": "gillnet",
        "latitude": 17.0,
        "longitude": 73.2,
        "reporter_phone": "+1 (555) 234-5678"
    }
    res_good = client.post("/api/v1/reports", json=good_payload)
    assert res_good.status_code == status.HTTP_201_CREATED
    assert res_good.json()["reporter_phone"] == "+1 (555) 234-5678"


def test_optional_email_and_vessel_registration(client, db_session):
    """Test that email and vessel registration number are strictly optional."""
    payload = {
        "gear_type": "monofilament",
        "latitude": 17.01,
        "longitude": 73.27,
        "reporter_name": "Devdas Patil",
        "reporter_phone": "+91 9123456780",
        "reporter_role": "Crew Member",
        "vessel_name": "Sagar Kanya",
        "vessel_type": "Fishing Boat",
        "declaration_confirmed": True
        # email and registration number omitted
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["reporter_email"] is None
    assert data["vessel_registration_number"] is None

    # Invalid email fails with 422
    invalid_email_payload = {
        **payload,
        "reporter_email": "not-an-email"
    }
    res_inv = client.post("/api/v1/reports", json=invalid_email_payload)
    assert res_inv.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_vessel_without_registered_name(client, db_session):
    """Test reporting for traditional or unregistered vessels without a boat name."""
    payload = {
        "gear_type": "trap",
        "latitude": 17.005,
        "longitude": 73.282,
        "reporter_name": "Anil Bandekar",
        "reporter_phone": "+91 9876543210",
        "reporter_role": "Vessel Owner",
        "has_registered_vessel_name": False,
        "vessel_name": "",  # Empty name provided by user
        "vessel_type": "Traditional Fishing Boat",
        "gear_quantity": 3,
        "declaration_confirmed": True
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["has_registered_vessel_name"] is False
    assert data["vessel_name"] == "No registered name"
    assert data["vessel_type"] == "Traditional Fishing Boat"


def test_reporter_contact_redaction_for_public_vs_ngo(client, db_session):
    """Test that reporter phone and email are redacted on public endpoints unless NGO authorized."""
    payload = {
        "gear_type": "gillnet",
        "latitude": 17.012,
        "longitude": 73.278,
        "reporting_method": "gps",
        "location_type": "exact",
        "reporter_name": "Anand Koli",
        "reporter_phone": "+91 9988776655",
        "reporter_email": "anand.koli@harbour.in",
        "vessel_name": "Matsya Rekha",
        "has_registered_vessel_name": True,
        "declaration_confirmed": True
    }
    create_res = client.post("/api/v1/reports", json=payload)
    assert create_res.status_code == status.HTTP_201_CREATED
    report_id = create_res.json()["id"]

    # 1. Public caller (unauthenticated, no Authorization header) -> Phone & Email must be redacted (None)
    public_detail = client.get(f"/api/v1/reports/{report_id}")
    assert public_detail.status_code == status.HTTP_200_OK
    pub_data = public_detail.json()
    assert pub_data["reporter_name"] == "Anand Koli"  # Publicly visible name/role
    assert pub_data["reporter_phone"] is None          # Redacted
    assert pub_data["reporter_email"] is None          # Redacted

    # Public listing
    public_list = client.get("/api/v1/reports")
    assert public_list.status_code == status.HTTP_200_OK
    listed_report = next((r for r in public_list.json()["items"] if r["id"] == report_id), None)
    assert listed_report is not None
    assert listed_report["reporter_phone"] is None
    assert listed_report["reporter_email"] is None

    # 2. Forged NGO headers without Bearer token -> MUST BE REJECTED / REDACTED
    forged_headers = {
        "X-NGO-Authorized": "true",
        "X-NGO-Role": "Field Recovery Specialist",
        "X-Officer-Role": "ngo_officer",
    }
    forged_detail = client.get(f"/api/v1/reports/{report_id}", headers=forged_headers)
    assert forged_detail.status_code == status.HTTP_200_OK
    forged_data = forged_detail.json()
    assert forged_data["reporter_phone"] is None, "Forged header must NOT grant access to phone"
    assert forged_data["reporter_email"] is None, "Forged header must NOT grant access to email"

    # Forged headers on list
    forged_list = client.get("/api/v1/reports", headers=forged_headers)
    assert forged_list.status_code == status.HTTP_200_OK
    forged_item = next((r for r in forged_list.json()["items"] if r["id"] == report_id), None)
    assert forged_item is not None
    assert forged_item["reporter_phone"] is None
    assert forged_item["reporter_email"] is None

    # 3. Invalid / tampered Bearer token -> MUST BE REJECTED / REDACTED
    tampered_detail = client.get(
        f"/api/v1/reports/{report_id}",
        headers={"Authorization": "Bearer forged.tampered.jwt.token"}
    )
    assert tampered_detail.status_code == status.HTTP_200_OK
    tampered_data = tampered_detail.json()
    assert tampered_data["reporter_phone"] is None
    assert tampered_data["reporter_email"] is None

    # 4. Authenticate via /api/v1/auth/login to obtain a valid signed JWT Bearer token
    login_res = client.post("/api/v1/auth/login", json={
        "operator_id": "officer.maritime@oceanrescue.org",
        "password": "oceanrescue-demo",
        "role": "Field Recovery Specialist",
        "agency": "Ghost Diving & Marine Alliance"
    })
    assert login_res.status_code == status.HTTP_200_OK
    jwt_token = login_res.json()["access_token"]
    assert len(jwt_token) > 20

    # 5. Authorized NGO caller with valid signed Bearer token -> Phone & Email must be visible
    auth_headers = {"Authorization": f"Bearer {jwt_token}"}
    ngo_detail = client.get(f"/api/v1/reports/{report_id}", headers=auth_headers)
    assert ngo_detail.status_code == status.HTTP_200_OK
    ngo_data = ngo_detail.json()
    assert ngo_data["reporter_phone"] == "+91 9988776655"
    assert ngo_data["reporter_email"] == "anand.koli@harbour.in"

    # Authorized NGO listing
    ngo_list = client.get("/api/v1/reports", headers=auth_headers)
    assert ngo_list.status_code == status.HTTP_200_OK
    ngo_listed_report = next((r for r in ngo_list.json()["items"] if r["id"] == report_id), None)
    assert ngo_listed_report is not None
    assert ngo_listed_report["reporter_phone"] == "+91 9988776655"
    assert ngo_listed_report["reporter_email"] == "anand.koli@harbour.in"


def test_unauthorized_token_role_redaction(client, db_session):
    """Test that authenticated users with unauthorized roles (e.g. fisherman) cannot view contact details."""
    from app.core.auth import create_access_token

    # Create report with contact info
    create_res = client.post("/api/v1/reports", json={
        "gear_type": "crab_pot",
        "latitude": 17.001,
        "longitude": 73.275,
        "reporting_method": "manual",
        "location_type": "estimated",
        "reporter_name": "Deepak Patil",
        "reporter_phone": "+91 9822114433",
        "reporter_email": "deepak.patil@coastal.in",
        "declaration_confirmed": True
    })
    report_id = create_res.json()["id"]

    # Issue signed token with unauthorized role: 'fisherman'
    fisherman_token = create_access_token(
        operator_id="fisherman.deepak@coastal.in",
        role="fisherman",
        agency="Independent"
    )
    res = client.get(
        f"/api/v1/reports/{report_id}",
        headers={"Authorization": f"Bearer {fisherman_token}"}
    )
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["reporter_name"] == "Deepak Patil"
    assert data["reporter_phone"] is None, "Unauthorized role must not access reporter phone"
    assert data["reporter_email"] is None, "Unauthorized role must not access reporter email"


def test_invalid_coordinate_ranges_rejected(client, db_session):
    """Test that backend rejects out-of-range latitude (> 90 or < -90) and longitude (> 180 or < -180)."""
    # Latitude out of bounds (> 90)
    res_lat_high = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 91.5,
        "longitude": 73.28
    })
    assert res_lat_high.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Latitude out of bounds (< -90)
    res_lat_low = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": -95.0,
        "longitude": 73.28
    })
    assert res_lat_low.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Longitude out of bounds (> 180)
    res_lon_high = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 17.0,
        "longitude": 185.0
    })
    assert res_lon_high.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Longitude out of bounds (< -180)
    res_lon_low = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 17.0,
        "longitude": -181.0
    })
    assert res_lon_low.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

