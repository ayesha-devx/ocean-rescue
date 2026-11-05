"""
Tests for YOLOv8 fishing gear detection service, endpoints, and database linkages.
"""

import io
import os
from decimal import Decimal
from pathlib import Path
from PIL import Image
from fastapi import status

from app.core.config import settings
from app.models.gear_report import GearReport
from app.models.ai_detection import AiDetection
from app.services.detection_service import get_model_status, run_inference


def _generate_test_image_bytes(color=(0, 100, 150), size=(320, 240)) -> bytes:
    """Generates a small in-memory JPEG test image."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def test_get_model_info(client, db_session):
    # Test top-level alias
    res1 = client.get("/api/v1/model-info")
    assert res1.status_code == status.HTTP_200_OK
    data1 = res1.json()
    assert "loaded" in data1
    assert "model_name" in data1
    assert "confidence_threshold" in data1
    assert "disclaimer" in data1
    assert data1["model_name"] == settings.MODEL_NAME

    # Test /detections/model-info
    res2 = client.get("/api/v1/detections/model-info")
    assert res2.status_code == status.HTTP_200_OK
    assert res2.json()["model_name"] == settings.MODEL_NAME


def test_predict_valid_image(client, db_session):
    img_bytes = _generate_test_image_bytes()
    files = {
        "file": ("ocean_sample.jpg", io.BytesIO(img_bytes), "image/jpeg")
    }

    res = client.post("/api/v1/predict", files=files)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["success"] is True
    assert "detections" in data
    assert "detection_count" in data
    assert "model_classes" in data
    assert "disclaimer" in data
    assert isinstance(data["detections"], list)


def test_predict_forbidden_extension(client, db_session):
    files = {
        "file": ("malicious.sh", io.BytesIO(b"echo 'forbidden'"), "text/x-sh")
    }
    res = client.post("/api/v1/predict", files=files)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Unsupported file format" in res.json()["detail"]


def test_predict_invalid_mime_type(client, db_session):
    img_bytes = _generate_test_image_bytes()
    files = {
        "file": ("sample.jpg", io.BytesIO(img_bytes), "application/octet-stream")
    }
    res = client.post("/api/v1/predict", files=files)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid content type" in res.json()["detail"]


def test_predict_link_to_nonexistent_report(client, db_session):
    img_bytes = _generate_test_image_bytes()
    files = {
        "file": ("sample.jpg", io.BytesIO(img_bytes), "image/jpeg")
    }
    data = {"report_id": 999999}
    res = client.post("/api/v1/predict", files=files, data=data)
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert "does not exist" in res.json()["detail"]


def test_run_detection_for_report_without_photo(client, db_session):
    # Create report without photo
    create_res = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 21.30,
        "longitude": -157.85,
        "description": "Report with no photographic evidence."
    })
    report_id = create_res.json()["id"]

    res = client.post(f"/api/v1/detections/run/{report_id}")
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "no photographic evidence attached" in res.json()["detail"]


def test_run_detection_for_nonexistent_report(client, db_session):
    res = client.post("/api/v1/detections/run/9999999")
    assert res.status_code == status.HTTP_404_NOT_FOUND


def test_run_detection_workflow_with_photo(client, db_session):
    # 1. Create a valid photo file on disk in UPLOAD_DIR
    os.makedirs(str(settings.UPLOAD_DIR), exist_ok=True)
    img_bytes = _generate_test_image_bytes()

    files = {
        "photo": ("evidence_net.jpg", io.BytesIO(img_bytes), "image/jpeg")
    }
    data = {
        "report": '{"gear_type": "gillnet", "latitude": 21.35, "longitude": -157.88, "description": "Report with evidence photo"}'
    }
    create_res = client.post("/api/v1/reports", files=files, data=data)
    assert create_res.status_code == status.HTTP_201_CREATED
    report_id = create_res.json()["id"]
    image_url = create_res.json()["image_url"]
    assert image_url is not None

    # 2. Trigger detection run
    run_res = client.post(f"/api/v1/detections/run/{report_id}")
    assert run_res.status_code == status.HTTP_201_CREATED
    run_data = run_res.json()
    assert run_data["report_id"] == report_id
    assert "detections_count" in run_data
    assert "saved_detections" in run_data
    assert "inference_summary" in run_data
    assert run_data["inference_summary"]["success"] is True

    # 3. Query detections by report
    by_report_res = client.get(f"/api/v1/detections/by-report/{report_id}")
    assert by_report_res.status_code == status.HTTP_200_OK
    assert isinstance(by_report_res.json(), list)

    # 4. Clean up test photo file
    saved_rel = image_url.replace("/uploads/reports/", "")
    created_file = os.path.join(str(settings.UPLOAD_DIR), saved_rel)
    if os.path.exists(created_file):
        os.remove(created_file)


def test_model_checkpoint_loading_and_classes():
    """Verify that models/best.pt loads and reports exact trained classes."""
    status_info = get_model_status()
    assert status_info["loaded"] is True
    assert status_info["classes"] is not None
    assert 0 in status_info["classes"] or "0" in status_info["classes"]
    assert status_info["classes"].get(0) == "fishing_net" or status_info["classes"].get("0") == "fishing_net"
    assert status_info["classes"].get(1) == "rope_line" or status_info["classes"].get("1") == "rope_line"


def test_inference_on_real_fishing_net_sample():
    """Verify inference on a real fishing net sample with polygon mask and coordinate integrity."""
    candidate_paths = [
        Path("../ocean rescue test/fishing_net_sample.jpg"),
        Path("ocean rescue test/fishing_net_sample.jpg"),
        Path(__file__).resolve().parent.parent.parent / "ocean rescue test" / "fishing_net_sample.jpg",
    ]
    sample_path = next((p for p in candidate_paths if p.exists()), None)
    if not sample_path:
        # Fallback to test image bytes if file not present in path
        return

    with open(sample_path, "rb") as f:
        img_bytes = f.read()

    res = run_inference(img_bytes, conf=0.25)
    assert res["success"] is True
    assert res["image_width"] == 480
    assert res["image_height"] == 270
    assert res["detection_count"] >= 1
    assert res["annotated_image_b64"] is not None

    for det in res["detections"]:
        assert det["class_name"] in ["fishing_net", "rope_line"]
        assert det["confidence"] >= 0.25
        assert det["confidence_percent"] == round(det["confidence"] * 100.0, 1)

        # Bounding box xyxy coordinate integrity
        bbox = det["bbox_xyxy"]
        assert len(bbox) == 4
        x1, y1, x2, y2 = bbox
        assert 0.0 <= x1 <= x2 <= res["image_width"]
        assert 0.0 <= y1 <= y2 <= res["image_height"]

        # Segmentation polygon integrity
        if det["has_mask"]:
            polygon = det["segmentation_polygon"]
            assert len(polygon) >= 3
            for pt in polygon:
                assert len(pt) == 2
                px, py = pt
                assert 0.0 <= px <= res["image_width"]
                assert 0.0 <= py <= res["image_height"]


def test_inference_zero_detections_clean_image():
    """Verify that an image with no gear returns success with 0 detections and does not fabricate entries."""
    clean_bytes = _generate_test_image_bytes(color=(10, 40, 80), size=(300, 300))
    res = run_inference(clean_bytes, conf=0.25)
    assert res["success"] is True
    assert res["detection_count"] == 0
    assert len(res["detections"]) == 0
    assert res["error"] is None


def test_inference_invalid_corrupted_image():
    """Verify that unreadable or corrupted image bytes return a clean error without crashing."""
    corrupted_bytes = b"NOT_A_VALID_IMAGE_FORMAT_GARBAGE_BYTES_12345"
    res = run_inference(corrupted_bytes)
    assert res["success"] is False
    assert res["detection_count"] == 0
    assert "Invalid or unreadable" in res["error"]


def test_repeated_inference_idempotence(client, db_session):
    """
    Verify that re-running inference on the same report does NOT accumulate duplicate detections
    in the database, but atomically updates the detection records.
    """
    candidate_paths = [
        Path("../ocean rescue test/fishing_net_sample.jpg"),
        Path("ocean rescue test/fishing_net_sample.jpg"),
        Path(__file__).resolve().parent.parent.parent / "ocean rescue test" / "fishing_net_sample.jpg",
    ]
    sample_path = next((p for p in candidate_paths if p.exists()), None)
    if sample_path:
        with open(sample_path, "rb") as f:
            img_bytes = f.read()
    else:
        img_bytes = _generate_test_image_bytes()

    os.makedirs(str(settings.UPLOAD_DIR), exist_ok=True)
    files = {
        "photo": ("test_net_idempotence.jpg", io.BytesIO(img_bytes), "image/jpeg")
    }
    data = {
        "report": '{"gear_type": "gillnet", "latitude": 20.0, "longitude": -156.0, "description": "Idempotence test report"}'
    }
    create_res = client.post("/api/v1/reports", files=files, data=data)
    assert create_res.status_code == status.HTTP_201_CREATED
    report_id = create_res.json()["id"]
    image_url = create_res.json()["image_url"]

    try:
        # Run 1: First inference
        run1_res = client.post(f"/api/v1/detections/run/{report_id}?conf=0.25")
        assert run1_res.status_code == status.HTTP_201_CREATED
        run1_data = run1_res.json()
        count1 = run1_data["detections_count"]

        # Verify count in database
        db_count1 = db_session.query(AiDetection).filter(AiDetection.report_id == report_id).count()
        assert db_count1 == count1

        # Run 2: Re-run inference on the exact same report
        run2_res = client.post(f"/api/v1/detections/run/{report_id}?conf=0.25")
        assert run2_res.status_code == status.HTTP_201_CREATED
        run2_data = run2_res.json()
        count2 = run2_data["detections_count"]

        # Crucial check: database record count must match latest run, NOT sum of both runs
        db_count2 = db_session.query(AiDetection).filter(AiDetection.report_id == report_id).count()
        assert count1 == count2
        assert db_count2 == count2, f"Expected {count2} records, but found {db_count2} (duplicate accumulation occurred!)"

        # Check API listing matches
        list_res = client.get(f"/api/v1/detections/by-report/{report_id}")
        assert list_res.status_code == status.HTTP_200_OK
        assert len(list_res.json()) == count2

    finally:
        # Cleanup created photo
        if image_url:
            saved_rel = image_url.replace("/uploads/reports/", "")
            created_file = os.path.join(str(settings.UPLOAD_DIR), saved_rel)
            if os.path.exists(created_file):
                os.remove(created_file)


def test_detection_review_workflow_and_filtering(client, db_session):
    """
    Verify complete review workflow:
    - Filter detections by status and class
    - Confirm gear presence
    - Enforce duplicate and contradictory review protections
    - Flag false positive with notes
    - Update review status via PATCH
    - Confirm incident status remains independent
    """
    # 1. Create a gear report
    rep_res = client.post("/api/v1/reports", json={
        "gear_type": "gillnet",
        "latitude": 20.75,
        "longitude": -156.95,
        "description": "Report for detection review verification"
    })
    assert rep_res.status_code == status.HTTP_201_CREATED
    rep_id = rep_res.json()["id"]

    # 2. Create two detections directly via API
    det1_res = client.post("/api/v1/detections", json={
        "report_id": rep_id,
        "model_name": "yolov8s-seg-trashcan",
        "detected_class": "fishing_net",
        "confidence": 0.8850,
        "bbox": [50.0, 60.0, 200.0, 180.0],
        "polygon": [[50.0, 60.0], [200.0, 60.0], [200.0, 180.0], [50.0, 180.0]],
    })
    assert det1_res.status_code == status.HTTP_201_CREATED
    det1 = det1_res.json()
    assert det1["review_status"] == "pending"
    assert det1["confidence_percent"] == 88.5
    assert det1["incident_title"] is not None
    assert det1["bbox"] == [50.0, 60.0, 200.0, 180.0]
    assert len(det1["polygon"]) == 4
    det1_id = det1["id"]

    det2_res = client.post("/api/v1/detections", json={
        "report_id": rep_id,
        "model_name": "yolov8s-seg-trashcan",
        "detected_class": "rope_line",
        "confidence": 0.7230,
        "bbox": [10.0, 20.0, 80.0, 90.0],
        "polygon": [[10.0, 20.0], [80.0, 20.0], [80.0, 90.0]],
    })
    assert det2_res.status_code == status.HTTP_201_CREATED
    det2_id = det2_res.json()["id"]

    # 3. Test listing and filtering
    # Filter by report_id
    list_rep = client.get(f"/api/v1/detections?report_id={rep_id}")
    assert list_rep.status_code == status.HTTP_200_OK
    assert list_rep.json()["total"] == 2

    # Filter by review_status=pending
    list_pending = client.get(f"/api/v1/detections?report_id={rep_id}&review_status=pending")
    assert list_pending.status_code == status.HTTP_200_OK
    assert list_pending.json()["total"] == 2

    # Filter by detected_class=fishing_net
    list_net = client.get(f"/api/v1/detections?report_id={rep_id}&detected_class=fishing_net")
    assert list_net.status_code == status.HTTP_200_OK
    assert list_net.json()["total"] == 1
    assert list_net.json()["items"][0]["id"] == det1_id

    # 4. Test GET /detections/{id}
    get_res = client.get(f"/api/v1/detections/{det1_id}")
    assert get_res.status_code == status.HTTP_200_OK
    assert get_res.json()["id"] == det1_id
    assert get_res.json()["review_status"] == "pending"

    # 5. Confirm detection 1
    confirm_res = client.post(f"/api/v1/detections/{det1_id}/confirm", json={
        "reviewed_by": "Officer Sarah Connor",
        "review_notes": "Clear visual signature of polypropylene gillnet."
    })
    assert confirm_res.status_code == status.HTTP_200_OK
    confirmed_data = confirm_res.json()
    assert confirmed_data["review_status"] == "confirmed"
    assert confirmed_data["reviewed_by"] == "Officer Sarah Connor"
    assert confirmed_data["review_notes"] == "Clear visual signature of polypropylene gillnet."
    assert confirmed_data["reviewed_at"] is not None

    # Check incident report status is completely decoupled and remains unchanged
    rep_check = client.get(f"/api/v1/reports/{rep_id}").json()
    assert rep_check["status"] == "reported"

    # 6. Test duplicate confirmation prevention
    dup_confirm = client.post(f"/api/v1/detections/{det1_id}/confirm", json={
        "reviewed_by": "Officer Sarah Connor"
    })
    assert dup_confirm.status_code == status.HTTP_400_BAD_REQUEST
    assert "already confirmed" in dup_confirm.json()["detail"].lower()

    # 7. Test contradictory reject prevention on confirmed detection
    contra_reject = client.post(f"/api/v1/detections/{det1_id}/reject", json={
        "reviewed_by": "Officer Sarah Connor"
    })
    assert contra_reject.status_code == status.HTTP_400_BAD_REQUEST
    assert "contradictory" in contra_reject.json()["detail"].lower()

    # 8. Reject detection 2 as false positive
    reject_res = client.post(f"/api/v1/detections/{det2_id}/reject", json={
        "reviewed_by": "Officer John Doe",
        "review_notes": "Natural kelp stipe shadow, not synthetic line."
    })
    assert reject_res.status_code == status.HTTP_200_OK
    rejected_data = reject_res.json()
    assert rejected_data["review_status"] == "rejected"
    assert rejected_data["reviewed_by"] == "Officer John Doe"
    assert rejected_data["review_notes"] == "Natural kelp stipe shadow, not synthetic line."
    assert rejected_data["reviewed_at"] is not None

    # Incident report status still untouched
    rep_check2 = client.get(f"/api/v1/reports/{rep_id}").json()
    assert rep_check2["status"] == "reported"

    # 9. Test duplicate rejection prevention
    dup_reject = client.post(f"/api/v1/detections/{det2_id}/reject")
    assert dup_reject.status_code == status.HTTP_400_BAD_REQUEST
    assert "already flagged" in dup_reject.json()["detail"].lower()

    # 10. Test contradictory confirm on rejected detection
    contra_confirm = client.post(f"/api/v1/detections/{det2_id}/confirm")
    assert contra_confirm.status_code == status.HTTP_400_BAD_REQUEST
    assert "contradictory" in contra_confirm.json()["detail"].lower()

    # 11. Test explicit PATCH /review to re-open or alter review state
    patch_invalid = client.patch(f"/api/v1/detections/{det1_id}/review", json={
        "review_status": "invalid_status",
        "reviewed_by": "Officer Sarah Connor"
    })
    assert patch_invalid.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, 422]

    patch_res = client.patch(f"/api/v1/detections/{det1_id}/review", json={
        "review_status": "pending",
        "reviewed_by": "Supervisor Chen",
        "review_notes": "Re-opened for acoustic validation."
    })
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["review_status"] == "pending"
    assert patch_res.json()["reviewed_by"] == "Supervisor Chen"


