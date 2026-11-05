"""
Drift calculation engine implementing Lagrangian particle advection
driven by ocean surface current vectors and windage leeway coefficients.
Independently testable pure-Python calculation routines.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple

from app.services.environmental_service import (
    STUDY_BOUNDARY,
    is_within_study_boundary,
    convert_wind_to_uv,
    convert_current_to_uv,
)

METERS_PER_DEGREE_LAT = 111320.0

# Maharashtra & Goa continental coastline approximation (high-water shoreline contour)
KONKAN_COASTLINE_CONTOUR: List[Tuple[float, float]] = [
    (14.0, 74.32),
    (14.5, 74.28),
    (15.0, 73.85),
    (15.5, 73.76),
    (16.0, 73.52),
    (16.5, 73.36),
    (16.8, 73.30),
    (17.0, 73.32),
    (17.2, 73.23),
    (17.5, 73.18),
    (18.0, 73.02),
    (18.5, 72.90),
    (19.0, 72.82),
    (19.5, 72.76),
    (20.0, 72.70),
]


def get_approximate_coastline_lon(lat: float) -> float:
    """
    Interpolates the longitude of the Indian western continental coastline for a given latitude.
    """
    if lat <= KONKAN_COASTLINE_CONTOUR[0][0]:
        return KONKAN_COASTLINE_CONTOUR[0][1]
    if lat >= KONKAN_COASTLINE_CONTOUR[-1][0]:
        return KONKAN_COASTLINE_CONTOUR[-1][1]
    for i in range(len(KONKAN_COASTLINE_CONTOUR) - 1):
        lat0, lon0 = KONKAN_COASTLINE_CONTOUR[i]
        lat1, lon1 = KONKAN_COASTLINE_CONTOUR[i + 1]
        if lat0 <= lat <= lat1:
            ratio = (lat - lat0) / (lat1 - lat0)
            return lon0 + ratio * (lon1 - lon0)
    return 73.30


def is_land_coordinate(lat: float, lon: float) -> bool:
    """
    Evaluates whether a geographic point falls on the Indian terrestrial landmass east of the coastline.
    For the pilot study boundary (14°N to 20°N), coordinates east of the coastline contour are terrestrial.
    """
    if lat < 14.0 or lat > 20.0 or lon < 68.0 or lon > 74.0:
        return False
    coast_lon = get_approximate_coastline_lon(lat)
    return lon > coast_lon


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance in kilometers between two WGS84 points using Haversine formula.
    """
    R = 6371.0  # Earth mean radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 3)


def step_advection(
    lat: float,
    lon: float,
    u_ms: float,
    v_ms: float,
    dt_seconds: float
) -> Tuple[float, float]:
    """
    Integrates geographic displacement over dt_seconds given eastward (u)
    and northward (v) velocity components in meters per second.
    
    Correctly accounts for latitude convergence when converting eastward displacement to longitude:
    dx = u * dt
    dy = v * dt
    d_lat = dy / METERS_PER_DEGREE_LAT
    d_lon = dx / (METERS_PER_DEGREE_LAT * cos(lat))
    """
    dx = u_ms * dt_seconds
    dy = v_ms * dt_seconds

    # Delta latitude
    d_lat = dy / METERS_PER_DEGREE_LAT

    # Delta longitude (meridians converge with cos(latitude))
    lat_rad = math.radians(lat)
    cos_lat = max(math.cos(lat_rad), 1e-6)  # Prevent division by zero near poles
    d_lon = dx / (METERS_PER_DEGREE_LAT * cos_lat)

    new_lat = max(-90.0, min(90.0, lat + d_lat))
    new_lon = lon + d_lon

    # Normalize longitude to [-180, 180]
    while new_lon > 180.0:
        new_lon -= 360.0
    while new_lon < -180.0:
        new_lon += 360.0

    return round(new_lat, 6), round(new_lon, 6)


# -------------------------------------------------------------------------
# SCIENTIFIC WINDAGE, LEEWAY, AND COMBINED SURFACE DRIFT VELOCITY ENGINE
# -------------------------------------------------------------------------

DEFAULT_GEAR_WINDAGE: Dict[str, float] = {
    "gillnet": 0.025,       # Standard floating pelagic gillnet with headrope floats (2.5%)
    "trawl": 0.015,         # Trawl netting with lower buoyancy / waterlogged (1.5%)
    "longline": 0.020,      # Monofilament main line with intermittent floats (2.0%)
    "traps": 0.000,         # Pots / traps (benthic / submerged, 0.0%)
    "pot": 0.000,           # Pots / traps (0.0%)
    "crab_pot": 0.000,      # Pots / traps (0.0%)
    "fad": 0.040,           # Fish Aggregating Devices with surface floats/canopy (4.0%)
    "purse_seine": 0.025,   # Corkline purse seine floats (2.5%)
    "other": 0.020,         # Baseline marine debris (2.0%)
}


def get_recommended_windage(gear_type: Optional[str] = None, is_submerged: bool = False) -> float:
    """
    Returns recommended aerodynamic surface windage coefficient based on gear physical buoyancy.
    If gear is submerged, windage is 0.0 (subsurface currents dominate, zero direct windage).
    """
    if is_submerged:
        return 0.0
    if not gear_type:
        return 0.025
    g_clean = gear_type.strip().lower()
    for k, v in DEFAULT_GEAR_WINDAGE.items():
        if k in g_clean:
            return v
    return 0.025


def calculate_leeway_vector(
    wind_speed_ms: Optional[float],
    wind_direction_from_deg: Optional[float],
    windage_factor: float
) -> Tuple[float, Optional[float], float, float]:
    """
    Calculates downwind leeway velocity components:
    - leeway_speed = wind_speed_10m * windage_factor (m/s)
    - downwind_bearing = (wind_direction_from + 180.0) % 360.0 (degrees toward which leeway pushes)
    - u_leeway = leeway_speed * sin(downwind_bearing_rad) (eastward, m/s)
    - v_leeway = leeway_speed * cos(downwind_bearing_rad) (northward, m/s)
    
    Coordinate Convention:
    - Eastward velocity = positive U
    - Northward velocity = positive V
    - Bearing measured clockwise from North (0° = North, 90° = East, 180° = South, 270° = West).
    
    Returns:
        (leeway_speed, downwind_bearing, u_leeway, v_leeway)
    """
    if wind_speed_ms is None or wind_speed_ms < 0.0 or windage_factor <= 0.0:
        return 0.0, None, 0.0, 0.0

    leeway_speed = float(wind_speed_ms) * float(windage_factor)
    if wind_direction_from_deg is None:
        return leeway_speed, None, 0.0, 0.0

    downwind_deg = (float(wind_direction_from_deg) + 180.0) % 360.0
    rad = math.radians(downwind_deg)
    u_leeway = leeway_speed * math.sin(rad)
    v_leeway = leeway_speed * math.cos(rad)
    return leeway_speed, downwind_deg, u_leeway, v_leeway


def calculate_combined_drift_vector(
    u_current: float,
    v_current: float,
    u_leeway: float,
    v_leeway: float
) -> Tuple[float, float, float, float]:
    """
    Combines ocean current vector and wind-driven leeway vector:
    u_drift = u_current + u_leeway
    v_drift = v_current + v_leeway
    drift_speed = sqrt(u_drift^2 + v_drift^2)
    drift_bearing = (degrees(atan2(u_drift, v_drift)) + 360.0) % 360.0
    
    Consistent units: m/s.
    
    Returns:
        (u_drift, v_drift, drift_speed, drift_bearing)
    """
    u_drift = float(u_current) + float(u_leeway)
    v_drift = float(v_current) + float(v_leeway)
    drift_speed = math.sqrt(u_drift**2 + v_drift**2)
    if drift_speed > 1e-7:
        drift_bearing = (math.degrees(math.atan2(u_drift, v_drift)) + 360.0) % 360.0
    else:
        drift_bearing = 0.0
    return u_drift, v_drift, drift_speed, drift_bearing


def calculate_drift_trajectory(
    start_lat: float,
    start_lon: float,
    start_time: datetime,
    duration_hours: int,
    env_conditions: Dict[str, Any],
    time_step_hours: int = 1,
    windage: float = 0.025
) -> Dict[str, Any]:
    """
    Computes timestamped Lagrangian drift trajectory points starting from (start_lat, start_lon)
    over duration_hours combining surface current velocity and windage leeway:
    
    V_drift = V_current + V_leeway
    where V_leeway = windage * V_wind_downwind
    
    Inputs:
        start_lat: WGS84 starting latitude (-90 to 90)
        start_lon: WGS84 starting longitude (-180 to 180)
        start_time: Datetime corresponding to report or simulation baseline
        duration_hours: Total duration (e.g. 6, 12, 24, 48)
        env_conditions: Environmental conditions dictionary from environmental_service
        time_step_hours: Integration interval in hours (default: 1)
        windage: Fractional windage coefficient (default: 0.025 for ALDFG)
    
    Returns:
        Structured dictionary containing trajectory metadata, boundary containment, and points list.
    """
    if start_lat < -90.0 or start_lat > 90.0:
        raise ValueError(f"Invalid latitude {start_lat}. Must be between -90 and 90.")
    if start_lon < -180.0 or start_lon > 180.0:
        raise ValueError(f"Invalid longitude {start_lon}. Must be between -180 and 180.")
    if duration_hours <= 0:
        raise ValueError("Duration must be a positive integer.")
    if time_step_hours <= 0:
        raise ValueError("Time step must be a positive integer.")
    if windage < 0.0 or windage > 0.15:
        raise ValueError("Windage coefficient must be between 0.0 and 0.15.")
    if not env_conditions or not isinstance(env_conditions, dict):
        raise ValueError("Valid environmental conditions data is required for trajectory calculation.")

    is_simulation = env_conditions.get("mode") == "simulation"
    source = env_conditions.get("source", "Environmental Current Telemetry")
    hourly_series = env_conditions.get("hourly_series", [])

    # Default fallback velocity if time series is sparse
    default_u = env_conditions.get("current_u")
    default_v = env_conditions.get("current_v")
    default_wind_spd = env_conditions.get("wind_speed")
    default_wind_dir = env_conditions.get("wind_direction")

    if default_u is None or default_v is None or math.isnan(default_u) or math.isnan(default_v):
        raise ValueError("Cannot calculate drift: essential velocity components are missing or NaN.")

    # Pre-parse timestamps in hourly_series for temporal alignment with incident loss time
    series_by_time: List[Tuple[datetime, Dict[str, Any]]] = []
    for entry in hourly_series:
        t_val = entry.get("time")
        if t_val:
            try:
                parsed_t = datetime.fromisoformat(str(t_val).replace("Z", "+00:00"))
                if parsed_t.tzinfo is None:
                    parsed_t = parsed_t.replace(tzinfo=timezone.utc)
                series_by_time.append((parsed_t, entry))
            except Exception:
                pass

    dt_seconds = time_step_hours * 3600.0
    num_steps = math.ceil(duration_hours / time_step_hours)

    curr_lat = start_lat
    curr_lon = start_lon
    curr_time = start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)

    # Initial boundary & coastline check
    initial_in_boundary = is_within_study_boundary(curr_lat, curr_lon)
    boundary_contained = initial_in_boundary
    boundary_exit_step = None if initial_in_boundary else 0

    grounding_detected = is_land_coordinate(curr_lat, curr_lon)
    grounding_step = 0 if grounding_detected else None
    grounding_location = {"latitude": curr_lat, "longitude": curr_lon} if grounding_detected else None

    # Step 0: Origin at t=0
    lw_spd_0, lw_dir_0, lw_u_0, lw_v_0 = calculate_leeway_vector(default_wind_spd, default_wind_dir, windage)
    u_drift_0, v_drift_0, drift_spd_0, drift_dir_0 = calculate_combined_drift_vector(
        default_u, default_v, lw_u_0, lw_v_0
    )

    points: List[Dict[str, Any]] = [{
        "step_index": 0,
        "forecast_time": curr_time.isoformat(),
        "latitude": curr_lat,
        "longitude": curr_lon,
        "current_u": default_u,
        "current_v": default_v,
        "current_speed": env_conditions.get("current_velocity", 0.0),
        "current_direction": env_conditions.get("current_direction", 0.0),
        "wind_speed": default_wind_spd,
        "wind_direction": default_wind_dir,
        "windage_coefficient": windage,
        "leeway_speed": lw_spd_0,
        "leeway_direction": lw_dir_0,
        "leeway_u": lw_u_0,
        "leeway_v": lw_v_0,
        "drift_u": u_drift_0,
        "drift_v": v_drift_0,
        "drift_speed": drift_spd_0,
        "drift_direction": drift_dir_0,
        "boundary_contained": initial_in_boundary,
        "is_grounded": grounding_detected,
        "drift_status": "grounded" if grounding_detected else "active_drift",
        "is_valid_drift": True,
        "distance_km": 0.0,
        "segment_distance_km": 0.0,
        "risk_score": 10.0,
        "model_name": "Lagrangian Advection V2.2",
        "simulation_mode": is_simulation,
        "source": source
    }]

    cumulative_path_distance_km = 0.0
    valid_path_distance_km = 0.0

    for step in range(1, num_steps + 1):
        prev_lat, prev_lon = curr_lat, curr_lon

        # Look up hourly vectors for this step temporally aligned to forecast_time
        series_entry = None
        if series_by_time:
            curr_utc = curr_time if curr_time.tzinfo else curr_time.replace(tzinfo=timezone.utc)
            best_diff = None
            best_rec = None
            for s_dt, s_rec in series_by_time:
                diff = abs((s_dt - curr_utc).total_seconds())
                if best_diff is None or diff < best_diff:
                    best_diff = diff
                    best_rec = s_rec
            # Use closest hourly observation within a 3-hour tolerance window
            if best_diff is not None and best_diff <= 10800:
                series_entry = best_rec

        # Fall back to step index if no timestamp match is available
        if series_entry is None and step - 1 < len(hourly_series):
            series_entry = hourly_series[step - 1]

        if series_entry is not None:
            u_cand = series_entry.get("u") if "u" in series_entry else series_entry.get("current_u")
            v_cand = series_entry.get("v") if "v" in series_entry else series_entry.get("current_v")
            if u_cand is None or v_cand is None or (isinstance(u_cand, float) and math.isnan(u_cand)) or (isinstance(v_cand, float) and math.isnan(v_cand)):
                raise ValueError("Cannot calculate drift: essential velocity components are missing or NaN.")
            u_step = float(u_cand)
            v_step = float(v_cand)
            spd_step = series_entry.get("speed", env_conditions.get("current_velocity", 0.0))
            dir_step = series_entry.get("direction", env_conditions.get("current_direction", 0.0))
            w_spd_step = series_entry.get("wind_speed", default_wind_spd)
            w_dir_step = series_entry.get("wind_direction", default_wind_dir)
        else:
            u_step = float(default_u)
            v_step = float(default_v)
            spd_step = env_conditions.get("current_velocity", 0.0)
            dir_step = env_conditions.get("current_direction", 0.0)
            w_spd_step = default_wind_spd
            w_dir_step = default_wind_dir

        # Calculate wind-driven leeway vector:
        lw_spd_step, lw_dir_step, lw_u_step, lw_v_step = calculate_leeway_vector(w_spd_step, w_dir_step, windage)

        # Combine ocean current with windage leeway via vector addition:
        u_combined, v_combined, drift_spd_step, drift_dir_step = calculate_combined_drift_vector(
            u_step, v_step, lw_u_step, lw_v_step
        )

        # Advect geographic coordinates using combined drift velocity:
        curr_lat, curr_lon = step_advection(curr_lat, curr_lon, u_combined, v_combined, dt_seconds)
        curr_time = curr_time + timedelta(seconds=dt_seconds)

        # Boundary check
        in_bounds = is_within_study_boundary(curr_lat, curr_lon)
        if not in_bounds and boundary_contained:
            boundary_contained = False
            boundary_exit_step = step

        # Land mask / coastal grounding check
        # Under physical search & rescue models, an adrift particle reaching the shoreline strands/grounds.
        # Coordinates are preserved exactly and never silently pushed offshore.
        is_land = is_land_coordinate(curr_lat, curr_lon)
        if is_land and not grounding_detected:
            grounding_detected = True
            grounding_step = step
            grounding_location = {"latitude": curr_lat, "longitude": curr_lon}

        # Explicit grounding semantics:
        # Steps prior to grounding: active_drift (valid)
        # Grounding step itself: grounded (valid terminus)
        # Steps after grounding: post_grounding_hypothetical (invalid for maritime drift)
        if not grounding_detected:
            pt_status = "active_drift"
            pt_grounded = False
            pt_valid = True
        elif step == grounding_step:
            pt_status = "grounded"
            pt_grounded = True
            pt_valid = True
        else:
            pt_status = "post_grounding_hypothetical"
            pt_grounded = True
            pt_valid = False

        # Distance calculations:
        # 1. Segment distance (arc length for this step)
        seg_dist = calculate_haversine_distance_km(prev_lat, prev_lon, curr_lat, curr_lon)
        cumulative_path_distance_km += seg_dist
        if pt_valid:
            valid_path_distance_km += seg_dist

        # 2. Straight-line geodesic displacement from origin
        dist_from_origin = calculate_haversine_distance_km(start_lat, start_lon, curr_lat, curr_lon)

        # Dynamic risk score: only valid active/grounded points carry operational risk;
        # post-grounding hypothetical points are deactivated
        if pt_valid:
            combined_velocity_mag = math.sqrt(u_combined**2 + v_combined**2)
            risk = min(98.0, round(12.0 + dist_from_origin * 1.6 + combined_velocity_mag * 12.0, 1))
        else:
            risk = None

        points.append({
            "step_index": step,
            "forecast_time": curr_time.isoformat(),
            "latitude": curr_lat,
            "longitude": curr_lon,
            "current_u": round(u_step, 4),
            "current_v": round(v_step, 4),
            "current_speed": round(spd_step, 4) if spd_step is not None else None,
            "current_direction": round(dir_step, 1) if dir_step is not None else None,
            "wind_speed": round(w_spd_step, 2) if w_spd_step is not None else None,
            "wind_direction": round(w_dir_step, 1) if w_dir_step is not None else None,
            "windage_coefficient": windage,
            "leeway_speed": lw_spd_step,
            "leeway_direction": lw_dir_step,
            "leeway_u": lw_u_step,
            "leeway_v": lw_v_step,
            "drift_u": u_combined,
            "drift_v": v_combined,
            "drift_speed": drift_spd_step,
            "drift_direction": drift_dir_step,
            "boundary_contained": in_bounds,
            "is_grounded": pt_grounded,
            "drift_status": pt_status,
            "is_valid_drift": pt_valid,
            "distance_km": dist_from_origin,
            "segment_distance_km": seg_dist,
            "risk_score": risk,
            "model_name": "Lagrangian Advection V2.2",
            "simulation_mode": is_simulation,
            "source": source
        })

    valid_points = [p for p in points if p["is_valid_drift"]]
    valid_points_count = len(valid_points)
    valid_drift_duration_hours = (valid_points_count - 1) * time_step_hours if valid_points_count > 0 else 0

    if grounding_detected:
        grounding_pt = points[grounding_step]
        net_displacement_km = grounding_pt["distance_km"]
        total_path_distance_km = round(valid_path_distance_km, 3)
        hypothetical_net_displacement_km = points[-1]["distance_km"]
        hypothetical_total_path_distance_km = round(cumulative_path_distance_km, 3)
        grounding_status = "estimated_grounding"
        grounding_disclaimer = (
            f"Grounding Estimate: Dispersal trajectory intersects the coastline model at step #{grounding_step} "
            f"({grounding_pt['latitude']}°N, {grounding_pt['longitude']}°E) after {valid_drift_duration_hours}h. "
            "Under maritime search and rescue protocols, pelagic drift terminates upon shoreline contact or reef entanglement. "
            f"Subsequent points ({len(points) - valid_points_count} steps) represent hypothetical unconstrained projections "
            "and are excluded from valid drift metrics. "
            "Operational Qualification: This is an estimated landfall corridor based on a regional coastline contour, "
            "not verified physical recovery or exact beach coordinate. Surf-zone wave breaking and high-tide refloating are not modeled."
        )
    else:
        net_displacement_km = points[-1]["distance_km"]
        total_path_distance_km = round(cumulative_path_distance_km, 3)
        hypothetical_net_displacement_km = None
        hypothetical_total_path_distance_km = None
        grounding_status = "offshore_adrift"
        grounding_disclaimer = (
            "Offshore Adrift: Trajectory remains entirely offshore within the maritime study boundary. "
            "No shoreline grounding detected over forecast duration."
        )

    # Average metrics calculated strictly across valid active/grounded drift points
    valid_speeds = [p["current_speed"] for p in valid_points if p.get("current_speed") is not None]
    valid_winds = [p["wind_speed"] for p in valid_points if p.get("wind_speed") is not None]
    valid_leeway_speeds = [p["leeway_speed"] for p in valid_points if p.get("leeway_speed") is not None]
    valid_drift_speeds = [p["drift_speed"] for p in valid_points if p.get("drift_speed") is not None]

    avg_speed = round(sum(valid_speeds) / len(valid_speeds), 3) if valid_speeds else 0.0
    avg_wind = round(sum(valid_winds) / len(valid_winds), 2) if valid_winds else None
    avg_leeway = round(sum(valid_leeway_speeds) / len(valid_leeway_speeds), 5) if valid_leeway_speeds else (
        round(avg_wind * windage, 5) if avg_wind is not None else None
    )
    avg_drift_speed = round(sum(valid_drift_speeds) / len(valid_drift_speeds), 4) if valid_drift_speeds else 0.0

    valid_drift_u = [p["drift_u"] for p in valid_points if p.get("drift_u") is not None]
    valid_drift_v = [p["drift_v"] for p in valid_points if p.get("drift_v") is not None]
    if valid_drift_u and valid_drift_v:
        mean_u = sum(valid_drift_u) / len(valid_drift_u)
        mean_v = sum(valid_drift_v) / len(valid_drift_v)
        avg_drift_direction = round((math.degrees(math.atan2(mean_u, mean_v)) + 360.0) % 360.0, 1)
    else:
        avg_drift_direction = None

    valid_lw_u = [p["leeway_u"] for p in valid_points if p.get("leeway_u") is not None]
    valid_lw_v = [p["leeway_v"] for p in valid_points if p.get("leeway_v") is not None]
    if valid_lw_u and valid_lw_v:
        mean_lw_u = sum(valid_lw_u) / len(valid_lw_u)
        mean_lw_v = sum(valid_lw_v) / len(valid_lw_v)
        avg_leeway_direction = round((math.degrees(math.atan2(mean_lw_u, mean_lw_v)) + 360.0) % 360.0, 1)
    else:
        avg_leeway_direction = None

    boundary_warning = (
        f"Trajectory remained within study boundary ({STUDY_BOUNDARY['name']})."
        if boundary_contained
        else f"Warning: Trajectory exited defined study boundary ({STUDY_BOUNDARY['name']}) at forecast step #{boundary_exit_step}."
    )

    return {
        "start_latitude": start_lat,
        "start_longitude": start_lon,
        "start_time": start_time.isoformat() if hasattr(start_time, "isoformat") else str(start_time),
        "duration_hours": duration_hours,
        "time_step_hours": time_step_hours,
        "points_count": len(points),
        "valid_points_count": valid_points_count,
        "valid_drift_duration_hours": valid_drift_duration_hours,
        "source": source,
        "simulation_mode": is_simulation,
        "current_speed_avg": avg_speed,
        "current_direction_avg": env_conditions.get("current_direction"),
        "wind_speed_avg": avg_wind,
        "wind_direction_avg": env_conditions.get("wind_direction"),
        "windage": windage,
        "leeway_speed_avg": avg_leeway,
        "leeway_direction_avg": avg_leeway_direction,
        "combined_drift_speed_avg": avg_drift_speed,
        "combined_drift_direction_avg": avg_drift_direction,
        "boundary_contained": boundary_contained,
        "boundary_exit_step": boundary_exit_step,
        "grounding_detected": grounding_detected,
        "grounding_step": grounding_step,
        "grounding_location": grounding_location,
        "grounding_status": grounding_status,
        "grounding_disclaimer": grounding_disclaimer,
        "study_boundary": STUDY_BOUNDARY,
        "calculation_method": "Second-Order Surface Hydrodynamic Advection + Leeway Drift (Spherical WGS84)",
        "assumptions": (
            f"Advection combines Open-Meteo surface currents with downwind leeway ({windage * 100:.1f}% windage factor). "
            "Latitudinal meridian convergence is integrated at every step."
        ),
        "limitations": (
            "Prototype drift estimate. Does not account for sub-surface net deformation, localized bathymetric friction, "
            "or non-linear Stokes wave drift. Positions indicate high-probability search corridors, not guaranteed recovery coordinates. "
            + boundary_warning + " " + grounding_disclaimer
        ),
        "net_displacement_km": net_displacement_km,
        "total_path_distance_km": total_path_distance_km,
        "total_displacement_km": net_displacement_km,  # Backward compatibility alias
        "hypothetical_net_displacement_km": hypothetical_net_displacement_km,
        "hypothetical_total_path_distance_km": hypothetical_total_path_distance_km,
        "points": points
    }
