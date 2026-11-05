"""
Tests for Gear Reports endpoints, spatial operations, and validation.
"""

from fastapi import status


def test_create_report_success(client, db_session):
    payload = {
        "gear_type": "gillnet",
        "latitude": 21.3069,
        "longitude": -157.8583,
        "description": "Submerged monofilament net snagged on reef.",
        "water_position": "submerged",
        "estimated_size": "medium",
        "sea_state": "moderate"
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["gear_type"] == "gillnet"
    assert data["status"] == "reported"
    assert abs(data["latitude"] - 21.3069) < 0.0001
    assert abs(data["longitude"] - (-157.8583)) < 0.0001
    assert "Submerged monofilament" in data["description"]
    assert data["id"] > 0


def test_create_report_invalid_coordinates(client, db_session):
    # Invalid latitude > 90
    payload_bad_lat = {
        "gear_type": "gillnet",
        "latitude": 95.0,
        "longitude": -157.8583,
        "description": "Test"
    }
    res = client.post("/api/v1/reports", json=payload_bad_lat)
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Invalid longitude < -180
    payload_bad_lon = {
        "gear_type": "gillnet",
        "latitude": 21.0,
        "longitude": -195.0,
        "description": "Test"
    }
    res = client.post("/api/v1/reports", json=payload_bad_lon)
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_get_report_by_id(client, db_session):
    # Create first
    create_res = client.post("/api/v1/reports", json={
        "gear_type": "crab_pot",
        "latitude": 34.02,
        "longitude": -119.61,
        "description": "Derelict Dungeness crab pot string."
    })
    report_id = create_res.json()["id"]

    # Fetch
    res = client.get(f"/api/v1/reports/{report_id}")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["id"] == report_id
    assert data["gear_type"] == "crab_pot"


def test_get_nonexistent_report(client, db_session):
    res = client.get("/api/v1/reports/99999999")
    assert res.status_code == status.HTTP_404_NOT_FOUND


def test_update_report_status(client, db_session):
    create_res = client.post("/api/v1/reports", json={
        "gear_type": "longline",
        "latitude": 33.5,
        "longitude": -118.5,
        "description": "Ghost longline gear."
    })
    report_id = create_res.json()["id"]

    # Valid status update
    patch_res = client.patch(f"/api/v1/reports/{report_id}/status", json={
        "status": "verified",
        "notes": "Verified by aerial reconnaissance drone pass."
    })
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["status"] == "verified"
    assert "Verified by aerial reconnaissance" in patch_res.json()["description"]

    # Invalid status rejection
    invalid_patch = client.patch(f"/api/v1/reports/{report_id}/status", json={
        "status": "invalid_random_status"
    })
    assert invalid_patch.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_reports_geojson(client, db_session):
    # Create report
    client.post("/api/v1/reports", json={
        "gear_type": "fad",
        "latitude": 20.5,
        "longitude": -156.5,
        "description": "Drifting FAD bundle"
    })

    res = client.get("/api/v1/reports/map/geojson")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert isinstance(data["features"], list)
    if data["features"]:
        feat = data["features"][0]
        assert feat["type"] == "Feature"
        assert feat["geometry"]["type"] == "Point"
        assert len(feat["geometry"]["coordinates"]) == 2


def test_create_report_with_valid_photo(client, db_session):
    import io, os, json
    from app.core.config import settings

    photo_content = b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 50
    files = {
        "photo": ("evidence.jpg", io.BytesIO(photo_content), "image/jpeg")
    }
    data = {
        "report": json.dumps({
            "gear_type": "gillnet",
            "latitude": 22.0,
            "longitude": -158.0,
            "description": "Report with valid photographic evidence."
        })
    }
    res = client.post("/api/v1/reports", data=data, files=files)
    assert res.status_code == status.HTTP_201_CREATED
    res_data = res.json()
    assert res_data["image_url"] is not None
    assert res_data["image_url"].startswith("/uploads/reports/report_")

    # Clean up test file created in uploads directory
    saved_rel = res_data["image_url"].replace("/uploads/reports/", "")
    created_file = os.path.join(str(settings.UPLOAD_DIR), saved_rel)
    if os.path.exists(created_file):
        os.remove(created_file)


def test_create_report_with_forbidden_extension(client, db_session):
    import io, json

    files = {
        "photo": ("script.py", io.BytesIO(b"print('malicious')"), "text/x-python")
    }
    data = {
        "report": json.dumps({
            "gear_type": "gillnet",
            "latitude": 22.0,
            "longitude": -158.0
        })
    }
    res = client.post("/api/v1/reports", data=data, files=files)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Unsupported file format" in res.json()["detail"]


def test_create_report_with_invalid_mime_type(client, db_session):
    import io, json

    # Filename has .jpg extension but content-type is executable/text
    files = {
        "photo": ("test.jpg", io.BytesIO(b"malicious content"), "application/x-msdownload")
    }
    data = {
        "report": json.dumps({
            "gear_type": "gillnet",
            "latitude": 22.0,
            "longitude": -158.0
        })
    }
    res = client.post("/api/v1/reports", data=data, files=files)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid content type" in res.json()["detail"]


def test_create_report_human_gear_type_mapping(client, db_session):
    # Test human strings from frontend form
    res1 = client.post("/api/v1/reports", json={
        "gear_type": "Gillnet / Monofilament",
        "latitude": 21.30,
        "longitude": -157.85
    })
    assert res1.status_code == status.HTTP_201_CREATED
    assert res1.json()["gear_type"] == "gillnet"

    res2 = client.post("/api/v1/reports", json={
        "gear_type": "Crab / Lobster Pot & Line",
        "latitude": 21.31,
        "longitude": -157.86
    })
    assert res2.status_code == status.HTTP_201_CREATED
    assert res2.json()["gear_type"] == "crab_pot"


def test_create_report_anonymous_privacy(client, db_session):
    # When is_anonymous is True, reporter details must NOT appear in report or description
    payload = {
        "gear_type": "gillnet",
        "latitude": 21.30,
        "longitude": -157.85,
        "is_anonymous": True,
        "reporter_name": "Captain Ahab",
        "contact_info": "VHF Ch 16 / Private Number",
        "description": "Observed floating near channel marker."
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert "Captain Ahab" not in data["description"]
    assert "Private Number" not in data["description"]
    assert "Privacy: Anonymous Mariner Submission" in data["description"]


def test_create_report_non_anonymous_telemetry(client, db_session):
    # When is_anonymous is False, vessel and contact are safely recorded in field telemetry
    payload = {
        "gear_type": "longline",
        "latitude": 21.30,
        "longitude": -157.85,
        "is_anonymous": False,
        "reporter_name": "F/V Pacific Star",
        "contact_info": "VHF 16",
        "water_position": "Submerged",
        "estimated_size": "Large (50 - 200 meters)",
        "description": "Heavy mainline snagged."
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    desc = res.json()["description"]
    assert "Vessel/Reporter: F/V Pacific Star" in desc
    assert "Contact: VHF 16" in desc
    assert "Water Position: Submerged" in desc


def test_create_report_invalid_form_coordinates(client, db_session):
    # Non-numeric coordinate string in form submission
    res = client.post("/api/v1/reports", data={
        "gear_type": "gillnet",
        "latitude": "invalid_lat",
        "longitude": "-157.85"
    })
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "Latitude and longitude must be valid numeric coordinates" in res.json()["detail"]


def test_create_report_missing_required_fields(client, db_session):
    # Missing gear_type
    res_missing_gear = client.post("/api/v1/reports", json={
        "latitude": 21.30,
        "longitude": -157.85
    })
    assert res_missing_gear.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Missing latitude
    res_missing_lat = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "longitude": -157.85
    })
    assert res_missing_lat.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Missing longitude
    res_missing_lon = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 21.30
    })
    assert res_missing_lon.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Form submission missing coordinates
    res_form_missing = client.post("/api/v1/reports", data={
        "gear_type": "gillnet"
    })
    assert res_form_missing.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_create_report_database_error_handling(client, db_session, monkeypatch):
    from sqlalchemy.exc import OperationalError

    # Simulate database crash or failure during report creation
    def mock_create_failure(*args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("Database connection lost"))

    monkeypatch.setattr("app.services.report_service.create_gear_report", mock_create_failure)

    res = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 21.30,
        "longitude": -157.85,
        "description": "Report during db failure"
    })
    # Must fail with 500 error, never false success (201)
    assert res.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "Database error while saving report" in res.json()["detail"]


def test_verified_reports_map_filter(client, db_session):
    """
    Test that queries for verified reports return only approved reports,
    and explicitly exclude pending (reported) and rejected/cancelled reports.
    """
    # 1. Create a pending report
    pending_res = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 16.992,
        "longitude": 73.301,
        "description": "Pending fisherman sighting near Mirkarwada"
    })
    assert pending_res.status_code == status.HTTP_201_CREATED
    pending_id = pending_res.json()["id"]

    # 2. Create an approved/verified report
    verified_res = client.post("/api/v1/reports", json={
        "gear_type": "trawl_net",
        "latitude": 16.995,
        "longitude": 73.308,
        "description": "Approved derelict net off Ratnagiri"
    })
    assert verified_res.status_code == status.HTTP_201_CREATED
    verified_id = verified_res.json()["id"]
    # NGO approves/verifies the report
    patch_res = client.patch(f"/api/v1/reports/{verified_id}/status", json={
        "status": "verified",
        "notes": "Verified by NGO field review"
    })
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["status"] == "verified"

    # 3. Create a rejected report
    rejected_res = client.post("/api/v1/reports", json={
        "gear_type": "crab_pot",
        "latitude": 17.001,
        "longitude": 73.295,
        "description": "Rejected false alarm"
    })
    assert rejected_res.status_code == status.HTTP_201_CREATED
    rejected_id = rejected_res.json()["id"]
    client.patch(f"/api/v1/reports/{rejected_id}/status", json={
        "status": "rejected",
        "notes": "Rejected: false alarm"
    })

    # 4. Query reports with status=verified
    res = client.get("/api/v1/reports?status=verified&page_size=100")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    items = data["items"]
    item_ids = [item["id"] for item in items]

    # Verify approved report is included
    assert verified_id in item_ids
    # Verify pending and rejected reports are excluded
    assert pending_id not in item_ids
    assert rejected_id not in item_ids

    # Every item returned must have status 'verified'
    for item in items:
        assert item["status"] == "verified"

    # 5. Query GeoJSON with status=verified
    geojson_res = client.get("/api/v1/reports/map/geojson?status=verified")
    assert geojson_res.status_code == status.HTTP_200_OK
    geojson_data = geojson_res.json()
    geojson_ids = [f["properties"]["id"] for f in geojson_data["features"]]

    assert verified_id in geojson_ids
    assert pending_id not in geojson_ids
    assert rejected_id not in geojson_ids


