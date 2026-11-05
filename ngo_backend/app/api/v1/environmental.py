"""
API endpoints for Environmental Observations subsystem.
Integrates live Open-Meteo marine & weather telemetry, PostGIS persistence,
and truthful sensor feed statuses.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint, ST_X, ST_Y

from app.db.session import get_db
from app.models.environmental_observation import EnvironmentalObservation
from app.schemas.environmental_observation import (
    EnvironmentalObservationCreate,
    EnvironmentalObservationResponse,
)
from app.schemas.common import PaginatedResponse
from app.services import environmental_service

router = APIRouter(prefix="/environmental-observations", tags=["Environmental Intelligence"])


class LiveTelemetryQueryRequest(BaseModel):
    latitude: float = Field(16.99, ge=-90.0, le=90.0, description="Target observation latitude (defaults to Mirkarwada Pilot Harbour)")
    longitude: float = Field(73.30, ge=-180.0, le=180.0, description="Target observation longitude")
    target_time: Optional[datetime] = Field(None, description="Optional target date/time")
    force_simulation: bool = Field(False, description="Force synthetic simulation mode")
    report_id: Optional[int] = Field(None, description="Optional associated incident/report ID")


def format_env_response(obs: EnvironmentalObservation, db: Session) -> EnvironmentalObservationResponse:
    coords = db.execute(
        select(
            ST_X(obs.observation_location).label("lon"),
            ST_Y(obs.observation_location).label("lat")
        )
    ).one()

    return EnvironmentalObservationResponse(
        id=obs.id,
        latitude=float(coords.lat),
        longitude=float(coords.lon),
        current_speed=obs.current_speed,
        current_direction=obs.current_direction,
        wind_speed=obs.wind_speed,
        wind_direction=obs.wind_direction,
        wave_height=obs.wave_height,
        observed_at=obs.observed_at,
        source=obs.source,
        report_id=obs.report_id,
        status_message=obs.status_message,
        retrieved_at=obs.retrieved_at,
        meta_info=obs.meta_info,
    )


@router.post("/query-live", response_model=EnvironmentalObservationResponse, status_code=status.HTTP_201_CREATED)
def query_and_save_live_telemetry(
    req: LiveTelemetryQueryRequest,
    db: Session = Depends(get_db)
):
    """
    On-demand telemetry retrieval:
    1. Queries real environmental data via Open-Meteo Marine & Weather APIs.
    2. Validates observations, units, and timestamps.
    3. Persists the validated observation into PostgreSQL/PostGIS.
    4. Returns the stored record with truthful data status.
    """
    cond = environmental_service.get_environmental_conditions(
        latitude=req.latitude,
        longitude=req.longitude,
        target_time=req.target_time,
        force_simulation=req.force_simulation
    )

    obs = environmental_service.save_environmental_observation_record(db, cond, report_id=req.report_id)
    return format_env_response(obs, db)


@router.post("", response_model=EnvironmentalObservationResponse, status_code=status.HTTP_201_CREATED)
def create_environmental_observation(
    data: EnvironmentalObservationCreate,
    db: Session = Depends(get_db)
):
    """
    Log an environmental sensor observation (ocean current, wind, waves).
    Stores location as PostGIS Point (SRID 4326).
    """
    geom = ST_SetSRID(ST_MakePoint(data.longitude, data.latitude), 4326)
    obs = EnvironmentalObservation(
        observation_location=geom,
        current_speed=data.current_speed,
        current_direction=data.current_direction,
        wind_speed=data.wind_speed,
        wind_direction=data.wind_direction,
        wave_height=data.wave_height,
        observed_at=data.observed_at,
        source=data.source,
        report_id=data.report_id,
        status_message=data.status_message,
        meta_info=data.meta_info,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return format_env_response(obs, db)


@router.get("", response_model=PaginatedResponse[EnvironmentalObservationResponse])
def list_environmental_observations(
    source: Optional[str] = Query(None, description="Filter by data source (e.g. NOAA, Copernicus)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List recorded environmental observations with pagination.
    """
    stmt = select(EnvironmentalObservation)
    if source:
        stmt = stmt.where(EnvironmentalObservation.source.ilike(f"%{source}%"))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    offset = (page - 1) * page_size
    stmt = stmt.order_by(desc(EnvironmentalObservation.observed_at)).offset(offset).limit(page_size)

    observations = db.scalars(stmt).all()
    items = [format_env_response(o, db) for o in observations]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )


@router.get("/latest", response_model=Optional[EnvironmentalObservationResponse])
def get_latest_observation(
    report_id: Optional[int] = Query(None, description="Optional filter by incident/report ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve the most recent environmental telemetry observation.
    Optionally filter by associated incident/report ID.
    Returns null if no matching environmental records exist.
    """
    stmt = select(EnvironmentalObservation)
    if report_id is not None:
        stmt = stmt.where(EnvironmentalObservation.report_id == report_id)
    stmt = stmt.order_by(desc(EnvironmentalObservation.observed_at)).limit(1)
    obs = db.scalars(stmt).first()
    if not obs:
        return None
    return format_env_response(obs, db)
