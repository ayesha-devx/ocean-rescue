"""
API endpoints for Drift Forecasting subsystem.
Integrates verified incident triage, marine environmental data,
Lagrangian advection drift modeling, and PostGIS trajectory persistence.
"""

import math
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, delete
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint, ST_X, ST_Y

from app.db.session import get_db
from app.models.drift_forecast import DriftForecast
from app.models.gear_report import GearReport
from app.schemas.drift_forecast import (
    DriftForecastCreate,
    DriftForecastResponse,
    DriftForecastGenerateRequest,
    DriftTrajectorySummary,
    MarineConditionsResponse,
    EligibleIncidentResponse,
)
from app.schemas.common import PaginatedResponse
from app.services import environmental_service, drift_service

router = APIRouter(prefix="/drift-forecasts", tags=["Drift Forecasting"])


def format_forecast_response(
    fc: DriftForecast,
    db: Session,
    grounding_step: Optional[int] = None
) -> DriftForecastResponse:
    coords = db.execute(
        select(
            ST_X(fc.predicted_location).label("lon"),
            ST_Y(fc.predicted_location).label("lat")
        )
    ).one()
    lat = float(coords.lat)
    lon = float(coords.lon)
    s_idx = fc.step_index if fc.step_index is not None else 0

    if grounding_step is not None:
        if s_idx < grounding_step:
            pt_status = "active_drift"
            pt_grounded = False
            pt_valid = True
        elif s_idx == grounding_step:
            pt_status = "grounded"
            pt_grounded = True
            pt_valid = True
        else:
            pt_status = "post_grounding_hypothetical"
            pt_grounded = True
            pt_valid = False
    else:
        is_land = drift_service.is_land_coordinate(lat, lon)
        pt_grounded = is_land
        pt_status = "grounded" if is_land else "active_drift"
        pt_valid = not is_land or s_idx == 0

    w_spd = float(fc.wind_speed) if fc.wind_speed is not None else None
    w_dir = float(fc.wind_direction) if fc.wind_direction is not None else None
    w_coeff = float(fc.windage_coefficient) if fc.windage_coefficient is not None else 0.025
    c_u = float(fc.current_u) if fc.current_u is not None else 0.0
    c_v = float(fc.current_v) if fc.current_v is not None else 0.0

    lw_spd, lw_dir, lw_u, lw_v = drift_service.calculate_leeway_vector(w_spd, w_dir, w_coeff)
    u_drift, v_drift, drift_spd, drift_dir = drift_service.calculate_combined_drift_vector(
        c_u, c_v, lw_u, lw_v
    )

    return DriftForecastResponse(
        id=fc.id,
        report_id=fc.report_id,
        latitude=lat,
        longitude=lon,
        forecast_time=fc.forecast_time,
        risk_score=fc.risk_score if pt_valid else None,
        model_name=fc.model_name,
        step_index=s_idx,
        simulation_mode=fc.simulation_mode if fc.simulation_mode is not None else False,
        current_u=float(fc.current_u) if fc.current_u is not None else None,
        current_v=float(fc.current_v) if fc.current_v is not None else None,
        current_speed=float(fc.current_speed) if fc.current_speed is not None else None,
        current_direction=float(fc.current_direction) if fc.current_direction is not None else None,
        wind_speed=w_spd,
        wind_direction=w_dir,
        windage_coefficient=w_coeff,
        leeway_speed=lw_spd,
        leeway_direction=lw_dir,
        leeway_u=lw_u,
        leeway_v=lw_v,
        drift_u=u_drift,
        drift_v=v_drift,
        drift_speed=drift_spd,
        drift_direction=drift_dir,
        boundary_contained=fc.boundary_contained if fc.boundary_contained is not None else True,
        is_grounded=pt_grounded,
        drift_status=pt_status,
        is_valid_drift=pt_valid,
        source=fc.source,
        distance_km=float(fc.distance_km) if fc.distance_km is not None else None,
        created_at=fc.created_at,
    )


@router.get("/eligible-incidents", response_model=List[EligibleIncidentResponse])
def get_eligible_verified_incidents(db: Session = Depends(get_db)):
    """
    Retrieve only verified/approved incidents eligible for drift trajectory modeling.
    Pending (reported) or rejected reports are strictly excluded.
    """
    stmt = (
        select(
            GearReport.id,
            GearReport.gear_type,
            GearReport.status,
            GearReport.reported_at,
            GearReport.description,
            ST_Y(GearReport.reported_location).label("lat"),
            ST_X(GearReport.reported_location).label("lon"),
            func.count(DriftForecast.id).label("forecast_count")
        )
        .outerjoin(DriftForecast, DriftForecast.report_id == GearReport.id)
        .where(func.lower(GearReport.status) == "verified")
        .group_by(GearReport.id)
        .order_by(desc(GearReport.reported_at))
    )

    rows = db.execute(stmt).all()
    results = []
    for r in rows:
        results.append(EligibleIncidentResponse(
            id=r.id,
            gear_type=r.gear_type,
            status=r.status,
            latitude=float(r.lat),
            longitude=float(r.lon),
            reported_at=r.reported_at,
            description=r.description,
            drift_forecasts_count=r.forecast_count
        ))
    return results


@router.get("/environmental-conditions", response_model=MarineConditionsResponse)
def get_marine_conditions(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    target_time: Optional[datetime] = Query(None, description="Optional loss date/time for historical vs forecast conditions"),
    force_simulation: bool = Query(False, description="Force synthetic simulation mode"),
    db: Session = Depends(get_db),
):
    """
    Query real marine and meteorological environmental conditions for given coordinates.
    Primary source: Open-Meteo Marine API (ocean currents, waves).
    Supporting source: Open-Meteo Weather API (10m wind speed and direction).
    If real ocean current data is unavailable for nearshore coastal cells (land mask),
    falls back to explicit synthetic simulation with clear labeling.
    Persists valid observations to environmental_observations table in PostgreSQL.
    """
    cond = environmental_service.get_environmental_conditions(
        latitude=latitude,
        longitude=longitude,
        target_time=target_time,
        force_simulation=force_simulation
    )

    # Persist observation in database
    try:
        environmental_service.save_environmental_observation_record(db, cond)
    except Exception as e:
        logger.warning(f"Could not persist environmental observation query: {e}")

    return MarineConditionsResponse(
        latitude=latitude,
        longitude=longitude,
        source=cond.get("source", "Environmental Telemetry"),
        mode=cond.get("mode", "real_data"),
        data_status=cond.get("data_status", "Live API response retrieved"),
        observation_time=cond.get("observation_time"),
        retrieval_time=cond.get("retrieval_time", datetime.now(timezone.utc).isoformat()),
        current_velocity=cond.get("current_velocity"),
        current_velocity_knots=cond.get("current_velocity_knots"),
        current_direction=cond.get("current_direction"),
        current_u=cond.get("current_u"),
        current_v=cond.get("current_v"),
        wave_height=cond.get("wave_height"),
        wave_direction=cond.get("wave_direction"),
        wind_speed=cond.get("wind_speed"),
        wind_speed_knots=cond.get("wind_speed_knots"),
        wind_direction=cond.get("wind_direction"),
        wind_u=cond.get("wind_u"),
        wind_v=cond.get("wind_v"),
        boundary_contained=cond.get("boundary_contained", True),
        data_available=cond.get("data_available", False),
        status_message=cond.get("status_message", "Environmental data queried successfully.")
    )


@router.post("/generate", response_model=DriftTrajectorySummary, status_code=status.HTTP_201_CREATED)
def generate_drift_forecast(data: DriftForecastGenerateRequest, db: Session = Depends(get_db)):
    """
    Executes end-to-end drift forecasting for a verified incident:
    1. Verifies that the incident report exists and is NGO-approved (status='verified').
    2. Retrieves real marine current & wind data matching incident loss time and coordinates.
    3. Calculates Lagrangian advection trajectory incorporating windage leeway.
    4. Persists the environmental observation record into environmental_observations.
    5. Clears previous forecast points for this incident to avoid duplicate accumulation.
    6. Persists new timestamped trajectory points in PostGIS.
    """
    report = db.get(GearReport, data.report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report ID {data.report_id} does not exist."
        )

    if report.status.lower() != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only verified incident reports can be modeled for drift forecasting. Incident #{data.report_id} is '{report.status}'."
        )

    # Extract coordinates
    coords = db.execute(
        select(
            ST_X(report.reported_location).label("lon"),
            ST_Y(report.reported_location).label("lat")
        )
    ).one()
    start_lat = float(coords.lat)
    start_lon = float(coords.lon)
    start_time = report.reported_at or datetime.now(timezone.utc)

    # 1. Fetch environmental data (historical reanalysis if report time is in past, or live forecast)
    env_conditions = environmental_service.get_environmental_conditions(
        latitude=start_lat,
        longitude=start_lon,
        target_time=start_time,
        force_simulation=data.force_simulation
    )

    # Persist environmental observation associated with this incident
    try:
        environmental_service.save_environmental_observation_record(db, env_conditions, report_id=data.report_id)
    except Exception as e:
        logger.warning(f"Could not persist incident environmental observation: {e}")

    # 2. Compute trajectory with windage leeway
    try:
        traj = drift_service.calculate_drift_trajectory(
            start_lat=start_lat,
            start_lon=start_lon,
            start_time=start_time,
            duration_hours=data.duration_hours,
            env_conditions=env_conditions,
            time_step_hours=data.time_step_hours,
            windage=data.windage
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Drift trajectory calculation failed: {str(e)}"
        )

    # 3. Clean prior forecast vectors for this report to prevent duplicate accumulation
    db.execute(delete(DriftForecast).where(DriftForecast.report_id == data.report_id))
    db.flush()

    # 4. Persist newly calculated trajectory points
    saved_models = []
    for pt in traj["points"]:
        pt_geom = ST_SetSRID(ST_MakePoint(pt["longitude"], pt["latitude"]), 4326)
        fc_obj = DriftForecast(
            report_id=data.report_id,
            predicted_location=pt_geom,
            forecast_time=datetime.fromisoformat(pt["forecast_time"]),
            risk_score=pt.get("risk_score"),
            model_name=pt.get("model_name", "Lagrangian Advection V2.2"),
            step_index=pt.get("step_index", 0),
            simulation_mode=pt.get("simulation_mode", False),
            current_u=pt.get("current_u"),
            current_v=pt.get("current_v"),
            current_speed=pt.get("current_speed"),
            current_direction=pt.get("current_direction"),
            wind_speed=pt.get("wind_speed"),
            wind_direction=pt.get("wind_direction"),
            windage_coefficient=pt.get("windage_coefficient"),
            boundary_contained=pt.get("boundary_contained", True),
            source=pt.get("source"),
            distance_km=pt.get("distance_km", 0.0)
        )
        db.add(fc_obj)
        saved_models.append(fc_obj)

    db.commit()

    # Refresh models to get generated IDs and timestamps
    response_points = []
    g_step = traj.get("grounding_step")
    for sm in saved_models:
        db.refresh(sm)
        response_points.append(format_forecast_response(sm, db, grounding_step=g_step))

    return DriftTrajectorySummary(
        report_id=data.report_id,
        gear_type=report.gear_type,
        start_latitude=start_lat,
        start_longitude=start_lon,
        start_time=start_time,
        duration_hours=data.duration_hours,
        time_step_hours=data.time_step_hours,
        points_count=len(response_points),
        valid_points_count=traj.get("valid_points_count"),
        valid_drift_duration_hours=traj.get("valid_drift_duration_hours"),
        source=traj["source"],
        simulation_mode=traj["simulation_mode"],
        current_speed_avg=traj.get("current_speed_avg"),
        current_direction_avg=traj.get("current_direction_avg"),
        wind_speed_avg=traj.get("wind_speed_avg"),
        wind_direction_avg=traj.get("wind_direction_avg"),
        windage=traj.get("windage"),
        leeway_speed_avg=traj.get("leeway_speed_avg"),
        leeway_direction_avg=traj.get("leeway_direction_avg"),
        combined_drift_speed_avg=traj.get("combined_drift_speed_avg"),
        combined_drift_direction_avg=traj.get("combined_drift_direction_avg"),
        boundary_contained=traj.get("boundary_contained", True),
        boundary_exit_step=traj.get("boundary_exit_step"),
        grounding_detected=traj.get("grounding_detected", False),
        grounding_step=traj.get("grounding_step"),
        grounding_location=traj.get("grounding_location"),
        grounding_status=traj.get("grounding_status", "offshore_adrift"),
        grounding_disclaimer=traj.get("grounding_disclaimer"),
        study_boundary=traj.get("study_boundary"),
        limitations=traj.get("limitations"),
        calculation_method=traj["calculation_method"],
        assumptions=traj["assumptions"],
        total_displacement_km=traj["total_displacement_km"],
        net_displacement_km=traj.get("net_displacement_km", traj["total_displacement_km"]),
        total_path_distance_km=traj.get("total_path_distance_km"),
        hypothetical_net_displacement_km=traj.get("hypothetical_net_displacement_km"),
        hypothetical_total_path_distance_km=traj.get("hypothetical_total_path_distance_km"),
        points=response_points
    )



@router.get("/latest/{report_id}", response_model=DriftTrajectorySummary)
def get_latest_forecast_for_report(report_id: int, db: Session = Depends(get_db)):
    """
    Retrieve the current saved drift forecast trajectory for an incident.
    Returns 404 if no drift forecast has been generated yet for this incident.
    """
    report = db.get(GearReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report ID {report_id} does not exist."
        )

    coords = db.execute(
        select(
            ST_X(report.reported_location).label("lon"),
            ST_Y(report.reported_location).label("lat")
        )
    ).one()

    stmt = select(DriftForecast).where(DriftForecast.report_id == report_id).order_by(DriftForecast.step_index.asc())
    rows = db.scalars(stmt).all()

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No drift forecast records exist for report #{report_id}."
        )

    # First pass: determine if any step triggered coastal land-mask grounding
    grounding_step = None
    for r in rows:
        c = db.execute(select(ST_X(r.predicted_location), ST_Y(r.predicted_location))).one()
        if drift_service.is_land_coordinate(float(c[1]), float(c[0])):
            grounding_step = r.step_index
            break

    points = [format_forecast_response(r, db, grounding_step=grounding_step) for r in rows]
    first_pt = points[0]
    last_pt = points[-1]
    is_sim = any(p.simulation_mode for p in points)
    src = first_pt.source or ("OceanRescue Synthetic Simulation" if is_sim else "Open-Meteo Marine API")
    grounding_detected = grounding_step is not None
    grounding_location = (
        {"latitude": points[grounding_step].latitude, "longitude": points[grounding_step].longitude}
        if grounding_step is not None else None
    )

    valid_points = [p for p in points if p.is_valid_drift]
    valid_points_count = len(valid_points)
    valid_duration = (valid_points_count - 1) if valid_points_count > 0 else 0

    if grounding_detected:
        valid_endpoint = points[grounding_step]
        net_disp = valid_endpoint.distance_km if valid_endpoint.distance_km is not None else 0.0
        cum_path = 0.0
        for i in range(1, grounding_step + 1):
            cum_path += drift_service.calculate_haversine_distance_km(
                points[i - 1].latitude, points[i - 1].longitude,
                points[i].latitude, points[i].longitude
            )
        total_path_dist = round(cum_path, 3)
        hypothetical_net_disp = last_pt.distance_km if last_pt.distance_km is not None else 0.0
        cum_hyp = cum_path
        for i in range(grounding_step + 1, len(points)):
            cum_hyp += drift_service.calculate_haversine_distance_km(
                points[i - 1].latitude, points[i - 1].longitude,
                points[i].latitude, points[i].longitude
            )
        hypothetical_path_dist = round(cum_hyp, 3)
        grounding_status = "estimated_grounding"
        grounding_disclaimer = (
            f"Grounding Estimate: Dispersal trajectory intersects the coastline model at step #{grounding_step} "
            f"({valid_endpoint.latitude}°N, {valid_endpoint.longitude}°E) after {valid_duration}h. "
            "Under maritime search and rescue protocols, pelagic drift terminates upon shoreline contact or reef entanglement. "
            f"Subsequent points ({len(points) - valid_points_count} steps) represent hypothetical unconstrained projections "
            "and are excluded from valid drift metrics. "
            "Operational Qualification: This is an estimated landfall corridor based on a regional coastline contour, "
            "not verified physical recovery or exact beach coordinate. Surf-zone wave breaking and high-tide refloating are not modeled."
        )
    else:
        net_disp = last_pt.distance_km if last_pt.distance_km is not None else 0.0
        cum_path = 0.0
        for i in range(1, len(points)):
            cum_path += drift_service.calculate_haversine_distance_km(
                points[i - 1].latitude, points[i - 1].longitude,
                points[i].latitude, points[i].longitude
            )
        total_path_dist = round(cum_path, 3)
        hypothetical_net_disp = None
        hypothetical_path_dist = None
        grounding_status = "offshore_adrift"
        grounding_disclaimer = (
            "Offshore Adrift: Trajectory remains entirely offshore within the maritime study boundary. "
            "No shoreline grounding detected over forecast duration."
        )

    wind_speeds = [p.wind_speed for p in valid_points if p.wind_speed is not None]
    avg_wind = round(sum(wind_speeds) / len(wind_speeds), 2) if wind_speeds else None
    windage_val = first_pt.windage_coefficient if first_pt.windage_coefficient is not None else 0.025
    leeway_avg = round(avg_wind * windage_val, 5) if avg_wind is not None else None

    current_speeds = [p.current_speed for p in valid_points if p.current_speed is not None]
    avg_current = round(sum(current_speeds) / len(current_speeds), 3) if current_speeds else first_pt.current_speed

    valid_drift_speeds = [p.drift_speed for p in valid_points if p.drift_speed is not None]
    avg_drift_speed = round(sum(valid_drift_speeds) / len(valid_drift_speeds), 4) if valid_drift_speeds else 0.0

    valid_drift_u = [p.drift_u for p in valid_points if p.drift_u is not None]
    valid_drift_v = [p.drift_v for p in valid_points if p.drift_v is not None]
    avg_drift_dir = round((math.degrees(math.atan2(sum(valid_drift_u)/len(valid_drift_u), sum(valid_drift_v)/len(valid_drift_v))) + 360.0) % 360.0, 1) if valid_drift_u and valid_drift_v else None

    valid_lw_u = [p.leeway_u for p in valid_points if p.leeway_u is not None]
    valid_lw_v = [p.leeway_v for p in valid_points if p.leeway_v is not None]
    avg_lw_dir = round((math.degrees(math.atan2(sum(valid_lw_u)/len(valid_lw_u), sum(valid_lw_v)/len(valid_lw_v))) + 360.0) % 360.0, 1) if valid_lw_u and valid_lw_v else None

    all_in_bounds = all(p.boundary_contained is not False for p in valid_points)
    exit_step = next((p.step_index for p in valid_points if p.boundary_contained is False), None)

    return DriftTrajectorySummary(
        report_id=report_id,
        gear_type=report.gear_type,
        start_latitude=float(coords.lat),
        start_longitude=float(coords.lon),
        start_time=report.reported_at or first_pt.forecast_time,
        duration_hours=max(0, int((last_pt.forecast_time - first_pt.forecast_time).total_seconds() / 3600)),
        time_step_hours=1,
        points_count=len(points),
        valid_points_count=valid_points_count,
        valid_drift_duration_hours=valid_duration,
        source=src,
        simulation_mode=is_sim,
        current_speed_avg=avg_current,
        current_direction_avg=first_pt.current_direction,
        wind_speed_avg=avg_wind,
        wind_direction_avg=first_pt.wind_direction,
        windage=windage_val,
        leeway_speed_avg=leeway_avg,
        leeway_direction_avg=avg_lw_dir,
        combined_drift_speed_avg=avg_drift_speed,
        combined_drift_direction_avg=avg_drift_dir,
        boundary_contained=all_in_bounds,
        boundary_exit_step=exit_step,
        grounding_detected=grounding_detected,
        grounding_step=grounding_step,
        grounding_location=grounding_location,
        grounding_status=grounding_status,
        grounding_disclaimer=grounding_disclaimer,
        study_boundary=drift_service.STUDY_BOUNDARY,
        limitations=(
            "Prototype drift estimate. Positions indicate high-probability search corridors, not guaranteed recovery coordinates. "
            + grounding_disclaimer
        ),
        calculation_method="Second-Order Surface Hydrodynamic Advection + Leeway Drift (Spherical WGS84)",
        assumptions="Current-driven Lagrangian particle transport with downwind surface leeway and spherical coordinate convergence.",
        total_displacement_km=net_disp,
        net_displacement_km=net_disp,
        total_path_distance_km=total_path_dist,
        hypothetical_net_displacement_km=hypothetical_net_disp,
        hypothetical_total_path_distance_km=hypothetical_path_dist,
        points=points
    )



@router.get("/by-report/{report_id}", response_model=List[DriftForecastResponse])
def get_forecasts_for_report(report_id: int, db: Session = Depends(get_db)):
    """
    Get all saved drift simulation steps for a specific gear report.
    """
    report = db.get(GearReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report ID {report_id} does not exist."
        )

    stmt = select(DriftForecast).where(DriftForecast.report_id == report_id).order_by(DriftForecast.step_index.asc(), DriftForecast.forecast_time.asc())
    rows = db.scalars(stmt).all()
    return [format_forecast_response(r, db) for r in rows]


@router.delete("/by-report/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forecasts_for_report(report_id: int, db: Session = Depends(get_db)):
    """
    Clear all saved forecast vectors for an incident report.
    """
    db.execute(delete(DriftForecast).where(DriftForecast.report_id == report_id))
    db.commit()
    return None


@router.post("", response_model=DriftForecastResponse, status_code=status.HTTP_201_CREATED)
def create_drift_forecast(data: DriftForecastCreate, db: Session = Depends(get_db)):
    """
    Log an individual drift forecast simulation vector for an incident report.
    """
    report = db.get(GearReport, data.report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot associate forecast: Gear report ID {data.report_id} does not exist."
        )

    geom = ST_SetSRID(ST_MakePoint(data.longitude, data.latitude), 4326)
    forecast = DriftForecast(
        report_id=data.report_id,
        predicted_location=geom,
        forecast_time=data.forecast_time,
        risk_score=data.risk_score,
        model_name=data.model_name.strip(),
        step_index=data.step_index,
        simulation_mode=data.simulation_mode,
        current_u=data.current_u,
        current_v=data.current_v,
        current_speed=data.current_speed,
        current_direction=data.current_direction,
        source=data.source,
        distance_km=data.distance_km,
    )
    db.add(forecast)
    db.commit()
    db.refresh(forecast)
    return format_forecast_response(forecast, db)
