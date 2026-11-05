"""
Route Persistence Service.
Handles saving calculated routes, maintaining version history without
overwriting previous routes, retrieving mission routes, selecting active routes,
and synchronizing PostGIS geometries with recovery_missions.planned_route.
"""

from datetime import datetime, timezone
import json
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, desc, update
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_SetSRID, ST_GeomFromText, ST_AsGeoJSON

from app.models.mission_route import MissionRoute
from app.models.recovery_mission import RecoveryMission
from app.schemas.route_optimization import (
    RouteItemResponse,
    RouteOptimizationResponse,
    WaypointItem,
)


class RoutePersistenceService:
    """Manages database persistence, version history, and active route selection."""

    @staticmethod
    def _format_model_to_schema(r: MissionRoute, db: Session) -> RouteItemResponse:
        """Converts MissionRoute SQLAlchemy model to RouteItemResponse schema."""
        raw_geojson = None
        if r.route_geometry is not None:
            geojson_str = db.scalar(select(ST_AsGeoJSON(r.route_geometry)))
            if geojson_str:
                raw_geojson = json.loads(geojson_str)

        if not raw_geojson:
            raw_geojson = {
                "type": "LineString",
                "coordinates": [[wp["longitude"], wp["latitude"]] for wp in (r.waypoints_json or [])]
            }

        norm_route_type = "primary" if r.route_type in ("optimal", "primary") else "alternative"
        geojson_feature = {
            "type": "Feature",
            "properties": {
                "route_type": norm_route_type,
                "mission_id": r.mission_id,
                "report_id": r.report_id,
                "total_km": float(r.total_distance_km),
                "total_nm": float(r.total_distance_nm),
            },
            "geometry": raw_geojson,
        }

        # Reconstruct WaypointItems
        waypoints: List[WaypointItem] = []
        for wp_dict in (r.waypoints_json or []):
            waypoints.append(WaypointItem(**wp_dict))

        # Formatted duration
        est_formatted = None
        if r.estimated_duration_hours is not None:
            total_minutes = int(round(float(r.estimated_duration_hours) * 60))
            hrs = total_minutes // 60
            mins = total_minutes % 60
            speed_txt = f" at {r.vessel_speed_knots} kts" if r.vessel_speed_knots else ""
            if hrs > 0:
                est_formatted = f"{hrs} hr {mins} min{speed_txt}"
            else:
                est_formatted = f"{mins} min{speed_txt}"
        else:
            est_formatted = "Unavailable (vessel speed not specified)"

        return RouteItemResponse(
            id=r.id,
            mission_id=r.mission_id,
            report_id=r.report_id,
            route_type=norm_route_type,
            is_selected=bool(r.is_selected),
            departure_port=r.departure_port,
            departure_lat=float(r.departure_lat),
            departure_lon=float(r.departure_lon),
            destination_target=r.destination_target,
            destination_lat=float(r.destination_lat),
            destination_lon=float(r.destination_lon),
            total_distance_km=float(r.total_distance_km),
            total_distance_nm=float(r.total_distance_nm),
            direct_distance_km=float(r.direct_distance_km),
            route_deviation_pct=(
                round(((float(r.total_distance_km) - float(r.direct_distance_km)) / float(r.direct_distance_km)) * 100.0, 1)
                if (float(r.direct_distance_km or 0.0) > 0.01 and (r.route_deviation_pct is None or (r.route_type == "alternative" and float(r.route_deviation_pct) == 0.0)))
                else (float(r.route_deviation_pct) if r.route_deviation_pct is not None else None)
            ),
            waypoint_count=r.waypoint_count,
            waypoints=waypoints,
            route_geojson=geojson_feature,
            algorithm=r.algorithm,
            feasibility_status=r.feasibility_status,
            feasibility_message=r.feasibility_message,
            constraints_applied=r.constraints_applied or {},
            constraints_encountered=r.constraints_encountered or [],
            environmental_context=r.environmental_context,
            vessel_speed_knots=float(r.vessel_speed_knots) if r.vessel_speed_knots is not None else None,
            estimated_duration_hours=float(r.estimated_duration_hours) if r.estimated_duration_hours is not None else None,
            estimated_duration_formatted=est_formatted,
            version=r.version,
            selected_by=r.selected_by,
            selected_at=r.selected_at,
            created_at=r.created_at,
        )

    @classmethod
    def save_calculated_routes(
        cls,
        db: Session,
        mission_id: int,
        calc_response: RouteOptimizationResponse,
    ) -> RouteOptimizationResponse:
        """
        Persists newly generated routes into mission_routes table.
        Increments version number to preserve full calculation history.
        Never erases or overwrites previously saved routes.
        """
        # Determine next version number for this mission
        max_ver = db.scalar(
            select(func.coalesce(func.max(MissionRoute.version), 0))
            .where(MissionRoute.mission_id == mission_id)
        )
        next_ver = (max_ver or 0) + 1

        saved_primary: Optional[RouteItemResponse] = None
        saved_alt: Optional[RouteItemResponse] = None
        saved_all: List[RouteItemResponse] = []

        for route_item in calc_response.all_routes:
            # Build PostGIS LineString WKT from waypoints
            coords_wkt = ", ".join(f"{wp.longitude} {wp.latitude}" for wp in route_item.waypoints)
            geom_wkt = f"LINESTRING({coords_wkt})"

            # Serialize waypoints to JSON
            wps_json = [wp.model_dump() for wp in route_item.waypoints]
            r_type = "primary" if route_item.route_type in ("optimal", "primary") else "alternative"
            model = MissionRoute(
                mission_id=mission_id,
                report_id=route_item.report_id,
                route_type=r_type,
                is_selected=False,
                departure_port=route_item.departure_port,
                departure_lat=route_item.departure_lat,
                departure_lon=route_item.departure_lon,
                destination_target=route_item.destination_target,
                destination_lat=route_item.destination_lat,
                destination_lon=route_item.destination_lon,
                total_distance_km=route_item.total_distance_km,
                total_distance_nm=route_item.total_distance_nm,
                direct_distance_km=route_item.direct_distance_km,
                route_deviation_pct=route_item.route_deviation_pct,
                waypoint_count=route_item.waypoint_count,
                waypoints_json=wps_json,
                route_geometry=ST_SetSRID(ST_GeomFromText(geom_wkt), 4326),
                algorithm=route_item.algorithm,
                feasibility_status=route_item.feasibility_status,
                feasibility_message=route_item.feasibility_message,
                constraints_applied=route_item.constraints_applied,
                constraints_encountered=route_item.constraints_encountered,
                environmental_context=route_item.environmental_context,
                vessel_speed_knots=route_item.vessel_speed_knots,
                estimated_duration_hours=route_item.estimated_duration_hours,
                version=next_ver,
                selected_by=None,
                selected_at=None,
            )
            db.add(model)
            db.commit()
            db.refresh(model)

            formatted = cls._format_model_to_schema(model, db)
            saved_all.append(formatted)
            if model.route_type in ("optimal", "primary"):
                saved_primary = formatted
            elif model.route_type == "alternative":
                saved_alt = formatted

        return RouteOptimizationResponse(
            mission_id=mission_id,
            report_id=calc_response.report_id,
            status=calc_response.status,
            message=calc_response.message,
            primary_route=saved_primary,
            alternative_route=saved_alt,
            all_routes=saved_all,
            calculation_timestamp=datetime.now(timezone.utc),
            disclaimer=calc_response.disclaimer,
        )

    @classmethod
    def list_mission_routes(cls, db: Session, mission_id: int) -> List[RouteItemResponse]:
        """Returns all routes generated for this recovery mission, sorted newest first."""
        stmt = (
            select(MissionRoute)
            .where(MissionRoute.mission_id == mission_id)
            .order_by(desc(MissionRoute.version), desc(MissionRoute.is_selected), desc(MissionRoute.id))
        )
        rows = db.scalars(stmt).all()
        return [cls._format_model_to_schema(r, db) for r in rows]

    @classmethod
    def get_mission_route_by_id(cls, db: Session, mission_id: int, route_id: int) -> Optional[RouteItemResponse]:
        """Retrieves single route verifying mission isolation."""
        stmt = (
            select(MissionRoute)
            .where(MissionRoute.mission_id == mission_id, MissionRoute.id == route_id)
        )
        model = db.scalar(stmt)
        if not model:
            return None
        return cls._format_model_to_schema(model, db)

    @classmethod
    def get_selected_route_for_mission(cls, db: Session, mission_id: int) -> Optional[RouteItemResponse]:
        """Retrieves currently active selected route for a mission."""
        stmt = (
            select(MissionRoute)
            .where(MissionRoute.mission_id == mission_id, MissionRoute.is_selected == True)  # noqa: E712
            .order_by(desc(MissionRoute.id))
        )
        model = db.scalar(stmt)
        if not model:
            return None
        return cls._format_model_to_schema(model, db)

    @classmethod
    def select_mission_route(
        cls,
        db: Session,
        mission_id: int,
        route_id: int,
        selected_by: str = "Lead Operations Officer",
        notes: Optional[str] = None,
    ) -> RouteItemResponse:
        """
        Marks route as active selected route, clears previous selections for this mission,
        and updates recovery_missions.planned_route geometry in PostGIS.
        """
        route = db.get(MissionRoute, route_id)
        if not route or route.mission_id != mission_id:
            raise ValueError(f"Route ID {route_id} does not belong to Recovery Mission #{mission_id}.")

        mission = db.get(RecoveryMission, mission_id)
        if not mission:
            raise ValueError(f"Recovery mission ID {mission_id} does not exist.")

        now_utc = datetime.now(timezone.utc)

        # 1. Clear previous selected status on this mission's routes
        db.execute(
            update(MissionRoute)
            .where(MissionRoute.mission_id == mission_id)
            .values(is_selected=False)
        )

        # 2. Mark this route as selected
        route.is_selected = True
        route.selected_by = selected_by
        route.selected_at = now_utc

        # Ensure route_deviation_pct is accurately computed and persisted if it was 0 on an alternative route
        if float(route.direct_distance_km or 0.0) > 0.01:
            tot = float(route.total_distance_km)
            dir_d = float(route.direct_distance_km)
            geom_dev = round(((tot - dir_d) / dir_d) * 100.0, 1)
            if route.route_deviation_pct is None or (route.route_type == "alternative" and float(route.route_deviation_pct) == 0.0 and geom_dev > 0.0):
                route.route_deviation_pct = geom_dev

        # 3. Synchronize recovery_missions.planned_route geometry in PostGIS
        mission.planned_route = route.route_geometry

        # 4. Append to audit trail in mission clearances
        clearances_dict = dict(mission.clearances or {})
        audit_trail = list(clearances_dict.get("_audit_trail", []))
        audit_trail.append({
            "timestamp": now_utc.isoformat(),
            "action": "route_selected",
            "route_id": route.id,
            "route_type": route.route_type,
            "version": route.version,
            "total_distance_km": float(route.total_distance_km),
            "total_distance_nm": float(route.total_distance_nm),
            "waypoint_count": route.waypoint_count,
            "selected_by": selected_by,
            "notes": notes,
        })
        clearances_dict["_audit_trail"] = audit_trail
        mission.clearances = clearances_dict

        db.commit()
        db.refresh(route)
        db.refresh(mission)

        return cls._format_model_to_schema(route, db)
