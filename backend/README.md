# OceanRescue Backend

**FastAPI + YOLOv8-seg detection API for the OceanRescue project.**

> **Tagline:** Every Net Found. Every Life Saved.

---

## Overview

The backend exposes a REST API that:
1. Loads `models/best.pt` (YOLOv8-seg, 2 classes: `fishing_net`, `rope_line`) once at startup.
2. Accepts image uploads and runs inference.
3. Returns class names, confidence scores, bounding boxes, and segmentation polygons.
4. Provides a health and model-info endpoint for monitoring.

> **Important:** Detections are candidate visual predictions requiring human review.  
> Geographic coordinates are **never** inferred from image pixels alone.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI application entry point
│   ├── core/
│   │   └── config.py                # Settings (env vars / .env file)
│   ├── api/v1/
│   │   ├── router.py                # Aggregates all v1 routes
│   │   ├── health.py                # GET /api/v1/health, GET /api/v1/model-info
│   │   └── predict.py               # POST /api/v1/predict
│   ├── services/
│   │   ├── model_service.py         # Model loading (singleton, thread-safe)
│   │   └── prediction_service.py    # Inference + result formatting
│   └── models/
│       └── schemas.py               # Pydantic response schemas
├── tests/
│   ├── test_health.py               # Health and model-info endpoint tests
│   └── test_predict.py              # Prediction validation and schema tests
├── conftest.py                      # pytest sys.path setup
├── requirements.txt                 # Python dependencies
└── run.py                           # Convenience launch script
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Python ≥ 3.10 | Tested on Python 3.14.2 |
| `torch` ≥ 1.8 (CPU or CUDA) | Already installed: `2.11.0+cpu` |
| `torchvision` ≥ 0.9 | Already installed: `0.26.0+cpu` |

> **GPU inference:** Install the CUDA-enabled torch/torchvision wheels from  
> https://pytorch.org and set `MODEL_DEVICE=cuda` in `.env`.

---

## Installation

Run all commands from the **project root** (`ocean rescue dataset/`).

### 1. Install backend dependencies

```powershell
pip install -r backend/requirements.txt
```

### 2. Create your `.env` file (optional)

```powershell
Copy-Item .env.example .env
# Edit .env to override defaults if needed
```

---

## Running the Server

From the **project root**:

```powershell
# Option A — uvicorn directly (recommended for development)
python -m uvicorn backend.app.main:app --reload --port 8000

# Option B — convenience script
python backend/run.py

# Option C — convenience script with custom port
python backend/run.py --port 8080 --reload
```

The API will be available at `http://localhost:8000`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Basic API info |
| `GET` | `/docs` | Swagger interactive docs |
| `GET` | `/redoc` | ReDoc documentation |
| `GET` | `/api/v1/health` | API + model load status |
| `GET` | `/api/v1/model-info` | Model classes, thresholds, notes |
| `POST` | `/api/v1/predict` | Upload image, run inference |

### `GET /api/v1/health`

```json
{
  "status": "ok",
  "app_name": "OceanRescue API",
  "app_version": "0.1.0",
  "model_loaded": true,
  "model_error": null,
  "model_path": "C:\\...\\models\\best.pt",
  "device": "cpu"
}
```

### `GET /api/v1/model-info`

Returns class names, confidence threshold, IoU threshold, and a short model evaluation summary.

### `POST /api/v1/predict`

Upload a JPEG, PNG, or WebP image (≤ 20 MB).

**curl example:**
```bash
curl -X POST http://localhost:8000/api/v1/predict \
     -F "file=@my_image.jpg" | python -m json.tool
```

**PowerShell example:**
```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/v1/predict `
  -Method Post `
  -Form @{ file = Get-Item .\my_image.jpg }
```

**Success response:**
```json
{
  "success": true,
  "detection_count": 2,
  "detections": [
    {
      "detection_index": 0,
      "class_id": 0,
      "class_name": "fishing_net",
      "confidence": 0.762,
      "bbox_xyxy": [12.5, 34.1, 310.7, 280.3],
      "segmentation_polygon": [[12.5, 34.1], [15.0, 35.0], ...],
      "has_mask": true
    }
  ],
  "annotated_image_b64": "<base64 JPEG>",
  "model_classes": {"0": "fishing_net", "1": "rope_line"},
  "confidence_threshold": 0.25,
  "error": null,
  "disclaimer": "These are candidate detections from a preliminary YOLOv8-seg model. ..."
}
```

**Validation failures return 422:**
- Empty file
- File size > 20 MB
- Unsupported file type (not JPEG/PNG/WebP)
- Corrupt or unreadable image

---

## Running Tests

From the **project root**:

```powershell
python -m pytest backend/tests/ -v
```

Expected output: **10 tests, all passing**.

```
backend/tests/test_health.py::test_health_endpoint_returns_200       PASSED
backend/tests/test_health.py::test_health_response_schema            PASSED
backend/tests/test_health.py::test_model_info_returns_200            PASSED
backend/tests/test_health.py::test_model_info_schema                 PASSED
backend/tests/test_health.py::test_root_redirect                     PASSED
backend/tests/test_predict.py::test_predict_empty_file_rejected      PASSED
backend/tests/test_predict.py::test_predict_non_image_rejected       PASSED
backend/tests/test_predict.py::test_predict_oversized_file_rejected  PASSED
backend/tests/test_predict.py::test_predict_corrupt_image_rejected   PASSED
backend/tests/test_predict.py::test_predict_valid_png_schema         PASSED
```

---

## Configuration

All settings have defaults and can be overridden via environment variables or a `.env` file in the project root.

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `false` | Enable debug logging |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | CORS allowed origins |
| `MODEL_DEVICE` | `cpu` | `cpu` or `cuda` |
| `MODEL_CONFIDENCE_THRESHOLD` | `0.25` | Detection confidence cutoff |
| `MODEL_IOU_THRESHOLD` | `0.45` | NMS IoU cutoff |
| `MAX_UPLOAD_BYTES` | `20971520` | Max upload size (20 MB) |

---

## Model Notes

- **File:** `models/best.pt`
- **Architecture:** YOLOv8-seg (`yolov8s-seg`)
- **Classes:** `0: fishing_net`, `1: rope_line`
- **Training:** 30 epochs configured; best checkpoint at epoch 11 (stopped early at 19)
- **Preliminary validation (110-image positive-only subset):**

| Metric | Score |
|---|---|
| BBox precision | 0.468 |
| BBox recall | 0.370 |
| BBox mAP@50 | 0.353 |
| Seg mAP@50 | 0.286 |

> These metrics are preliminary. The validation set contains no background-only images.  
> Do not present these as field-ready accuracy.

---

## Limitations and Disclaimers

- Detections are **candidate visual predictions**. A detection does not confirm that an object is abandoned, lost, or discarded fishing gear.
- **No GPS coordinates are inferred from image content.** Location information must come from a trusted source (user input, EXIF data, or a georeferenced dataset).
- The model has modest validation scores on a limited dataset. False positives and missed detections are expected.
- All inference results include a `disclaimer` field that communicates these limitations.
- Drift predictions and recovery recommendations are handled by separate modules (not implemented in this backend foundation phase).
