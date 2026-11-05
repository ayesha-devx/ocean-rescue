"""
API endpoints for NGO Dashboard aggregated metrics.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dashboard import DashboardStatsResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["NGO Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse, status_code=status.HTTP_200_OK)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Calculate and return live NGO operational metrics strictly from actual database records.
    If the database contains zero records, returns honest zeroes and empty arrays.
    """
    return dashboard_service.calculate_dashboard_metrics(db)
