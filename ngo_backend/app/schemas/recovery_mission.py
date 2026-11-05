"""
Pydantic Schemas for Recovery Missions.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, field_validator, computed_field


class MissionStatusEnum(str, Enum):
    PLANNED = "planned"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    SUCCESSFULLY_RECOVERED = "successfully_recovered"
    PARTIALLY_RECOVERED = "partially_recovered"
    UNSUCCESSFUL = "unsuccessful"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RecoveryOutcomeEnum(str, Enum):
    SUCCESSFULLY_RECOVERED = "successfully_recovered"
    PARTIALLY_RECOVERED = "partially_recovered"
    UNSUCCESSFUL = "unsuccessful"


class Waypoint(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class RecoveryMissionBase(BaseModel):
    report_id: int = Field(..., ge=1, description="Associated gear report ID")
    title: Optional[str] = Field(None, max_length=255, description="Mission designation / title")
    departure_port: Optional[str] = Field(
        default="Mirkarwada Fishing Harbour, Ratnagiri",
        max_length=150,
        description="Staging departure port"
    )
    target_sector: Optional[str] = Field(
        default="Arabian Sea – Ratnagiri / Konkan Coast",
        max_length=150,
        description="Target marine operational sector"
    )
    assigned_to: Optional[str] = Field(None, max_length=150, description="Assigned vessel or salvage crew")
    vessel: Optional[str] = Field(None, description="Alternative field for assigned vessel")
    status: str = Field("planned", description="Mission status (planned, in_progress, successfully_recovered, partially_recovered, unsuccessful, cancelled)")
    priority: Optional[str] = Field("HIGH", max_length=50, description="Mission priority tier")
    operational_notes: Optional[str] = Field(None, description="Operational salvage notes")
    notes: Optional[str] = Field(None, description="Alternative field for operational notes")
    scheduled_at: Optional[datetime] = Field(None, description="Planned deployment window")
    target_date: Optional[str] = Field(None, description="Planned recovery date string (YYYY-MM-DD)")
    completed_at: Optional[datetime] = Field(None, description="Actual retrieval clearance timestamp")
    route_waypoints: Optional[List[Waypoint]] = Field(None, description="Waypoints for planned LineString route")

    @field_validator("status")
    def validate_status(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned in ("aborted", "cancelled"):
            return "cancelled"
        if cleaned in ("draft", "draft ready", "draft_ready", "planned"):
            return "planned"
        if cleaned in ("recovered", "successful", "success", "successfully_recovered"):
            return "successfully_recovered"
        if cleaned in ("partial", "partially_recovered"):
            return "partially_recovered"
        if cleaned in ("failed", "unsuccessful"):
            return "unsuccessful"
        valid = [s.value for s in MissionStatusEnum]
        if cleaned not in valid:
            raise ValueError(f"Invalid status '{v}'. Allowed: {', '.join(valid)}")
        return cleaned


class RecoveryMissionCreate(RecoveryMissionBase):
    pass


class RecoveryMissionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    departure_port: Optional[str] = Field(None, max_length=150)
    target_sector: Optional[str] = Field(None, max_length=150)
    assigned_to: Optional[str] = Field(None, max_length=150)
    vessel: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    operational_notes: Optional[str] = None
    notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    target_date: Optional[str] = None
    completed_at: Optional[datetime] = None
    route_waypoints: Optional[List[Waypoint]] = None

    @field_validator("status")
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().lower()
        if cleaned in ("aborted", "cancelled"):
            return "cancelled"
        if cleaned in ("draft", "draft ready", "draft_ready", "planned"):
            return "planned"
        if cleaned in ("recovered", "successful", "success", "successfully_recovered"):
            return "successfully_recovered"
        if cleaned in ("partial", "partially_recovered"):
            return "partially_recovered"
        if cleaned in ("failed", "unsuccessful"):
            return "unsuccessful"
        valid = [s.value for s in MissionStatusEnum]
        if cleaned not in valid:
            raise ValueError(f"Invalid status '{v}'. Allowed: {', '.join(valid)}")
        return cleaned


class RecoveryOutcomeCreate(BaseModel):
    outcome: str = Field(..., description="Recovery result: successfully_recovered, partially_recovered, unsuccessful")
    notes: Optional[str] = Field(None, max_length=5000, description="Notes describing operational retrieval result")
    evidence_url: Optional[str] = Field(None, description="Optional photo URL or path of recovered gear")
    submitted_by: Optional[str] = Field("Lead Recovery Officer", description="Authorized officer name/callsign")

    @field_validator("outcome")
    def validate_outcome(cls, v: str) -> str:
        cleaned = v.strip().lower()
        valid = [o.value for o in RecoveryOutcomeEnum]
        if cleaned not in valid:
            raise ValueError(f"Invalid outcome '{v}'. Must be one of: {', '.join(valid)}")
        return cleaned


class RecoveryOutcomeCorrectionCreate(BaseModel):
    outcome: str = Field(..., description="Corrected recovery result: successfully_recovered, partially_recovered, unsuccessful")
    correction_reason: str = Field(..., min_length=3, max_length=2000, description="Mandatory audit explanation for correcting this recovery outcome")
    notes: Optional[str] = Field(None, max_length=5000, description="Updated operational notes")
    evidence_url: Optional[str] = Field(None, description="Optional photo URL or path of recovered gear")
    submitted_by: Optional[str] = Field("Lead Recovery Officer", description="Authorized officer certifying the correction")

    @field_validator("outcome")
    def validate_outcome(cls, v: str) -> str:
        cleaned = v.strip().lower()
        valid = [o.value for o in RecoveryOutcomeEnum]
        if cleaned not in valid:
            raise ValueError(f"Invalid outcome '{v}'. Must be one of: {', '.join(valid)}")
        return cleaned

    @field_validator("correction_reason")
    def validate_reason(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Correction reason is mandatory for outcome corrections.")
        return v.strip()


class RecoveryOutcomeResponse(BaseModel):
    id: int
    mission_id: int
    incident_id: int
    outcome: str
    notes: Optional[str] = None
    evidence_url: Optional[str] = None
    submitted_by: str
    submitted_at: datetime
    is_correction: bool = False
    correction_reason: Optional[str] = None
    original_outcome_id: Optional[int] = None

    model_config = {"from_attributes": True}


class RecoveryMissionStatsResponse(BaseModel):
    total_missions: int
    planned: int
    in_progress: int
    successfully_recovered: int
    partially_recovered: int
    unsuccessful: int
    cancelled: int


class RecoveryMissionResponse(BaseModel):
    id: int
    report_id: int
    title: Optional[str] = None
    departure_port: Optional[str] = "Mirkarwada Fishing Harbour, Ratnagiri"
    target_sector: Optional[str] = "Arabian Sea – Ratnagiri / Konkan Coast"
    assigned_to: Optional[str] = None
    status: str
    priority: Optional[str] = "HIGH"
    operational_notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    route_geojson: Optional[dict] = None

    # Recovery Outcome Tracking
    latest_outcome: Optional[RecoveryOutcomeResponse] = None
    outcomes: List[RecoveryOutcomeResponse] = Field(default_factory=list)

    # Incident Context
    incident_gear_type: Optional[str] = None
    incident_latitude: Optional[float] = None
    incident_longitude: Optional[float] = None
    incident_priority: Optional[str] = None
    incident_risk_score: Optional[float] = None
    incident_status: Optional[str] = None

    # Route Optimization Status
    has_selected_route: bool = Field(default=False, description="True if a route has been optimized and saved")
    selected_route_id: Optional[int] = None
    selected_route_type: Optional[str] = Field(default=None, description="'primary' or 'alternative'")
    selected_route_version: Optional[int] = None
    selected_route_departure: Optional[str] = None
    selected_route_destination: Optional[str] = None
    selected_route_distance_km: Optional[float] = None
    selected_route_distance_nm: Optional[float] = None
    selected_route_direct_distance_km: Optional[float] = None
    selected_route_deviation_pct: Optional[float] = None
    selected_route_waypoints_count: Optional[int] = None
    selected_route_status: Optional[str] = Field(default="pending", description="Route clearance status: 'cleared', 'pending', etc.")
    selected_route_estimated_duration_formatted: Optional[str] = None

    @computed_field
    @property
    def name(self) -> str:
        """Alias for title for frontend compatibility."""
        return self.title or f"Recovery Mission #{self.id} (Incident #{self.report_id})"

    @computed_field
    @property
    def vessel(self) -> Optional[str]:
        """Alias for assigned_to for frontend compatibility."""
        return self.assigned_to

    @computed_field
    @property
    def port(self) -> str:
        """Alias for departure_port for frontend compatibility."""
        return self.departure_port or "Mirkarwada Fishing Harbour, Ratnagiri"

    @computed_field
    @property
    def region(self) -> str:
        """Alias for target_sector for frontend compatibility."""
        return self.target_sector or "Arabian Sea – Ratnagiri / Konkan Coast"

    @computed_field
    @property
    def notes(self) -> Optional[str]:
        """Alias for operational_notes for frontend compatibility."""
        return self.operational_notes

    @computed_field
    @property
    def targetDate(self) -> Optional[str]:
        """Formatted date for frontend compatibility."""
        if self.scheduled_at:
            return self.scheduled_at.strftime("%Y-%m-%d")
        return None

    model_config = {"from_attributes": True}
