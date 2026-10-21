# OceanRescue — Product Requirements Document (PRD)

**Tagline:** Every Net Found. Every Life Saved.

**Official Project Title:** AI-Driven Geospatial Intelligence for Detection, Drift Forecasting, and Retrieval Optimization of ALDFG (Abandoned, Lost, and Discarded Fishing Gear)

**Project Type:** Third-Year B.E. Computer Engineering Mini Project

**Document Version:** 1.0

**Status:** Initial requirements baseline

---

## 1. Project Overview

OceanRescue is an AI-driven marine conservation and geospatial decision-support platform designed to help identify potential abandoned, lost, and discarded fishing gear (ALDFG), associate observations with geographic information, estimate probable drift, prioritize recovery targets, and recommend recovery routes.

The system integrates computer vision, geospatial information, environmental datasets, forecasting, risk assessment, and route planning in one interactive dashboard.

The project aims to demonstrate an end-to-end workflow using available research datasets and clearly identified prototype scenarios. It is not an autonomous physical recovery system.

### Core workflow

**Detect → Locate → Integrate → Predict → Prioritize → Optimize → Support Recovery**

## 2. Problem Statement

Abandoned, lost, and discarded fishing gear can continue trapping marine organisms, damaging underwater habitats, and creating navigation hazards. Locating such gear is difficult because underwater visibility is limited, equipment can become submerged or entangled, and currents, wind, and waves can move floating gear away from its last-known position.

Manual surveys, divers, boats, and sonar-based searches can require considerable time and resources. Information about visual detections, geographic locations, ocean conditions, and recovery operations may also be fragmented across different sources.

OceanRescue addresses this problem by connecting AI-based detection with geospatial information and prototype forecasting and recovery-planning tools in a single decision-support platform.

## 3. Product Vision

To develop a practical prototype that transforms available marine observations and environmental information into mapped, prioritized, and actionable recovery-planning information for marine conservation and recovery teams.

## 4. Goals and Objectives

1. Detect fishing nets and ropes/lines in suitable underwater images using the existing trained AI model.
2. Display detection classes, confidence scores, bounding boxes, and segmentation masks where available.
3. Associate observations with coordinates and timestamps when reliable location metadata is available.
4. Integrate available ocean-current, wind, wave, bathymetry, and other relevant environmental datasets.
5. Demonstrate probable drift forecasting using a documented model or clearly labelled simulation.
6. Calculate transparent prototype risk scores and prioritize candidate recovery targets.
7. Recommend a recovery sequence or route using target locations, priorities, and stated assumptions.
8. Present detections, mapped observations, forecast paths, risk levels, and routes in a GIS dashboard.
9. Evaluate the system with documented test cases and report limitations honestly.

## 5. Target Users and Stakeholders

### Primary users
- Marine conservation and cleanup teams
- Fishing communities and fishermen reporting lost gear
- Researchers studying marine debris and ghost gear
- Recovery teams planning search operations

### Secondary stakeholders
- Fisheries departments and marine authorities
- Environmental NGOs
- Maritime safety organizations
- Academic evaluators and project supervisors

These are intended user groups, not confirmed deployment partners.

## 6. Proposed Solution

OceanRescue will provide a unified interface for uploading or reviewing marine observations, detecting candidate fishing gear, displaying available geographic information, examining forecast scenarios, reviewing recovery priorities, and planning routes.

The system will distinguish between:
- **Observed information:** data directly present in images, reports, or datasets.
- **Model predictions:** AI detections and forecasting outputs.
- **Prototype estimates:** simulated coordinates, risk scores, drift paths, or routes used for demonstrations.

The platform must not present simulated or estimated values as verified real-world observations.

## 7. Core Features and Requirements

### 7.1 AI-Based Gear Detection

The existing YOLOv8 segmentation model is located at `models/best.pt`.

Current supported classes:
- `fishing_net`
- `rope_line`

The detection module shall:
- Accept supported image uploads.
- Validate file type and size.
- Run inference using the trained model.
- Return predicted classes and confidence scores.
- Provide bounding boxes and segmentation polygons when available.
- Display an annotated image.
- Handle images with no detections and invalid inputs gracefully.

**Important limitation:** The model is a preliminary baseline with modest validation performance. It does not currently detect every type of fishing gear. A detection does not prove that an object is abandoned fishing gear.

### 7.2 Geospatial Localization

The system shall:
- Store or display latitude, longitude, observation time, source, and detection details when available.
- Show georeferenced observations on an interactive map.
- Allow authorized users to add a reported observation with its last-known location.
- Distinguish verified coordinates from user-reported, estimated, or simulated coordinates.

An image alone does not provide GPS coordinates unless associated location metadata is available. The system must not invent coordinates for AI detections.

### 7.3 Ocean Data Integration

The system shall support integration of available environmental datasets, including:
- Ocean currents
- Wind
- Waves and tides, when available
- Bathymetry
- Weather information, when available

The system shall validate data availability, timestamps, coordinate reference systems, units, and missing values.

For the initial prototype, existing local datasets may be used. Live data integration is optional unless a reliable source and practical implementation path are established.

### 7.4 Drift Forecasting

The system shall demonstrate how environmental information and an observation's last-known position can be used to estimate probable future movement.

The forecasting module shall:
- Accept an initial position and available environmental inputs.
- Generate forecast positions or a trajectory for supported time horizons.
- Display forecast paths on the map.
- Represent uncertainty or clearly explain the limitations of the forecast.
- Record the inputs and method used for each forecast.

Forecasts may use a suitable baseline model or a documented simulation, depending on data quality and availability.

A simulated drift path must be labelled **demonstration only**. Real-world accuracy must not be claimed without appropriate validation data.

### 7.5 Risk Assessment and Prioritization

The system shall calculate a transparent prototype priority score using defined factors, which may include:
- Potential ecological impact
- Proximity to sensitive marine areas, when supported by spatial data
- Gear category and observation confidence
- Potential navigation or operational concerns, where reliable data exists
- Recovery feasibility and available resources

The system shall display a priority level such as Low, Medium, High, or Critical, with the factors contributing to the result.

The initial version may use a documented rule-based scoring system. The score must not be presented as a scientifically validated ecological risk measurement.

### 7.6 Recovery Route Optimization

The system shall recommend a recovery visit sequence or route using available target coordinates, priorities, a starting point, and stated constraints.

The route-planning module shall:
- Accept a starting position and selected targets.
- Use a documented route-planning method appropriate to the prototype.
- Display the recommended sequence on the map.
- Explain the assumptions used.
- Handle missing coordinates and infeasible routes.

The first version may use sample vessel positions and simulated targets. It must clearly state that an optimized map route is not a verified safe maritime navigation route.

### 7.7 GIS Dashboard

The dashboard shall provide:
- Project overview and key counts
- Image upload and AI detection results
- Interactive map of available observations
- Detection details and confidence scores
- Environmental data views where supported
- Drift forecast visualization
- Risk and priority information
- Recovery route recommendations
- Recovery status and observation history

The interface should be responsive, accessible, understandable, and suitable for academic demonstration.

### 7.8 Recovery Feedback

Users should be able to record a target's status, such as:
- Reported
- Under review
- Planned for recovery
- Recovered
- Not found
- Closed

The system should allow actual outcomes to be compared with prior estimates when sufficient information exists. A recovery status is a user-recorded update, not automatic proof of physical recovery.

## 8. Minimum Viable Product (MVP)

The first complete demonstrable version will prioritize:

1. A working backend that loads `models/best.pt`.
2. An image-upload interface and functional detection API.
3. A React dashboard displaying annotated images and detections.
4. An interactive GIS map with correctly sourced or clearly labelled demonstration coordinates.
5. Integration of at least one available environmental dataset where practical.
6. A basic drift demonstration using documented assumptions.
7. Transparent risk scoring and target prioritization.
8. A basic recovery-route recommendation.
9. Clear status labels, error handling, and project documentation.
10. A documented evaluation using defined test images and scenarios.

Features must be implemented and tested incrementally. The AI detection API should be verified before frontend integration.

## 9. Out of Scope

The initial MVP does not promise:
- Autonomous physical recovery of fishing gear
- Fully autonomous underwater vehicles or robots
- A production-grade maritime navigation system
- Guaranteed real-time detection from satellites or underwater sensors
- Reliable detection of all gear types or all underwater conditions
- Scientifically validated real-world drift forecasts without supporting data
- Operational decisions without human review
- Unverified claims of environmental impact reduction
- Mandatory user accounts, complex permissions, or payment systems unless later justified

## 10. User Stories

- As a researcher, I want to upload an underwater image so that I can inspect potential fishing-net and rope detections.
- As a recovery team member, I want to view observations on a map so that I can understand their reported locations.
- As a researcher, I want to see confidence scores and annotated images so that I can review AI predictions.
- As a planner, I want to view a probable drift scenario so that I can understand possible future movement.
- As a conservation team member, I want targets ranked by transparent risk factors so that I can review which targets may need attention first.
- As a recovery planner, I want a suggested route through selected targets so that I can compare possible visit sequences.
- As a user, I want to update recovery status so that the dashboard reflects the latest reported outcome.
- As a project evaluator, I want documented metrics and limitations so that I can assess the prototype fairly.

## 11. Functional Requirements

| ID | Requirement | Acceptance condition |
|---|---|---|
| FR-01 | Load the trained model | The backend reports successful loading or a clear error. |
| FR-02 | Accept image uploads | Valid supported images are accepted; invalid files are rejected safely. |
| FR-03 | Run detection | The API returns class, confidence, and available geometry. |
| FR-04 | Display results | The frontend shows detections and an annotated image. |
| FR-05 | Manage observations | A valid observation can be saved with its source and available metadata. |
| FR-06 | Map locations | Valid coordinates appear at the correct map position. |
| FR-07 | Integrate ocean data | Supported datasets are parsed and missing or invalid values are handled. |
| FR-08 | Generate drift estimates | Forecast output includes its method, time horizon, and limitations. |
| FR-09 | Prioritize targets | A documented score and its contributing factors are displayed. |
| FR-10 | Recommend routes | The system displays a route through valid selected target locations. |
| FR-11 | Update status | A status change is saved and reflected in the interface. |
| FR-12 | Handle failures | Errors are understandable and do not crash the whole application. |

## 12. Non-Functional Requirements

### Performance
- The interface should provide visible loading feedback for image inference and map operations.
- The API should avoid loading the model for every request.
- Response time should be measured in the development environment and reported rather than assumed.

### Reliability
- Missing datasets, invalid coordinates, empty detections, and inference failures must be handled gracefully.
- Forecasts and routes must not be generated from invalid input without an explicit fallback.

### Security
- Validate uploaded file types and sizes.
- Avoid executing or trusting uploaded files.
- Keep secrets out of source control.
- Configure CORS for the intended frontend origin.
- Provide useful error messages without exposing internal secrets or stack traces to end users.

### Usability and accessibility
- Use clear labels, consistent navigation, readable typography, and responsive layouts.
- Use more than color alone to distinguish priority levels.
- Include loading, empty, success, and error states.

### Maintainability
- Keep detection, mapping, forecasting, risk scoring, and route planning as separable modules.
- Document configuration, dependencies, data sources, and setup.
- Preserve original datasets and training artifacts.

## 13. Data Requirements

The project may use:
- SeaClear marine debris dataset
- TrashCan 1.0 marine debris dataset, subject to its applicable permissions and terms
- Existing project ocean-current, wind, wave, bathymetry, and sensitive-marine-area datasets
- User-provided observation reports and sample scenarios

### Data handling rules
- Record data source and relevant licensing or usage restrictions.
- Maintain clear training/validation separation.
- Do not assume every marine-debris annotation is ALDFG.
- Track coordinate reference systems, units, and timestamps.
- Identify missing, stale, simulated, and uncertain data.
- Avoid duplicating or modifying the original research datasets unnecessarily.

## 14. Recommended Technical Approach

### Frontend
- React.js
- Leaflet for interactive maps
- Responsive component-based dashboard

### Backend
- Python
- FastAPI
- Ultralytics YOLO and the existing `models/best.pt`
- OpenCV and supporting geospatial Python libraries as required

### Data and storage
- Begin with a simple, documented storage approach for the prototype.
- Use PostgreSQL with PostGIS if persistent geospatial records and spatial queries are needed.
- Keep original datasets in their existing project folders.

### Geospatial and forecasting tools
- GeoPandas, Shapely, and Rasterio as appropriate
- A documented baseline forecasting method suitable for the available data
- A suitable route-planning algorithm with explicit assumptions

Technology choices should remain practical for a student mini project. Do not introduce unnecessary infrastructure before the core workflow works.

## 15. Success Metrics and Evaluation

The project will be evaluated across multiple modules.

### AI detection
- Precision, recall, and mAP for bounding boxes
- Segmentation precision, recall, and mAP
- Per-class results for `fishing_net` and `rope_line`
- Qualitative review of false positives and missed detections

The current model has preliminary, modest validation scores on a 110-image validation subset. These results are not sufficient to claim field-ready detection. Evaluation should be improved using a representative validation set, including appropriate negative/background images.

### Geospatial module
- Correct placement of known test coordinates
- Correct handling of coordinate reference systems and missing locations

### Drift forecasting
- Compare predictions with ground-truth trajectories when suitable data is available
- Otherwise, evaluate only the software workflow and label the output as a simulation

### Risk assessment
- Verify reproducibility of scores from the same inputs
- Test missing factors and boundary cases
- Document the scoring formula

### Route planning
- Verify that all selected targets are represented correctly
- Compare the recommended route with a simple baseline on defined scenarios
- Report distance or cost only when calculated from stated assumptions

### End-to-end system
- Successful upload, inference, and display
- Correct handling of empty detections and invalid files
- Correct display of sourced or explicitly simulated geospatial information
- Clear distinction between predictions, reports, and verified outcomes

No numerical success threshold should be claimed until the team defines and measures it.

## 16. Assumptions and Constraints

- The existing trained model and local project assets are available.
- The current model supports only two classes: fishing nets and ropes/lines.
- The project is a prototype built within student-project time and resource constraints.
- Dataset availability and licensing may limit which features can be evaluated.
- Real-time ocean data and field validation may not be available.
- Geographic accuracy depends on the quality and provenance of input coordinates.
- Forecast quality depends on the suitability of the data and method.

## 17. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Low AI detection performance | Evaluate representative data, inspect errors, and improve the model only when justified. |
| Marine debris confused with ALDFG | Label outputs as potential gear and require contextual review. |
| Missing GPS metadata | Never invent coordinates; request a report or use labelled demo data. |
| Inadequate drift data | Use a documented baseline or simulation and state limitations. |
| Inconsistent environmental data | Validate timestamps, units, coordinate systems, and missing values. |
| Misleading risk scores | Show factors and describe scores as prototype estimates. |
| Unsafe route interpretation | Label routes as planning recommendations, not certified navigation instructions. |
| Excessive project complexity | Complete and test the MVP in stages before adding advanced features. |

## 18. Acceptance Criteria

The MVP is considered demonstrable when:

1. The backend loads the existing model without retraining it.
2. A supported image can be uploaded and processed.
3. Results include available class names, confidence scores, geometry, and an annotated image.
4. Empty detections and invalid inputs are handled correctly.
5. The dashboard displays detections and available geospatial observations.
6. Any simulated coordinates, drift paths, scores, and routes are explicitly identified as such.
7. The prototype can demonstrate a documented forecasting, prioritization, and route-planning scenario.
8. The data sources, model evaluation, assumptions, and limitations are documented.
9. Existing datasets and training files remain intact.
10. A reviewer can follow the README to set up and run the application.

## 19. Development Milestones

1. **Project documentation:** Finalize the PRD, requirements, and architecture.
2. **AI backend:** Load and test the existing model through an API.
3. **Frontend foundation:** Build the dashboard and image-upload workflow.
4. **GIS integration:** Display observations with valid coordinates.
5. **Environmental data:** Integrate suitable existing ocean datasets.
6. **Forecasting:** Implement and test a baseline drift scenario.
7. **Risk and routing:** Add transparent prioritization and route recommendations.
8. **Integration and testing:** Validate the end-to-end workflow and document limitations.
9. **Final demonstration:** Prepare a reproducible scenario, evaluation report, and project presentation.

## 20. Future Enhancements

- Expand gear categories when suitable labelled data becomes available.
- Improve segmentation and validate against larger, representative datasets.
- Integrate additional underwater imagery or sonar where feasible.
- Develop probabilistic drift forecasts and uncertainty visualization.
- Improve hotspot analysis and environmental-risk modelling.
- Integrate authorized live data feeds.
- Explore hardware-assisted data collection and field validation.
- Evaluate long-term recovery outcomes and operational performance.

## 21. Final Product Definition

OceanRescue is an AI-driven geospatial decision-support prototype that connects visual detection of potential fishing nets and ropes with geographic observations, environmental information, drift scenarios, risk prioritization, and recovery-route recommendations.

Its primary contribution is the integration of these components into one documented workflow. The prototype supports human decision-making and does not claim autonomous retrieval or unverified real-world performance.

**Final principle:** Every result must be traceable to an observation, a documented model prediction, or an explicitly labelled prototype assumption.