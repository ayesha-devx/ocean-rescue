# OceanRescue — Development Plan

**Project Title:** AI-Driven Geospatial Intelligence for Detection, Drift Forecasting, and Retrieval Optimization of ALDFG  
**Project Name:** OceanRescue  
**Tagline:** Every Net Found. Every Life Saved.  
**Project Type:** Third-Year B.E. Computer Engineering Mini Project  
**Document Status:** Development Planning  
**Version:** 1.0

---

## 1. Project Overview

OceanRescue is an AI-driven marine conservation and decision-support platform designed to help identify abandoned, lost, and discarded fishing gear (ALDFG), commonly known as ghost gear.

The project connects AI-based fishing gear detection with geospatial localization, ocean-condition data, drift forecasting, risk prioritization, and recovery-route recommendations through an interactive GIS dashboard.

The development objective is to build a functional prototype that demonstrates the complete workflow using available datasets, simulated scenarios where necessary, and clearly identified experimental outputs.

OceanRescue will assist human recovery teams. It will not perform autonomous physical retrieval or claim validated real-world forecasting without appropriate evidence.

## 2. Development Objectives

The development process aims to:

1. Build an AI model capable of identifying supported fishing-gear categories in suitable images.
2. Display detection results with class labels, confidence scores, and bounding boxes or segmentation masks.
3. associate observations with geographic coordinates when reliable location information is available.
4. Integrate relevant ocean-condition and geospatial datasets.
5. Develop an experimental drift-forecasting module using available environmental and historical data.
6. Calculate provisional risk and recovery-priority scores.
7. Recommend candidate recovery locations and routes subject to operational constraints.
8. Develop an interactive dashboard for viewing detections, forecasts, risk levels, and recovery status.
9. Evaluate individual modules and the end-to-end workflow using measurable criteria.
10. Maintain data provenance, uncertainty information, and human oversight throughout the application.

## 3. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React.js | Dashboard and user interface |
| Map visualization | Leaflet or MapLibre | Geographic layers and interactive maps |
| Backend API | Python, FastAPI | Connect modules and expose application APIs |
| AI detection | YOLO-family model, Ultralytics | Fishing-gear detection and segmentation |
| Deep learning | PyTorch | Model training and inference |
| Image processing | OpenCV | Image preprocessing and visualization |
| Data processing | Pandas, NumPy | Data cleaning and transformation |
| Geospatial processing | GeoPandas, Shapely, Rasterio | Spatial analysis and coordinate operations |
| Forecasting | Scikit-learn initially; temporal models if justified | Experimental drift estimation |
| Route planning | A* or Dijkstra-based approach | Candidate route recommendation |
| Database | PostgreSQL with PostGIS, if required | Store spatial records and application data |
| GIS preparation | QGIS | Inspect and prepare geographic datasets |
| Model training | Google Colab GPU | Train and evaluate the detection model |
| Version control | Git and GitHub | Source control and collaboration |

The stack may be adjusted when implementation or compatibility testing identifies a genuine need.

## 4. Development Strategy

Development will follow an incremental approach. Each module must be tested independently before it is integrated into the complete workflow.

### Phase 1 — Requirements and Project Setup

**Tasks**
- Review the Project Requirements Document, Software Requirements Specification, and System Architecture Document.
- Finalize the MVP features and acceptance criteria.
- Organize the repository into frontend, backend, models, datasets, tests, and documentation.
- Establish Git version control and a clear configuration strategy.
- Record dataset licenses, source details, and processing decisions.

**Deliverables**
- Confirmed requirements and MVP scope.
- Organized repository.
- Development environment and setup instructions.

**Completion criteria:** The project structure is established, dependencies are documented, and the initial application can run locally.

### Phase 2 — Dataset Preparation and AI Detection

**Tasks**
- Review the available marine imagery datasets and their permitted uses.
- Verify class mappings, annotations, image quality, and label consistency.
- Separate training, validation, and test data appropriately.
- Train and evaluate the selected YOLO-family model.
- Generate predictions on unseen sample images.
- Record precision, recall, F1-score, mAP, and segmentation metrics where applicable.
- Save the trained weights and inference configuration.

**Deliverables**
- Documented dataset preparation pipeline.
- Trained model weights.
- Evaluation results and sample predictions.
- Reproducible inference script.

**Completion criteria:** The model loads successfully, returns predictions in the supported classes, and produces documented evaluation results.

**Current progress:** An initial YOLOv8 segmentation baseline has been trained and evaluated. Its performance is preliminary, so model improvement and representative validation remain part of development.

### Phase 3 — Geospatial Data Preparation

**Tasks**
- Identify available incident coordinates, ocean-current data, wind data, and other relevant environmental layers.
- Validate coordinate reference systems, timestamps, missing values, and spatial coverage.
- Standardize data into consistent formats.
- Associate detections with coordinates only when supported by GPS, image metadata, or a documented geolocation method.
- Preserve source information and location uncertainty.
- Prepare geographic layers for display on the dashboard.

**Deliverables**
- Cleaned geospatial datasets.
- Coordinate validation utilities.
- Prepared map layers and sample incident records.

**Completion criteria:** Valid geographic records can be loaded and displayed correctly without inventing precise locations for observations that lack reliable coordinates.

### Phase 4 — Backend and API Development

**Tasks**
- Set up the FastAPI application.
- Implement an image inference endpoint.
- Create endpoints for incident records, map features, forecasts, risk scores, and recovery recommendations as modules become available.
- Validate incoming requests and handle invalid files or missing fields.
- Standardize API responses and error messages.
- Connect PostgreSQL/PostGIS if persistent storage is needed for the MVP.

**Deliverables**
- Running backend service.
- API documentation.
- Validated request and response formats.

**Completion criteria:** The frontend or API testing tools can submit an image and retrieve structured detection results. Other endpoints return documented outputs or clearly indicate unavailable data.

### Phase 5 — Drift Forecasting

**Tasks**
- Establish a simple baseline before attempting complex temporal models.
- Identify the required historical observations and environmental inputs.
- Align records by location and time.
- Implement a suitable baseline forecasting method.
- Generate forecast points or trajectories for supported scenarios.
- Represent the forecast horizon, input assumptions, and uncertainty.
- Compare outputs against held-out observations or a defined baseline when suitable reference data exists.

**Deliverables**
- Experimental drift-forecasting module.
- Forecast API response format.
- Visualizable forecast trajectories and evaluation report.

**Completion criteria:** The module produces reproducible outputs for supported test scenarios and communicates its assumptions and limitations.

If sufficient temporal data is unavailable, the MVP will use a clearly labelled simulated or simplified demonstration instead of claiming validated ocean-drift prediction.

### Phase 6 — Risk Assessment and Priority Ranking

**Tasks**
- Define the factors used to calculate risk, such as gear type, estimated persistence, proximity to sensitive habitats, and relevant environmental context.
- Define a transparent scoring method and normalize its inputs.
- Handle missing values and uncertain observations.
- Rank detected or reported incidents by provisional priority.
- Display the factors contributing to each score.

**Deliverables**
- Risk-scoring module.
- Ranked incident list.
- Risk explanation and visualization components.

**Completion criteria:** Given the same inputs and configuration, the module produces consistent rankings and explains the factors behind each result.

Risk scores will be presented as decision-support estimates, not scientifically validated ecological probabilities unless independently validated.

### Phase 7 — Recovery Route Recommendation

**Tasks**
- Define candidate recovery locations.
- Represent the vessel's starting position and candidate destinations.
- Implement a basic route-planning algorithm.
- Consider available travel-distance information and configured operational constraints.
- Compare candidate routes and display the selected recommendation.
- Provide alternatives when a candidate is unsuitable.
- Require human review before a recovery plan is treated as operational.

**Deliverables**
- Route-planning module.
- Candidate recovery locations.
- Map-based route visualization and route comparison.

**Completion criteria:** The application generates a route for a defined test scenario, explains the selection criteria, and identifies limitations such as missing navigation or safety information.

Routes are recommendations for a prototype; they are not certified maritime navigation instructions.

### Phase 8 — Frontend and GIS Dashboard

**Tasks**
- Build the React application using the approved UI/UX prototype.
- Implement dashboard navigation and reusable components.
- Add image submission and detection-result views.
- Display incident locations and geographic layers on an interactive map.
- Visualize forecast trajectories and risk categories.
- Add recovery planning and mission-status views.
- Include loading, empty, error, and unavailable-data states.
- Ensure responsive layouts and basic accessibility.

**Deliverables**
- Integrated OceanRescue dashboard.
- Interactive GIS map.
- Detection, drift, risk, recovery-planning, and mission views.

**Completion criteria:** A user can navigate the dashboard, inspect available records, view model results, and understand which outputs are measured, estimated, or simulated.

### Phase 9 — Integration and Testing

**Tasks**
- Connect the frontend to the backend APIs.
- Test image submission and prediction rendering.
- Test geographic records and map layers.
- Verify forecast, risk, and route outputs against defined scenarios.
- Test invalid inputs, missing coordinates, unavailable data, and API failures.
- Check performance and resource requirements.
- Document defects and resolve critical issues.

**Deliverables**
- Integrated MVP.
- Test cases and results.
- Defect log and evaluation report.

**Completion criteria:** The main demonstration workflow works end to end, critical failures are resolved, and known limitations are documented.

### Phase 10 — Final Evaluation and Documentation

**Tasks**
- Evaluate AI performance on a representative held-out dataset.
- Record module-level and end-to-end test results.
- Document data sources, licenses, methods, assumptions, and limitations.
- Prepare installation instructions and a demonstration scenario.
- Update project documentation with actual implementation status.
- Prepare the final report, presentation, and viva explanation.

**Deliverables**
- Final project report.
- Technical documentation.
- Evaluation results.
- Demonstration-ready MVP.

**Completion criteria:** The project can be reproduced from the documented instructions, and every reported result is supported by actual testing.

## 5. MVP Scope

The Minimum Viable Product (MVP) will prioritize a working end-to-end demonstration.

### Included in the MVP

- Image-based detection of the supported fishing-gear classes.
- Confidence scores and detection visualization.
- Geographic display of records with available coordinates.
- Loading and visualization of prepared ocean and geographic data.
- A basic experimental drift-forecasting workflow.
- Transparent provisional risk scoring.
- Candidate recovery-location ranking and basic route recommendations.
- A React-based GIS dashboard.
- Backend APIs connecting the main modules.
- Basic testing, evaluation, and documentation.

### Deferred or Optional

- Continuous live satellite and ocean-sensor ingestion.
- Large-scale real-time monitoring.
- Automatic retraining from recovery feedback.
- Physical retrieval hardware and autonomous vessels.
- Production-grade maritime routing and navigation safety.
- Advanced LSTM/GRU forecasting unless data quantity and quality justify it.
- Large-scale deployment and production infrastructure.

These features may be considered after the core MVP is implemented and evaluated.

## 6. Dependencies and Implementation Order

The major dependencies are:

1. **Dataset preparation → AI detection:** Model training depends on usable images and reliable annotations.
2. **Detection → backend inference:** The trained model must have a stable inference interface.
3. **Geospatial preparation → mapping:** Geographic visualization depends on valid coordinates and map layers.
4. **Environmental data → drift forecasting:** Forecasting requires suitable inputs and a defined prediction target.
5. **Incident and environmental records → risk assessment:** Risk ranking depends on defined factors and available values.
6. **Candidate locations and constraints → route planning:** Route recommendations require valid starting points, destinations, and routing assumptions.
7. **Backend APIs → frontend integration:** The dashboard requires consistent response formats.
8. **Integrated MVP → final evaluation:** End-to-end testing can only be completed after the main modules are connected.

Frontend development and documentation can proceed in parallel with AI and backend work, provided that the API contracts and UI requirements are agreed upon.

## 7. Milestones

| Milestone | Expected outcome |
|---|---|
| M1 — Project Foundation | Requirements, repository, and environment ready |
| M2 — AI Baseline | Trained model, predictions, and preliminary evaluation |
| M3 — Geospatial Foundation | Validated spatial records and map layers |
| M4 — Core Backend | Inference and data APIs available |
| M5 — Intelligence Modules | Forecasting, risk scoring, and route planning prototypes |
| M6 — Dashboard Integration | Main React and GIS screens connected to the backend |
| M7 — MVP Validation | End-to-end tests and documented limitations |
| M8 — Final Submission | Report, presentation, setup guide, and demonstration |

The exact calendar dates will be assigned according to the academic submission deadline and the progress of prerequisite tasks.

## 8. Definition of Done

A feature will be considered complete when:

- Its purpose and input/output requirements are documented.
- The implementation runs in the intended development environment.
- Valid and invalid inputs have been tested.
- Errors and missing-data conditions are handled appropriately.
- The feature integrates with the relevant modules.
- Results can be reproduced for documented test cases.
- Limitations and assumptions are recorded.
- Relevant code and documentation are committed to version control.

A visually completed UI screen alone does not mean its underlying feature is implemented.

## 9. Risks and Mitigation

| Risk | Mitigation |
|---|---|
| Limited or imbalanced ALDFG imagery | Audit class coverage, improve annotations, and document dataset limitations |
| Weak model generalization | Use representative held-out evaluation data and avoid unsupported accuracy claims |
| Missing or inaccurate coordinates | Preserve location uncertainty and avoid fabricated geolocation |
| Incomplete ocean data | Use documented demonstration scenarios and clearly label simulated inputs |
| Unreliable drift forecasts | Start with a baseline and evaluate against appropriate reference data |
| Complex integration | Develop modular APIs and test each component independently |
| Excessive scope | Prioritize MVP features and defer advanced capabilities |
| Misleading risk or route outputs | Explain scoring factors, assumptions, and human-review requirements |

## 10. Final Expected Outcome

The expected outcome is a working OceanRescue prototype that demonstrates how AI-based fishing-gear detection can be connected to geospatial information, experimental drift forecasting, provisional risk prioritization, and recovery-route recommendations.

The final application should present these outputs through an interactive GIS dashboard that supports human decision-making.

Project success will be assessed through functional completeness, reproducible testing, transparent evaluation, appropriate data handling, and a clear explanation of the system's limitations—not through unverified claims of field effectiveness.

---

**Document End — OceanRescue Development Plan**