# OceanRescue NGO Conservation Operations Platform — Backend

A modern, production-grade geospatial backend for the **OceanRescue** project (*Every Net Found. Every Life Saved.*).

Engineered specifically for the NGO Conservation Operations Portal to manage ALDFG (Abandoned, Lost, and Discarded Fishing Gear) incident intake, PostGIS spatial queries, YOLOv8 detections, hydrodynamic telemetry, drift trajectories, and salvage mission orchestration.

---

## 1. Technology Stack

- **Framework:** Python 3.14 + FastAPI 0.141+
- **ORM & Database:** SQLAlchemy 2.0 (Modern 2.x Typed Declarative Mappings)
- **Spatial Extensions:** GeoAlchemy2 + PostGIS 3.6.2 (WGS84 EPSG:4326) + Shapely 2.2
- **Database Driver:** `psycopg2-binary` connection-pooled engine
- **Data Validation & Serialization:** Pydantic 2.12 + Pydantic Settings
- **Testing:** Pytest 9.1 with safe transactional rollback fixtures

---

## 2. Architecture & File Structure

```text
ngo_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application setup, CORS, error handlers, static mounts
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py               # Pydantic Settings environment configuration
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                 # DeclarativeBase for SQLAlchemy 2.x
│   │   └── session.py              # Connection pool & get_db dependency
│   ├── models/                     # Exact mappings of the 5 PostgreSQL/PostGIS tables
│   │   ├── __init__.py
│   │   ├── gear_report.py          # gear_reports (POINT, SRID 4326)
│   │   ├── ai_detection.py         # ai_detections (FK -> gear_reports)
│   │   ├── environmental_observation.py # environmental_observations (POINT, SRID 4326)
│   │   ├── drift_forecast.py       # drift_forecasts (POINT, SRID 4326)
│   │   └── recovery_mission.py     # recovery_missions (LINESTRING, SRID 4326)
│   ├── schemas/                    # Pydantic models for request validation & response serialization
│   │   ├── __init__.py
│   │   ├── common.py               # GeoJSON, pagination, coordinates validation
│   │   ├── gear_report.py
│   │   ├── dashboard.py
│   │   ├── ai_detection.py
│   │   ├── environmental_observation.py
│   │   ├── drift_forecast.py
│   │   └── recovery_mission.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py           # Master v1 router aggregating all subsystems
│   │       ├── health.py           # /health, /api/v1/health, /api/v1/health/db
│   │       ├── reports.py          # /api/v1/reports (CRUD, PostGIS queries, uploads)
│   │       ├── dashboard.py        # /api/v1/dashboard/stats (live non-fabricated metrics)
│   │       ├── detections.py       # /api/v1/detections
│   │       ├── environmental.py    # /api/v1/environmental-observations
│   │       ├── forecasts.py        # /api/v1/drift-forecasts
│   │       └── missions.py         # /api/v1/recovery-missions
│   └── services/
│       ├── __init__.py
│       ├── report_service.py       # Spatial queries, PostGIS conversions, GeoJSON builders
│       └── dashboard_service.py    # Aggregated metrics calculated from real database rows
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # Safe rollback test fixtures (preserves real database records)
│   ├── test_health.py
│   ├── test_reports.py
│   └── test_subsystems.py
├── .env.example                    # Template environment variables (no hardcoded passwords)
├── .gitignore
├── requirements.txt
├── run.py                          # Local startup script
└── README.md
```

---

## 3. Database Schema Mapping

The backend directly connects to the existing PostgreSQL `oceanrescue` database with PostGIS enabled:

| Table | Primary Key | Geometry Column | Foreign Keys |
|---|---|---|---|
| `gear_reports` | `id` (bigint identity) | `reported_location` (POINT, 4326) | None |
| `ai_detections` | `id` (bigint identity) | None | `report_id` -> `gear_reports.id` |
| `environmental_observations` | `id` (bigint identity) | `observation_location` (POINT, 4326) | None |
| `drift_forecasts` | `id` (bigint identity) | `predicted_location` (POINT, 4326) | `report_id` -> `gear_reports.id` |
| `recovery_missions` | `id` (bigint identity) | `planned_route` (LINESTRING, 4326) | `report_id` -> `gear_reports.id` |

---

## 4. REST API Endpoints Overview

All operational endpoints are routed under `/api/v1`:

### Health & Connectivity
- `GET /health` — Application health check
- `GET /api/v1/health` — Subsystem liveness check
- `GET /api/v1/health/db` — Safe database connectivity check with PostGIS version and table count (does not leak credentials)

### Gear Reports
- `POST /api/v1/reports` — Create report (supports JSON and multipart photo uploads)
- `GET /api/v1/reports` — List reports with status, gear type, search, and spatial bounding box filters
- `GET /api/v1/reports/{report_id}` — Inspect single report details
- `PATCH /api/v1/reports/{report_id}` — Update permitted report fields
- `PATCH /api/v1/reports/{report_id}/status` — Transition report status (`reported` -> `verified` -> `in_review` -> `scheduled_recovery` -> `resolved` -> `cancelled`)
- `GET /api/v1/reports/map/geojson` — Standard GeoJSON FeatureCollection of report points

### NGO Dashboard
- `GET /api/v1/dashboard/stats` — Live operational metrics calculated strictly from actual database rows (total reports, status breakdown, gear distribution, active missions, recent reports)

### AI Detections
- `POST /api/v1/detections` — Record detection linking to `report_id` (foreign key verified)
- `GET /api/v1/detections` — List detections
- `GET /api/v1/detections/by-report/{report_id}` — List detections for a specific report

### Environmental Observations
- `POST /api/v1/environmental-observations` — Log ocean current/wind/wave sensor readings
- `GET /api/v1/environmental-observations` — Paginated observations
- `GET /api/v1/environmental-observations/latest` — Most recent sensor reading

### Drift Forecasts
- `POST /api/v1/drift-forecasts` — Record Lagrangian drift simulation points
- `GET /api/v1/drift-forecasts` — List drift forecasts
- `GET /api/v1/drift-forecasts/by-report/{report_id}` — Trajectory steps for an incident

### Recovery Missions
- `POST /api/v1/recovery-missions` — Create salvage mission plan with waypoints LineString
- `GET /api/v1/recovery-missions` — List missions with status filter
- `GET /api/v1/recovery-missions/{id}` — Retrieve mission details with route GeoJSON
- `PATCH /api/v1/recovery-missions/{id}` — Update status (`planned`, `assigned`, `in_progress`, `completed`, `aborted`)

---

## 5. Local Execution Instructions (Windows PowerShell)

### Step 1: Configure Environment
Copy `.env.example` to `.env` in the `ngo_backend` directory and adjust the password if needed:
```powershell
cd "c:\Users\KRIN\Downloads\ocean rescue dataset\ngo_backend"
Copy-Item .env.example .env
```

### Step 2: Install Dependencies
```powershell
py -m pip install -r requirements.txt
```

### Step 3: Run Automated Tests
```powershell
py -m pytest
```
*Tests use isolated transaction rollbacks, so your database data is never modified or erased.*

### Step 4: Start the NGO Backend
```powershell
py run.py
```
Or with Uvicorn:
```powershell
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API documentation will be available at:
- Swagger UI: **`http://127.0.0.1:8000/docs`**
- ReDoc: **`http://127.0.0.1:8000/redoc`**

### Step 5: Start the Frontend (if not already running)
```powershell
cd "c:\Users\KRIN\Downloads\ocean rescue dataset\frontend"
npm run dev
```
Open **`http://localhost:5173/`** for the public site or **`http://localhost:5173/ngo/dashboard`** for the NGO Operations Portal.
