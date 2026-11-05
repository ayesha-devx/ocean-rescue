"""
OceanRescue Risk Prioritization Subsystem — Decision Support Engine.
Implements explainable, multi-criteria risk scoring across ALDFG incidents:
1. Gear Classification Lethality (30%)
2. Wildlife Entanglement & Harm (25%)
3. Hydrodynamic Drift Dispersal (20%)
4. Coastal Grounding Proximity (15%)
5. Temporal Persistence / Age (10%)

Strict scientific protocol:
- Distinguishes model estimates (e.g. simulated shoreline grounding) from verified observations.
- Distinguishes low risk from missing/uncertain telemetry.
- All scoring parameters and weights are documented and configurable.
- Preserves mathematical integrity: displayed total score == sum of factor points.
- Excludes hypothetical post-grounding trajectory points from valid drift calculations.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import re
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, asc, func
from geoalchemy2.functions import ST_X, ST_Y

from app.models.gear_report import GearReport
from app.models.drift_forecast import DriftForecast
from app.models.environmental_observation import EnvironmentalObservation
from app.models.ai_detection import AiDetection
from app.models.risk_assessment import RiskAssessment
from app.schemas.risk import (
    RiskWeightConfig,
    RiskFactorDetail,
    RiskAssessmentResponse,
    PriorityBandEnum,
    DataConfidenceEnum,
    RiskQueueSummary,
    RiskQueueResponse,
)
from app.services.drift_service import (
    calculate_haversine_distance_km,
    is_land_coordinate,
    get_approximate_coastline_lon,
    KONKAN_COASTLINE_CONTOUR,
)

# Pilot harbour benchmark (Mirkarwada Harbour, Ratnagiri)
PILOT_LAT = 16.99
PILOT_LON = 73.30

# Default configurable weights (Sum = 100.0)
DEFAULT_WEIGHTS = RiskWeightConfig(
    gear_hazard=30.0,
    wildlife_risk=25.0,
    drift_dispersal=20.0,
    coastal_grounding=15.0,
    temporal_age=10.0,
)

# Priority score thresholds
PRIORITY_CRITICAL_MIN = 80.0
PRIORITY_HIGH_MIN = 60.0
PRIORITY_MEDIUM_MIN = 35.0

# Gear type hazard factors (0.0 to 1.0 multiplier)
GEAR_HAZARD_RATIOS = {
    "gillnet": 1.0,         # High ghost fishing: continuous vertical monofilament entanglement
    "crab_pot": 0.85,       # Self-baiting persistent crustacean traps
    "lobster_trap": 0.85,
    "trap_pot": 0.85,
    "trap": 0.80,
    "pot": 0.80,
    "monofilament": 0.90,
    "fishing_net": 0.70,
    "net": 0.70,
    "trawl_net": 0.65,      # High benthic scour and smothering, moderate pelagic entanglement
    "trawl": 0.65,
    "longline": 0.50,       # Hook-and-line snagging of sharks, turtles, seabirds
    "fad": 0.40,            # Drifting aggregator with trailing webbing
    "purse_seine": 0.35,
    "rope_line": 0.30,
    "rope": 0.30,
    "line": 0.30,
    "other": 0.30,
}

# Gear hazard descriptions for explainability
GEAR_DESCRIPTIONS = {
    "gillnet": "Pelagic gillnets present critical continuous ghost fishing risk due to high vertical monofilament mesh enmeshment surface.",
    "monofilament": "Invisible synthetic monofilament line maintains long-term non-biodegradable entanglement loop threat.",
    "crab_pot": "Crab/lobster pots present high risk through cyclical self-baiting demersal entrapment.",
    "lobster_trap": "Demersal traps create cyclical entrapment loops on seabed substrates.",
    "trap_pot": "Demersal pot/trap structure maintains prolonged seabed ghost fishing entrapment.",
    "trap": "Traps self-bait and maintain continuous demersal catch cycles.",
    "pot": "Pot gear creates persistent entrapment on reef and sediment substrates.",
    "fishing_net": "Commercial fishing net with extensive surface area creates significant wildlife entanglement and reef smothering hazard.",
    "net": "Netting debris with broad surface area creates active entanglement and benthic smothering hazard.",
    "trawl_net": "Heavy trawl netting scours seabed, smothers rocky reef micro-habitats, and entangles benthic megafauna.",
    "trawl": "Heavy trawl webbing presents substantial benthic smothering and seabed scour impact.",
    "longline": "Monofilament longline hooks create severe entanglement and snagging risks for pelagics, turtles, and seabirds.",
    "fad": "Drifting Fish Aggregating Device (FAD) webbing presents moderate entangling hazards for pelagic species.",
    "purse_seine": "Purse seine netting fragments create localized marine navigation and entanglement obstructions.",
    "rope_line": "Mooring rope/line presents propeller entanglement, mammal flipper wrap, and navigational hazards.",
    "rope": "Discarded line/rope creates navigational obstruction and localized entanglement hazard.",
    "line": "Discarded monofilament/poly line creates localized snagging risk.",
    "other": "Miscellaneous or unclassified gear presents baseline marine debris obstruction risk.",
}

# Fishing gear, debris, and equipment classes that must NEVER be classified as marine fauna
GEAR_AND_DEBRIS_CLASSES = {
    "fishing_net",
    "rope_line",
    "net",
    "rope",
    "trap",
    "pot",
    "crab_pot",
    "lobster_trap",
    "trawl_net",
    "trawl",
    "longline",
    "fad",
    "monofilament",
    "gear",
    "buoy",
    "debris_bottle",
    "debris_can",
    "debris_pipe",
    "debris_bag",
    "debris_tarp",
    "debris_container",
    "debris_cup",
    "debris_snack_wrapper",
    "debris_clothing",
    "debris_wreckage",
    "debris_branch_wood",
    "debris_other",
    "uncertain_cable_metal",
    "rov_cable",
    "rov_tortuga",
    "rov_vehicle_leg",
    "rov_bluerov",
}

# Marine fauna keywords / classes
FAUNA_KEYWORDS = [
    "turtle", "sea_turtle", "dolphin", "whale", "mammal", "shark",
    "dugong", "porpoise", "seal", "ray", "manta_ray", "animal_fish",
    "animal_starfish", "animal_crab", "animal_eel", "animal_sponge",
    "animal_urchin", "animal_etc", "marine_biology"
]

WILDLIFE_CONFIRMED_PATTERNS = [
    r"\b(entangle|entangled|trapped|snagged|injured|dead)\b.*?\b(turtle|dolphin|whale|mammal|shark|bird|ray|dugong|porpoise|seal|fish)\b",
    r"\b(turtle|dolphin|whale|mammal|shark|bird|ray|dugong|porpoise|seal|fish)\b.*?\b(entangle|entangled|trapped|snagged|injured|dead)\b",
    r"\b(confirmed wildlife|animal trapped|endangered species)\b",
]

# Negative patterns: statements explicitly noting absence of wildlife or absence of entanglement
WILDLIFE_NEGATIVE_PATTERNS = [
    r"\bno\s+(?:marine\s+fauna|marine\s+mammals?|marine\s+life|wildlife|animals?|turtles?|dolphins?|whales?|sharks?|fish|entangle\w*)\b",
    r"\bno\s+wildlife\s+interaction\b",
    r"\bno\s+entangled\s+marine\s+wildlife\b",
    r"\b(?:no|zero)\s+.*?\b(?:observed\s+entangled|entangled|trapped)\b",
]

WILDLIFE_SUSPECTED_PATTERNS = [
    r"\b(turtle|dolphin|whale|shark|marine life|wildlife)\b",
    r"\b(sanctuary|marine protected area|coral reef|breeding ground)\b",
]


def calculate_distance_to_coastline_km(lat: float, lon: float) -> float:
    """
    Calculates great-circle distance in kilometers from (lat, lon) to the continental coastline.
    Uses the high-water contour along Maharashtra/Goa/Karnataka (14.0°N to 20.0°N).
    If coordinates fall on land (east of the coastline), returns 0.0 km.
    Otherwise evaluates the perpendicular distance to the interpolated coastline longitude
    as well as distance to contour vertices to account for coastal bays and headlands.
    """
    if is_land_coordinate(lat, lon):
        return 0.0
    coast_lon = get_approximate_coastline_lon(lat)
    # Perpendicular distance to coast at same latitude
    min_dist = calculate_haversine_distance_km(lat, lon, lat, coast_lon)
    # Check nearest contour vertices for coastal curvature
    for c_lat, c_lon in KONKAN_COASTLINE_CONTOUR:
        d = calculate_haversine_distance_km(lat, lon, c_lat, c_lon)
        if d < min_dist:
            min_dist = d
    return round(min_dist, 2)


def is_gear_or_debris(class_name: str) -> bool:
    """Strict check: confirms whether a detected class is fishing gear or marine debris."""
    slug = (class_name or "").lower().strip()
    if slug in GEAR_AND_DEBRIS_CLASSES:
        return True
    if any(g in slug for g in ["net", "rope", "trawl", "longline", "pot", "trap", "debris", "cable", "gear", "buoy", "monofilament", "line"]):
        return True
    return False


def is_marine_fauna(class_name: str) -> bool:
    """Strict check: confirms whether a detected class represents marine fauna, excluding gear."""
    if is_gear_or_debris(class_name):
        return False
    slug = (class_name or "").lower().strip()
    if slug.startswith("animal_") or slug == "marine_biology":
        return True
    return any(k in slug for k in ["turtle", "dolphin", "whale", "mammal", "shark", "dugong", "porpoise", "seal", "ray"])


def _normalize_weights(weights: Optional[RiskWeightConfig]) -> RiskWeightConfig:
    """Ensures weights are proportional and sum to 100.0%."""
    if not weights:
        return DEFAULT_WEIGHTS
    
    total = (
        weights.gear_hazard
        + weights.wildlife_risk
        + weights.drift_dispersal
        + weights.coastal_grounding
        + weights.temporal_age
    )
    if total <= 0:
        return DEFAULT_WEIGHTS

    factor = 100.0 / total
    return RiskWeightConfig(
        gear_hazard=round(weights.gear_hazard * factor, 1),
        wildlife_risk=round(weights.wildlife_risk * factor, 1),
        drift_dispersal=round(weights.drift_dispersal * factor, 1),
        coastal_grounding=round(weights.coastal_grounding * factor, 1),
        temporal_age=round(weights.temporal_age * factor, 1),
    )


def assess_wildlife_impact(
    description: Optional[str],
    ai_detections: List[AiDetection]
) -> Tuple[float, str, bool, str]:
    """
    Evaluates wildlife impact evidence strictly separating the evidence tiers:
    1. Confirmed wildlife entanglement (measured: 1.00 ratio, verified by NGO/field report narrative)
    2. Candidate animal detection (model_estimate: 0.35 ratio, unverified by NGO)
    3. Suspected wildlife interaction (inferred: 0.50 ratio, habitat/vicinity sighting)
    4. Explicit negative report (unassessed/negative: 0.20 ratio baseline ghost fishing potential)
    5. No wildlife assessment (unassessed: 0.20 ratio baseline ghost fishing potential)
    
    Strict rules:
    - Detected fishing nets, ropes, or gear objects are NEVER classified as marine fauna.
    - Candidate animal detections are NOT automatically confirmed entanglement.
    - Preserves evidence source, detection class, confidence, and verification status.
    Returns: (ratio, status, confirmed_bool, description)
    """
    desc = (description or "").lower().strip()

    # Filter detections to find any actual marine fauna (strictly excluding gear)
    fauna_detections = [
        d for d in (ai_detections or [])
        if is_marine_fauna(d.detected_class)
    ]

    # Check for NGO-confirmed fauna detections
    confirmed_fauna_det = next(
        (d for d in fauna_detections if (d.review_status or "").lower() == "confirmed"),
        None
    )

    # 1. State 4: Confirmed Wildlife Entanglement (Requires VERIFIED evidence)
    has_confirmed_narrative = any(re.search(p, desc) for p in WILDLIFE_CONFIRMED_PATTERNS)
    has_negative_narrative = any(re.search(p, desc) for p in WILDLIFE_NEGATIVE_PATTERNS)
    
    if has_confirmed_narrative and not has_negative_narrative:
        return (
            1.0,
            "measured",
            True,
            "Confirmed wildlife entanglement: Field-verified report narrative documents trapped, injured, or entangled marine fauna."
        )

    if confirmed_fauna_det:
        return (
            1.0,
            "measured",
            True,
            f"Confirmed wildlife entanglement: NGO-verified AI detection confirmed {confirmed_fauna_det.detected_class} "
            f"({float(confirmed_fauna_det.confidence):.1%} confidence, review status: 'confirmed', reviewed by: {confirmed_fauna_det.reviewed_by or 'NGO Staff'})."
        )

    # 2. Check for explicit negative report ("no marine mammals or sea turtles entangled")
    if has_negative_narrative:
        return (
            0.20,
            "unassessed",
            False,
            "No wildlife entanglement reported: Field narrative explicitly notes absence of entangled marine fauna. Baseline 20% ghost fishing potential applied."
        )

    # 3. State 3: Suspected wildlife interaction
    if any(re.search(p, desc) for p in WILDLIFE_SUSPECTED_PATTERNS):
        return (
            0.50,
            "inferred",
            False,
            "Suspected wildlife interaction: Incident coordinates or narrative intersect known marine habitat or wildlife activity area. Absence of confirmed entanglement."
        )

    # 4. State 2: Candidate animal detection (Unreviewed or pending AI detection)
    if fauna_detections:
        candidate = fauna_detections[0]
        status_label = candidate.review_status or "pending_review"
        return (
            0.35,
            "model_estimate",
            False,
            f"Candidate animal detection: AI Computer Vision detected candidate marine fauna ({candidate.detected_class}) "
            f"with {float(candidate.confidence):.1%} confidence (review status: '{status_label}'). "
            f"Unverified by NGO -- candidate detection not classified as confirmed entanglement."
        )

    # 5. State 1: No wildlife assessment (Default baseline)
    return (
        0.20,
        "unassessed",
        False,
        "No wildlife assessment: Absence of field evidence. Baseline 20% ghost fishing potential applied (protocol: absence of evidence is not evidence of absence)."
    )


def calculate_incident_risk(
    report: GearReport,
    db: Session,
    weights: Optional[RiskWeightConfig] = None
) -> Dict[str, Any]:
    """
    Computes a transparent, explainable multi-factor risk score for an incident report.
    Returns complete breakdown dictionary matching RiskAssessmentResponse schema.
    """
    cfg = _normalize_weights(weights)
    missing_inputs: List[str] = []
    stale_inputs: List[str] = []
    now_utc = datetime.now(timezone.utc)

    # Coordinates
    coords = db.execute(
        select(
            ST_X(report.reported_location).label("lon"),
            ST_Y(report.reported_location).label("lat")
        )
    ).one()
    start_lat = float(coords.lat)
    start_lon = float(coords.lon)

    # -------------------------------------------------------------------------
    # FACTOR 1: GEAR TYPE & LETHALITY (Max cfg.gear_hazard pts)
    # -------------------------------------------------------------------------
    raw_gear_val = report.gear_type
    gear_slug = (raw_gear_val or "").lower().strip()
    
    if not gear_slug or gear_slug in ["none", "unknown"]:
        gear_ratio = 0.20
        gear_status = "incomplete"
        gear_confidence = "low"
        gear_desc = "Unclassified gear type: physical gear identification is missing from the incident report. Baseline uncertainty ratio (0.20) assigned; field verification required to determine exact gear lethality."
        gear_evidence = ["Incident Record: Unclassified gear type"]
        gear_formula = f"Points = {cfg.gear_hazard:.1f} * 0.20 = {round(0.20 * cfg.gear_hazard, 1)} pts (Baseline uncertainty for unclassified gear)"
        missing_inputs.append("Unclassified fishing gear type: physical gear identification pending field review")
    elif gear_slug in GEAR_HAZARD_RATIOS:
        gear_ratio = GEAR_HAZARD_RATIOS[gear_slug]
        gear_status = "measured" if gear_slug != "other" else "baseline"
        gear_confidence = "high" if gear_slug != "other" else "medium"
        gear_desc = GEAR_DESCRIPTIONS.get(gear_slug, f"Gear type '{gear_slug}' presents baseline marine obstruction risk.")
        gear_evidence = ["Incident Gear Specification", "FAO / NOAA Ghost Gear Threat Framework"]
        gear_formula = f"Points = {cfg.gear_hazard:.1f} * {gear_ratio:.2f} = {round(gear_ratio * cfg.gear_hazard, 1)} pts ({gear_slug.replace('_', ' ').title()})"
    else:
        # Check substring match
        matched_ratio = None
        for k, r in GEAR_HAZARD_RATIOS.items():
            if k in gear_slug:
                matched_ratio = r
                break
        gear_ratio = matched_ratio if matched_ratio is not None else 0.30
        gear_status = "inferred"
        gear_confidence = "medium"
        gear_desc = f"Gear classification '{gear_slug}' mapped to closest hazard category ({gear_ratio:.2f} ratio)."
        gear_evidence = ["Incident Gear Specification (Keyword Inference)"]
        gear_formula = f"Points = {cfg.gear_hazard:.1f} * {gear_ratio:.2f} = {round(gear_ratio * cfg.gear_hazard, 1)} pts"

    gear_points = round(gear_ratio * cfg.gear_hazard, 1)
    factor_gear = RiskFactorDetail(
        factor_key="gear_hazard",
        name="Gear Classification & Ghost Fishing Lethality",
        weight_pct=cfg.gear_hazard,
        points_awarded=gear_points,
        max_points=cfg.gear_hazard,
        status=gear_status,
        raw_value=raw_gear_val or "Unclassified",
        description=gear_desc,
        confidence=gear_confidence,
        evidence_sources=gear_evidence,
        formula_description=gear_formula,
    )

    # -------------------------------------------------------------------------
    # FACTOR 2: WILDLIFE ENTANGLEMENT & MARINE HARM (Max cfg.wildlife_risk pts)
    # -------------------------------------------------------------------------
    detections = db.query(AiDetection).filter(AiDetection.report_id == report.id).all()
    wildlife_ratio, wildlife_status, wildlife_confirmed, wildlife_desc = assess_wildlife_impact(
        report.description, detections
    )
    wildlife_points = round(wildlife_ratio * cfg.wildlife_risk, 1)
    
    if wildlife_confirmed:
        wildlife_conf = "high"
        wildlife_evidence = ["Verified Field Incident Narrative / NGO Verification"]
        wildlife_formula = f"Points = {cfg.wildlife_risk:.1f} * 1.00 = {wildlife_points} pts (Verified marine fauna entanglement)"
    elif wildlife_status == "inferred":
        wildlife_conf = "medium"
        wildlife_evidence = ["Field Narrative Habitat Mention / Proximity"]
        wildlife_formula = f"Points = {cfg.wildlife_risk:.1f} * 0.50 = {wildlife_points} pts (Suspected wildlife interaction)"
    elif wildlife_status == "model_estimate":
        wildlife_conf = "low"
        wildlife_evidence = ["AI Computer Vision Candidate Fauna Detection (Pending NGO review)"]
        wildlife_formula = f"Points = {cfg.wildlife_risk:.1f} * 0.35 = {wildlife_points} pts (Candidate animal detection)"
    else:
        wildlife_conf = "low" if "no wildlife" not in (report.description or "").lower() else "high"
        wildlife_evidence = ["Field Report Narrative (Absence of Confirmed Wildlife Entanglement)"]
        wildlife_formula = f"Points = {cfg.wildlife_risk:.1f} * 0.20 = {wildlife_points} pts (Baseline ghost fishing potential)"

    # Strict audit requirement: unassessed wildlife always flags missing inputs
    if wildlife_status == "unassessed":
        missing_inputs.append("Field-verified wildlife entanglement inspection")

    factor_wildlife = RiskFactorDetail(
        factor_key="wildlife_risk",
        name="Marine Wildlife Entanglement & Ecological Impact",
        weight_pct=cfg.wildlife_risk,
        points_awarded=wildlife_points,
        max_points=cfg.wildlife_risk,
        status=wildlife_status,
        raw_value="Confirmed Harm" if wildlife_confirmed else ("Unassessed" if wildlife_status == "unassessed" else "Suspected"),
        description=wildlife_desc,
        confidence=wildlife_conf,
        evidence_sources=wildlife_evidence,
        formula_description=wildlife_formula,
    )

    # -------------------------------------------------------------------------
    # FACTOR 3: HYDRODYNAMIC DRIFT DISPERSAL (Max cfg.drift_dispersal pts)
    # -------------------------------------------------------------------------
    # Retrieve all trajectory points for this report ordered by id descending
    forecast_rows = db.execute(
        select(
            DriftForecast.id,
            DriftForecast.step_index,
            DriftForecast.distance_km,
            DriftForecast.current_speed,
            DriftForecast.forecast_time,
            ST_X(DriftForecast.predicted_location).label("lon"),
            ST_Y(DriftForecast.predicted_location).label("lat")
        ).where(
            DriftForecast.report_id == report.id
        ).order_by(desc(DriftForecast.id))
    ).all()

    forecast_points_data = []
    latest_forecast_id = None
    forecast_generated_time = None
    forecast_is_stale = False
    forecast_validity_hours = 24.0

    if forecast_rows:
        latest_fc = forecast_rows[0]
        latest_forecast_id = latest_fc.id
        forecast_generated_time = latest_fc.forecast_time
        fc_time = latest_fc.forecast_time
        if fc_time.tzinfo is None:
            fc_time = fc_time.replace(tzinfo=timezone.utc)
        fc_age_hours = (now_utc - fc_time).total_seconds() / 3600.0
        
        # Stale check: forecasts older than 24 hours
        if fc_age_hours > 24.0:
            forecast_is_stale = True
            stale_inputs.append(
                f"Lagrangian drift forecast #{latest_fc.id} is stale ({fc_age_hours:.1f}h old; validity threshold: 24h)"
            )

        # Scoping to latest forecast run: group by unique step_index taking the latest id
        seen_steps = set()
        latest_run_points = []
        for r in forecast_rows:
            if r.step_index not in seen_steps:
                seen_steps.add(r.step_index)
                latest_run_points.append(r)
        latest_run_points.sort(key=lambda x: x.step_index if x.step_index is not None else 0)
        forecast_points_data = latest_run_points

    has_forecast = len(forecast_points_data) > 0
    hypo_points_count = len(forecast_points_data) if has_forecast else None
    valid_points_count = None
    net_displacement_km = None
    total_path_dist_km = None
    hypo_net_displacement_km = None
    hypo_total_path_dist_km = None
    grounding_detected = False
    grounding_step = None
    grounding_location = None

    drift_ratio = 0.0
    drift_status = "missing"
    drift_desc = ""
    drift_confidence = "low"
    drift_evidence = []
    drift_formula = ""
    raw_drift_val = None

    if has_forecast:
        # 1. Calculate full hypothetical trajectory metrics (preserved for audit)
        hypo_end_pt = forecast_points_data[-1]
        hypo_net_displacement_km = round(
            calculate_haversine_distance_km(start_lat, start_lon, float(hypo_end_pt.lat), float(hypo_end_pt.lon)),
            2
        )
        hypo_total_path_dist_km = round(
            sum(float(pt.distance_km or 0.0) for pt in forecast_points_data),
            2
        )

        # 2. Check for coastal grounding in trajectory using standard coastline land-mask
        for pt in forecast_points_data:
            pt_lat = float(pt.lat)
            pt_lon = float(pt.lon)
            if is_land_coordinate(pt_lat, pt_lon):
                grounding_detected = True
                grounding_step = pt.step_index
                grounding_location = {"latitude": pt_lat, "longitude": pt_lon}
                break

        # 3. Filter to valid trajectory points up to grounding point
        if grounding_detected:
            valid_points = [p for p in forecast_points_data if p.step_index <= grounding_step]
        else:
            valid_points = forecast_points_data

        valid_points_count = len(valid_points)

        # 4. Score drift dispersal strictly using valid pre-grounding movement
        if grounding_detected and grounding_step == 0:
            # Grounded immediately at origin / step 0: immobilized
            net_displacement_km = 0.0
            total_path_dist_km = 0.0
            valid_avg_speed = 0.0
            drift_ratio = 0.0
            drift_status = "model_estimate"
            drift_confidence = "high"
            drift_desc = (
                f"Grounded at loss origin (step 0): Gear is immobilized on shoreline; zero hydrodynamic dispersal. "
                f"(Hypothetical post-grounding advection of {hypo_net_displacement_km:.2f} km excluded from scoring)."
            )
            raw_drift_val = f"Valid: 0.00 km (Grounded at step 0) | Hypo Net: {hypo_net_displacement_km:.2f} km"
            drift_evidence = [
                f"Lagrangian Drift Forecast #{latest_forecast_id} ({len(forecast_points_data)} steps)",
                "Coastal Land-Mask Collision (Step 0 Grounding)"
            ]
            drift_formula = f"Points = {cfg.drift_dispersal:.1f} * 0.00 = 0.0 pts (Grounded at step 0: zero valid hydrodynamic displacement)"

        elif grounding_detected and grounding_step > 0:
            valid_end_pt = valid_points[-1]
            net_displacement_km = round(
                calculate_haversine_distance_km(start_lat, start_lon, float(valid_end_pt.lat), float(valid_end_pt.lon)),
                2
            )
            total_path_dist_km = round(
                sum(float(pt.distance_km or 0.0) for pt in valid_points),
                2
            )
            valid_avg_speed = round(
                sum(float(pt.current_speed or 0.0) for pt in valid_points) / len(valid_points),
                3
            ) if valid_points else 0.15

            if net_displacement_km >= 10.0 or valid_avg_speed >= 0.25:
                drift_ratio = 1.0
                drift_desc = (
                    f"Rapid pre-grounding dispersal: Predicted {net_displacement_km:.2f} km displacement before shoreline grounding "
                    f"at step +{grounding_step}h. (Hypothetical post-grounding movement excluded)."
                )
            elif net_displacement_km >= 5.0 or valid_avg_speed >= 0.15:
                drift_ratio = 0.70
                drift_desc = (
                    f"Moderate pre-grounding dispersal: Predicted {net_displacement_km:.2f} km displacement before shoreline grounding "
                    f"at step +{grounding_step}h. (Hypothetical post-grounding movement excluded)."
                )
            elif net_displacement_km >= 1.0:
                drift_ratio = 0.40
                drift_desc = (
                    f"Localized pre-grounding drift: Predicted {net_displacement_km:.2f} km displacement before shoreline grounding "
                    f"at step +{grounding_step}h. (Hypothetical post-grounding movement excluded)."
                )
            else:
                drift_ratio = 0.20
                drift_desc = (
                    f"Minimal pre-grounding drift: Predicted {net_displacement_km:.2f} km displacement before shoreline grounding "
                    f"at step +{grounding_step}h."
                )
            drift_status = "model_estimate"
            drift_confidence = "high"
            raw_drift_val = f"Valid Net: {net_displacement_km:.2f} km (Step 0 to +{grounding_step}h) | Hypo Net: {hypo_net_displacement_km:.2f} km"
            drift_evidence = [
                f"Lagrangian Drift Forecast #{latest_forecast_id} (Truncated at step {grounding_step})",
                "Coastal Land-Mask Advection Truncation"
            ]
            drift_formula = f"Points = {cfg.drift_dispersal:.1f} * {drift_ratio:.2f} = {round(drift_ratio * cfg.drift_dispersal, 1)} pts (Pre-grounding displacement: {net_displacement_km:.2f} km)"

        else:
            # No grounding detected: full forecast is valid
            valid_end_pt = valid_points[-1]
            net_displacement_km = hypo_net_displacement_km
            total_path_dist_km = hypo_total_path_dist_km
            valid_avg_speed = round(
                sum(float(pt.current_speed or 0.0) for pt in valid_points) / len(valid_points),
                3
            ) if valid_points else 0.15

            if net_displacement_km >= 10.0 or valid_avg_speed >= 0.25:
                drift_ratio = 1.0
                drift_desc = f"Rapid dispersal: Predicted {net_displacement_km:.2f} km advection across operational boundary increases threat area."
            elif net_displacement_km >= 5.0 or valid_avg_speed >= 0.15:
                drift_ratio = 0.70
                drift_desc = f"Moderate dispersal: Predicted {net_displacement_km:.2f} km displacement expands search envelope."
            elif net_displacement_km >= 1.0:
                drift_ratio = 0.40
                drift_desc = f"Localized drift: Predicted {net_displacement_km:.2f} km displacement within immediate sector."
            else:
                drift_ratio = 0.20
                drift_desc = "Stationary or minimal drift: Gear displacement remains near origin coordinates."
            drift_status = "model_estimate"
            drift_confidence = "high"
            raw_drift_val = f"Net: {net_displacement_km:.2f} km | Path: {total_path_dist_km:.2f} km | Avg Speed: {valid_avg_speed:.2f} m/s"
            drift_evidence = [
                f"Lagrangian Drift Forecast #{latest_forecast_id} ({len(valid_points)} valid steps)",
                "Surface Current Advection Model"
            ]
            drift_formula = f"Points = {cfg.drift_dispersal:.1f} * {drift_ratio:.2f} = {round(drift_ratio * cfg.drift_dispersal, 1)} pts (Net displacement: {net_displacement_km:.2f} km, speed: {valid_avg_speed:.2f} m/s)"

    else:
        # Check latest environmental observation strictly associated with this report
        latest_obs = db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.report_id == report.id
        ).order_by(desc(EnvironmentalObservation.observed_at)).first()

        if latest_obs and latest_obs.current_speed is not None:
            c_spd = float(latest_obs.current_speed)
            raw_drift_val = f"Surface Current: {c_spd:.2f} m/s"
            if c_spd >= 0.25:
                drift_ratio = 0.60
                drift_desc = f"High current velocity ({c_spd:.2f} m/s) suggests active pelagic dispersal corridor."
            elif c_spd >= 0.12:
                drift_ratio = 0.40
                drift_desc = f"Moderate current velocity ({c_spd:.2f} m/s) indicates steady hydrodynamic transport."
            else:
                drift_ratio = 0.20
                drift_desc = f"Low current velocity ({c_spd:.2f} m/s) suggests limited immediate dispersal."
            drift_status = "inferred"
            drift_confidence = "medium"
            drift_evidence = [f"Environmental Observation #{latest_obs.id} (Current Speed: {c_spd:.2f} m/s)"]
            drift_formula = f"Points = {cfg.drift_dispersal:.1f} * {drift_ratio:.2f} = {round(drift_ratio * cfg.drift_dispersal, 1)} pts (Inferred from surface current velocity)"
            missing_inputs.append("Lagrangian drift trajectory forecast (not yet generated)")
        else:
            drift_ratio = 0.0
            drift_desc = "No valid drift forecast or current telemetry available for this incident."
            drift_status = "missing"
            drift_confidence = "low"
            drift_evidence = ["None: No forecast or ocean current telemetry"]
            drift_formula = f"Points = {cfg.drift_dispersal:.1f} * 0.00 = 0.0 pts (Missing forecast inputs)"
            missing_inputs.append("Lagrangian drift trajectory forecast")
            missing_inputs.append("Ocean surface current telemetry")

    # Consistent 1-decimal rounding for factor points
    drift_points = round(drift_ratio * cfg.drift_dispersal, 1)
    factor_drift = RiskFactorDetail(
        factor_key="drift_dispersal",
        name="Hydrodynamic Surface Drift & Dispersal Corridor",
        weight_pct=cfg.drift_dispersal,
        points_awarded=drift_points,
        max_points=cfg.drift_dispersal,
        status=drift_status,
        raw_value=raw_drift_val or "No Telemetry",
        description=drift_desc,
        confidence=drift_confidence,
        evidence_sources=drift_evidence,
        formula_description=drift_formula,
    )

    # -------------------------------------------------------------------------
    # FACTOR 4: COASTAL GROUNDING & HABITAT SENSITIVITY (Max cfg.coastal_grounding pts)
    # -------------------------------------------------------------------------
    grounding_ratio = 0.0
    grounding_status_str = "missing"
    grounding_desc = ""
    grounding_confidence = "medium"
    grounding_evidence = []
    grounding_formula = ""

    dist_to_pilot = calculate_haversine_distance_km(start_lat, start_lon, PILOT_LAT, PILOT_LON)

    # Measure actual geographic distance to the coastline contour
    pts_to_evaluate = []
    if has_forecast and valid_points_count and valid_points_count > 0:
        pts_to_evaluate = [(float(p.lat), float(p.lon)) for p in valid_points]
    else:
        pts_to_evaluate = [(start_lat, start_lon)]

    min_shoreline_dist_km = min(calculate_distance_to_coastline_km(lat, lon) for lat, lon in pts_to_evaluate)

    if grounding_detected:
        grounding_ratio = 1.0
        grounding_status_str = "model_estimate"
        grounding_confidence = "high"
        grounding_desc = (
            f"Model-estimated shoreline grounding: Advection trajectory predicts coastal intersection at step "
            f"+{grounding_step}h ({grounding_location['latitude']:.4f}° N, {grounding_location['longitude']:.4f}° E). "
            f"High threat to rocky intertidal/coastal zone. (Model estimate, not confirmed physical grounding)."
        )
        grounding_evidence = [
            f"Lagrangian Advection Simulation (Intersection at step +{grounding_step}h)",
            "Konkan High-Water Shoreline Land-Mask"
        ]
        grounding_formula = f"Points = {cfg.coastal_grounding:.1f} * 1.00 = {cfg.coastal_grounding:.1f} pts (Model-estimated shoreline collision)"
    elif has_forecast:
        if dist_to_pilot <= 5.0:
            grounding_ratio = 0.60
            grounding_status_str = "model_estimate"
            grounding_confidence = "high"
            grounding_desc = f"Nearshore trajectory: Drift remains within {dist_to_pilot:.1f} km of coastal waters and harbour channels."
            grounding_evidence = [f"Valid Drift Trajectory (Harbour Proximity: {dist_to_pilot:.1f} km, Coastline Distance: {min_shoreline_dist_km:.1f} km)"]
            grounding_formula = f"Points = {cfg.coastal_grounding:.1f} * 0.60 = {round(0.60 * cfg.coastal_grounding, 1)} pts (Nearshore <= 5.0 km)"
        else:
            grounding_ratio = 0.25
            grounding_status_str = "model_estimate"
            grounding_confidence = "medium"
            grounding_desc = f"Offshore trajectory: Forecast envelope remains {dist_to_pilot:.1f} km offshore away from immediate shoreline."
            grounding_evidence = [f"Valid Drift Trajectory (Offshore Distance: {dist_to_pilot:.1f} km, Coastline Distance: {min_shoreline_dist_km:.1f} km)"]
            grounding_formula = f"Points = {cfg.coastal_grounding:.1f} * 0.25 = {round(0.25 * cfg.coastal_grounding, 1)} pts (Offshore transit)"

    else:
        if dist_to_pilot <= 5.0 or min_shoreline_dist_km <= 5.0:
            grounding_ratio = 0.40
            grounding_status_str = "inferred"
            grounding_confidence = "medium"
            grounding_desc = f"Loss location is nearshore ({dist_to_pilot:.1f} km from Mirkarwada harbour benchmark)."
            grounding_evidence = ["Reported Loss Location Coordinates", "Regional Port Proximity Buffer"]
            grounding_formula = f"Points = {cfg.coastal_grounding:.1f} * 0.40 = {round(0.40 * cfg.coastal_grounding, 1)} pts (Nearshore loss location)"
        else:
            grounding_ratio = 0.15
            grounding_status_str = "inferred"
            grounding_confidence = "medium"
            grounding_desc = f"Loss location is offshore ({dist_to_pilot:.1f} km from coastline)."
            grounding_evidence = ["Reported Loss Location Coordinates", "Regional Coastline Interpolation"]
            grounding_formula = f"Points = {cfg.coastal_grounding:.1f} * 0.15 = {round(0.15 * cfg.coastal_grounding, 1)} pts (Offshore loss location)"

    grounding_points = round(grounding_ratio * cfg.coastal_grounding, 1)
    factor_grounding = RiskFactorDetail(
        factor_key="coastal_grounding",
        name="Coastal Habitat Proximity & Shoreline Grounding",
        weight_pct=cfg.coastal_grounding,
        points_awarded=grounding_points,
        max_points=cfg.coastal_grounding,
        status=grounding_status_str,
        raw_value="Shoreline Contact Predicted" if grounding_detected else (f"{dist_to_pilot:.1f} km from harbour"),
        description=grounding_desc,
        confidence=grounding_confidence,
        evidence_sources=grounding_evidence,
        formula_description=grounding_formula,
    )

    # -------------------------------------------------------------------------
    # FACTOR 5: TEMPORAL PERSISTENCE & RETRIEVAL WINDOW (Max cfg.temporal_age pts)
    # -------------------------------------------------------------------------
    rep_time = report.reported_at
    if rep_time is None:
        age_ratio = 0.0
        age_days = 0.0
        age_status = "missing"
        age_confidence = "low"
        age_desc = "Loss timestamp unavailable: Temporal persistence cannot be measured without verified loss timestamp."
        raw_age_val = "Unknown Timestamp"
        age_evidence = ["None: Missing incident loss timestamp"]
        age_formula = f"Points = {cfg.temporal_age:.1f} * 0.00 = 0.0 pts (Missing loss timestamp)"
        missing_inputs.append("Incident loss timestamp: exact time of loss or reporting is unavailable")
    else:
        if rep_time.tzinfo is None:
            rep_time = rep_time.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now_utc - rep_time).total_seconds() / 86400.0)
        raw_age_val = f"{age_days:.1f} days adrift"
        age_status = "measured"
        age_confidence = "high"
        age_evidence = ["Incident Timestamp Record (UTC)"]

        if age_days < 1.0:
            age_ratio = 1.0
            age_desc = "Immediate loss window (<24h): High retrieval viability before gear waterlogs, sinks, or biofowls."
            age_formula = f"Points = {cfg.temporal_age:.1f} * 1.00 = {round(1.00 * cfg.temporal_age, 1)} pts (Immediate retrieval window: {age_days:.1f}d < 1.0d)"
        elif age_days < 7.0:
            age_ratio = 0.80
            age_desc = f"Active adrift phase ({age_days:.1f} days): Gear remains buoyant in the upper hydrodynamic column."
            age_formula = f"Points = {cfg.temporal_age:.1f} * 0.80 = {round(0.80 * cfg.temporal_age, 1)} pts (Active adrift phase: {age_days:.1f}d < 7.0d)"
        elif age_days < 30.0:
            age_ratio = 0.50
            age_desc = f"Persistent marine hazard ({age_days:.1f} days): Increased ghost fishing and navigational snag risk."
            age_formula = f"Points = {cfg.temporal_age:.1f} * 0.50 = {round(0.50 * cfg.temporal_age, 1)} pts (Persistent hazard: {age_days:.1f}d < 30.0d)"
        else:
            age_ratio = 0.30
            age_desc = f"Long-term marine debris deposit ({age_days:.1f} days): Potential benthic entanglement or structural degradation."
            age_formula = f"Points = {cfg.temporal_age:.1f} * 0.30 = {round(0.30 * cfg.temporal_age, 1)} pts (Long-term debris: {age_days:.1f}d >= 30.0d)"

    age_points = round(age_ratio * cfg.temporal_age, 1)
    factor_age = RiskFactorDetail(
        factor_key="temporal_age",
        name="Incident Age & Operational Retrieval Urgency",
        weight_pct=cfg.temporal_age,
        points_awarded=age_points,
        max_points=cfg.temporal_age,
        status=age_status,
        raw_value=raw_age_val,
        description=age_desc,
        confidence=age_confidence,
        evidence_sources=age_evidence,
        formula_description=age_formula,
    )

    # -------------------------------------------------------------------------
    # COMPOSITE SCORE & PRIORITY BAND
    # Exactly equals the sum of the 1-decimal rounded factor contributions
    # -------------------------------------------------------------------------
    total_score = min(100.0, max(0.0, round(
        gear_points + wildlife_points + drift_points + grounding_points + age_points, 1
    )))

    if total_score >= PRIORITY_CRITICAL_MIN:
        priority = PriorityBandEnum.CRITICAL
    elif total_score >= PRIORITY_HIGH_MIN:
        priority = PriorityBandEnum.HIGH
    elif total_score >= PRIORITY_MEDIUM_MIN:
        priority = PriorityBandEnum.MEDIUM
    else:
        priority = PriorityBandEnum.LOW

    # -------------------------------------------------------------------------
    # DATA CONFIDENCE & MISSING INPUTS EVALUATION
    # -------------------------------------------------------------------------
    confidence_checks = [
        report.status.lower() in ["verified", "scheduled_recovery"],
        report.gear_type is not None and report.gear_type.lower() not in ["other", "unknown", ""],
        wildlife_status in ["measured", "inferred"],
        has_forecast and (valid_points_count or 0) > 0,
        db.query(EnvironmentalObservation).filter(EnvironmentalObservation.report_id == report.id).count() > 0,
    ]
    confidence_count = sum(1 for c in confidence_checks if c)
    if confidence_count >= 4:
        data_confidence = DataConfidenceEnum.HIGH
    elif confidence_count == 3:
        data_confidence = DataConfidenceEnum.MEDIUM
    else:
        data_confidence = DataConfidenceEnum.LOW

    needs_inputs = (data_confidence == DataConfidenceEnum.LOW) or len(missing_inputs) > 0
    completeness_status = "needs_inputs" if needs_inputs else "complete"

    # -------------------------------------------------------------------------
    # HUMAN-READABLE PRIMARY REASON & EXPLANATION
    # -------------------------------------------------------------------------
    factor_ratios = [
        ("Wildlife Harm / Entanglement", wildlife_ratio),
        ("Coastal Grounding Threat", grounding_ratio),
        ("High-Risk Gear Classification", gear_ratio),
        ("Hydrodynamic Dispersal", drift_ratio),
        ("Fresh Loss / Retrieval Window", age_ratio),
    ]
    factor_ratios.sort(key=lambda x: x[1], reverse=True)
    primary_reason = factor_ratios[0][0]

    if wildlife_confirmed:
        primary_reason = "Confirmed Marine Wildlife Entanglement"
    elif grounding_detected:
        primary_reason = f"Model-Estimated Coastal Grounding (+{grounding_step}h)"
    elif gear_ratio >= 1.0 and total_score >= PRIORITY_HIGH_MIN:
        primary_reason = "Critical Monofilament Gillnet Lethality"

    explanation = (
        f"Incident #{report.id} ({report.gear_type.upper() if report.gear_type else 'UNCLASSIFIED'}) was assigned a normalized risk index of {total_score}/100 "
        f"({priority.value.upper()} Priority). Contributing factors: {gear_points} pts from gear lethality, "
        f"{wildlife_points} pts from wildlife risk ({wildlife_status}), {drift_points} pts from hydrodynamic drift dispersal "
        f"({drift_status}), {grounding_points} pts from coastal grounding proximity ({grounding_status_str}), and "
        f"{age_points} pts from temporal urgency ({age_days:.1f} days adrift). "
        f"Data confidence is assessed as {data_confidence.value.upper()} ({confidence_count}/5 evidence quality checks passed). "
        f"Confidence reflects evidence quality across available telemetry; "
        f"{'all required operational inputs are complete' if not needs_inputs else f'{len(missing_inputs)} operational input(s) remain pending: ' + '; '.join(missing_inputs)}."
    )
    if needs_inputs:
        explanation += f" Note: {len(missing_inputs)} dimension(s) require field/telemetry input."

    # -------------------------------------------------------------------------
    # RULE-BASED RECOMMENDED NEXT ACTION
    # -------------------------------------------------------------------------
    if wildlife_confirmed:
        recommended_action = (
            f"Urgent Wildlife Rescue Response: Confirmed marine animal entanglement. Immediately dispatch specialized "
            f"disentanglement assets and notify regional marine mammal/turtle stranding network."
        )
    elif grounding_detected:
        recommended_action = (
            f"Coastal Shoreline Reconnaissance: Lagrangian advection model projects shoreline intersection near "
            f"{grounding_location['latitude']:.4f}° N, {grounding_location['longitude']:.4f}° E. Dispatch shore patrol team "
            f"to visually inspect rocky intertidal reefs."
        )
    elif needs_inputs and not has_forecast:
        recommended_action = (
            f"Generate Hydrodynamic Forecast: Calculate 24h Lagrangian particle advection to resolve downstream "
            f"dispersal corridor before scheduling physical recovery."
        )
    elif forecast_is_stale:
        recommended_action = (
            f"Regenerate Hydrodynamic Forecast: Latest drift model is >24h old. Recalculate advection vectors using "
            f"latest surface current and wind observation data."
        )
    elif priority == PriorityBandEnum.CRITICAL:
        recommended_action = (
            f"Mobilize Rapid Recovery Mission: High composite risk driven by gear lethality and rapid advection. "
            f"Stage recovery mission in Recovery Planning."
        )
    elif priority == PriorityBandEnum.HIGH:
        recommended_action = (
            f"Stage Recovery Mission: High risk gear adrift in operational sector. Review recovery vessel availability "
            f"and coordinate retrieval window."
        )
    elif priority == PriorityBandEnum.MEDIUM:
        recommended_action = (
            f"Routine Operations Queue: Retain in recovery planning ledger. Re-evaluate if surface current vectors shift "
            f"toward sensitive nearshore sanctuaries."
        )
    else:
        recommended_action = (
            f"Passive Monitoring: Logged in operational repository. Low immediate ecological hazard."
        )

    # Environmental observation summary metrics if available
    obs = db.query(EnvironmentalObservation).filter(
        EnvironmentalObservation.report_id == report.id
    ).order_by(desc(EnvironmentalObservation.observed_at)).first()

    current_spd = float(obs.current_speed) if obs and obs.current_speed is not None else None
    wind_spd = float(obs.wind_speed) if obs and obs.wind_speed is not None else None
    wave_ht = float(obs.wave_height) if obs and obs.wave_height is not None else None
    env_source = obs.source if obs else None

    factors_dict = {
        "gear_hazard": factor_gear,
        "wildlife_risk": factor_wildlife,
        "drift_dispersal": factor_drift,
        "coastal_grounding": factor_grounding,
        "temporal_age": factor_age,
    }

    return {
        "report_id": report.id,
        "gear_type": report.gear_type or "Unclassified",
        "reported_at": report.reported_at,
        "latitude": start_lat,
        "longitude": start_lon,
        "status": report.status,
        "risk_score": total_score,
        "priority": priority,
        "data_confidence": data_confidence,
        "needs_inputs": needs_inputs,
        "completeness_status": completeness_status,
        "primary_reason": primary_reason,
        "explanation": explanation,
        "recommended_action": recommended_action,
        "factors": factors_dict,
        "missing_inputs": missing_inputs,
        "stale_inputs": stale_inputs,
        "wildlife_impact_confirmed": wildlife_confirmed,
        "grounding_detected": grounding_detected,
        "grounding_step": grounding_step,
        "grounding_location": grounding_location,
        "min_shoreline_distance_km": min_shoreline_dist_km,
        "has_forecast": has_forecast,
        "latest_forecast_id": latest_forecast_id,
        "forecast_generated_time": forecast_generated_time,
        "forecast_validity_period_hours": forecast_validity_hours,
        "forecast_is_stale": forecast_is_stale,
        "forecast_points_count": valid_points_count if valid_points_count is not None else (hypo_points_count or 0),
        "valid_trajectory_points_count": valid_points_count,
        "hypothetical_trajectory_points_count": hypo_points_count,
        "net_displacement_km": net_displacement_km,
        "total_path_distance_km": total_path_dist_km,
        "hypothetical_net_displacement_km": hypo_net_displacement_km,
        "hypothetical_total_path_distance_km": hypo_total_path_dist_km,
        "current_speed": current_spd,
        "wind_speed": wind_spd,
        "wave_height": wave_ht,
        "environmental_source": env_source,
        "assessed_at": now_utc,
        "updated_at": now_utc,
        "assessment_timestamp": now_utc,
        "calculation_version": "v3.5-verified",
    }


def evaluate_and_persist_incident_risk(
    report_id: int,
    db: Session,
    weights: Optional[RiskWeightConfig] = None,
    persist: bool = True
) -> RiskAssessmentResponse:
    """
    Computes risk assessment for a specific incident and persists to database if default weights used.
    """
    report = db.get(GearReport, report_id)
    if not report:
        raise ValueError(f"GearReport #{report_id} does not exist.")

    res_dict = calculate_incident_risk(report, db, weights)

    if persist and weights is None:
        # Upsert into risk_assessments table
        existing = db.query(RiskAssessment).filter(RiskAssessment.report_id == report_id).first()
        now_utc = datetime.now(timezone.utc)

        # Convert factors to serializable dict for JSONB
        factors_json = {
            k: v.model_dump() for k, v in res_dict["factors"].items()
        }

        audit_metadata = {
            "grounding_detected": res_dict["grounding_detected"],
            "grounding_step": res_dict["grounding_step"],
            "has_forecast": res_dict["has_forecast"],
            "latest_forecast_id": res_dict.get("latest_forecast_id"),
            "forecast_is_stale": res_dict.get("forecast_is_stale"),
            "valid_points_count": res_dict.get("valid_trajectory_points_count"),
            "hypothetical_points_count": res_dict.get("hypothetical_trajectory_points_count"),
            "valid_net_displacement_km": res_dict.get("net_displacement_km"),
            "hypothetical_net_displacement_km": res_dict.get("hypothetical_net_displacement_km"),
            "valid_path_distance_km": res_dict.get("total_path_distance_km"),
            "hypothetical_path_distance_km": res_dict.get("hypothetical_total_path_distance_km"),
            "min_shoreline_distance_km": res_dict.get("min_shoreline_distance_km"),
            "weights": DEFAULT_WEIGHTS.model_dump(),
        }

        if existing:
            existing.risk_score = Decimal(str(res_dict["risk_score"]))
            existing.priority = res_dict["priority"].value
            existing.data_confidence = res_dict["data_confidence"].value
            existing.needs_inputs = res_dict["needs_inputs"]
            existing.primary_reason = res_dict["primary_reason"]
            existing.explanation = res_dict["explanation"]
            existing.recommended_action = res_dict["recommended_action"]
            existing.factors = factors_json
            existing.missing_inputs = res_dict["missing_inputs"]
            existing.metadata_info = audit_metadata
            existing.updated_at = now_utc
            db.commit()
            db.refresh(existing)
            res_dict["assessment_id"] = existing.id
        else:
            new_record = RiskAssessment(
                report_id=report_id,
                risk_score=Decimal(str(res_dict["risk_score"])),
                priority=res_dict["priority"].value,
                data_confidence=res_dict["data_confidence"].value,
                needs_inputs=res_dict["needs_inputs"],
                primary_reason=res_dict["primary_reason"],
                explanation=res_dict["explanation"],
                recommended_action=res_dict["recommended_action"],
                factors=factors_json,
                missing_inputs=res_dict["missing_inputs"],
                metadata_info=audit_metadata,
                assessed_at=now_utc,
                updated_at=now_utc,
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)
            res_dict["assessment_id"] = new_record.id

    return RiskAssessmentResponse(**res_dict)


def get_risk_prioritized_queue(
    db: Session,
    priority: Optional[str] = None,
    gear_type: Optional[str] = None,
    wildlife: Optional[str] = None,
    completeness: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "risk_score",
    sort_order: str = "desc",
    weights: Optional[RiskWeightConfig] = None,
) -> RiskQueueResponse:
    """
    Evaluates and ranks all verified incidents.
    Supports filtering, searching, and sorting across the priority queue.
    System-wide summary metrics (counts and average score) remain strictly filter-independent.
    """
    active_weights = _normalize_weights(weights)

    # Only verified incidents are admitted into the active recovery triage queue
    verified_reports = db.query(GearReport).filter(
        GearReport.status.in_(["verified", "scheduled_recovery"])
    ).all()

    assessed_items: List[RiskAssessmentResponse] = []

    for rep in verified_reports:
        # Calculate dynamic risk assessment
        res_dict = calculate_incident_risk(rep, db, active_weights)
        resp = RiskAssessmentResponse(**res_dict)
        assessed_items.append(resp)

    # Compute system-wide summary counts and average score across ALL verified items before filtering
    total_verified = len(verified_reports)
    critical_cnt = sum(1 for i in assessed_items if i.priority == PriorityBandEnum.CRITICAL)
    high_cnt = sum(1 for i in assessed_items if i.priority == PriorityBandEnum.HIGH)
    medium_cnt = sum(1 for i in assessed_items if i.priority == PriorityBandEnum.MEDIUM)
    low_cnt = sum(1 for i in assessed_items if i.priority == PriorityBandEnum.LOW)
    needs_inputs_cnt = sum(1 for i in assessed_items if i.needs_inputs)
    avg_score = round(sum(i.risk_score for i in assessed_items) / total_verified, 1) if total_verified > 0 else 0.0

    summary = RiskQueueSummary(
        total_assessed=total_verified,
        total_verified=total_verified,
        critical_count=critical_cnt,
        high_count=high_cnt,
        medium_count=medium_cnt,
        low_count=low_cnt,
        needs_inputs_count=needs_inputs_cnt,
        verified_count=total_verified,
        average_score=avg_score,
    )

    filtered = assessed_items

    # 1. Filter by Priority
    if priority and priority.lower() != "all":
        p_val = priority.lower()
        filtered = [i for i in filtered if i.priority.value == p_val]

    # 2. Filter by Gear Type
    if gear_type and gear_type.lower() != "all":
        g_val = gear_type.lower()
        filtered = [i for i in filtered if g_val in i.gear_type.lower()]

    # 3. Filter by Wildlife Impact
    if wildlife and wildlife.lower() != "all":
        w_val = wildlife.lower()
        if w_val in ["confirmed", "entangled"]:
            filtered = [i for i in filtered if i.wildlife_impact_confirmed]
        elif w_val in ["unconfirmed", "none"]:
            filtered = [i for i in filtered if not i.wildlife_impact_confirmed]

    # 4. Filter by Completeness & Confidence
    if completeness and completeness.lower() != "all":
        c_val = completeness.lower()
        if c_val in ["needs_inputs", "incomplete"]:
            filtered = [i for i in filtered if i.needs_inputs]
        elif c_val in ["complete", "operational_complete"]:
            filtered = [i for i in filtered if not i.needs_inputs]
        elif c_val in ["low_confidence", "confidence_low", "low"]:
            filtered = [i for i in filtered if i.data_confidence == DataConfidenceEnum.LOW]
        elif c_val in ["medium_confidence", "confidence_medium", "medium"]:
            filtered = [i for i in filtered if i.data_confidence == DataConfidenceEnum.MEDIUM]
        elif c_val in ["high_confidence", "confidence_high", "high"]:
            filtered = [i for i in filtered if i.data_confidence == DataConfidenceEnum.HIGH]

    # 5. Search by ID or location coordinates
    if search and search.strip():
        q = search.strip().lower()
        filtered = [
            i for i in filtered
            if q in str(i.report_id)
            or q in i.gear_type.lower()
            or q in i.primary_reason.lower()
            or q in f"{i.latitude:.2f} {i.longitude:.2f}"
        ]

    # 6. Sorting
    reverse = (sort_order.lower() == "desc")
    if sort_by in ["risk_score", "score"]:
        filtered.sort(key=lambda x: x.risk_score, reverse=reverse)
    elif sort_by in ["report_id", "id", "incident_id"]:
        filtered.sort(key=lambda x: x.report_id, reverse=reverse)
    elif sort_by in ["reported_at", "age"]:
        min_dt = datetime.min.replace(tzinfo=timezone.utc)
        filtered.sort(key=lambda x: x.reported_at or min_dt, reverse=reverse)
    elif sort_by == "gear_type":
        filtered.sort(key=lambda x: x.gear_type, reverse=reverse)
    elif sort_by == "confidence":
        conf_order = {DataConfidenceEnum.HIGH: 3, DataConfidenceEnum.MEDIUM: 2, DataConfidenceEnum.LOW: 1}
        filtered.sort(key=lambda x: conf_order.get(x.data_confidence, 0), reverse=reverse)
    else:
        filtered.sort(key=lambda x: x.risk_score, reverse=reverse)

    return RiskQueueResponse(
        summary=summary,
        items=filtered,
        weights=active_weights,
    )
