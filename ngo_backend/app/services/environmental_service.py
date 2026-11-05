"""
Environmental data service integrating Open-Meteo Marine API (primary)
and Open-Meteo Weather API (supporting) with rigorous validation,
spherical coordinate awareness, historical/forecast alignment, PostGIS persistence,
and explicit simulation fallback for coastal land masks.
"""

import json
import logging
import math
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint

from app.models.environmental_observation import EnvironmentalObservation

logger = logging.getLogger(__name__)

# Lightweight in-memory cache: (lat_round, lon_round, date_key) -> (cached_at_timestamp, data_dict)
_ENV_CACHE: Dict[Tuple[float, float, str], Tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


def clear_environmental_cache() -> None:
    """
    Clears the in-memory environmental telemetry cache. Useful for tests and cache busting.
    """
    _ENV_CACHE.clear()


# Project study boundary (Eastern Arabian Sea / Konkan Shelf, Maharashtra & Goa, India)
STUDY_BOUNDARY = {
    "name": "Eastern Arabian Sea / Konkan Shelf Study Boundary",
    "min_lat": 14.0,
    "max_lat": 20.0,
    "min_lon": 68.0,
    "max_lon": 74.0,
}


def is_within_study_boundary(latitude: float, longitude: float) -> bool:
    """
    Checks if a coordinate point falls inside the project's primary study boundary.
    """
    return (
        STUDY_BOUNDARY["min_lat"] <= latitude <= STUDY_BOUNDARY["max_lat"]
        and STUDY_BOUNDARY["min_lon"] <= longitude <= STUDY_BOUNDARY["max_lon"]
    )


def convert_current_to_uv(speed_ms: float, direction_deg: float) -> Tuple[float, float]:
    """
    Converts oceanographic current speed (m/s) and flow direction (degrees 0-360 clockwise from North,
    towards which water flows) into eastward (u) and northward (v) velocity components.
    
    u = speed * sin(direction)
    v = speed * cos(direction)
    """
    rad = math.radians(direction_deg % 360.0)
    u = speed_ms * math.sin(rad)
    v = speed_ms * math.cos(rad)
    return round(u, 4), round(v, 4)


def convert_wind_to_uv(speed_ms: float, direction_from_deg: float) -> Tuple[float, float]:
    """
    Converts meteorological wind speed (m/s) and wind direction (degrees 0-360 from which wind blows)
    into downwind eastward (u) and northward (v) leeway velocity components.
    
    Downwind direction = (direction_from_deg + 180) % 360
    u = speed * sin(downwind_rad)
    v = speed * cos(downwind_rad)
    """
    downwind_deg = (direction_from_deg + 180.0) % 360.0
    rad = math.radians(downwind_deg)
    u = speed_ms * math.sin(rad)
    v = speed_ms * math.cos(rad)
    return round(u, 4), round(v, 4)


def _safe_http_get(url: str, timeout_seconds: int = 10) -> Optional[Dict[str, Any]]:
    """
    Safely executes an HTTP GET request with standard headers and error handling.
    """
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "OceanRescue-Geospatial-Operations/2.0 (ALDFG Environmental Intelligence)",
            "Accept": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
            if response.status != 200:
                logger.warning(f"HTTP GET returned status {response.status} for {url}")
                return None
            data = json.loads(response.read().decode("utf-8"))
            if data.get("error"):
                logger.warning(f"Open-Meteo error response: {data.get('reason')}")
                return None
            return data
    except urllib.error.URLError as e:
        logger.warning(f"Network error querying {url}: {e.reason}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error querying {url}: {e}")
        return None


def fetch_open_meteo_marine_data(
    latitude: float,
    longitude: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    timeout_seconds: int = 10
) -> Optional[Dict[str, Any]]:
    """
    Primary source: Open-Meteo Marine API.
    Retrieves ocean currents (ocean_current_velocity, ocean_current_direction) and waves (wave_height, wave_direction).
    Supports both forecast mode and historical range (start_date, end_date in YYYY-MM-DD).
    """
    base_url = "https://marine-api.open-meteo.com/v1/marine"
    hourly_vars = "ocean_current_velocity,ocean_current_direction,wave_height,wave_direction"
    
    if start_date and end_date:
        url = (
            f"{base_url}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&start_date={start_date}&end_date={end_date}"
            f"&hourly={hourly_vars}"
            f"&wind_speed_unit=ms"
        )
    else:
        url = (
            f"{base_url}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&hourly={hourly_vars}"
            f"&current=ocean_current_velocity,ocean_current_direction"
            f"&forecast_days=3"
            f"&wind_speed_unit=ms"
        )

    return _safe_http_get(url, timeout_seconds)


def fetch_open_meteo_weather_data(
    latitude: float,
    longitude: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    timeout_seconds: int = 10
) -> Optional[Dict[str, Any]]:
    """
    Supporting source: Open-Meteo Weather API.
    Retrieves 10m wind speed and direction (wind_speed_10m, wind_direction_10m).
    Uses ERA5 archive API if historical, or standard forecast API if current/future.
    """
    hourly_vars = "wind_speed_10m,wind_direction_10m"
    
    if start_date and end_date:
        # Check if historical
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if end_date < today_str:
            base_url = "https://archive-api.open-meteo.com/v1/archive"
        else:
            base_url = "https://api.open-meteo.com/v1/forecast"
            
        url = (
            f"{base_url}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&start_date={start_date}&end_date={end_date}"
            f"&hourly={hourly_vars}"
            f"&wind_speed_unit=ms"
        )
    else:
        base_url = "https://api.open-meteo.com/v1/forecast"
        url = (
            f"{base_url}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&hourly={hourly_vars}"
            f"&current=wind_speed_10m,wind_direction_10m"
            f"&forecast_days=3"
            f"&wind_speed_unit=ms"
        )

    return _safe_http_get(url, timeout_seconds)


def generate_synthetic_marine_flow(
    latitude: float,
    longitude: float,
    duration_hours: int = 48,
    target_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Explicitly labeled synthetic/simulated hydrodynamic flow model for coastal testing
    when real satellite/model grids have nearshore coastal land masks or during offline tests.
    
    Generates realistic semi-diurnal tidal oscillation + prevailing alongshore flow.
    """
    now = target_time or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    base_u = 0.12  # Eastward tidal baseline m/s
    base_v = -0.22 # Southward coastal current baseline m/s (along Konkan/Maharashtra coast)
    wind_spd = 4.2 # Typical coastal breeze m/s
    wind_dir = 290.0 # From WNW

    hourly_records = []
    for h in range(duration_hours + 1):
        # 12.42-hour M2 semi-diurnal tidal phase
        phase = (2 * math.pi * h) / 12.42
        u = round(base_u + 0.10 * math.cos(phase), 4)
        v = round(base_v + 0.08 * math.sin(phase), 4)
        speed = round(math.sqrt(u**2 + v**2), 4)
        direction = round((math.degrees(math.atan2(u, v)) + 360.0) % 360.0, 1)

        wu, wv = convert_wind_to_uv(wind_spd, wind_dir)
        t_iso = (now + timedelta(hours=h)).isoformat()
        hourly_records.append({
            "step": h,
            "time": t_iso,
            "u": u,
            "v": v,
            "speed": speed,
            "direction": direction,
            "wind_speed": wind_spd,
            "wind_direction": wind_dir,
            "wind_u": wu,
            "wind_v": wv,
            "wave_height": 0.8
        })

    current_sample = hourly_records[0]
    return {
        "source": "OceanRescue Synthetic Coastal Flow Model (Simulation)",
        "mode": "simulation",
        "data_status": "Simulation mode",
        "data_available": True,
        "latitude": latitude,
        "longitude": longitude,
        "observation_time": now.isoformat(),
        "retrieval_time": datetime.now(timezone.utc).isoformat(),
        "current_velocity": current_sample["speed"],
        "current_velocity_knots": round(current_sample["speed"] * 1.94384, 2),
        "current_direction": current_sample["direction"],
        "current_u": current_sample["u"],
        "current_v": current_sample["v"],
        "wind_speed": wind_spd,
        "wind_speed_knots": round(wind_spd * 1.94384, 2),
        "wind_direction": wind_dir,
        "wind_u": current_sample["wind_u"],
        "wind_v": current_sample["wind_v"],
        "wave_height": 0.8,
        "wave_direction": 260.0,
        "boundary_contained": is_within_study_boundary(latitude, longitude),
        "hourly_series": hourly_records,
        "status_message": "Synthetic hydrodynamics active (explicit development/simulation mode). Every vector is explicitly modeled."
    }


def get_environmental_conditions(
    latitude: float,
    longitude: float,
    target_time: Optional[datetime] = None,
    force_simulation: bool = False
) -> Dict[str, Any]:
    """
    Retrieves validated marine & weather environmental conditions for coordinates.
    Checks memory cache first.
    Queries Open-Meteo Marine API (currents, waves) and Weather API (wind).
    Matches timestamps, preserves metadata, and falls back to explicit simulation mode
    only when coastal land mask prevents satellite reading.
    """
    if latitude < -90.0 or latitude > 90.0:
        raise ValueError(f"Invalid latitude {latitude}. Must be between -90 and 90.")
    if longitude < -180.0 or longitude > 180.0:
        raise ValueError(f"Invalid longitude {longitude}. Must be between -180 and 180.")

    now_utc = datetime.now(timezone.utc)
    is_historical = False
    start_date_str = None
    end_date_str = None

    if target_time:
        if target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=timezone.utc)
        time_diff_days = (now_utc - target_time).total_seconds() / 86400.0
        if time_diff_days > 2.0:
            is_historical = True
            start_date_str = target_time.strftime("%Y-%m-%d")
            end_date_str = (target_time + timedelta(days=3)).strftime("%Y-%m-%d")

    cache_date_key = f"{start_date_str}_{end_date_str}" if is_historical else "live"
    cache_key = (round(latitude, 3), round(longitude, 3), cache_date_key)
    now_ts = time.time()

    if not force_simulation and cache_key in _ENV_CACHE:
        cached_time, cached_data = _ENV_CACHE[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS and cached_data.get("mode") in ("real_data", "historical_data"):
            return cached_data

    if force_simulation:
        return generate_synthetic_marine_flow(latitude, longitude, target_time=target_time)

    # 1. Fetch Marine API (currents and waves)
    try:
        marine_data = fetch_open_meteo_marine_data(
            latitude,
            longitude,
            start_date=start_date_str,
            end_date=end_date_str
        )
    except TypeError:
        # Fallback for legacy mocks defined as lambda lat, lon, timeout_seconds=10
        marine_data = fetch_open_meteo_marine_data(latitude, longitude)

    # 2. Fetch Weather API (winds)
    try:
        weather_data = fetch_open_meteo_weather_data(
            latitude,
            longitude,
            start_date=start_date_str,
            end_date=end_date_str
        )
    except TypeError:
        weather_data = fetch_open_meteo_weather_data(latitude, longitude)


    # Check if marine API failed completely
    if not marine_data and not weather_data:
        logger.info(f"Open-Meteo APIs unreachable for ({latitude}, {longitude}). Falling back to simulation.")
        sim_data = generate_synthetic_marine_flow(latitude, longitude, target_time=target_time)
        sim_data["data_status"] = "Data source unavailable"
        sim_data["status_message"] = "Open-Meteo APIs unreachable; synthetic fallback active with explicit labeling."
        return sim_data

    # Parse marine data
    marine_current = (marine_data or {}).get("current", {})
    marine_hourly = (marine_data or {}).get("hourly", {})
    weather_current = (weather_data or {}).get("current", {})
    weather_hourly = (weather_data or {}).get("hourly", {})

    curr_speed = marine_current.get("ocean_current_velocity")
    curr_dir = marine_current.get("ocean_current_direction")

    hourly_times = marine_hourly.get("time", []) or weather_hourly.get("time", [])
    hourly_vels = marine_hourly.get("ocean_current_velocity", [])
    hourly_dirs = marine_hourly.get("ocean_current_direction", [])
    hourly_wave_h = marine_hourly.get("wave_height", [])
    hourly_wave_d = marine_hourly.get("wave_direction", [])

    hourly_winds = weather_hourly.get("wind_speed_10m", [])
    hourly_wind_dirs = weather_hourly.get("wind_direction_10m", [])

    # Validate marine currents
    valid_vels = [v for v in hourly_vels if v is not None and not (isinstance(v, float) and math.isnan(v))]

    # If marine currents are null (land mask at harbor pixel), check if weather is available
    if len(valid_vels) == 0:
        logger.info(f"Open-Meteo returned land-mask current nulls at ({latitude}, {longitude}).")
        sim_data = generate_synthetic_marine_flow(latitude, longitude, target_time=target_time)
        if weather_data and hourly_winds:
            # We have real wind data! Partial real data mode
            valid_winds = [w for w in hourly_winds if w is not None]
            if valid_winds:
                w_spd = float(weather_current.get("wind_speed_10m") or valid_winds[0])
                w_dir = float(weather_current.get("wind_direction_10m") or hourly_wind_dirs[0] or 0.0)
                sim_data["wind_speed"] = round(w_spd, 2)
                sim_data["wind_speed_knots"] = round(w_spd * 1.94384, 2)
                sim_data["wind_direction"] = round(w_dir, 1)
                wu, wv = convert_wind_to_uv(w_spd, w_dir)
                sim_data["wind_u"] = wu
                sim_data["wind_v"] = wv
                sim_data["data_status"] = "Partial environmental data"
                sim_data["status_message"] = (
                    "Live Open-Meteo wind telemetry retrieved. Marine current pixel is land-masked; "
                    "using synthetic coastal tidal model for current vectors."
                )
                return sim_data

        sim_data["data_status"] = "Simulation mode"
        sim_data["status_message"] = "Nearshore harbour land mask: synthetic coastal hydrodynamics active."
        return sim_data

    # Valid real current data available!
    first_curr_speed = curr_speed if curr_speed is not None else valid_vels[0]
    first_curr_dir = curr_dir if curr_dir is not None else (hourly_dirs[0] if hourly_dirs else 0.0)

    curr_speed_val = float(first_curr_speed)
    curr_dir_val = float(first_curr_dir) if first_curr_dir is not None else 0.0
    u, v = convert_current_to_uv(curr_speed_val, curr_dir_val)

    # Wind data
    wind_spd_val = None
    wind_dir_val = None
    wind_u = 0.0
    wind_v = 0.0

    valid_winds = [w for w in hourly_winds if w is not None]
    if weather_current.get("wind_speed_10m") is not None:
        wind_spd_val = float(weather_current["wind_speed_10m"])
        wind_dir_val = float(weather_current.get("wind_direction_10m") or 0.0)
    elif valid_winds:
        wind_spd_val = float(valid_winds[0])
        wind_dir_val = float(hourly_wind_dirs[0] if hourly_wind_dirs else 0.0)

    if wind_spd_val is not None:
        wind_u, wind_v = convert_wind_to_uv(wind_spd_val, wind_dir_val or 0.0)

    # Assemble aligned hourly records
    hourly_records = []
    max_steps = min(len(hourly_times), max(len(hourly_vels), len(hourly_winds)))

    for i in range(max_steps):
        v_spd = hourly_vels[i] if i < len(hourly_vels) else None
        v_d = hourly_dirs[i] if i < len(hourly_dirs) else 0.0
        w_s = hourly_winds[i] if i < len(hourly_winds) else None
        w_d = hourly_wind_dirs[i] if i < len(hourly_wind_dirs) else 0.0
        wav_h = hourly_wave_h[i] if i < len(hourly_wave_h) else None

        step_u, step_v = convert_current_to_uv(
            float(v_spd) if v_spd is not None else curr_speed_val,
            float(v_d or 0.0)
        )
        step_wu, step_wv = convert_wind_to_uv(
            float(w_s) if w_s is not None else (wind_spd_val or 0.0),
            float(w_d or 0.0)
        )

        hourly_records.append({
            "step": i,
            "time": hourly_times[i] if i < len(hourly_times) else "",
            "u": step_u,
            "v": step_v,
            "speed": round(float(v_spd) if v_spd is not None else curr_speed_val, 4),
            "direction": round(float(v_d or 0.0), 1),
            "wind_speed": round(float(w_s), 2) if w_s is not None else wind_spd_val,
            "wind_direction": round(float(w_d or 0.0), 1),
            "wind_u": step_wu,
            "wind_v": step_wv,
            "wave_height": round(float(wav_h), 2) if wav_h is not None else None,
        })

    data_status = "Historical archive data retrieved" if is_historical else "Live API response retrieved"
    source_label = (
        f"Open-Meteo Marine API (Copernicus 1/12°) & Open-Meteo Weather API"
        if not is_historical
        else f"Open-Meteo Marine Archive & ERA5 Reanalysis"
    )

    result = {
        "source": source_label,
        "mode": "historical_data" if is_historical else "real_data",
        "data_status": data_status,
        "data_available": True,
        "latitude": latitude,
        "longitude": longitude,
        "observation_time": marine_current.get("time") or (hourly_times[0] if hourly_times else now_utc.isoformat()),
        "retrieval_time": now_utc.isoformat(),
        "current_velocity": round(curr_speed_val, 4),
        "current_velocity_knots": round(curr_speed_val * 1.94384, 2),
        "current_direction": round(curr_dir_val, 1),
        "current_u": u,
        "current_v": v,
        "wind_speed": round(wind_spd_val, 2) if wind_spd_val is not None else None,
        "wind_speed_knots": round(wind_spd_val * 1.94384, 2) if wind_spd_val is not None else None,
        "wind_direction": round(wind_dir_val, 1) if wind_dir_val is not None else None,
        "wind_u": wind_u,
        "wind_v": wind_v,
        "wave_height": hourly_wave_h[0] if hourly_wave_h and hourly_wave_h[0] is not None else None,
        "wave_direction": hourly_wave_d[0] if hourly_wave_d and hourly_wave_d[0] is not None else None,
        "boundary_contained": is_within_study_boundary(latitude, longitude),
        "hourly_series": hourly_records,
        "status_message": f"{data_status}: Validated marine currents and surface wind telemetry retrieved."
    }

    _ENV_CACHE[cache_key] = (now_ts, result)
    return result


def save_environmental_observation_record(
    db: Session,
    obs_data: Dict[str, Any],
    report_id: Optional[int] = None
) -> EnvironmentalObservation:
    """
    Persists a validated environmental observation record into PostgreSQL / PostGIS.
    Stores spatial location, current speed/direction, wind speed/direction, waves,
    data source, status message, and metadata.
    """
    lat = float(obs_data["latitude"])
    lon = float(obs_data["longitude"])
    geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)

    obs_time_raw = obs_data.get("observation_time")
    if obs_time_raw:
        try:
            obs_dt = datetime.fromisoformat(obs_time_raw.replace("Z", "+00:00"))
        except Exception:
            obs_dt = datetime.now(timezone.utc)
    else:
        obs_dt = datetime.now(timezone.utc)

    if obs_dt.tzinfo is None:
        obs_dt = obs_dt.replace(tzinfo=timezone.utc)

    curr_spd = obs_data.get("current_velocity")
    curr_dir = obs_data.get("current_direction")
    wind_spd = obs_data.get("wind_speed")
    wind_dir = obs_data.get("wind_direction")
    wave_h = obs_data.get("wave_height")

    obs = EnvironmentalObservation(
        observation_location=geom,
        current_speed=Decimal(str(curr_spd)) if curr_spd is not None else None,
        current_direction=Decimal(str(curr_dir)) if curr_dir is not None else None,
        wind_speed=Decimal(str(wind_spd)) if wind_spd is not None else None,
        wind_direction=Decimal(str(wind_dir)) if wind_dir is not None else None,
        wave_height=Decimal(str(wave_h)) if wave_h is not None else None,
        observed_at=obs_dt,
        source=obs_data.get("source", "Open-Meteo Marine / Weather"),
        report_id=report_id,
        status_message=obs_data.get("status_message") or obs_data.get("data_status"),
        meta_info={
            "mode": obs_data.get("mode"),
            "data_status": obs_data.get("data_status"),
            "current_u": obs_data.get("current_u"),
            "current_v": obs_data.get("current_v"),
            "wind_u": obs_data.get("wind_u"),
            "wind_v": obs_data.get("wind_v"),
            "boundary_contained": obs_data.get("boundary_contained"),
        }
    )

    db.add(obs)
    db.commit()
    db.refresh(obs)
    logger.info(f"Persisted environmental observation #{obs.id} at ({lat}, {lon})")
    return obs
