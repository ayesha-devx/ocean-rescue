# OceanRescue — AI-Powered Marine Intelligence & Trash Detection Platform

OceanRescue is an integrated marine intelligence platform featuring real-time underwater debris and marine hazard detection, drift forecasting, sonar bathymetry integration, and automated recovery planning.

---

## 🚀 Quick Start Guide (For Collaborators)

Clone the repository:
```bash
git clone https://github.com/ayesha-devx/ocean-rescue.git
cd ocean-rescue
```

### 1. Backend Setup (FastAPI & YOLO Inference)
Make sure you have Python 3.9+ installed.

```bash
# Optional: create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the backend API server (runs at http://localhost:8000)
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend API Docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend Setup (React + Vite)
Make sure you have Node.js 18+ installed.

```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start the frontend dev server
npm run dev
```
Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 📁 Repository Structure
- `backend/` — FastAPI application, detection endpoints, inference service, and router logic.
- `frontend/` — React frontend application, mission console, interactive maps, telemetry widgets, and reporting views.
- `models/` — Pre-trained neural network weights (`best.pt`).
- `dataset/` — Underwater instance segmentation dataset (images & labels).
- `sea clear dataset/` — Marine debris datasets.
- `dataset_integration/` — Unified dataset scripts, stages, and training pipelines.
- `docs/` — Architecture documentation, System Architecture Document (SAD), and specs.
