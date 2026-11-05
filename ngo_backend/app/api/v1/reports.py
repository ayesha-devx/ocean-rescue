"""
API endpoints for Gear Reports management and spatial queries.
"""

import os
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Request, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import settings
from app.schemas.gear_report import (
    GearReportCreate,
    GearReportUpdate,
    GearReportStatusUpdate,
    GearReportResponse,
)
from app.schemas.common import PaginatedResponse, GeoJSONFeatureCollection
from app.services import report_service, detection_service

router = APIRouter(prefix="/reports", tags=["Gear Reports"])
logger = logging.getLogger(__name__)


from app.core.auth import is_authorized_ngo


def redact_sensitive_contact_info(report: Union[GearReportResponse, dict], authorized: bool) -> Union[GearReportResponse, dict]:
    """
    Redacts reporter_phone and reporter_email for public/unauthorized callers.
    Leaves other details intact.
    """
    if authorized or not report:
        return report

    if isinstance(report, GearReportResponse):
        return report.model_copy(update={
            "reporter_phone": None,
            "reporter_email": None,
        })
    elif isinstance(report, dict):
        report_copy = dict(report)
        report_copy["reporter_phone"] = None
        report_copy["reporter_email"] = None
        return report_copy
    return report


def save_uploaded_photo(photo: UploadFile) -> str:
    """
    Validates and securely saves an uploaded evidence photo.
    Returns the relative URL path.
    """
    if not photo or not photo.filename:
        return None

    # Validate file size
    photo.file.seek(0, os.SEEK_END)
    file_size = photo.file.tell()
    photo.file.seek(0)

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Photo size ({file_size / (1024*1024):.1f}MB) exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES / (1024*1024):.0f}MB."
        )

    # Validate extension
    ext = os.path.splitext(photo.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    # Validate MIME content-type header if present
    if photo.content_type and not photo.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type '{photo.content_type}'. Must be an image format."
        )

    # Ensure upload directory exists
    os.makedirs(str(settings.UPLOAD_DIR), exist_ok=True)

    # Generate secure non-colliding filename
    safe_filename = f"report_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = os.path.join(str(settings.UPLOAD_DIR), safe_filename)

    with open(dest_path, "wb") as f:
        f.write(photo.file.read())

    return f"/uploads/reports/{safe_filename}"


@router.post("", response_model=GearReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Create a new lost fishing gear report.
    Supports either JSON body or multipart/form-data (with optional photo evidence).
    """
    content_type = request.headers.get("content-type", "")

    # 1. Handle Form submission (multipart with optional photo or urlencoded)
    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        photo_file: Optional[UploadFile] = form.get("photo")

        # Frontend might pack JSON payload inside a 'report' form field
        report_json_str = form.get("report")
        if report_json_str:
            try:
                payload_dict = json.loads(report_json_str)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid JSON in 'report' form field: {str(e)}")
        else:
            # Direct form fields
            payload_dict = dict(form)
            # Remove photo field from dict
            payload_dict.pop("photo", None)

        # Safely convert coordinates
        try:
            lat = float(payload_dict.get("latitude"))
            lon = float(payload_dict.get("longitude"))
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Latitude and longitude must be valid numeric coordinates."
            )

        # Parse anonymous preference cleanly
        is_anon_raw = (
            payload_dict.get("is_anonymous")
            if payload_dict.get("is_anonymous") is not None
            else payload_dict.get("isAnonymous", False)
        )
        is_anon = is_anon_raw if isinstance(is_anon_raw, bool) else str(is_anon_raw).lower() in ("true", "1", "yes")

        # Parse boolean flags cleanly
        has_reg_name_raw = (
            payload_dict.get("has_registered_vessel_name")
            if payload_dict.get("has_registered_vessel_name") is not None
            else payload_dict.get("hasRegisteredVesselName", True)
        )
        has_reg_name = has_reg_name_raw if isinstance(has_reg_name_raw, bool) else str(has_reg_name_raw).lower() in ("true", "1", "yes")

        decl_raw = (
            payload_dict.get("declaration_confirmed")
            if payload_dict.get("declaration_confirmed") is not None
            else payload_dict.get("declarationConfirmed", False)
        )
        declaration_confirmed = decl_raw if isinstance(decl_raw, bool) else str(decl_raw).lower() in ("true", "1", "yes")

        # Parse gear quantity
        raw_qty = payload_dict.get("gear_quantity") if payload_dict.get("gear_quantity") is not None else payload_dict.get("gearQuantity", 1)
        try:
            gear_qty = int(raw_qty) if raw_qty is not None and str(raw_qty).strip() != "" else 1
        except (ValueError, TypeError):
            gear_qty = 1

        # Convert camelCase frontend fields if needed
        data_kwargs = {
            "gear_type": payload_dict.get("gear_type") or payload_dict.get("gearType"),
            "latitude": lat,
            "longitude": lon,
            "description": payload_dict.get("description"),
            "image_url": payload_dict.get("image_url") or payload_dict.get("imageUrl"),
            "reporter_type": payload_dict.get("reporter_type") or payload_dict.get("reporterType"),
            "reporter_name": None if is_anon else (payload_dict.get("reporter_name") or payload_dict.get("reporterName")),
            "reporter_phone": None if is_anon else (payload_dict.get("reporter_phone") or payload_dict.get("reporterPhone")),
            "reporter_email": None if is_anon else (payload_dict.get("reporter_email") or payload_dict.get("reporterEmail")),
            "reporter_role": payload_dict.get("reporter_role") or payload_dict.get("reporterRole") or payload_dict.get("reporter_type") or payload_dict.get("reporterType"),
            "contact_info": None if is_anon else (payload_dict.get("contact_info") or payload_dict.get("contactInfo")),
            "is_anonymous": is_anon,
            "vessel_name": "No registered name" if (not has_reg_name and (not payload_dict.get("vessel_name") and not payload_dict.get("vesselName"))) else (payload_dict.get("vessel_name") or payload_dict.get("vesselName")),
            "has_registered_vessel_name": has_reg_name,
            "vessel_registration_number": payload_dict.get("vessel_registration_number") or payload_dict.get("vesselRegistrationNumber"),
            "vessel_type": payload_dict.get("vessel_type") or payload_dict.get("vesselType"),
            "home_port": payload_dict.get("home_port") or payload_dict.get("homePort"),
            "gear_quantity": gear_qty,
            "gear_markings": payload_dict.get("gear_markings") or payload_dict.get("gearMarkings"),
            "water_position": payload_dict.get("water_position") or payload_dict.get("waterPosition"),
            "estimated_size": payload_dict.get("estimated_size") or payload_dict.get("estimatedSize"),
            "location_notes": payload_dict.get("location_notes") or payload_dict.get("locationNotes"),
            "sea_state": payload_dict.get("sea_state") or payload_dict.get("seaState"),
            "wildlife_entangled": payload_dict.get("wildlife_entangled") or payload_dict.get("wildlifeEntangled"),
            "wildlife_details": payload_dict.get("wildlife_details") or payload_dict.get("wildlifeDetails"),
            "declaration_confirmed": declaration_confirmed,
            # Extended Reporting Method & Telemetry (Stage 2)
            "reporting_method": payload_dict.get("reporting_method") or payload_dict.get("reportingMethod"),
            "location_type": payload_dict.get("location_type") or payload_dict.get("locationType"),
            "location_uncertainty_radius_m": payload_dict.get("location_uncertainty_radius_m") or payload_dict.get("locationUncertaintyRadiusM"),
            "loss_date_time": payload_dict.get("loss_date_time") or payload_dict.get("lossDateTime"),
            "approximate_area": payload_dict.get("approximate_area") or payload_dict.get("approximateArea"),
            "distance_from_coast_km": payload_dict.get("distance_from_coast_km") or payload_dict.get("distanceFromCoastKm"),
            "nearby_landmark": payload_dict.get("nearby_landmark") or payload_dict.get("nearbyLandmark"),
            "direction_from_landmark": payload_dict.get("direction_from_landmark") or payload_dict.get("directionFromLandmark"),
        }

        # Save photo if uploaded
        if photo_file and hasattr(photo_file, "filename") and photo_file.filename:
            saved_url = save_uploaded_photo(photo_file)
            data_kwargs["image_url"] = saved_url

        try:
            report_create = GearReportCreate(**data_kwargs)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # 2. Handle standard JSON submission
    else:
        try:
            body = await request.json()
            is_anon_raw = (
                body.get("is_anonymous")
                if body.get("is_anonymous") is not None
                else body.get("isAnonymous", False)
            )
            is_anon = is_anon_raw if isinstance(is_anon_raw, bool) else str(is_anon_raw).lower() in ("true", "1", "yes")

            has_reg_name_raw = (
                body.get("has_registered_vessel_name")
                if body.get("has_registered_vessel_name") is not None
                else body.get("hasRegisteredVesselName", True)
            )
            has_reg_name = has_reg_name_raw if isinstance(has_reg_name_raw, bool) else str(has_reg_name_raw).lower() in ("true", "1", "yes")

            decl_raw = (
                body.get("declaration_confirmed")
                if body.get("declaration_confirmed") is not None
                else body.get("declarationConfirmed", False)
            )
            declaration_confirmed = decl_raw if isinstance(decl_raw, bool) else str(decl_raw).lower() in ("true", "1", "yes")

            raw_qty = body.get("gear_quantity") if body.get("gear_quantity") is not None else body.get("gearQuantity", 1)
            try:
                gear_qty = int(raw_qty) if raw_qty is not None and str(raw_qty).strip() != "" else 1
            except (ValueError, TypeError):
                gear_qty = 1

            # Normalize camelCase to snake_case if submitted by frontend
            normalized = {
                "gear_type": body.get("gear_type") or body.get("gearType"),
                "latitude": body.get("latitude"),
                "longitude": body.get("longitude"),
                "description": body.get("description"),
                "image_url": body.get("image_url") or body.get("imageUrl"),
                "reporter_type": body.get("reporter_type") or body.get("reporterType"),
                "reporter_name": None if is_anon else (body.get("reporter_name") or body.get("reporterName")),
                "reporter_phone": None if is_anon else (body.get("reporter_phone") or body.get("reporterPhone")),
                "reporter_email": None if is_anon else (body.get("reporter_email") or body.get("reporterEmail")),
                "reporter_role": body.get("reporter_role") or body.get("reporterRole") or body.get("reporter_type") or body.get("reporterType"),
                "contact_info": None if is_anon else (body.get("contact_info") or body.get("contactInfo")),
                "is_anonymous": is_anon,
                "vessel_name": "No registered name" if (not has_reg_name and (not body.get("vessel_name") and not body.get("vesselName"))) else (body.get("vessel_name") or body.get("vesselName")),
                "has_registered_vessel_name": has_reg_name,
                "vessel_registration_number": body.get("vessel_registration_number") or body.get("vesselRegistrationNumber"),
                "vessel_type": body.get("vessel_type") or body.get("vesselType"),
                "home_port": body.get("home_port") or body.get("homePort"),
                "gear_quantity": gear_qty,
                "gear_markings": body.get("gear_markings") or body.get("gearMarkings"),
                "water_position": body.get("water_position") or body.get("waterPosition"),
                "estimated_size": body.get("estimated_size") or body.get("estimatedSize"),
                "location_notes": body.get("location_notes") or body.get("locationNotes"),
                "sea_state": body.get("sea_state") or body.get("seaState"),
                "wildlife_entangled": body.get("wildlife_entangled") or body.get("wildlifeEntangled"),
                "wildlife_details": body.get("wildlife_details") or body.get("wildlifeDetails"),
                "declaration_confirmed": declaration_confirmed,
                # Extended Reporting Method & Telemetry (Stage 2)
                "reporting_method": body.get("reporting_method") or body.get("reportingMethod"),
                "location_type": body.get("location_type") or body.get("locationType"),
                "location_uncertainty_radius_m": body.get("location_uncertainty_radius_m") or body.get("locationUncertaintyRadiusM"),
                "loss_date_time": body.get("loss_date_time") or body.get("lossDateTime"),
                "approximate_area": body.get("approximate_area") or body.get("approximateArea"),
                "distance_from_coast_km": body.get("distance_from_coast_km") or body.get("distanceFromCoastKm"),
                "nearby_landmark": body.get("nearby_landmark") or body.get("nearbyLandmark"),
                "direction_from_landmark": body.get("direction_from_landmark") or body.get("directionFromLandmark"),
            }
            report_create = GearReportCreate(**normalized)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    try:
        report_response = report_service.create_gear_report(db, report_create)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error while saving report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while saving report. Please try again."
        )

    # If the report includes an uploaded evidence photo, run YOLOv8 detection workflow automatically
    if report_response.image_url:
        try:
            detection_service.run_detection_for_report(db, report_response.id)
            updated = report_service.get_gear_report_by_id(db, report_response.id)
            if updated:
                report_response = updated
        except Exception as e:
            logger.warning(f"Automated AI detection run skipped for report #{report_response.id}: {e}")

    return report_response


@router.get("", response_model=PaginatedResponse[GearReportResponse])
def get_reports(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status (e.g. reported, verified, in_review, resolved)"),
    gear_type: Optional[str] = Query(None, description="Filter by gear type (e.g. gillnet, trawl_net, crab_pot)"),
    reporting_method: Optional[str] = Query(None, description="Filter by reporting method (e.g. gps, manual)"),
    location_type: Optional[str] = Query(None, description="Filter by location type (e.g. exact, estimated)"),
    search: Optional[str] = Query(None, description="Search term matching gear type or description"),
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Bounding box minimum latitude"),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Bounding box maximum latitude"),
    min_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Bounding box minimum longitude"),
    max_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Bounding box maximum longitude"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Page size limit"),
    sort_by: str = Query("reported_at", description="Sort field (reported_at, id, status, gear_type)"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort direction"),
    db: Session = Depends(get_db)
):
    """
    List gear reports with multi-criteria filtering, spatial bounding box, and pagination.
    Redacts reporter contact info (phone/email) for unauthorized public callers.
    """
    reports, total = report_service.list_gear_reports(
        db=db,
        status=status,
        gear_type=gear_type,
        reporting_method=reporting_method,
        location_type=location_type,
        search=search,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )

    authorized = is_authorized_ngo(request)
    if not authorized:
        reports = [redact_sensitive_contact_info(r, authorized=False) for r in reports]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=reports
    )


@router.get("/export/pdf")
def export_reports_pdf(
    status: Optional[str] = Query(None, description="Optional status filter"),
    gear_type: Optional[str] = Query(None, description="Optional gear type filter"),
    search: Optional[str] = Query(None, description="Optional search keyword"),
    db: Session = Depends(get_db)
):
    """
    Generate and download a professional PDF report containing cataloged incident records,
    verification metrics, risk prioritization distribution, AI detections, and drift telemetry.
    """
    pdf_bytes = report_service.generate_incident_report_pdf(
        db, status=status, gear_type=gear_type, search=search
    )
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"OceanRescue_Incident_Report_{today_str}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/map/geojson", response_model=GeoJSONFeatureCollection)
def get_reports_geojson(
    status: Optional[str] = Query(None, description="Optional status filter"),
    db: Session = Depends(get_db)
):
    """
    Retrieve real spatial report locations in standard GeoJSON FeatureCollection format.
    """
    return report_service.get_reports_geojson(db, status=status)


@router.get("/{report_id}", response_model=GearReportResponse)
def get_report(report_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Retrieve single incident report by ID.
    Redacts reporter contact info (phone/email) for unauthorized public callers.
    """
    report = report_service.get_gear_report_by_id(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report with ID {report_id} was not found."
        )
    authorized = is_authorized_ngo(request)
    if not authorized:
        report = redact_sensitive_contact_info(report, authorized=False)
    return report


@router.patch("/{report_id}", response_model=GearReportResponse)
def update_report(
    report_id: int,
    data: GearReportUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Safely update permitted report attributes.
    """
    updated = report_service.update_gear_report(db, report_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report with ID {report_id} was not found."
        )
    if not is_authorized_ngo(request):
        updated = redact_sensitive_contact_info(updated, authorized=False)
    return updated


@router.patch("/{report_id}/status", response_model=GearReportResponse)
def update_report_status(
    report_id: int,
    data: GearReportStatusUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Safely transition report status (reported -> verified -> in_review -> scheduled_recovery -> resolved -> cancelled).
    """
    updated = report_service.update_gear_report_status(db, report_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gear report with ID {report_id} was not found."
        )
    if not is_authorized_ngo(request):
        updated = redact_sensitive_contact_info(updated, authorized=False)
    return updated
