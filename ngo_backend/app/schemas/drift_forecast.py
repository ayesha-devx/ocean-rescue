"""
Pydantic Schemas for Drift Forecasts.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class DriftForecastBase(BaseModel):
    report_id: int = Field(..., ge=1, description="Associated gear report ID")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Predicted latitude (-90.0 to 90.0)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Predicted longitude (-180.0 to 180.0)")
    forecast_time: datetime = Field(..., description="Target forecast timestamp")
    risk_score: Optional[Decimal] = Field(None, ge=0.0, le=100.0, description="Composite environmental risk index (0-100)")
    model_name: str = Field(..., min_length=1, max_length=100, description="Drift model name e.g. Lagrangian Advection")
    step_index: Optional[int] = Field(0, ge=0, description="Step index in trajectory sequence")
    simulation_mode: Optional[bool] = Field(False, description="True if simulated/synthetic, False if derived from real environmental data")
    current_u: Optional[float] = Field(None, description="Eastward ocean current velocity in m/s")
    current_v: Optional[float] = Field(None, description="Northward ocean current velocity in m/s")
    current_speed: Optional[float] = Field(None, ge=0.0, description="Current speed in m/s")
    current_direction: Optional[float] = Field(None, ge=0.0, le=360.0, description="Current flow direction in degrees")
    source: Optional[str] = Field(None, max_length=255, description="Environmental data source")
    distance_km: Optional[float] = Field(None, ge=0.0, description="Displacement distance in km from reported location")
    segment_distance_km: Optional[float] = Field(None, ge=0.0, description="Step arc distance in km from previous point")
    wind_speed: Optional[float] = Field(None, ge=0.0, description="10m surface wind speed in m/s")
    wind_direction: Optional[float] = Field(None, ge=0.0, le=360.0, description="10m wind direction in degrees (from which wind blows)")
    windage_coefficient: Optional[float] = Field(None, ge=0.0, le=0.15, description="Applied windage leeway factor")
    leeway_speed: Optional[float] = Field(None, ge=0.0, description="Wind-driven leeway speed in m/s")
    leeway_direction: Optional[float] = Field(None, ge=0.0, le=360.0, description="Downwind leeway heading in degrees (towards which leeway pushes)")
    leeway_u: Optional[float] = Field(None, description="Eastward leeway velocity component in m/s")
    leeway_v: Optional[float] = Field(None, description="Northward leeway velocity component in m/s")
    drift_u: Optional[float] = Field(None, description="Eastward combined surface drift velocity (current + leeway) in m/s")
    drift_v: Optional[float] = Field(None, description="Northward combined surface drift velocity (current + leeway) in m/s")
    drift_speed: Optional[float] = Field(None, ge=0.0, description="Combined surface drift velocity magnitude in m/s")
    drift_direction: Optional[float] = Field(None, ge=0.0, le=360.0, description="Combined surface drift bearing in degrees")
    boundary_contained: Optional[bool] = Field(True, description="True if within defined study boundary")
    is_grounded: Optional[bool] = Field(False, description="True if point has contacted shoreline or is on land")
    drift_status: Optional[str] = Field("active_drift", description="'active_drift', 'grounded', or 'post_grounding_hypothetical'")
    is_valid_drift: Optional[bool] = Field(True, description="True if physically valid maritime drift prior to grounding")


class DriftForecastCreate(DriftForecastBase):
    pass


class DriftForecastResponse(DriftForecastBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DriftForecastGenerateRequest(BaseModel):
    report_id: int = Field(..., ge=1, description="Verified incident report ID")
    duration_hours: int = Field(24, ge=1, le=168, description="Forecast duration in hours (e.g. 6, 12, 24, 48)")
    time_step_hours: int = Field(1, ge=1, le=24, description="Integration time step in hours")
    windage: float = Field(0.025, ge=0.0, le=0.15, description="Surface windage coefficient (0.0 to 0.15, default 0.025)")
    force_simulation: bool = Field(False, description="Explicitly request synthetic simulation instead of live marine API")


class DriftTrajectorySummary(BaseModel):
    report_id: int
    gear_type: str
    start_latitude: float
    start_longitude: float
    start_time: datetime
    duration_hours: int
    time_step_hours: int
    points_count: int
    valid_points_count: Optional[int] = None
    valid_drift_duration_hours: Optional[int] = None
    source: str
    simulation_mode: bool
    current_speed_avg: Optional[float] = None
    current_direction_avg: Optional[float] = None
    wind_speed_avg: Optional[float] = None
    wind_direction_avg: Optional[float] = None
    windage: Optional[float] = None
    leeway_speed_avg: Optional[float] = None
    leeway_direction_avg: Optional[float] = None
    combined_drift_speed_avg: Optional[float] = None
    combined_drift_direction_avg: Optional[float] = None
    boundary_contained: bool = True
    boundary_exit_step: Optional[int] = None
    grounding_detected: bool = False
    grounding_step: Optional[int] = None
    grounding_location: Optional[dict] = None
    grounding_status: Optional[str] = "offshore_adrift"
    grounding_disclaimer: Optional[str] = None
    study_boundary: Optional[dict] = None
    limitations: Optional[str] = None
    calculation_method: str
    assumptions: str
    total_displacement_km: float
    net_displacement_km: Optional[float] = None
    total_path_distance_km: Optional[float] = None
    hypothetical_net_displacement_km: Optional[float] = None
    hypothetical_total_path_distance_km: Optional[float] = None
    points: List[DriftForecastResponse]


class MarineConditionsResponse(BaseModel):
    latitude: float
    longitude: float
    source: str
    mode: str  # "real_data", "historical_data", or "simulation"
    data_status: Optional[str] = "Live API response retrieved"  # Accurate descriptive status label
    observation_time: Optional[str] = None
    retrieval_time: str
    current_velocity: Optional[float] = None  # in m/s
    current_velocity_knots: Optional[float] = None
    current_direction: Optional[float] = None  # in degrees
    current_u: Optional[float] = None  # in m/s
    current_v: Optional[float] = None  # in m/s
    wave_height: Optional[float] = None  # in meters
    wave_direction: Optional[float] = None
    wind_speed: Optional[float] = None  # in m/s
    wind_speed_knots: Optional[float] = None
    wind_direction: Optional[float] = None  # in degrees
    wind_u: Optional[float] = None  # in m/s (downwind)
    wind_v: Optional[float] = None  # in m/s (downwind)
    boundary_contained: Optional[bool] = True
    data_available: bool
    status_message: str



class EligibleIncidentResponse(BaseModel):
    id: int
    gear_type: str
    status: str
    latitude: float
    longitude: float
    reported_at: datetime
    description: Optional[str] = None
    drift_forecasts_count: int = 0
