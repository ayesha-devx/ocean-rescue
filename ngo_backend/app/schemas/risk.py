"""
Pydantic schemas for OceanRescue Risk Prioritization subsystem.
Defines transparent factor breakdown, priority bands, weights, and queue summaries.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, computed_field


class PriorityBandEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DataConfidenceEnum(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RiskWeightConfig(BaseModel):
    """
    Documented multi-criteria weights for explainable risk calculation.
    Default configuration reflects FAO/NOAA ghost gear impact frameworks.
    """
    gear_hazard: float = Field(30.0, ge=0.0, le=100.0, description="Weight for fishing gear type & lethality (0-100)")
    wildlife_risk: float = Field(25.0, ge=0.0, le=100.0, description="Weight for confirmed/suspected wildlife entanglement (0-100)")
    drift_dispersal: float = Field(20.0, ge=0.0, le=100.0, description="Weight for hydrodynamic drift velocity & vector displacement (0-100)")
    coastal_grounding: float = Field(15.0, ge=0.0, le=100.0, description="Weight for shoreline grounding proximity & coastal habitat sensitivity (0-100)")
    temporal_age: float = Field(10.0, ge=0.0, le=100.0, description="Weight for incident age & retrieval window urgency (0-100)")


class EvaluateRiskRequest(BaseModel):
    """
    Optional payload for dynamic re-evaluation with custom decision-support weights.
    """
    custom_weights: Optional[RiskWeightConfig] = None


class RiskWeightResponse(BaseModel):
    """
    Response schema for weights and priority band thresholds documentation.
    """
    weights: Dict[str, float]
    priority_bands: Dict[str, List[float]]
    model_version: str = "v3.4"
    documentation: str = (
        "Prototype multi-criteria decision support scoring engine (0-100) based on FAO/NOAA ghost gear impact frameworks. "
        "Configurable operational thresholds, not scientifically validated limits."
    )


class RiskFactorDetail(BaseModel):
    """
    Detailed explainability breakdown for a single contributing risk factor.
    """
    factor_key: str = Field(..., description="Machine identifier (e.g. gear_hazard, wildlife_risk)")
    name: str = Field(..., description="Human-readable title")
    weight_pct: float = Field(..., description="Assigned factor weight percentage")
    points_awarded: float = Field(..., description="Points awarded (0 to max_points)")
    max_points: float = Field(..., description="Maximum possible points for this factor")
    status: str = Field(..., description="Source status: measured, model_estimate, inferred, baseline, unassessed, missing, incomplete")
    raw_value: Optional[Any] = Field(None, description="Input measurement or raw parameter value")
    description: str = Field(..., description="Human-readable justification for points awarded")
    confidence: str = Field(default="medium", description="Factor-level confidence: high, medium, low")
    evidence_sources: List[str] = Field(default_factory=list, description="Primary data sources for this assessment")
    formula_description: Optional[str] = Field(default=None, description="Exact formula applied to derive awarded points")

    @computed_field
    @property
    def points(self) -> float:
        """Alias for points_awarded for frontend compatibility."""
        return self.points_awarded

    @computed_field
    @property
    def details(self) -> str:
        """Alias for description for frontend compatibility."""
        return self.description

    @computed_field
    @property
    def weight(self) -> float:
        """Normalized weight multiplier (0.0 to 1.0)."""
        return round(self.weight_pct / 100.0, 4)


class RiskAssessmentResponse(BaseModel):
    """
    Complete explainable risk assessment payload for an incident.
    """
    report_id: int
    assessment_id: Optional[int] = None
    gear_type: str
    reported_at: Optional[datetime] = None
    latitude: float
    longitude: float
    status: str
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Normalized composite risk index (0 to 100)")
    priority: PriorityBandEnum = Field(..., description="Priority category: critical, high, medium, low")
    data_confidence: DataConfidenceEnum = Field(..., description="Completeness of underlying observations: high, medium, low")
    needs_inputs: bool = Field(..., description="True if essential forecast or telemetry inputs are missing")
    completeness_status: str = Field(default="complete", description="Completeness tier: complete or needs_inputs")

    primary_reason: str = Field(..., description="Concise primary hazard driver")
    explanation: str = Field(..., description="Detailed analytical justification of the assigned priority")
    recommended_action: str = Field(..., description="Rule-based recommended operational next step")

    factors: Dict[str, RiskFactorDetail] = Field(..., description="Granular breakdown of all factor weights and points")
    missing_inputs: List[str] = Field(default_factory=list, description="List of unassessed or missing telemetry dimensions")
    stale_inputs: List[str] = Field(default_factory=list, description="List of stale or outdated telemetry inputs")

    # Linked contextual metadata
    wildlife_impact_confirmed: bool = False
    grounding_detected: bool = False
    grounding_step: Optional[int] = None
    grounding_location: Optional[Dict[str, float]] = None
    min_shoreline_distance_km: Optional[float] = None
    has_forecast: bool = False
    latest_forecast_id: Optional[int] = None
    forecast_generated_time: Optional[datetime] = None
    forecast_validity_period_hours: Optional[float] = None
    forecast_is_stale: bool = False
    forecast_points_count: Optional[int] = None
    valid_trajectory_points_count: Optional[int] = None
    hypothetical_trajectory_points_count: Optional[int] = None
    net_displacement_km: Optional[float] = None
    total_path_distance_km: Optional[float] = None
    hypothetical_net_displacement_km: Optional[float] = None
    hypothetical_total_path_distance_km: Optional[float] = None
    current_speed: Optional[float] = None
    wind_speed: Optional[float] = None
    wave_height: Optional[float] = None
    environmental_source: Optional[str] = None

    assessed_at: datetime
    updated_at: datetime
    assessment_timestamp: Optional[datetime] = None
    calculation_version: str = Field(default="v3.5-verified", description="Version of the risk prioritization algorithm")

    @computed_field
    @property
    def incident_id(self) -> int:
        """Alias for report_id for standardized API schema."""
        return self.report_id

    @computed_field
    @property
    def age_days(self) -> Optional[float]:
        """Calculates floating incident age in days."""
        if self.reported_at:
            now = datetime.now(timezone.utc)
            rep = self.reported_at
            if rep.tzinfo is None:
                rep = rep.replace(tzinfo=timezone.utc)
            return max(0.0, round((now - rep).total_seconds() / 86400.0, 1))
        return None


class RiskQueueSummary(BaseModel):
    total_assessed: int = 0
    total_verified: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    needs_inputs_count: int = 0
    verified_count: int = 0
    average_score: float = 0.0


class RiskQueueResponse(BaseModel):
    summary: RiskQueueSummary
    items: List[RiskAssessmentResponse]
    weights: RiskWeightConfig

