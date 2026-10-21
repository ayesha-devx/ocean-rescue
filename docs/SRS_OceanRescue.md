# OceanRescue — Software Requirements Specification (SRS)

**Project Name:** OceanRescue  
**Official Project Title:** AI-Driven Geospatial Intelligence for Detection, Drift Forecasting, and Retrieval Optimization of ALDFG (Abandoned, Lost, and Discarded Fishing Gear)  
**Tagline:** Every Net Found. Every Life Saved.  
**Project Type:** Third-Year B.E. Computer Engineering Mini Project  
**Document Version:** 1.0  
**Status:** Initial requirements baseline  
**Related Document:** `docs/PRD_OceanRescue.md`  
**Existing Project Reference:** `OceanRescue_Project_Master_Document`  
**Primary AI Model:** YOLOv8-seg  
**Implementation Approach:** Modular, data-driven, and suitable for a student mini project.

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for OceanRescue. It defines the system's expected behaviour, user roles, data requirements, software components, interfaces, validation rules, security requirements, and acceptance criteria.

The SRS will serve as the reference for frontend and backend development, integration of the existing trained AI model, testing, and final project demonstration.

### 1.2 Project Overview

OceanRescue is an AI-powered marine conservation and geospatial decision-support platform designed to help identify potential abandoned, lost, and discarded fishing gear (ALDFG).

The system combines computer vision, geospatial information, environmental datasets, drift-forecasting methods, and risk-based prioritization to assist users in locating and planning the recovery of potential fishing-gear hazards.

The intended workflow is:

1. Upload or select an underwater image.
2. Detect potential fishing nets and rope/line objects using the trained AI model.
3. Display detections, confidence scores, and segmentation masks.
4. associate observations with available geographic coordinates.
5. Combine observations with available ocean-current, wind, wave, bathymetry, and marine-risk data.
6. Estimate possible drift or movement where sufficient input data is available.
7. Prioritize observations based on configurable risk criteria.
8. Display observations, risk levels, and proposed recovery routes on an interactive map.
9. Allow a human user to review observations and record recovery status or corrections.

The system is a decision-support tool. It does not autonomously retrieve fishing gear, and its recommendations require human review.

### 1.3 Scope

The MVP shall include:

- Image-based detection and segmentation of fishing nets and rope/line objects.
- Confidence scores and visual detection results.
- Observation records with geographic coordinates when available.
- An interactive GIS map.
- Display and integration of available environmental and geospatial datasets.
- A baseline drift-forecasting module using suitable input data.
- Configurable risk scoring and prioritization.
- Basic recovery-route planning using available geographic information.
- Storage and retrieval of observations.
- A dashboard for reviewing detections, risks, and recovery activities.
- Manual status updates and basic feedback recording.

The MVP will use existing datasets and the already trained model. Further model training is not a prerequisite for beginning application development.

### 1.4 Out of Scope

The following are not required for the initial MVP:

- Autonomous underwater robots or automatic physical retrieval.
- A production-ready live satellite surveillance system.
- Guaranteed detection of every type of ALDFG.
- Guaranteed accurate real-world drift predictions.
- A fully operational real-time ocean forecasting service.
- A deployed IoT sensor network.
- Automatic emergency alerts to government or marine authorities.
- Claims of field-tested environmental impact without supporting evidence.

These features may be considered future enhancements.

### 1.5 Definitions

| Term | Definition |
|---|---|
| ALDFG | Abandoned, Lost, and Discarded Fishing Gear |
| AI | Artificial Intelligence |
| YOLOv8-seg | Object detection and instance segmentation model used by the current project |
| Instance segmentation | Identifying an object and outlining its visible pixels |
| GIS | Geographic Information System |
| GeoAI | Use of AI with geographic or spatial information |
| GPS | Global Positioning System |
| PostGIS | PostgreSQL extension for storing and querying geographic data |
| Drift forecasting | Estimating possible future movement using available environmental and observation data |
| Risk score | A calculated value used to help prioritize observations |
| Recovery route | A proposed route to help a human team inspect or recover a target |
| MVP | Minimum Viable Product |

---

## 2. Overall System Description

### 2.1 Product Perspective

OceanRescue will be developed as a modular web application consisting of a React frontend, a Python backend, a trained computer-vision model, a geospatial database, and data-processing modules.

The components will communicate through documented API endpoints.

The system should remain modular so that the detection model, environmental datasets, forecasting method, or map interface can be improved independently.

### 2.2 Intended Users

**1. Administrator**

- Manage access to the application.
- Review system data and operational status.
- Manage supported configuration options where implemented.

**2. Researcher or Marine Analyst**

- Upload and review images.
- Examine detections and confidence scores.
- Inspect observation locations and environmental context.
- Review drift estimates and risk priorities.

**3. Recovery Team Member**

- View prioritized observations.
- Inspect proposed recovery routes.
- Update observation or recovery status.
- Record field feedback where available.

For the initial academic demonstration, these roles may be represented through a simple role-based interface. Full enterprise-level access management is not required.

### 2.3 Operating Environment

The system is intended to run in a modern web browser on desktop and mobile-sized screens.

**Development environment:**
- Windows development workstation.
- Python environment for the backend and AI model.
- Node.js environment for the frontend.
- Local PostgreSQL/PostGIS database or a compatible hosted instance.
- Existing model training artifacts produced through Google Colab.

GPU acceleration may be used for model training or inference when available. CPU inference may be supported for smaller demonstrations, subject to performance.

### 2.4 Design Constraints

- The trained model currently has two target classes: `fishing_net` and `rope_line`.
- The model file is stored in the project at `models/best.pt`.
- The current baseline was trained with YOLOv8-seg and stopped early at epoch 19; the best checkpoint was selected from epoch 11.
- The existing validation subset contains 110 images and is limited. Its metrics must not be presented as proof of field reliability.
- Model inference must use the class mapping stored with the model.
- Drift forecasting depends on the availability, temporal coverage, and quality of environmental data.
- Image coordinates and geographic coordinates must not be treated as interchangeable.
- All generated forecasts and route recommendations must be identified as estimates.
- Dataset licensing and attribution requirements must be respected.
- The project must reuse the existing datasets, reports, and model artifacts where suitable instead of unnecessarily rebuilding them.

---

## 3. Functional Requirements

Each requirement has an identifier that can be used during implementation and testing.

### 3.1 Image Input and Management

**FR-01 — Image Upload**

The system shall allow an authorized user to select an image for analysis.

**FR-02 — File Validation**

The backend shall validate the uploaded file's type, size, and readability before processing it.

**FR-03 — Invalid Upload Handling**

The system shall reject unsupported or corrupted files and display a meaningful error message.

**FR-04 — Image Preview**

The frontend shall display the selected image before or after analysis.

**FR-05 — Observation Metadata**

The system shall allow users to provide available observation metadata, including observation date, source, location, and notes.

**FR-06 — Optional Location**

The system shall allow an observation to be saved without geographic coordinates. Such an observation shall be marked as unlocated and excluded from map-based route calculations until suitable coordinates are supplied.

### 3.2 AI Detection and Segmentation

**FR-07 — Model Loading**

The backend shall load the existing trained model from the configured model path, initially `models/best.pt`.

**FR-08 — Supported Classes**

The model integration shall use these class labels:

- Class 0: `fishing_net`
- Class 1: `rope_line`

**FR-09 — Image Inference**

The backend shall process a valid image and return available detections from the trained model.

**FR-10 — Detection Results**

For each detection, the backend shall return the class label, confidence score, and bounding-box coordinates when provided by the model.

**FR-11 — Segmentation Results**

Where a valid segmentation mask is produced, the system shall make the mask or a rendered visualization available to the frontend.

**FR-12 — Confidence Filtering**

The system shall support a configurable inference confidence threshold. The initial demonstration may use a threshold of 0.25, subject to testing and configuration.

**FR-13 — No-Detection Result**

If no supported objects are detected, the system shall return a valid result indicating that no qualifying detections were found. It shall not treat this as a server failure.

**FR-14 — Inference Errors**

If model loading or inference fails, the backend shall log the technical error and return a safe, understandable error response.

**FR-15 — Detection Review**

The user shall be able to inspect the original image and its available detection overlays before using the result in subsequent decision-support steps.

**FR-16 — Model Limitations**

The interface and project documentation shall not represent model detections as confirmed ALDFG without appropriate review. A net or rope-like object detected in an image may require human verification.

### 3.3 Observation and Geospatial Management

**FR-17 — Observation Record**

The system shall store a persistent observation record containing an identifier, observation date, source, detection results, and available metadata.

**FR-18 — Geographic Coordinates**

The system shall store latitude and longitude when known, validate their allowed ranges, and associate the coordinates with the observation.

**FR-19 — Coordinate Reference**

The system shall document the coordinate reference system used for geographic storage and spatial calculations. WGS 84 latitude and longitude should be used for ordinary GPS observations unless a specific dataset requires a documented transformation.

**FR-20 — Interactive Map**

The frontend shall provide an interactive map displaying geolocated observations.

**FR-21 — Map Markers**

Each mapped observation shall provide access to its identifier, detection classes, confidence information, observation date, and current status where available.

**FR-22 — Map Filters**

The user shall be able to filter map observations by supported detection class, risk level, and status.

**FR-23 — Missing Coordinates**

The system shall not invent coordinates for an image. If a GPS position is unavailable, the user must supply a valid location or the observation must remain unlocated.

**FR-24 — Spatial Storage**

The backend shall support spatial queries and geographic geometry storage through PostgreSQL with PostGIS.

### 3.4 Environmental Data Integration

**FR-25 — Dataset Integration**

The backend shall provide a structured method for loading and querying available environmental and geospatial datasets.

Potential inputs include:

- Ocean-current data.
- Wind data.
- Wave data.
- Bathymetry.
- Sensitive marine-area information.
- Fishing-gear incident or observation records.
- Geographic coordinates and observation timestamps.

**FR-26 — Dataset Metadata**

The system shall retain or document the source, units, coordinate reference system, temporal coverage, and relevant limitations of each integrated dataset where this information is available.

**FR-27 — Environmental Data Matching**

The system shall associate an observation with environmental information only when a suitable spatial and temporal match can be established.

**FR-28 — Missing or Incompatible Data**

If environmental information is unavailable or incompatible, the system shall show that limitation and shall not silently substitute fabricated values.

**FR-29 — Data Freshness**

The system shall indicate the available observation or dataset time when it matters to interpretation. Historical data shall not be presented as live ocean conditions.

### 3.5 Drift Forecasting

**FR-30 — Forecasting Module**

The backend shall provide a separate module for estimating possible movement of geolocated observations.

**FR-31 — Baseline Method**

A simple baseline forecasting method, such as a physics-informed current-displacement calculation or a suitable machine-learning baseline, may be implemented according to the availability and quality of data.

**FR-32 — Input Requirements**

The forecasting module shall use available initial coordinates, observation time, forecast interval, and relevant environmental variables supported by the chosen method.

**FR-33 — Forecast Output**

When sufficient data are available, the system shall return estimated future positions and the forecast horizon. Where practical, it should also provide multiple time steps rather than only one endpoint.

**FR-34 — Forecast Status**

Each forecast shall indicate whether it is generated, unavailable, or failed, along with its time horizon and important input limitations.

**FR-35 — Uncertainty**

The system shall identify forecasts as estimates. It shall not display an unvalidated trajectory as a guaranteed path.

**FR-36 — No Unsupported Forecast**

If the necessary data are missing, the system shall explain why a forecast could not be generated rather than fabricate a trajectory.

**FR-37 — Model Selection**

More advanced temporal models, including LSTM or GRU, shall only be introduced if the available dataset supports their development and meaningful evaluation. They are not mandatory for the initial MVP.

### 3.6 Risk Assessment and Prioritization

**FR-38 — Risk Scoring**

The backend shall calculate a configurable risk score for eligible observations using documented criteria.

Potential criteria include:

- Detection category and available confidence information.
- Proximity to sensitive marine areas.
- Proximity to relevant infrastructure or ecological locations, where data are available.
- Estimated persistence or movement, if supported.
- Observation age and data quality.
- Other justified project-specific factors.

**FR-39 — Transparent Calculation**

The risk calculation shall document its inputs, weights or rules, and limitations.

**FR-40 — Risk Categories**

The system may translate the calculated score into configurable categories such as Low, Medium, and High.

**FR-41 — Missing Inputs**

If required risk inputs are unavailable, the system shall mark the assessment as incomplete or apply only a clearly documented partial calculation.

**FR-42 — Prioritization**

The dashboard shall allow eligible observations to be sorted by risk score or category.

**FR-43 — No Unsupported Claims**

The system shall not represent an illustrative risk score as a scientifically validated ecological impact measurement.

### 3.7 Recovery Route Planning

**FR-44 — Route Planning**

The system shall support generating a proposed route to selected, geolocated recovery targets using available geographic information and a documented routing method.

**FR-45 — Target Selection**

A user shall be able to select one or more eligible observations as route targets.

**FR-46 — Route Display**

Where route generation succeeds, the frontend shall display the proposed route and selected targets on the map.

**FR-47 — Route Limitations**

The system shall identify routes as planning suggestions. A route calculated from geographic distance alone shall not be represented as a safe or operationally validated marine navigation route.

**FR-48 — Missing or Invalid Targets**

The system shall reject or exclude targets without valid coordinates and explain the issue to the user.

**FR-49 — Route Optimization**

The system may prioritize targets using risk scores or travel-distance estimates. The method and assumptions shall be documented.

**FR-50 — No Feasible Route**

If a route cannot be calculated, the system shall provide an understandable status rather than displaying a fabricated route.

### 3.8 Dashboard and Reporting

**FR-51 — Dashboard Overview**

The frontend shall provide a dashboard summarizing available observations, detections, risk categories, and recovery statuses.

**FR-52 — Observation Details**

The user shall be able to open an observation and inspect its available image, detections, coordinates, environmental context, forecast, and risk assessment.

**FR-53 — Search and Filtering**

The system shall support searching or filtering stored observations using relevant available fields.

**FR-54 — Status Management**

The system shall support documented observation statuses such as New, Under Review, Prioritized, Recovery Planned, Recovered, and Dismissed.

**FR-55 — Manual Review**

An authorized user shall be able to correct or annotate an observation and record review feedback.

**FR-56 — Summary Export**

If included in the MVP implementation, the system shall allow a user to export a basic observation or analysis summary in a supported format such as CSV.

### 3.9 User Access and Administration

**FR-57 — Authentication**

If user accounts are enabled for the deployed MVP, users shall authenticate before accessing protected operations.

**FR-58 — Authorization**

The backend shall enforce permissions for protected operations independently of frontend visibility.

**FR-59 — Access Errors**

Unauthorized requests shall receive an appropriate response without exposing protected information.

**FR-60 — Audit-Relevant Actions**

The system should record important review and status changes with a timestamp and user identifier when authentication is implemented.

Full multi-tenant organization management is outside the initial MVP.

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-01:** The frontend shall show a loading indicator during image upload, inference, and other long-running operations.

**NFR-02:** Image processing shall not block unrelated API requests unnecessarily.

**NFR-03:** The backend shall handle invalid requests without crashing the application.

**NFR-04:** Performance shall be measured using representative test images and the actual development hardware. No unverified response-time guarantee shall be advertised.

**NFR-05:** Large datasets shall not be loaded in their entirety into the browser when filtered or paginated access is practical.

### 4.2 Reliability

**NFR-06:** A failed model inference shall not corrupt an existing observation record.

**NFR-07:** Database errors shall be handled with safe error responses and server-side diagnostic logs.

**NFR-08:** The system shall distinguish between a successful analysis with no detections and a failed analysis.

**NFR-09:** The backend shall validate required fields before storing observations or generating forecasts.

### 4.3 Security

**NFR-10:** Uploaded files shall be validated and handled safely.

**NFR-11:** Secrets, database credentials, and API keys shall be stored in environment variables or an appropriate secret-management mechanism, not hardcoded in source code.

**NFR-12:** Production deployments shall use HTTPS.

**NFR-13:** Database access shall use appropriate credentials and least-privilege permissions.

**NFR-14:** The backend shall validate and sanitize user-provided inputs.

**NFR-15:** Protected endpoints shall enforce authentication and authorization when accounts are enabled.

**NFR-16:** The application shall avoid exposing stack traces, credentials, internal file paths, or other sensitive implementation details in public error responses.

**NFR-17:** Uploaded files and stored records shall be subject to reasonable size limits and access controls.

### 4.4 Usability and Accessibility

**NFR-18:** The interface shall use clear labels and understandable terminology.

**NFR-19:** The application shall be responsive on desktop and mobile-sized screens.

**NFR-20:** Loading, success, empty, warning, and error states shall be visibly distinguishable.

**NFR-21:** Detection confidence, risk scores, and forecast limitations shall be explained clearly enough for a non-specialist project evaluator to understand.

**NFR-22:** Important map information shall also be available through a list or detail view where practical.

### 4.5 Maintainability

**NFR-23:** Frontend, backend, AI inference, geospatial processing, and forecasting logic shall be organized into separate modules.

**NFR-24:** API endpoints, environment configuration, database setup, and model-loading procedures shall be documented.

**NFR-25:** Dataset paths and model paths shall be configurable rather than scattered as hardcoded values throughout the codebase.

**NFR-26:** Dependencies shall be recorded in suitable dependency files.

### 4.6 Scalability

**NFR-27:** The system should support adding new detection classes or replacing the model without redesigning the entire application.

**NFR-28:** Environmental data integrations should be modular so that new datasets can be added independently.

**NFR-29:** Background processing may be introduced if inference or spatial operations become too slow for synchronous API requests.

### 4.7 Scientific Integrity

**NFR-30:** Model performance metrics shall be reported with their dataset, split, evaluation method, and relevant limitations.

**NFR-31:** Historical environmental data shall not be described as real-time data.

**NFR-32:** Forecasts and risk scores shall be identified as estimates unless independently validated.

**NFR-33:** The application shall not claim autonomous recovery or proven field effectiveness.

**NFR-34:** Dataset attribution and usage restrictions shall be respected.

---

## 5. Data Requirements

### 5.1 AI Model

**Current model path:** `models/best.pt`

**Model type:** YOLOv8 instance segmentation.

**Supported classes:**

| Class ID | Label |
|---|---|
| 0 | `fishing_net` |
| 1 | `rope_line` |

The model should be loaded once per backend process where practical, rather than reloaded for every image request.

The backend must confirm that the model file exists and that inference can be performed before reporting the model as ready.

### 5.2 Dataset Sources

The project has collected or organized datasets and files relating to:

- SeaClear marine imagery.
- TrashCan underwater imagery.
- Fishing-gear incidents.
- Ocean currents.
- Wind.
- Waves.
- Bathymetry.
- Sensitive marine areas.

Each source must be inspected before integration to determine its schema, coverage, coordinate reference system, units, licensing, and limitations.

The presence of a dataset in the project folder does not automatically mean that it is ready for production use.

### 5.3 Core Observation Record

Each observation should support the following fields where applicable:

| Field | Requirement |
|---|---|
| `id` | Unique observation identifier |
| `created_at` | Record creation timestamp |
| `observed_at` | Observation timestamp, if known |
| `source` | Image upload, imported record, or other documented source |
| `image_path` | Reference to the stored image, if retained |
| `latitude` | Optional validated latitude |
| `longitude` | Optional validated longitude |
| `detection_results` | Structured classes, confidence scores, and geometry |
| `risk_score` | Optional calculated score |
| `risk_level` | Optional risk category |
| `forecast_status` | Forecast availability and status |
| `recovery_status` | Current workflow status |
| `notes` | Optional user notes |

The exact database schema shall be finalized during architecture and database design.

### 5.4 Forecast Record

A forecast record should include:

- Observation identifier.
- Forecast creation time.
- Forecast horizon.
- Input data references or summary.
- Estimated coordinates or trajectory.
- Forecast method or model identifier.
- Data availability status.
- Known limitations or uncertainty information.

### 5.5 Data Quality

The system shall validate coordinate ranges, required timestamps, supported class labels, and required fields. Missing environmental data shall remain missing rather than being replaced with invented values.

---

## 6. External Interfaces

### 6.1 Frontend Interface

**Recommended stack:**
- React.js.
- JavaScript or TypeScript.
- Leaflet for interactive mapping.
- A responsive CSS framework or consistent component styling.

The frontend shall communicate with the backend through HTTP APIs and display analysis results returned by the server.

### 6.2 Backend Interface

**Recommended stack:**
- Python.
- FastAPI.
- Ultralytics YOLO for inference.
- OpenCV for image processing where needed.
- GeoPandas, Rasterio, and Shapely for suitable geospatial operations.

The backend shall expose documented endpoints for model health, image analysis, observations, environmental context, forecasts, risk assessments, and route planning as those modules are implemented.

### 6.3 Database Interface

**Recommended database:** PostgreSQL with PostGIS.

The database shall store observation records and spatial information. Large image files should be stored using a suitable file or object-storage approach, with references stored in the database.

### 6.4 Environmental Data Interface

Environmental datasets shall be accessed through controlled data-loading or querying modules. Dataset-specific transformations shall be documented and tested.

External live APIs are optional and shall only be integrated if an appropriate source, access method, and usage conditions are established.

---

## 7. High-Level Processing Workflow

1. **Input:** A user uploads an underwater image or selects an existing observation.
2. **Validation:** The backend checks the file and associated metadata.
3. **Detection:** The trained YOLOv8-seg model detects supported fishing-net and rope-line classes.
4. **Review:** The user inspects the original image, confidence scores, and segmentation overlays.
5. **Geolocation:** Available coordinates are attached to the observation; missing coordinates are not invented.
6. **Data fusion:** The system retrieves compatible environmental and spatial information where available.
7. **Forecasting:** The system estimates possible movement when sufficient inputs exist.
8. **Risk assessment:** The system calculates a documented risk score when the required inputs are available.
9. **Route planning:** The system generates a proposed route for eligible, geolocated targets using the implemented routing method.
10. **Visualization:** The frontend presents the observation, environmental context, forecasts, risk, and route on the dashboard.
11. **Human action:** The user reviews the recommendation and updates the observation or recovery status.

The system shall preserve clear status information between stages so that failure in one optional stage does not falsely imply that every stage succeeded.

---

## 8. API Requirements

The exact API paths and request/response schemas will be finalized during backend design. The following are proposed logical endpoints.

| Method | Proposed endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend availability |
| `GET` | `/api/model/status` | Report model loading status and supported classes |
| `POST` | `/api/detections/predict` | Upload and analyze an image |
| `POST` | `/api/observations` | Create an observation |
| `GET` | `/api/observations` | List observations with supported filters |
| `GET` | `/api/observations/{id}` | Retrieve observation details |
| `PATCH` | `/api/observations/{id}` | Update permitted observation fields or status |
| `GET` | `/api/environment` | Retrieve compatible environmental context |
| `POST` | `/api/forecasts` | Request a drift estimate |
| `POST` | `/api/risks/assess` | Calculate a risk assessment |
| `POST` | `/api/routes/plan` | Generate a proposed recovery route |

These paths are a proposed interface, not a claim that the endpoints already exist. They should be implemented only after the corresponding module and its data requirements are defined.

All endpoints shall return structured responses and appropriate HTTP status codes. Error responses shall explain the issue without exposing sensitive internals.

---

## 9. Error Handling and Edge Cases

The system shall handle at least the following cases:

1. Unsupported image format.
2. Corrupted or unreadable image.
3. Image exceeding the configured upload limit.
4. Missing trained-model file.
5. Model loading failure.
6. Image with no supported detections.
7. Low-confidence detections.
8. Missing geographic coordinates.
9. Invalid latitude or longitude.
10. Missing or incompatible environmental data.
11. Missing timestamps needed for a forecast.
12. Forecasting failure.
13. Risk calculation with incomplete inputs.
14. Route target without valid coordinates.
15. No feasible route found by the selected routing method.
16. Database unavailable.
17. Unauthorized access to a protected endpoint.
18. Invalid observation identifier.
19. Duplicate or repeated observation submission.
20. Frontend network timeout or backend error.

For each case, the system shall display an appropriate status, avoid fabricating results, and preserve any previously saved valid data.

---

## 10. Security and Privacy Requirements

- Only permitted file types and sizes shall be accepted.
- User-provided file names shall not be trusted as filesystem paths.
- Uploaded files shall be stored and accessed safely.
- Credentials shall be kept outside source code.
- Database queries shall use safe parameterization or an appropriate ORM.
- Protected operations shall validate the authenticated user's permissions.
- Error messages returned to users shall not expose internal stack traces or secrets.
- The system shall avoid collecting unnecessary personal information.
- Dataset and image attribution shall be maintained where required.
- Logs shall not unnecessarily contain sensitive credentials or file contents.

For a local academic demonstration, the level of security implementation may be proportionate to the environment, but the code should not introduce avoidable security vulnerabilities.

---

## 11. Acceptance Criteria

The MVP shall be considered functionally demonstrable when the following criteria have been tested.

### AC-01 — Application Startup

The frontend, backend, and configured database start using documented instructions.

### AC-02 — Model Availability

The backend loads `models/best.pt` successfully and reports the supported classes.

### AC-03 — Image Analysis

A valid test image can be submitted and the backend returns a structured inference result.

### AC-04 — Segmentation Visualization

Where the model produces a mask, the application can display a corresponding detection overlay.

### AC-05 — No-Detection Handling

An image with no qualifying detections returns a valid no-detection result.

### AC-06 — Observation Persistence

An observation with valid fields can be saved and retrieved from the database.

### AC-07 — Coordinate Validation

Invalid geographic coordinates are rejected.

### AC-08 — Map Visualization

A geolocated observation appears at the expected position on the map.

### AC-09 — Environmental Context

The application can display compatible available environmental information and identify unavailable data.

### AC-10 — Forecast Status

The forecasting module returns a documented estimate when inputs are sufficient and an understandable unavailable status when they are not.

### AC-11 — Risk Assessment

The system calculates a risk score according to documented rules and identifies incomplete assessments.

### AC-12 — Route Planning

A proposed route can be generated and displayed for eligible test targets using the implemented routing method.

### AC-13 — Recovery Status

A permitted user can update an observation's workflow status and retrieve the updated value.

### AC-14 — Error Handling

Invalid files, missing model files, unavailable dependencies, and invalid requests do not crash the entire application.

### AC-15 — Scientific Transparency

The interface and documentation distinguish detections from confirmed ALDFG, and estimates from validated real-world predictions.

### AC-16 — Documentation

The project contains setup instructions, environment configuration guidance, API documentation, and a description of the model and dataset limitations.

---

## 12. Testing Requirements

Testing shall cover:

**Unit testing**
- File validation.
- Coordinate validation.
- Class mapping.
- Risk-scoring logic.
- Forecast-input validation.
- Route-input validation.

**Integration testing**
- Frontend to backend API communication.
- Backend model loading and inference.
- Backend to database operations.
- Geospatial dataset loading.
- Observation-to-map integration.

**System testing**
- Complete image-to-observation workflow.
- Dashboard filtering.
- Forecast and risk display.
- Recovery-route display.
- Error handling and recovery.

**Model evaluation**
- Use a documented held-out validation dataset.
- Report detection and segmentation metrics separately.
- Inspect false positives and false negatives.
- Avoid claiming real-world accuracy based solely on a small validation subset.

**Usability testing**
- Verify that users can upload an image, review results, locate observations, and understand the limitations of the outputs.

---

## 13. Technology Stack

| Component | Selected or recommended technology |
|---|---|
| Frontend | React.js |
| Interactive map | Leaflet |
| Backend | Python with FastAPI |
| AI model | Existing trained YOLOv8-seg checkpoint |
| Image processing | OpenCV |
| Geospatial processing | GeoPandas, Rasterio, Shapely |
| Database | PostgreSQL with PostGIS |
| Forecasting | A data-supported baseline method; more advanced ML only if justified |
| GIS inspection | QGIS where useful |
| Model training | Google Colab with GPU support |
| Version control | Git |
| Development environment | Existing OceanRescue project folder in Antigravity |

The stack is intended to be practical for the current project. Additional services, queues, or complex infrastructure should only be introduced when a demonstrated requirement justifies them.

---

## 14. Deployment and Configuration

The application should support local development first.

The repository should include:

- Frontend dependency and run instructions.
- Backend dependency file.
- Environment-variable example file without real secrets.
- Database setup instructions.
- Configurable model path.
- API startup instructions.
- Basic health checks.
- Testing instructions.

The model shall remain at `models/best.pt` unless the project architecture is intentionally changed. The dataset directories, training notebooks, and existing project reports shall be preserved.

Any hosted deployment shall use appropriate secret management, HTTPS, and database access controls.

---

## 15. Assumptions, Dependencies, and Risks

### 15.1 Assumptions

- The existing trained model and its class mapping remain available.
- The current project datasets can be inspected and used according to their respective licences.
- At least some observations can be associated with geographic coordinates.
- Suitable environmental datasets can be read and matched to observations.
- A local academic demonstration is an acceptable initial deployment target.

### 15.2 Dependencies

- A compatible Python environment and model dependencies.
- A working React development environment.
- PostgreSQL/PostGIS for persistent spatial storage.
- Readable image and environmental datasets.
- Sufficient data quality for the chosen forecasting and routing methods.

### 15.3 Risks

**Model limitations:** The baseline model has preliminary performance and limited validation coverage. It may miss targets or produce false positives.

**Data limitations:** Datasets may differ in format, coordinate systems, coverage, units, and collection time.

**Forecasting limitations:** Available historical data may not be sufficient to validate accurate drift forecasts.

**Risk-scoring limitations:** Risk weights may be heuristic and should not be represented as validated ecological science.

**Routing limitations:** Geographic route calculations may not account for marine hazards, currents, tides, restricted areas, or operational constraints unless explicitly incorporated.

**Integration complexity:** The project contains several datasets and modules. Each should be integrated incrementally with validation rather than all at once.

### 15.4 Mitigation

- Keep the MVP focused.
- Reuse the existing model and dataset preparation.
- Document dataset provenance and assumptions.
- Validate each module independently.
- Clearly label estimates and unavailable data.
- Test the complete workflow using known sample inputs.
- Keep advanced forecasting and operational navigation outside the required MVP unless suitable evidence and data become available.

---

## 16. Requirements Traceability

| Project goal | Related requirements |
|---|---|
| Detect fishing nets and rope/line objects | FR-07 to FR-16 |
| Store and locate observations | FR-17 to FR-24 |
| Integrate environmental data | FR-25 to FR-29 |
| Estimate possible drift | FR-30 to FR-37 |
| Prioritize observations | FR-38 to FR-43 |
| Plan proposed recovery routes | FR-44 to FR-50 |
| Present results in a dashboard | FR-51 to FR-56 |
| Control access and record changes | FR-57 to FR-60 |
| Protect application and data | NFR-10 to NFR-17 |
| Maintain scientific integrity | NFR-30 to NFR-34 |

---

## 17. Final SRS Baseline

OceanRescue shall be implemented as a modular AI and geospatial decision-support web application. The first priority is to integrate the existing trained YOLOv8-seg model into a working backend, expose image-analysis results through an API, and present those results in a usable frontend.

The next stages are observation storage, GIS visualization, environmental-data integration, baseline drift estimation, risk prioritization, and proposed recovery-route planning.

Each stage must be tested before being presented as complete. Forecasts, risk scores, and route recommendations shall be described according to the evidence and capabilities actually implemented.

**Document status:** Initial SRS baseline for development. Requirements may be revised through documented project decisions as implementation and data validation progress.