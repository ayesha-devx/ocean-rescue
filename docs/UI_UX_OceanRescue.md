# OceanRescue — UI/UX Design Document

**Project Title:** AI-Driven Geospatial Intelligence for Detection, Drift Forecasting, and Retrieval Optimization of ALDFG  
**Project Name:** OceanRescue  
**Tagline:** Every Net Found. Every Life Saved.  
**Document Type:** User Interface and User Experience (UI/UX) Design Specification  
**Project Stage:** Third-Year Computer Engineering Mini-Project  
**Version:** 1.0

---

## 1. Introduction

OceanRescue is an AI-driven geospatial decision-support platform designed to support the detection, monitoring, drift forecasting, risk assessment, and recovery planning of Abandoned, Lost, and Discarded Fishing Gear (ALDFG).

The user interface provides a centralized marine intelligence dashboard through which users can examine detected fishing nets and ropes, visualize their geographic locations, review environmental conditions, understand potential ecological risks, and plan recovery operations.

The UI/UX design focuses on presenting complex AI, geographic, and environmental information in an organized, accessible, and actionable manner.

The interface is designed as a professional marine operations command center with a dark ocean-inspired theme, electric cyan highlights, interactive map visualizations, technical data panels, and clear operational status indicators.

## 2. UI/UX Design Objectives

The primary objectives of the OceanRescue interface are:

- Provide a centralized dashboard for monitoring potential ALDFG observations.
- Present AI-generated detections of fishing nets and rope/line objects.
- Display geographic locations, drift estimates, and environmental overlays.
- Communicate ecological risk levels through understandable visual indicators.
- Support prioritization of observations for further investigation.
- Provide a structured workflow for human-reviewed recovery planning.
- Display model performance, environmental data availability, and operational records.
- Make technical information understandable through consistent layouts and visual hierarchy.
- Maintain consistency across all screens.
- Clearly distinguish simulated information from verified data and live service outputs.

## 3. Target Users

### 3.1 Marine Researchers

Researchers can examine potential fishing-gear detections, geographic observations, drift estimates, and environmental conditions.

### 3.2 Marine Conservation Teams

Conservation teams can review potentially hazardous observations, assess ecological vulnerability, and prioritize locations for further investigation.

### 3.3 Recovery and Field Operations Teams

Authorized personnel can examine proposed recovery locations, review route information, and prepare recovery plans subject to human approval and operational constraints.

### 3.4 Project Administrators

Administrators can inspect model configuration, environmental data sources, system status, and application settings.

## 4. Design Principles

### 4.1 Information Hierarchy

Important information such as critical-risk observations, detection counts, model confidence, and mission status must be visually prominent.

Supporting information such as telemetry, environmental variables, and audit records should remain accessible without overwhelming the primary content.

### 4.2 Consistency

All screens must use consistent navigation, typography, colors, card layouts, buttons, spacing, and status indicators.

### 4.3 Clarity

Technical data should use descriptive labels, meaningful units, timestamps, and tooltips where necessary.

### 4.4 Human Oversight

AI-generated detections, risk scores, drift estimates, and recovery recommendations must be presented as decision-support outputs. Users must be able to review, confirm, reject, or flag observations where appropriate.

### 4.5 Scientific Transparency

The interface must communicate uncertainty and data provenance. Simulated environmental values, demonstration detections, and experimental forecasts must not be presented as validated real-world results.

### 4.6 Responsive Design

The interface should adapt to desktop, laptop, tablet, and smaller screens while preserving access to important information and actions.

## 5. Visual Design System

### 5.1 Color Palette

OceanRescue uses a dark marine-inspired interface.

| UI Element | Suggested Color | Purpose |
|---|---|---|
| Main background | `#061521` | Primary application background |
| Sidebar background | `#091C29` | Navigation panel |
| Card background | `#0C2231` | Dashboard cards and content panels |
| Electric cyan | `#00D9F5` | Primary actions and active elements |
| Bioluminescent teal | `#00E5B5` | Positive states and selected highlights |
| Primary text | `#E5F7FF` | Main headings and important values |
| Secondary text | `#91ADBC` | Supporting labels and descriptions |
| Critical red | `#FF5364` | Critical risk and urgent alerts |
| Warning amber | `#FFB547` | Warnings and elevated risk |
| Neutral blue | `#4EA8DE` | Informational status |

Colors must be used consistently. Risk categories must also include text labels or icons so that users do not have to rely on color alone.

### 5.2 Typography

Use a modern, readable sans-serif typeface for headings, body text, forms, and navigation.

Monospaced typography may be used selectively for coordinates, timestamps, telemetry, observation IDs, and technical identifiers.

The typography hierarchy should include:

- Page titles for primary screen identification.
- Section headings for grouping related information.
- Body text for descriptions and instructions.
- Compact labels for metrics and metadata.
- Monospaced values for technical data.

### 5.3 Layout and Spacing

The application should use a consistent spacing system based on multiples of four or eight pixels.

Cards should have consistent padding, subtle borders, and restrained corner rounding. Avoid excessive glow effects, unnecessary decoration, or crowded text.

### 5.4 Icons and Status Indicators

Use recognizable icons for navigation, maps, AI detection, forecasts, risk assessment, recovery planning, reports, data sources, and settings.

Status indicators must use clear text, such as:

- Connected
- Demo Data
- Unavailable
- Processing
- Pending Review
- Confirmed
- Rejected
- Critical
- High Risk

## 6. Application Layout

### 6.1 Main Navigation

The primary navigation sidebar provides access to the following modules:

1. Dashboard
2. Ocean Map
3. AI Detection
4. Detection Details
5. Drift Forecast
6. Risk Assessment
7. Recovery Planning
8. Mission Details
9. Reports and Analytics
10. Data Sources
11. Settings

The sidebar should maintain the same structure across all screens, highlight the active module, and display appropriate navigation icons.

### 6.2 Application Header

The header should include:

- OceanRescue logo and project identity.
- Current workspace or operational context.
- Search field for observation or mission identifiers.
- Data refresh timestamp.
- Coordinate reference indicator.
- Notification access.
- User profile or role information.

Live connectivity indicators must reflect actual application status. If a service is not integrated, its status should be identified as simulated, unavailable, or not connected.

### 6.3 Main Content Area

The main content area should adapt to each module. It may contain metric cards, geographic visualizations, image previews, tables, charts, forms, or operational details.

### 6.4 Contextual Information Panels

Where appropriate, contextual panels should display selected observation details, model confidence, environmental conditions, risk factors, and available actions without requiring the user to leave the current screen.

## 7. Screen-by-Screen UI/UX Specification

### Screen 1: Dashboard

**Purpose:** Provide an overview of the OceanRescue system and current observation status.

**Main components:**

- Total detections.
- High-risk observations.
- Active drift forecasts.
- Recovery priorities.
- Interactive geographic overview.
- Recent or high-priority observations.
- AI detection distribution.
- Environmental conditions.
- Operational audit log.

**User interactions:**

- Open an observation to view its details.
- Navigate to the Ocean Map.
- Access AI Detection.
- Open risk assessment or recovery planning.
- Review recent operational events.

**Expected outcome:** Users can quickly understand the current state of the application and identify observations that may require attention.

### Screen 2: Ocean Map

**Purpose:** Display geographic observations and relevant marine environmental information.

**Main components:**

- Interactive map.
- Observation markers.
- Drift-vector overlays.
- Geographic risk boundaries.
- Map layer controls.
- Coordinate and distance information.
- Selected observation panel.
- Environmental overlays, when data is available.

**User interactions:**

- Zoom and pan the map.
- Select an observation marker.
- Toggle available geographic layers.
- Inspect coordinates and associated details.
- Navigate to an observation's details.

**Expected outcome:** Users can explore the geographic distribution of potential fishing-gear observations.

**Implementation note:** Use Leaflet or MapLibre with an appropriate map data source. Environmental overlays must be displayed only when corresponding data is available.

### Screen 3: AI Detection

**Purpose:** Provide an interface for examining image-based AI detection results.

**Main components:**

- Image upload or image selection area.
- Image preview.
- AI detection bounding boxes or segmentation masks.
- Class labels for `fishing_net` and `rope_line`.
- Model confidence scores.
- Inference summary.
- Detection review controls.
- Recent image or survey sequence thumbnails.
- Field notes and review actions.

**User interactions:**

- Select an image for inference.
- Run detection through the connected backend.
- Inspect predicted objects.
- Review confidence scores.
- Confirm, reject, or flag a prediction.
- Record review notes.

**Expected outcome:** Users can inspect the model's predictions and record their review decisions.

**Implementation note:** The interface must display the actual response from the trained YOLOv8 segmentation model. If inference is unavailable, use clearly labeled sample results.

### Screen 4: Detection Details

**Purpose:** Present detailed information about a selected detection.

**Main components:**

- Observation ID and timestamp.
- Original image and detection overlay.
- Predicted class.
- Model confidence.
- Bounding-box or segmentation information.
- Geographic coordinates, when available.
- Model provenance and version.
- Associated environmental context.
- Temporal sequence previews, when available.
- Review status and audit trail.
- GIS location preview.

**User interactions:**

- Confirm a detection.
- Reject a detection.
- Flag an anomaly.
- Add field notes.
- Open the associated map location.
- Forward a reviewed observation to risk assessment or recovery planning.

**Expected outcome:** Users can examine the evidence associated with an individual prediction before using it in downstream workflows.

### Screen 5: Drift Forecast

**Purpose:** Visualize estimated movement of selected observations under available environmental conditions.

**Main components:**

- Current observation location.
- Forecast trajectory.
- Predicted positions at selected future intervals.
- Environmental input summary.
- Wind and current information.
- Forecast time horizon.
- Uncertainty or confidence visualization.
- Forecast generation status.

**User interactions:**

- Select an observation.
- Choose a forecast duration.
- Inspect estimated future positions.
- Toggle available environmental overlays.
- Compare forecast intervals.
- Open associated risk information.

**Expected outcome:** Users can explore experimental drift estimates to support investigation and planning.

**Scientific limitation:** Forecasts must be identified as experimental unless validated against appropriate ground-truth observations. A model's output must not be described as a guaranteed future trajectory.

### Screen 6: Risk Assessment

**Purpose:** Organize observations according to estimated ecological and operational risk.

**Main components:**

- Total observations assessed.
- Critical and high-risk counts.
- Risk-prioritization map.
- Ranked observation table.
- Risk-category filters.
- Habitat vulnerability information.
- Risk scoring factors.
- Observation-level risk explanation.
- Links to detection details and recovery planning.

**User interactions:**

- Filter observations by risk category.
- Sort the observation queue.
- Open an observation.
- Review the factors contributing to its risk score.
- Navigate to drift forecasting.
- Forward an observation for recovery planning.

**Expected outcome:** Users can prioritize observations for human investigation.

**Implementation note:** Risk scores must be derived from documented project logic or explicitly labeled as demonstration values.

### Screen 7: Recovery Planning

**Purpose:** Present proposed recovery locations and planning information for human review.

**Main components:**

- Selected observation and its risk status.
- Geographic planning map.
- Candidate recovery or interception locations.
- Proposed route and waypoints.
- Vessel or operational constraints.
- Estimated distance and travel time, when calculated.
- Environmental and safety considerations.
- Route comparison.
- Mission configuration and notes.
- Human authorization controls.

**User interactions:**

- Select an observation.
- Review candidate locations.
- Compare proposed routes.
- Examine relevant operational constraints.
- Save a draft plan.
- Submit a plan for human authorization.

**Expected outcome:** Users can prepare and evaluate recovery plans without assuming that the system autonomously retrieves fishing gear.

**Implementation note:** Route suggestions and travel estimates must be labeled as experimental or simulated until supported by validated routing logic and current operational data.

### Screen 8: Mission Details and Status

**Purpose:** Track the administrative and operational status of a recovery mission.

**Main components:**

- Mission identifier and linked observation.
- Mission status timeline.
- Planned and authorized stages.
- Mission location and route preview.
- Operational notes.
- Field observations.
- Recovery outcome records.
- Relevant telemetry.
- Safety checks and authorization status.

**User interactions:**

- Open a mission.
- Review its current status.
- Add field notes.
- Record a recovery outcome.
- Inspect mission history.
- Update status where the user's permissions allow.

**Expected outcome:** Users can follow the documented progress of a mission and preserve operational records.

**Implementation note:** Mission status changes must be persisted by the backend. Do not represent a mission as completed without an actual recorded completion event.

### Screen 9: Reports and Analytics

**Purpose:** Present system summaries, model evaluation results, geographic patterns, and historical trends.

**Main components:**

- Detection summary metrics.
- Observation and risk distributions.
- Model evaluation metrics.
- Temporal trends.
- Geographic hotspot visualizations.
- Observation tables.
- Dataset and model version information.
- Report export controls.

**User interactions:**

- Filter data by time range or observation category.
- Review model performance.
- Inspect geographic patterns.
- Export available reports.
- Open the source observations associated with a result.

**Expected outcome:** Users can understand system activity and review available analytical evidence.

**Implementation note:** Model performance metrics must come from actual evaluation results. Demonstration values must be clearly identified and must not be confused with validated real-world accuracy.

### Screen 10: Data Sources and Environmental Telemetry

**Purpose:** Display environmental data sources, their availability, and their contribution to the application's workflows.

**Main components:**

- Ocean-current data source status.
- Wind and wave data source status.
- Bathymetry information.
- Satellite or remote-sensing data status.
- Data ingestion history.
- Last update timestamps.
- Geographic coverage information.
- Units and coordinate reference details.
- Environmental variable summaries.
- Data quality and availability warnings.

**Potential sources:**

- HYCOM for ocean-current information.
- ERA5 for atmospheric and wind-related variables.
- WW3 for wave information.
- Bathymetric datasets for seafloor depth.
- Satellite or remote-sensing imagery for observations where available.

**User interactions:**

- Inspect a source's status.
- Review available variables.
- Examine the latest recorded update.
- Inspect data ingestion records.
- Identify missing or unavailable data.

**Expected outcome:** Users can understand which environmental inputs are available and whether the system has sufficient information for a particular workflow.

**Implementation note:** These providers must not be marked as connected unless their data has actually been retrieved and processed.

### Screen 11: Settings and System Configuration

**Purpose:** Provide a centralized interface for managing supported application preferences and configuration.

**Main components:**

- AI model information.
- Detection confidence threshold.
- Image inference settings.
- Detection class selection.
- Drift forecast configuration.
- Risk assessment parameters.
- Map and coordinate preferences.
- Notification preferences.
- Data source configuration.
- System health information.
- Save Settings.
- Reset to Defaults.
- Export Configuration.

**User interactions:**

- Adjust supported settings.
- Save configuration changes.
- Reset preferences after confirmation.
- Export configuration.
- Review model and system information.

**Expected outcome:** Users can inspect and manage configuration options supported by the application.

**Implementation note:** Controls that are not connected to backend functionality must be labeled as prototype controls or disabled. The interface must not imply that changing a value retrains a model or updates a live data provider unless that functionality exists.

## 8. Navigation and User Flows

### 8.1 Detection-to-Review Workflow

Dashboard → AI Detection → Detection Details → Human Review → Risk Assessment

This workflow supports the inspection and review of potential fishing-gear detections.

### 8.2 Geographic Investigation Workflow

Dashboard → Ocean Map → Select Observation → Detection Details → Drift Forecast

This workflow supports geographic exploration and examination of estimated movement.

### 8.3 Risk-to-Recovery Workflow

Risk Assessment → Select Observation → Recovery Planning → Review Route Options → Human Authorization → Mission Details

This workflow supports planning while preserving human responsibility for operational decisions.

### 8.4 Analytics Workflow

Reports and Analytics → Select Metrics or Time Range → Inspect Results → Export Report

This workflow supports reviewing and communicating available project results.

### 8.5 Configuration Workflow

Settings → Modify Supported Preferences → Validate Inputs → Save Settings → Display Confirmation

Configuration changes must be validated before they are saved.

## 9. Interaction Design

### 9.1 Buttons

Primary actions should use the electric cyan accent. Secondary actions should use neutral or outlined styles. Destructive actions such as rejecting a detection or resetting configuration should be visually distinct and require confirmation when appropriate.

### 9.2 Forms

Forms must include descriptive labels, sensible defaults, input validation, and understandable error messages.

### 9.3 Tables

Tables should support readable column headings, sorting, filtering, and pagination when the volume of records requires it.

### 9.4 Maps

Map interactions should include zoom, pan, layer toggling, marker selection, and accessible descriptions of selected observations.

### 9.5 Feedback

The interface should provide feedback for loading, successful saves, failed requests, unavailable data, and empty results.

### 9.6 Review Actions

Confirmation, rejection, and anomaly-reporting actions should record the observation identifier, review decision, timestamp, and reviewer information where authentication and backend support are implemented.

## 10. Loading, Error, Empty, and Offline States

Every major screen should account for the following states.

**Loading:** Display a loading indicator or skeleton while data is being retrieved or processed.

**Error:** Show a concise explanation and an appropriate retry option.

**Empty:** Explain when no observations, missions, or reports are available and provide a relevant next action.

**Offline or unavailable service:** Identify which functionality is unavailable and distinguish cached or demonstration information from live information.

**Partial data:** Display the available information while clearly indicating missing environmental inputs or incomplete processing.

**Low-confidence prediction:** Display the predicted class and confidence while indicating that human review is required.

**Unauthorized action:** Explain when a user lacks permission to perform an operation.

## 11. Responsive Design

### Desktop

Use a persistent sidebar, a spacious main content area, and multi-column information panels. Desktop is the primary layout for geographic analysis and operational dashboards.

### Tablet

Reduce the number of simultaneous columns, allow the sidebar to collapse, and preserve access to essential map controls and observation details.

### Mobile

Use a compact navigation pattern, vertically stacked cards, touch-friendly controls, and simplified map panels. Secondary information should remain available without crowding the screen.

Responsive behavior must preserve functionality rather than merely shrinking the desktop interface.

## 12. Accessibility and Usability

The interface should follow practical accessibility principles:

- Maintain sufficient contrast between text and background.
- Use readable font sizes and clear labels.
- Provide keyboard-accessible controls and visible focus states.
- Use descriptive labels for icons and form inputs.
- Do not communicate risk using color alone.
- Provide text alternatives or summaries for important chart and map information.
- Use clear error messages and validation feedback.
- Keep navigation and interaction patterns consistent.
- Support appropriate zoom and text scaling.

## 13. Frontend Technology and Implementation

The frontend will be implemented using the following proposed technologies:

| Component | Technology |
|---|---|
| UI framework | React.js |
| Language | JavaScript or TypeScript |
| Styling | CSS or Tailwind CSS |
| Geographic visualization | Leaflet or MapLibre |
| Charts and analytics | A suitable React charting library |
| AI detection integration | HTTP API to Python backend |
| Backend framework | FastAPI |
| AI model | Trained YOLOv8 segmentation model |
| Database, if required | PostgreSQL with PostGIS |

The final implementation should reuse common components rather than duplicating them across screens.

Recommended reusable components include:

- `AppLayout`
- `Sidebar`
- `Header`
- `MetricCard`
- `StatusBadge`
- `ObservationTable`
- `RiskIndicator`
- `MapPanel`
- `DetectionViewer`
- `ChartPanel`
- `LoadingState`
- `ErrorState`
- `ConfirmationDialog`

Each major screen should be implemented as a separate page or route while sharing the common application layout.

## 14. Backend Integration Requirements

The UI will require backend integration for functionality that involves real data or persistent operations.

Expected integration areas include:

- Image upload and AI inference.
- Detection results and model confidence.
- Observation metadata and geographic coordinates.
- Environmental data retrieval.
- Drift forecast generation.
- Risk assessment calculations.
- Recovery planning records.
- Mission status and review history.
- Reports and model evaluation metrics.
- Settings persistence and data source status.

The backend must return meaningful error responses and validate input data. The frontend must handle failed requests, incomplete responses, and unavailable services without crashing.

All integrations should be added incrementally and tested independently.

## 15. Data Integrity and Scientific Limitations

OceanRescue is a research and educational decision-support project.

The following limitations must be reflected in the UI/UX implementation:

1. A model prediction does not prove that an object is abandoned or lost fishing gear.
2. Predictions may contain false positives and false negatives.
3. Model confidence is not equivalent to verified real-world accuracy.
4. Drift forecasts are estimates whose reliability depends on the input data and forecasting method.
5. Risk scores depend on the selected scoring criteria and available environmental information.
6. Recovery recommendations are planning aids and require human assessment.
7. Environmental data sources may have missing values, different update frequencies, and different geographic coverage.
8. Demonstration records and simulated environmental values must be identified clearly.
9. Real-world recovery operations require appropriate authorization, safety checks, and expert review.

The system must not claim autonomous retrieval, validated operational forecasting, or live environmental integration unless those capabilities have actually been implemented and verified.

## 16. UI/UX Testing and Acceptance Criteria

The interface will be reviewed against the following criteria:

- All 11 screens are accessible through consistent navigation.
- The active navigation item is clearly indicated.
- Screen layouts follow the approved OceanRescue design system.
- Important metrics and risk states are easy to identify.
- Tables, forms, maps, and charts display appropriate information.
- Controls provide feedback and validation.
- Loading, error, empty, and unavailable states are handled.
- The layout adapts to desktop, tablet, and mobile screens.
- Important interactions can be operated using a keyboard.
- AI detections are distinguishable from human-confirmed observations.
- Simulated data is clearly labeled.
- Model metrics correspond to actual evaluation results when presented as experimental results.
- Backend-dependent actions report success only after the corresponding operation succeeds.
- Recovery plans remain subject to human review and authorization.

## 17. Future Enhancements

Potential future improvements include:

- Real-time environmental data integration.
- Improved map-layer management.
- Historical observation playback.
- More detailed uncertainty visualization.
- Role-based access control.
- Exportable geographic reports.
- Improved model evaluation and monitoring.
- Integration with field-survey devices.
- Human feedback workflows for improving future model versions.

These enhancements will be considered according to project feasibility, available datasets, implementation time, and validation requirements.

## 18. Conclusion

The OceanRescue UI/UX design establishes a consistent interface for connecting AI-based detection, geographic exploration, environmental information, drift estimation, ecological risk assessment, and recovery planning.

The 11-screen design provides a structured workflow from observation discovery to human-reviewed planning and reporting. Its dark marine-inspired visual language, clear status indicators, reusable components, and transparent presentation of uncertainty support an organized and technically credible user experience.

The final application will be developed incrementally, connecting each interface to actual backend functionality and available datasets while clearly identifying experimental or simulated outputs.

**OceanRescue — Every Net Found. Every Life Saved.**
