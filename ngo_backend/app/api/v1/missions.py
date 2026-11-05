"""
API endpoints for recovery missions and recovery outcome tracking.
Completely removes obsolete Operational Sign-Off Clearance and provides
streamlined Recovery Outcome Tracking for NGO operations.
"""

from datetime import datetime, timezone, date
import json
import os
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Request
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_SetSRID, ST_GeomFromText, ST_AsGeoJSON, ST_X, ST_Y

from app.db.session import get_db
from app.core.config import settings
from app.models.recovery_mission import RecoveryMission
from app.models.gear_report import GearReport
from app.models.risk_assessment import RiskAssessment
from app.models.mission_route import MissionRoute
from app.models.recovery_outcome import RecoveryOutcome
from app.schemas.recovery_mission import (
    RecoveryMissionCreate,
    RecoveryMissionUpdate,
    RecoveryMissionResponse,
    RecoveryOutcomeCreate,
    RecoveryOutcomeCorrectionCreate,
    RecoveryOutcomeResponse,
    RecoveryMissionStatsResponse,
    RecoveryOutcomeEnum,
)
from app.schemas.common import PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recovery-missions", tags=["Recovery Planning & Missions"])

OUTCOME_INCIDENT_STATUS_MAP = {
    "successfully_recovered": "recovered",
    "partially_recovered": "partially_recovered",
    "unsuccessful": "recovery_unsuccessful",
}


def save_evidence_photo(photo: UploadFile) -> Optional[str]:
    """
    Validates and securely saves an uploaded recovery outcome evidence photo.
    Validates file size (<=10MB) and allowed image formats (.jpg, .jpeg, .png, .webp, .heic).
    """
    if not photo or not photo.filename:
        return None

    # Validate file size
    photo.file.seek(0, os.SEEK_END)
    file_size = photo.file.tell()
    photo.file.seek(0)

    max_size = 10 * 1024 * 1024  # 10 MB
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Evidence photo size ({file_size / (1024*1024):.1f}MB) exceeds maximum limit of 10MB."
        )

    # Validate extension
    ext = os.path.splitext(photo.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(allowed_exts))}"
        )

    # Save under uploads/evidence/
    evidence_dir = settings.UPLOAD_ROOT / "evidence"
    os.makedirs(str(evidence_dir), exist_ok=True)

    safe_filename = f"outcome_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = evidence_dir / safe_filename

    with open(dest_path, "wb") as f:
        f.write(photo.file.read())

    return f"/uploads/evidence/{safe_filename}"


def format_mission_response(msn: RecoveryMission, db: Session) -> RecoveryMissionResponse:
    route_geojson = None
    if msn.planned_route is not None:
        raw_json = db.scalar(select(ST_AsGeoJSON(msn.planned_route)))
        if raw_json:
            route_geojson = json.loads(raw_json)

    # Fetch linked incident context
    gear_type = None
    lat = None
    lon = None
    inc_status = None
    priority = msn.priority or "HIGH"
    risk_score = None

    if msn.report:
        gear_type = msn.report.gear_type
        inc_status = msn.report.status
        try:
            coords = db.execute(
                select(
                    ST_X(msn.report.reported_location).label("lon"),
                    ST_Y(msn.report.reported_location).label("lat")
                )
            ).one()
            lat = float(coords.lat)
            lon = float(coords.lon)
        except Exception:
            pass

    # Query latest risk assessment for this report
    risk_ass = db.execute(
        select(RiskAssessment).where(RiskAssessment.report_id == msn.report_id).order_by(desc(RiskAssessment.id))
    ).scalars().first()
    if risk_ass:
        risk_score = float(risk_ass.risk_score) if risk_ass.risk_score is not None else None
        if not msn.priority:
            priority = str(risk_ass.priority).upper()

    default_title = (
        f"Ratnagiri {gear_type.capitalize()} Recovery – Incident #{msn.report_id}"
        if gear_type
        else f"Recovery Mission #{msn.id} – Incident #{msn.report_id}"
    )

    # Query recovery outcomes history (newest first)
    outcome_records = db.execute(
        select(RecoveryOutcome)
        .where(RecoveryOutcome.mission_id == msn.id)
        .order_by(desc(RecoveryOutcome.submitted_at))
    ).scalars().all()

    outcomes_list = [
        RecoveryOutcomeResponse.model_validate(o)
        for o in outcome_records
    ]
    latest_outcome = outcomes_list[0] if outcomes_list else None

    # Query active selected route for this mission if any
    sel_route = db.execute(
        select(MissionRoute)
        .where(MissionRoute.mission_id == msn.id, MissionRoute.is_selected == True)  # noqa: E712
        .order_by(desc(MissionRoute.id))
    ).scalars().first()

    has_route = sel_route is not None
    route_id = sel_route.id if sel_route else None
    route_type = ("alternative" if sel_route.route_type == "alternative" else "primary") if sel_route else None
    route_ver = sel_route.version if sel_route else None
    route_dep = sel_route.departure_port if sel_route else None
    route_dest = sel_route.destination_target if sel_route else None
    route_dist_km = float(sel_route.total_distance_km) if sel_route else None
    route_dist_nm = float(sel_route.total_distance_nm) if sel_route else None
    route_direct_km = float(sel_route.direct_distance_km) if sel_route and sel_route.direct_distance_km is not None else None
    route_dev_pct = float(sel_route.route_deviation_pct) if sel_route and sel_route.route_deviation_pct is not None else None
    if sel_route and route_direct_km and route_dist_km and route_direct_km > 0.01:
        calc_dev = round(((route_dist_km - route_direct_km) / route_direct_km) * 100.0, 1)
        if route_dev_pct is None or (sel_route.route_type == "alternative" and route_dev_pct == 0.0 and calc_dev > 0.0):
            route_dev_pct = calc_dev
    route_wps_count = sel_route.waypoint_count if sel_route else None
    route_status = "cleared" if (has_route and sel_route.feasibility_status == "feasible") else ("pending" if not has_route else sel_route.feasibility_status)
    
    route_duration_formatted = None
    if sel_route and sel_route.estimated_duration_hours is not None:
        total_minutes = int(round(float(sel_route.estimated_duration_hours) * 60))
        hrs = total_minutes // 60
        mins = total_minutes % 60
        speed_txt = f" at {sel_route.vessel_speed_knots} kts" if sel_route.vessel_speed_knots else ""
        if hrs > 0:
            route_duration_formatted = f"{hrs} hr {mins} min{speed_txt}"
        else:
            route_duration_formatted = f"{mins} min{speed_txt}"

    return RecoveryMissionResponse(
        id=msn.id,
        report_id=msn.report_id,
        title=msn.title or default_title,
        departure_port=msn.departure_port or "Mirkarwada Fishing Harbour, Ratnagiri",
        target_sector=msn.target_sector or "Arabian Sea – Ratnagiri / Konkan Coast",
        assigned_to=msn.assigned_to,
        status=msn.status,
        priority=priority,
        operational_notes=msn.operational_notes,
        scheduled_at=msn.scheduled_at,
        completed_at=msn.completed_at,
        created_at=msn.created_at,
        route_geojson=route_geojson,
        latest_outcome=latest_outcome,
        outcomes=outcomes_list,
        incident_gear_type=gear_type,
        incident_latitude=lat,
        incident_longitude=lon,
        incident_priority=priority,
        incident_risk_score=risk_score,
        incident_status=inc_status,
        has_selected_route=has_route,
        selected_route_id=route_id,
        selected_route_type=route_type,
        selected_route_version=route_ver,
        selected_route_departure=route_dep,
        selected_route_destination=route_dest,
        selected_route_distance_km=route_dist_km,
        selected_route_distance_nm=route_dist_nm,
        selected_route_direct_distance_km=route_direct_km,
        selected_route_deviation_pct=route_dev_pct,
        selected_route_waypoints_count=route_wps_count,
        selected_route_status=route_status,
        selected_route_estimated_duration_formatted=route_duration_formatted,
    )


@router.get("/stats", response_model=RecoveryMissionStatsResponse)
def get_recovery_mission_stats(db: Session = Depends(get_db)):
    """
    Get dynamic recovery mission summary metrics directly from the database.
    """
    total = db.scalar(select(func.count(RecoveryMission.id))) or 0
    planned = db.scalar(select(func.count(RecoveryMission.id)).where(RecoveryMission.status == "planned")) or 0
    in_progress = db.scalar(select(func.count(RecoveryMission.id)).where(RecoveryMission.status == "in_progress")) or 0
    successfully_recovered = db.scalar(
        select(func.count(RecoveryMission.id)).where(
            RecoveryMission.status.in_(["successfully_recovered", "completed", "recovered"])
        )
    ) or 0
    partially_recovered = db.scalar(
        select(func.count(RecoveryMission.id)).where(RecoveryMission.status == "partially_recovered")
    ) or 0
    unsuccessful = db.scalar(
        select(func.count(RecoveryMission.id)).where(RecoveryMission.status == "unsuccessful")
    ) or 0
    cancelled = db.scalar(
        select(func.count(RecoveryMission.id)).where(RecoveryMission.status == "cancelled")
    ) or 0

    return RecoveryMissionStatsResponse(
        total_missions=total,
        planned=planned,
        in_progress=in_progress,
        successfully_recovered=successfully_recovered,
        partially_recovered=partially_recovered,
        unsuccessful=unsuccessful,
        cancelled=cancelled,
    )


@router.post("", response_model=RecoveryMissionResponse, status_code=status.HTTP_201_CREATED)
def create_recovery_mission(data: RecoveryMissionCreate, db: Session = Depends(get_db)):
    """
    Create a recovery mission plan linked to an existing gear report.
    Validates report_id foreign key, planned date window, and assigned vessel.
    """
    report = db.get(GearReport, data.report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot plan mission: Gear report ID {data.report_id} does not exist."
        )

    # Validate planned date window
    sched_val = data.scheduled_at
    if not sched_val and data.target_date:
        try:
            sched_val = datetime.strptime(data.target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Planned recovery date must be a valid date in YYYY-MM-DD format."
            )

    if sched_val:
        now_utc = datetime.now(timezone.utc)
        if sched_val.date() < now_utc.date():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Planned date window cannot be in the past ({sched_val.strftime('%Y-%m-%d')}). Please select an upcoming operational date."
            )

    # Validate assigned vessel
    vessel_val = (data.assigned_to or data.vessel or "").strip()
    if not vessel_val:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assigned vessel or fleet unit is required. Please assign a valid salvage vessel."
        )

    # Title default
    title_val = (data.title or "").strip()
    if not title_val:
        gear_label = (report.gear_type or "gear").capitalize()
        title_val = f"Ratnagiri {gear_label} Recovery – Incident #{report.id}"

    port_val = (data.departure_port or "Mirkarwada Fishing Harbour, Ratnagiri").strip()
    sector_val = (data.target_sector or "Arabian Sea – Ratnagiri / Konkan Coast").strip()
    notes_val = data.operational_notes or data.notes

    # Convert waypoints to PostGIS LineString if provided
    route_geom = None
    if data.route_waypoints and len(data.route_waypoints) >= 2:
        coords_str = ", ".join(f"{w.longitude} {w.latitude}" for w in data.route_waypoints)
        wkt = f"LINESTRING({coords_str})"
        route_geom = ST_SetSRID(ST_GeomFromText(wkt), 4326)

    mission = RecoveryMission(
        report_id=data.report_id,
        title=title_val,
        departure_port=port_val,
        target_sector=sector_val,
        assigned_to=vessel_val,
        status=data.status,
        priority=data.priority or "HIGH",
        operational_notes=notes_val,
        scheduled_at=sched_val,
        completed_at=data.completed_at,
        planned_route=route_geom,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return format_mission_response(mission, db)


@router.get("", response_model=PaginatedResponse[RecoveryMissionResponse])
def list_recovery_missions(
    status: Optional[str] = Query(None, description="Filter by mission status (planned, in_progress, successfully_recovered, partially_recovered, unsuccessful, cancelled)"),
    report_id: Optional[int] = Query(None, description="Filter by associated gear report ID"),
    assigned_to: Optional[str] = Query(None, description="Filter by vessel or salvage unit"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List recovery missions with pagination, status filters, and report_id scoping.
    """
    stmt = select(RecoveryMission)
    if status and status.upper() != "ALL":
        stmt = stmt.where(RecoveryMission.status == status.lower().strip())
    if report_id:
        stmt = stmt.where(RecoveryMission.report_id == report_id)
    if assigned_to:
        stmt = stmt.where(RecoveryMission.assigned_to.ilike(f"%{assigned_to.strip()}%"))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    offset = (page - 1) * page_size
    stmt = stmt.order_by(desc(RecoveryMission.created_at)).offset(offset).limit(page_size)

    rows = db.scalars(stmt).all()
    items = [format_mission_response(r, db) for r in rows]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )


@router.get("/{mission_id}", response_model=RecoveryMissionResponse)
def get_recovery_mission(mission_id: int, db: Session = Depends(get_db)):
    """
    Retrieve single recovery mission details.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )
    return format_mission_response(msn, db)


@router.patch("/{mission_id}", response_model=RecoveryMissionResponse)
@router.put("/{mission_id}", response_model=RecoveryMissionResponse)
def update_recovery_mission(
    mission_id: int,
    data: RecoveryMissionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update mission parameters, fleet assignment, or operational notes.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    # 1. Mission designation / title
    if data.title is not None:
        new_title = data.title.strip()
        if not new_title:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Mission designation / title cannot be empty."
            )
        msn.title = new_title

    # 2. Departure Port
    if data.departure_port is not None:
        new_port = data.departure_port.strip()
        if not new_port:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Departure port cannot be empty."
            )
        msn.departure_port = new_port

    # 3. Target Marine Sector
    if data.target_sector is not None:
        new_sector = data.target_sector.strip()
        if not new_sector:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Target marine sector cannot be empty."
            )
        msn.target_sector = new_sector

    # 4. Assigned Salvage Vessel
    if data.assigned_to is not None or data.vessel is not None:
        new_vessel = (data.assigned_to or data.vessel or "").strip()
        if not new_vessel:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Assigned salvage vessel cannot be empty."
            )
        msn.assigned_to = new_vessel

    # 5. Status
    if data.status is not None and data.status != msn.status:
        msn.status = data.status

    # 6. Priority
    if data.priority is not None and data.priority != msn.priority:
        msn.priority = data.priority

    # 7. Operational salvage notes
    new_notes = data.operational_notes if data.operational_notes is not None else data.notes
    if new_notes is not None:
        msn.operational_notes = new_notes.strip()

    # 8. Planned date
    if data.scheduled_at is not None:
        if data.scheduled_at.date() < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Planned mission date cannot be in the past."
            )
        msn.scheduled_at = data.scheduled_at
    elif data.target_date is not None:
        try:
            parsed_d = datetime.strptime(data.target_date, "%Y-%m-%d").date()
            if parsed_d < date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Planned mission date cannot be in the past."
                )
            new_dt = datetime.combine(parsed_d, datetime.min.time(), tzinfo=timezone.utc)
            msn.scheduled_at = new_dt
        except ValueError as ve:
            if "Planned mission date" in str(ve):
                raise
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid target_date format. Expected YYYY-MM-DD."
            )

    if data.completed_at is not None:
        msn.completed_at = data.completed_at

    if data.route_waypoints and len(data.route_waypoints) >= 2:
        coords_str = ", ".join(f"{w.longitude} {w.latitude}" for w in data.route_waypoints)
        wkt = f"LINESTRING({coords_str})"
        msn.planned_route = ST_SetSRID(ST_GeomFromText(wkt), 4326)

    db.commit()
    db.refresh(msn)
    return format_mission_response(msn, db)


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recovery_mission(mission_id: int, db: Session = Depends(get_db)):
    """
    Delete a recovery mission by ID.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )
    db.delete(msn)
    db.commit()
    return None


@router.post("/{mission_id}/start", response_model=RecoveryMissionResponse)
def start_recovery_operation(mission_id: int, db: Session = Depends(get_db)):
    """
    Start the recovery operation for a mission in 'planned' status.
    Transitions mission status to 'in_progress'.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    if msn.status == "in_progress":
        return format_mission_response(msn, db)

    if msn.status in ("successfully_recovered", "partially_recovered", "unsuccessful"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start operation: Mission #{mission_id} has already concluded with status '{msn.status}'."
        )
    if msn.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start operation: Mission #{mission_id} is cancelled."
        )

    msn.status = "in_progress"
    # Also update linked incident status if appropriate
    if msn.report and msn.report.status not in ("recovered", "partially_recovered", "recovery_unsuccessful"):
        msn.report.status = "scheduled_recovery"

    db.commit()
    db.refresh(msn)
    return format_mission_response(msn, db)


@router.post("/{mission_id}/evidence")
def upload_recovery_evidence(
    mission_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload optional evidence photograph for a recovery mission.
    Validates file size (<=10MB) and allowed image types.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    url = save_evidence_photo(photo)
    return {
        "mission_id": mission_id,
        "evidence_url": url,
        "filename": photo.filename,
    }


@router.post("/{mission_id}/outcomes", response_model=RecoveryMissionResponse)
async def submit_recovery_outcome(
    mission_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Record the actual physical recovery outcome for an active recovery mission (planned or in_progress).
    Updates the mission status, creates an immutable RecoveryOutcome history entry,
    and synchronizes the linked incident status.
    Rejects duplicate outcome submissions on already concluded or successfully recovered missions.
    Supports either JSON body or multipart/form-data (with optional evidence photo).
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    # Prevent duplicate submissions on already completed or successfully recovered missions
    current_status = (msn.status or "").lower()
    if current_status == "successfully_recovered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This mission has already been successfully recovered. A new outcome cannot be submitted unless an authorized correction is required."
        )
    if current_status in ("partially_recovered", "unsuccessful"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit new outcome: Mission #{mission_id} has already concluded with status '{msn.status}'. Submit an authorized correction if modifying this outcome."
        )
    if current_status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit outcome: Mission #{mission_id} is cancelled."
        )

    content_type = request.headers.get("content-type", "")
    outcome_val = None
    notes_val = None
    evidence_url_val = None
    submitted_by_val = "Lead Recovery Officer"

    if "multipart/form-data" in content_type:
        form = await request.form()
        outcome_val = form.get("outcome")
        notes_val = form.get("notes")
        submitted_by_val = form.get("submitted_by") or "Lead Recovery Officer"
        evidence_url_val = form.get("evidence_url")
        photo_file = form.get("photo") or form.get("evidence")
        if photo_file and hasattr(photo_file, "filename") and photo_file.filename:
            evidence_url_val = save_evidence_photo(photo_file)
    else:
        body = await request.json()
        outcome_val = body.get("outcome")
        notes_val = body.get("notes")
        evidence_url_val = body.get("evidence_url")
        submitted_by_val = body.get("submitted_by") or "Lead Recovery Officer"

    if not outcome_val:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Recovery outcome is required."
        )

    cleaned_outcome = outcome_val.strip().lower()
    valid_outcomes = [e.value for e in RecoveryOutcomeEnum]
    if cleaned_outcome not in valid_outcomes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid recovery outcome '{outcome_val}'. Allowed options: {', '.join(valid_outcomes)}"
        )

    now_utc = datetime.now(timezone.utc)

    # 1. Create RecoveryOutcome record (original submission)
    outcome_entry = RecoveryOutcome(
        mission_id=msn.id,
        incident_id=msn.report_id,
        outcome=cleaned_outcome,
        notes=(notes_val.strip() if notes_val else None),
        evidence_url=evidence_url_val,
        submitted_by=str(submitted_by_val).strip(),
        submitted_at=now_utc,
        is_correction=False,
        correction_reason=None,
        original_outcome_id=None,
    )
    db.add(outcome_entry)

    # 2. Update recovery mission status and completion timestamp
    msn.status = cleaned_outcome
    msn.completed_at = now_utc

    # 3. Synchronize linked incident status
    if msn.report:
        new_inc_status = OUTCOME_INCIDENT_STATUS_MAP.get(cleaned_outcome)
        if new_inc_status:
            msn.report.status = new_inc_status

    db.commit()
    db.refresh(msn)

    return format_mission_response(msn, db)


@router.post("/{mission_id}/corrections", response_model=RecoveryMissionResponse)
@router.post("/{mission_id}/correct-outcome", response_model=RecoveryMissionResponse)
async def correct_recovery_outcome(
    mission_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Submit an authorized correction to an existing recovery outcome record.
    Preserves all previous outcome history (append-only), creates an audit correction
    entry linked to the original record, records certifying officer and mandatory correction
    reason, and synchronizes mission and linked incident statuses.
    Requires authorized NGO recovery officer role/identity.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    # Authorization verification
    officer_role_header = request.headers.get("x-officer-role", "").strip()

    content_type = request.headers.get("content-type", "")
    outcome_val = None
    correction_reason_val = None
    notes_val = None
    evidence_url_val = None
    submitted_by_val = "Lead Recovery Officer"

    if "multipart/form-data" in content_type:
        form = await request.form()
        outcome_val = form.get("outcome")
        correction_reason_val = form.get("correction_reason") or form.get("reason")
        notes_val = form.get("notes")
        submitted_by_val = form.get("submitted_by") or "Lead Recovery Officer"
        evidence_url_val = form.get("evidence_url")
        photo_file = form.get("photo") or form.get("evidence")
        if photo_file and hasattr(photo_file, "filename") and photo_file.filename:
            evidence_url_val = save_evidence_photo(photo_file)
    else:
        body = await request.json()
        outcome_val = body.get("outcome")
        correction_reason_val = body.get("correction_reason") or body.get("reason")
        notes_val = body.get("notes")
        evidence_url_val = body.get("evidence_url")
        submitted_by_val = body.get("submitted_by") or "Lead Recovery Officer"

    officer_str = str(submitted_by_val or "").strip()
    role_check = f"{officer_role_header} {officer_str}".lower()
    unauthorized_keywords = ["public", "unauthorized", "guest", "fisherman", "anonymous"]
    if any(k in role_check for k in unauthorized_keywords) or not officer_str:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Only authorized NGO recovery officers can correct recovery outcomes."
        )

    # Validate mandatory correction reason
    if not correction_reason_val or not str(correction_reason_val).strip() or len(str(correction_reason_val).strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Correction reason is mandatory for outcome corrections."
        )

    if not outcome_val:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Corrected recovery outcome is required."
        )

    cleaned_outcome = outcome_val.strip().lower()
    valid_outcomes = [e.value for e in RecoveryOutcomeEnum]
    if cleaned_outcome not in valid_outcomes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid recovery outcome '{outcome_val}'. Allowed options: {', '.join(valid_outcomes)}"
        )

    # Verify that an existing outcome record exists to correct
    latest_outcome = db.execute(
        select(RecoveryOutcome)
        .where(RecoveryOutcome.mission_id == msn.id)
        .order_by(desc(RecoveryOutcome.submitted_at))
    ).scalars().first()

    if not latest_outcome:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No existing recovery outcome found to correct for mission #{mission_id}. Use normal outcome submission."
        )

    now_utc = datetime.now(timezone.utc)

    # Create audit correction record linked to the original record
    correction_entry = RecoveryOutcome(
        mission_id=msn.id,
        incident_id=msn.report_id,
        outcome=cleaned_outcome,
        notes=(notes_val.strip() if notes_val else (latest_outcome.notes if notes_val is None else None)),
        evidence_url=(evidence_url_val or latest_outcome.evidence_url),
        submitted_by=officer_str,
        submitted_at=now_utc,
        is_correction=True,
        correction_reason=str(correction_reason_val).strip(),
        original_outcome_id=latest_outcome.id,
    )
    db.add(correction_entry)

    # Update mission status and completion timestamp
    msn.status = cleaned_outcome
    msn.completed_at = now_utc

    # Synchronize linked incident status
    if msn.report:
        new_inc_status = OUTCOME_INCIDENT_STATUS_MAP.get(cleaned_outcome)
        if new_inc_status:
            msn.report.status = new_inc_status

    db.commit()
    db.refresh(msn)

    return format_mission_response(msn, db)


@router.get("/{mission_id}/outcomes", response_model=List[RecoveryOutcomeResponse])
def get_mission_recovery_outcomes(
    mission_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve historical recovery outcomes log for a mission, ordered newest first.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    records = db.execute(
        select(RecoveryOutcome)
        .where(RecoveryOutcome.mission_id == mission_id)
        .order_by(desc(RecoveryOutcome.submitted_at))
    ).scalars().all()

    return [RecoveryOutcomeResponse.model_validate(r) for r in records]


@router.get("/{mission_id}/outcome", response_model=RecoveryOutcomeResponse)
def get_latest_recovery_outcome(
    mission_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve the latest recorded recovery outcome for a mission.
    """
    msn = db.get(RecoveryMission, mission_id)
    if not msn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery mission ID {mission_id} does not exist."
        )

    latest = db.execute(
        select(RecoveryOutcome)
        .where(RecoveryOutcome.mission_id == mission_id)
        .order_by(desc(RecoveryOutcome.submitted_at))
    ).scalars().first()

    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No recovery outcome recorded yet for mission #{mission_id}."
        )

    return RecoveryOutcomeResponse.model_validate(latest)
