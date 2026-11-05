"""
API Endpoints for OceanRescue Risk Prioritization Subsystem.
Provides decision support endpoints for retrieving risk-ranked incident queues,
granular factor breakdowns, and interactive weight recalibration.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.gear_report import GearReport
from app.schemas.risk import (
    RiskQueueResponse,
    RiskAssessmentResponse,
    RiskWeightConfig,
    EvaluateRiskRequest,
    RiskWeightResponse,
)
from app.services.risk_service import (
    DEFAULT_WEIGHTS,
    get_risk_prioritized_queue,
    evaluate_and_persist_incident_risk,
    calculate_incident_risk,
)

router = APIRouter(prefix="/risk", tags=["Risk Prioritization"])


@router.get("/queue", response_model=RiskQueueResponse)
def get_risk_queue(
    priority: Optional[str] = Query(None, description="Filter by priority: critical, high, medium, low"),
    gear_type: Optional[str] = Query(None, description="Filter by gear type slug"),
    wildlife: Optional[str] = Query(None, description="Filter by wildlife impact: confirmed, unconfirmed"),
    completeness: Optional[str] = Query(None, description="Filter by data completeness: complete, needs_inputs"),
    search: Optional[str] = Query(None, description="Search term matching ID, gear type, or coordinates"),
    sort_by: str = Query("risk_score", description="Sort attribute: risk_score, report_id, reported_at, gear_type"),
    sort_order: str = Query("desc", description="Sort direction: asc or desc"),
    db: Session = Depends(get_db),
):
    """
    Retrieve the risk-prioritized recovery queue of verified fishing gear incidents.
    Includes aggregated summary counts across priority bands and data completeness flags.
    """
    return get_risk_prioritized_queue(
        db=db,
        priority=priority,
        gear_type=gear_type,
        wildlife=wildlife,
        completeness=completeness,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        weights=None,
    )


@router.get("/incident/{report_id}", response_model=RiskAssessmentResponse)
def get_incident_risk_assessment(
    report_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve or compute the explainable risk assessment for a specific incident.
    Returns granular factor points, weights, missing data flags, and recommended action.
    """
    report = db.get(GearReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report #{report_id} does not exist."
        )

    try:
        return evaluate_and_persist_incident_risk(
            report_id=report_id,
            db=db,
            weights=None,
            persist=True,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not compute risk assessment: {str(e)}"
        )


@router.post("/evaluate/{report_id}", response_model=RiskAssessmentResponse)
def evaluate_incident_risk_custom(
    report_id: int,
    payload: Optional[EvaluateRiskRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Re-evaluate an incident's risk score, optionally applying custom decision-support weights.
    """
    report = db.get(GearReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report #{report_id} does not exist."
        )

    custom_weights = payload.custom_weights if payload else None

    if custom_weights:
        total = (
            custom_weights.gear_hazard
            + custom_weights.wildlife_risk
            + custom_weights.drift_dispersal
            + custom_weights.coastal_grounding
            + custom_weights.temporal_age
        )
        if not (abs(total - 1.0) < 0.05 or abs(total - 100.0) < 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Custom weights must sum to 1.0 (or 100%). Received sum: {total:.2f}."
            )

    try:
        return evaluate_and_persist_incident_risk(
            report_id=report_id,
            db=db,
            weights=custom_weights,
            persist=(custom_weights is None),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate incident risk: {str(e)}"
        )


@router.get("/weights", response_model=RiskWeightResponse)
def get_default_weights():
    """
    Return the documented baseline multi-criteria decision support weights
    along with prototype priority band thresholds.
    """
    return RiskWeightResponse(
        weights={
            "gear_hazard": round(DEFAULT_WEIGHTS.gear_hazard / 100.0, 2),
            "wildlife_risk": round(DEFAULT_WEIGHTS.wildlife_risk / 100.0, 2),
            "drift_dispersal": round(DEFAULT_WEIGHTS.drift_dispersal / 100.0, 2),
            "coastal_grounding": round(DEFAULT_WEIGHTS.coastal_grounding / 100.0, 2),
            "temporal_age": round(DEFAULT_WEIGHTS.temporal_age / 100.0, 2),
        },
        priority_bands={
            "critical": [80.0, 100.0],
            "high": [60.0, 79.9],
            "medium": [35.0, 59.9],
            "low": [0.0, 34.9],
        },
    )
