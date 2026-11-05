"""
FastAPI Endpoints for Route Optimization Module.
Handles route calculation, version retrieval, preferred route selection,
and restricted marine zone GIS boundaries.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_X, ST_Y

from app.db.session import get_db
from app.models.recovery_mission import RecoveryMission
from app.models.gear_report import GearReport
from app.models.drift_forecast import DriftForecast
from app.models.risk_assessment import RiskAssessment
from app.models.environmental_observation import EnvironmentalObservation
from app.schemas.route_optimization import (
    RouteOptimizationRequest,
    RouteOptimizationResponse,
    RouteItemResponse,
    RouteSelectionRequest,
)
from app.services.route_validation_service import (
    RouteValidationService,
    RouteValidationError,
)
from app.services.route_optimization_service import (
    RouteOptimizationService,
    MarineZoneManager,
)
from app.services.route_persistence_service import RoutePersistenceService

router = APIRouter(prefix="/recovery-missions", tags=["Route Optimization"])


@router.post(
    "/{mission_id}/routes/optimize",
    response_model=RouteOptimizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate and persist optimized marine recovery routes"
)
def optimize_mission_route(
    mission_id: int,
    data: Optional[RouteOptimizationRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Executes A* pathfinding to generate optimal and alternative maritime routes
    from departure staging harbour to target recovery coordinates.
    Strictly prohibits crossing land or marine protected zones.
    Preserves version history in the database.
    """
    req = data or RouteOptimizationRequest()

    # 1. Verify recovery mission exists
    mission = db.get(RecoveryMission, mission_id)
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    # 2. Verify associated gear report exists
    report = db.get(GearReport, mission.report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated gear report ID {mission.report_id} does not exist."
        )

    # 3. Determine departure harbour coordinates
    dep_port = req.departure_port or mission.departure_port or "Mirkarwada Fishing Harbour, Ratnagiri"
    dep_lat = req.departure_lat if req.departure_lat is not None else 16.99
    dep_lon = req.departure_lon if req.departure_lon is not None else 73.30

    # 4. Determine recovery target coordinates
    target_lat = req.target_lat
    target_lon = req.target_lon
    dest_label = f"Incident #{report.id} ({report.gear_type.upper()})"

    if target_lat is None or target_lon is None:
        if req.target_type == "drift_endpoint":
            # Retrieve latest step from drift forecasts
            latest_drift = db.execute(
                select(DriftForecast)
                .where(DriftForecast.report_id == report.id)
                .order_by(desc(DriftForecast.step_index), desc(DriftForecast.id))
            ).scalars().first()
            if latest_drift and latest_drift.predicted_location is not None:
                coords = db.execute(
                    select(
                        ST_X(latest_drift.predicted_location).label("lon"),
                        ST_Y(latest_drift.predicted_location).label("lat")
                    )
                ).one()
                target_lat = float(coords.lat)
                target_lon = float(coords.lon)
                dest_label = f"Incident #{report.id} Drift Forecast Endpoint (+{latest_drift.step_index or 0}h)"

        elif req.target_type == "grounding_point":
            # Check risk assessment for predicted grounding location
            risk_ass = db.execute(
                select(RiskAssessment)
                .where(RiskAssessment.report_id == report.id)
                .order_by(desc(RiskAssessment.id))
            ).scalars().first()
            if risk_ass and risk_ass.factors and isinstance(risk_ass.factors, dict):
                g_loc = risk_ass.factors.get("grounding_location")
                if g_loc and "latitude" in g_loc and "longitude" in g_loc:
                    target_lat = float(g_loc["latitude"])
                    target_lon = float(g_loc["longitude"])
                    dest_label = f"Incident #{report.id} Shoreline Grounding Point"

        # Fallback to reported incident loss location
        if target_lat is None or target_lon is None:
            if report.reported_location is not None:
                coords = db.execute(
                    select(
                        ST_X(report.reported_location).label("lon"),
                        ST_Y(report.reported_location).label("lat")
                    )
                ).one()
                target_lat = float(coords.lat)
                target_lon = float(coords.lon)
                dest_label = f"Incident #{report.id} Reported Loss Location"

    # 5. Validate coordinates
    try:
        val_dep_lat, val_dep_lon = RouteValidationService.validate_wgs84_coordinates(
            dep_lat, dep_lon, field_name="Departure Harbour Coordinates"
        )
        RouteValidationService.validate_departure_location(
            val_dep_lat, val_dep_lon, port_name=dep_port
        )

        val_tgt_lat, val_tgt_lon = RouteValidationService.validate_wgs84_coordinates(
            target_lat, target_lon, field_name="Recovery Target Coordinates"
        )
        RouteValidationService.validate_recovery_target(
            val_tgt_lat, val_tgt_lon, target_label=dest_label
        )

        val_speed = RouteValidationService.validate_vessel_speed(req.vessel_speed_knots)
    except RouteValidationError as ve:
        raise HTTPException(
            status_code=ve.status_code,
            detail=ve.message
        )

    # 6. Query environmental telemetry if requested
    env_context = None
    if req.incorporate_environmental:
        latest_env = db.execute(
            select(EnvironmentalObservation)
            .order_by(desc(EnvironmentalObservation.observed_at))
        ).scalars().first()
        if latest_env:
            env_context = {
                "observation_id": latest_env.id,
                "observed_at": latest_env.observed_at.isoformat() if latest_env.observed_at else None,
                "current_speed": float(latest_env.current_speed) if latest_env.current_speed is not None else 0.0,
                "current_direction": float(latest_env.current_direction) if latest_env.current_direction is not None else 0.0,
                "wind_speed": float(latest_env.wind_speed) if latest_env.wind_speed is not None else 0.0,
                "wind_direction": float(latest_env.wind_direction) if latest_env.wind_direction is not None else 0.0,
                "wave_height": float(latest_env.wave_height) if latest_env.wave_height is not None else None,
                "source": latest_env.source or "Open-Meteo Marine (Copernicus 1/12°)",
            }

    # 7. Execute A* Route Optimization Engine
    vessel_name_val = req.vessel_name or mission.assigned_to or "Assigned Salvage Vessel"
    calc_result = RouteOptimizationService.calculate_routes(
        mission_id=mission.id,
        report_id=report.id,
        start_lat=val_dep_lat,
        start_lon=val_dep_lon,
        start_port=dep_port,
        dest_lat=val_tgt_lat,
        dest_lon=val_tgt_lon,
        dest_label=dest_label,
        vessel_name=vessel_name_val,
        vessel_speed_knots=val_speed,
        constraints=req.constraints,
        environmental_data=env_context,
    )

    if calc_result.status == "no_feasible_route":
        return calc_result

    # 8. Persist generated routes into database
    persisted_response = RoutePersistenceService.save_calculated_routes(
        db=db,
        mission_id=mission.id,
        calc_response=calc_result
    )

    return persisted_response


@router.get(
    "/{mission_id}/routes",
    response_model=List[RouteItemResponse],
    summary="List all calculated routes for a recovery mission"
)
def list_mission_routes(mission_id: int, db: Session = Depends(get_db)):
    """
    Retrieves all calculated routes and previous versions for a recovery mission.
    """
    mission = db.get(RecoveryMission, mission_id)
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )
    return RoutePersistenceService.list_mission_routes(db, mission_id)


@router.get(
    "/{mission_id}/routes/selected",
    response_model=Optional[RouteItemResponse],
    summary="Get currently active selected route for mission"
)
def get_selected_mission_route(mission_id: int, db: Session = Depends(get_db)):
    """
    Returns the active selected route for this recovery mission, or null if none selected.
    """
    mission = db.get(RecoveryMission, mission_id)
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )
    return RoutePersistenceService.get_selected_route_for_mission(db, mission_id)


@router.get(
    "/{mission_id}/routes/{route_id}",
    response_model=RouteItemResponse,
    summary="Retrieve single route details"
)
def get_mission_route_by_id(mission_id: int, route_id: int, db: Session = Depends(get_db)):
    """
    Retrieves single route by ID, enforcing mission isolation.
    """
    route = RoutePersistenceService.get_mission_route_by_id(db, mission_id, route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route ID {route_id} does not exist for Recovery Mission #{mission_id}."
        )
    return route


@router.post(
    "/{mission_id}/routes/{route_id}/select",
    response_model=RouteItemResponse,
    summary="Select active route and synchronize planned_route geometry"
)
def select_mission_route(
    mission_id: int,
    route_id: int,
    data: Optional[RouteSelectionRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Marks the chosen route as active (is_selected=True), clears previous selections,
    synchronizes the LineString geometry to recovery_missions.planned_route,
    and logs an audit trail event.
    """
    req = data or RouteSelectionRequest()
    try:
        updated_route = RoutePersistenceService.select_mission_route(
            db=db,
            mission_id=mission_id,
            route_id=route_id,
            selected_by=req.selected_by or "Lead Operations Officer",
            notes=req.notes
        )
        return updated_route
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )


# Non-nested router for standalone GIS boundaries
gis_router = APIRouter(prefix="/routes", tags=["Route Optimization GIS Data"])


@gis_router.get(
    "/restricted-zones",
    summary="Get GeoJSON of designated protected marine sanctuaries"
)
def get_restricted_marine_zones():
    """
    Returns actual boundary geometries of protected marine sanctuaries
    (e.g. Malvan Marine Sanctuary) for interactive Leaflet GIS map rendering.
    """
    zones = MarineZoneManager.get_restricted_zones()
    features = []
    for z in zones:
        features.append({
            "type": "Feature",
            "properties": {
                "id": z["id"],
                "name": z["name"],
                "designation": z["designation"],
                "area_km2": z.get("area_km2"),
                "category": "Marine Protected Area",
            },
            "geometry": z["raw_geometry"],
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "source": "WDPA / Maharashtra Marine Sanctuary Boundaries",
            "count": len(features),
        },
        "features": features
    }
