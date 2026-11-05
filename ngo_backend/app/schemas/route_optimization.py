"""
Pydantic Schemas for Route Optimization Module.
Validates inputs and serializes outputs for A* marine pathfinding,
route comparison, persistence, and navigation disclaimers.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class WaypointItem(BaseModel):
    index: int = Field(..., description="1-indexed sequence order of the waypoint")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude")
    distance_from_prev_km: float = Field(0.0, ge=0.0, description="Leg distance in kilometers")
    cumulative_distance_km: float = Field(0.0, ge=0.0, description="Cumulative distance from start in km")
    cumulative_distance_nm: float = Field(0.0, ge=0.0, description="Cumulative distance from start in Nautical Miles")
    label: Optional[str] = Field(None, description="Descriptive label e.g. 'Harbour Departure', 'Waypoint 1', 'Recovery Target'")


class RouteConstraintConfig(BaseModel):
    avoid_land: bool = Field(True, description="Strictly prohibit crossing or routing over terrestrial land")
    avoid_restricted_zones: bool = Field(True, description="Avoid designated marine sanctuaries and protected areas")
    coastal_buffer_km: float = Field(1.5, ge=0.2, le=20.0, description="Minimum clearance distance from continental coastline in km")
    marine_sanctuary_buffer_km: float = Field(1.5, ge=0.0, le=20.0, description="Safety clearance buffer from protected sanctuary boundaries in km")


class RouteOptimizationRequest(BaseModel):
    departure_port: Optional[str] = Field(
        "Mirkarwada Fishing Harbour, Ratnagiri",
        description="Designation of departure harbour base"
    )
    departure_lat: Optional[float] = Field(
        16.99,
        ge=-90.0,
        le=90.0,
        description="WGS84 latitude of departure harbour"
    )
    departure_lon: Optional[float] = Field(
        73.30,
        ge=-180.0,
        le=180.0,
        description="WGS84 longitude of departure harbour"
    )
    target_type: str = Field(
        "incident_reported",
        description="Source of recovery target coordinates: 'incident_reported', 'drift_endpoint', 'grounding_point', or 'custom'"
    )
    target_lat: Optional[float] = Field(
        None,
        ge=-90.0,
        le=90.0,
        description="Override recovery target latitude"
    )
    target_lon: Optional[float] = Field(
        None,
        ge=-180.0,
        le=180.0,
        description="Override recovery target longitude"
    )
    vessel_name: Optional[str] = Field(
        None,
        description="Assigned vessel name for operational tracking"
    )
    vessel_speed_knots: Optional[float] = Field(
        None,
        gt=0.0,
        le=50.0,
        description="Cruising speed in knots for travel time calculation"
    )
    constraints: Optional[RouteConstraintConfig] = Field(
        default_factory=RouteConstraintConfig,
        description="Operational safety constraints"
    )
    incorporate_environmental: bool = Field(
        True,
        description="Whether to incorporate available ocean current telemetry into route cost"
    )

    @field_validator("target_type")
    @classmethod
    def validate_target_type(cls, v: str) -> str:
        valid = {"incident_reported", "drift_endpoint", "grounding_point", "custom"}
        if v.lower() not in valid:
            raise ValueError(f"target_type must be one of: {', '.join(sorted(valid))}")
        return v.lower()


class RouteItemResponse(BaseModel):
    id: Optional[int] = Field(None, description="Database primary key if persisted")
    mission_id: int
    report_id: int
    route_type: str = Field(..., description="'primary' (shortest feasible) or 'alternative' (conservative offshore buffer)")
    is_selected: bool = Field(False, description="Whether this is the active selected route for the recovery mission")
    
    # Departure & Destination
    departure_port: str
    departure_lat: float
    departure_lon: float
    destination_target: str
    destination_lat: float
    destination_lon: float

    # Distances & Metrics
    total_distance_km: float
    total_distance_nm: float
    direct_distance_km: float
    route_deviation_pct: Optional[float] = None
    waypoint_count: int
    waypoints: List[WaypointItem]
    route_geojson: Dict[str, Any] = Field(..., description="GeoJSON Feature with LineString geometry")

    # Algorithm & Feasibility
    algorithm: str
    feasibility_status: str = Field(..., description="'feasible', 'blocked', or 'prototype'")
    feasibility_message: Optional[str] = None
    constraints_applied: Dict[str, Any] = Field(default_factory=dict)
    constraints_encountered: List[str] = Field(default_factory=list)

    # Environmental & Vessel Context
    environmental_context: Optional[Dict[str, Any]] = None
    vessel_speed_knots: Optional[float] = None
    estimated_duration_hours: Optional[float] = None
    estimated_duration_formatted: Optional[str] = None

    # Versioning & Audit
    version: int = 1
    selected_by: Optional[str] = None
    selected_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    disclaimer: str = Field(
        "Preliminary decision-support route calculated via A* grid search. "
        "Not certified for official maritime navigation without authoritative nautical chart and Coast Guard clearance.",
        description="Legal and navigational safety disclaimer"
    )


class RouteOptimizationResponse(BaseModel):
    mission_id: int
    report_id: int
    status: str = Field(..., description="'calculated', 'no_feasible_route', or 'error'")
    message: str
    primary_route: Optional[RouteItemResponse] = None
    alternative_route: Optional[RouteItemResponse] = None
    all_routes: List[RouteItemResponse] = Field(default_factory=list)
    calculation_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    disclaimer: str = Field(
        "Preliminary decision-support route calculated via A* grid search. "
        "Not certified for official maritime navigation without authoritative nautical chart and Coast Guard clearance."
    )


class RouteSelectionRequest(BaseModel):
    selected_by: Optional[str] = Field("Lead Operations Officer", description="Designation of officer confirming route")
    notes: Optional[str] = Field(None, description="Optional operational notes logged with route selection")


class RestrictedMarineZoneFeature(BaseModel):
    id: str
    name: str
    designation: str
    marine_type: str
    area_km2: Optional[float] = None
    geometry: Dict[str, Any]
    properties: Dict[str, Any]
