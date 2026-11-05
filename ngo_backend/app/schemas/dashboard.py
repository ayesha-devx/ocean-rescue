"""
Pydantic Schemas for NGO Dashboard and Operational Metrics.
"""

from datetime import datetime
from typing import Dict, List, Any
from pydantic import BaseModel, Field

from app.schemas.gear_report import GearReportResponse


class DashboardStatsResponse(BaseModel):
    """
    Live aggregated statistics calculated strictly from actual database records.
    Never returns fabricated or mock operational counts.
    """
    total_reports: int = Field(..., ge=0, description="Total gear reports recorded")
    verified_reports: int = Field(..., ge=0, description="Reports verified by NGO specialists")
    pending_reports: int = Field(..., ge=0, description="Reports awaiting triage review")
    in_review_reports: int = Field(..., ge=0, description="Reports currently under review")
    scheduled_recovery_reports: int = Field(..., ge=0, description="Reports assigned to recovery operations")
    resolved_reports: int = Field(..., ge=0, description="Reports successfully retrieved and cleared")
    cancelled_reports: int = Field(..., ge=0, description="Reports flagged as false alarms or duplicates")
    
    # Distributions
    status_counts: Dict[str, int] = Field(default_factory=dict, description="Counts keyed by status")
    gear_type_distribution: Dict[str, int] = Field(default_factory=dict, description="Counts keyed by gear type")
    
    # Subsystem counters
    total_ai_detections: int = Field(..., ge=0, description="Total AI detection inferences logged")
    total_environmental_observations: int = Field(..., ge=0, description="Total hydrodynamic/wind observations")
    total_drift_forecasts: int = Field(..., ge=0, description="Total drift trajectory simulations logged")
    total_recovery_missions: int = Field(..., ge=0, description="Total recovery missions scheduled or executed")
    active_recovery_missions: int = Field(..., ge=0, description="Missions currently in progress or planned")

    # Recent activity
    recent_reports: List[GearReportResponse] = Field(default_factory=list, description="Recent incident reports")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of telemetry calculation")
