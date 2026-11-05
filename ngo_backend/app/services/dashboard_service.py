"""
Dashboard Service — Computes live operational metrics from database tables.
Guarantees absolute data integrity: Zero fabricated statistics or dummy counts.
"""

from datetime import datetime, timezone
from typing import Dict
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session

from app.models.gear_report import GearReport
from app.models.ai_detection import AiDetection
from app.models.environmental_observation import EnvironmentalObservation
from app.models.drift_forecast import DriftForecast
from app.models.recovery_mission import RecoveryMission
from app.schemas.dashboard import DashboardStatsResponse
from app.services.report_service import format_report_response


def calculate_dashboard_metrics(db: Session) -> DashboardStatsResponse:
    """
    Computes all operational metrics directly from PostgreSQL records.
    """
    # 1. Total reports
    total_reports = db.scalar(select(func.count(GearReport.id))) or 0

    # 2. Status distribution
    status_query = select(GearReport.status, func.count(GearReport.id)).group_by(GearReport.status)
    status_counts: Dict[str, int] = {row[0]: row[1] for row in db.execute(status_query).all()}

    verified_reports = status_counts.get("verified", 0)
    pending_reports = status_counts.get("reported", 0)
    in_review_reports = status_counts.get("in_review", 0)
    scheduled_recovery_reports = status_counts.get("scheduled_recovery", 0)
    resolved_reports = status_counts.get("resolved", 0)
    cancelled_reports = status_counts.get("cancelled", 0)

    # 3. Gear type distribution
    gear_query = select(GearReport.gear_type, func.count(GearReport.id)).group_by(GearReport.gear_type)
    gear_type_distribution: Dict[str, int] = {row[0]: row[1] for row in db.execute(gear_query).all()}

    # 4. Subsystem record counts
    total_ai = db.scalar(select(func.count(AiDetection.id))) or 0
    total_env = db.scalar(select(func.count(EnvironmentalObservation.id))) or 0
    total_drift = db.scalar(select(func.count(DriftForecast.id))) or 0
    total_missions = db.scalar(select(func.count(RecoveryMission.id))) or 0

    # Active missions (not completed and not aborted)
    active_missions = db.scalar(
        select(func.count(RecoveryMission.id)).where(
            RecoveryMission.status.in_(["planned", "assigned", "in_progress"])
        )
    ) or 0

    # 5. Recent reports (latest 5)
    recent_stmt = select(GearReport).order_by(desc(GearReport.reported_at)).limit(5)
    recent_db_reports = db.scalars(recent_stmt).all()
    recent_reports = [format_report_response(r, db) for r in recent_db_reports]

    return DashboardStatsResponse(
        total_reports=total_reports,
        verified_reports=verified_reports,
        pending_reports=pending_reports,
        in_review_reports=in_review_reports,
        scheduled_recovery_reports=scheduled_recovery_reports,
        resolved_reports=resolved_reports,
        cancelled_reports=cancelled_reports,
        status_counts=status_counts,
        gear_type_distribution=gear_type_distribution,
        total_ai_detections=total_ai,
        total_environmental_observations=total_env,
        total_drift_forecasts=total_drift,
        total_recovery_missions=total_missions,
        active_recovery_missions=active_missions,
        recent_reports=recent_reports,
        generated_at=datetime.now(timezone.utc)
    )
