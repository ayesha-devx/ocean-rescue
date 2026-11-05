"""
Report Service — Business logic for Gear Reports and spatial operations.
"""

import json
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint, ST_X, ST_Y, ST_AsGeoJSON, ST_DWithin, ST_MakeEnvelope

from io import BytesIO
from datetime import datetime, timezone

from app.models.gear_report import GearReport
from app.models.ai_detection import AiDetection
from app.models.drift_forecast import DriftForecast
from app.models.recovery_mission import RecoveryMission
from app.models.risk_assessment import RiskAssessment
from app.schemas.gear_report import GearReportCreate, GearReportUpdate, GearReportStatusUpdate, GearReportResponse
from app.schemas.common import GeoJSONFeature, GeoJSONFeatureCollection, GeoJSONGeometry

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


def format_report_response(report: GearReport, db: Session) -> GearReportResponse:
    """
    Extracts longitude and latitude from PostGIS geometry point and builds response schema.
    """
    # Extract coordinates via PostGIS scalar functions
    coords = db.execute(
        select(
            ST_X(report.reported_location).label("lon"),
            ST_Y(report.reported_location).label("lat")
        )
    ).one()

    # Count linked resources safely
    ai_count = db.scalar(select(func.count(AiDetection.id)).where(AiDetection.report_id == report.id)) or 0
    drift_count = db.scalar(select(func.count(DriftForecast.id)).where(DriftForecast.report_id == report.id)) or 0
    mission_count = db.scalar(select(func.count(RecoveryMission.id)).where(RecoveryMission.report_id == report.id)) or 0

    return GearReportResponse(
        id=report.id,
        gear_type=report.gear_type,
        description=report.description,
        image_url=report.image_url,
        status=report.status,
        longitude=float(coords.lon),
        latitude=float(coords.lat),
        reporting_method=report.reporting_method,
        location_type=report.location_type,
        location_uncertainty_radius_m=report.location_uncertainty_radius_m,
        loss_date_time=report.loss_date_time,
        approximate_area=report.approximate_area,
        distance_from_coast_km=report.distance_from_coast_km,
        nearby_landmark=report.nearby_landmark,
        direction_from_landmark=report.direction_from_landmark,
        reporter_name=report.reporter_name,
        reporter_phone=report.reporter_phone,
        reporter_email=report.reporter_email,
        reporter_role=report.reporter_role,
        vessel_name=report.vessel_name,
        has_registered_vessel_name=report.has_registered_vessel_name,
        vessel_registration_number=report.vessel_registration_number,
        vessel_type=report.vessel_type,
        home_port=report.home_port,
        gear_quantity=report.gear_quantity or 1,
        gear_markings=report.gear_markings,
        water_position=report.water_position,
        estimated_size=report.estimated_size,
        sea_state=report.sea_state,
        declaration_confirmed=report.declaration_confirmed,
        reported_at=report.reported_at,
        updated_at=report.updated_at,
        ai_detections_count=ai_count,
        drift_forecasts_count=drift_count,
        recovery_missions_count=mission_count,
    )


def create_gear_report(db: Session, data: GearReportCreate) -> GearReportResponse:
    """
    Creates a new gear report with PostGIS Point geometry (SRID 4326).
    Appends citizen intake details to description if provided.
    """
    # Construct supplementary intake summary if citizen fields are present
    supplementary_notes = []
    if data.is_anonymous:
        supplementary_notes.append("Privacy: Anonymous Mariner Submission")
    else:
        if data.reporter_name:
            supplementary_notes.append(f"Vessel/Reporter: {data.reporter_name}")
        if data.contact_info:
            supplementary_notes.append(f"Contact: {data.contact_info}")

    if data.reporter_type:
        supplementary_notes.append(f"Role: {data.reporter_type}")
    if data.water_position:
        supplementary_notes.append(f"Water Position: {data.water_position}")
    if data.estimated_size:
        supplementary_notes.append(f"Estimated Size: {data.estimated_size}")
    if data.sea_state:
        supplementary_notes.append(f"Sea State: {data.sea_state}")

    if data.wildlife_entangled:
        w_lower = data.wildlife_entangled.lower()
        if "yes" in w_lower:
            supplementary_notes.append(f"Wildlife Entangled: URGENT ({data.wildlife_entangled})")
            if data.wildlife_details:
                supplementary_notes.append(f"Wildlife Details: {data.wildlife_details}")
        elif "uncertain" in w_lower:
            supplementary_notes.append("Wildlife Entangled: Uncertain conditions")

    if data.location_notes:
        supplementary_notes.append(f"Landmark/Sector: {data.location_notes}")

    final_description = (data.description or "").strip()
    if supplementary_notes:
        supp_text = " | ".join(supplementary_notes)
        if final_description:
            final_description = f"{final_description}\n\n[Field Telemetry: {supp_text}]"
        else:
            final_description = f"[Field Telemetry: {supp_text}]"

    # Create PostGIS point geometry: ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    point_geom = ST_SetSRID(ST_MakePoint(data.longitude, data.latitude), 4326)

    # Determine reporting method and location type
    rep_method = data.reporting_method
    if not rep_method and (data.location_type == "estimated" or data.location_uncertainty_radius_m is not None):
        rep_method = "manual"
    elif not rep_method:
        rep_method = "gps"

    loc_type = data.location_type
    if not loc_type:
        loc_type = "estimated" if rep_method == "manual" else "exact"

    # Format vessel name fallback if no registered name
    v_name = data.vessel_name
    if data.has_registered_vessel_name is False:
        if not v_name or not v_name.strip():
            v_name = "No registered name"

    report = GearReport(
        gear_type=data.gear_type,
        description=final_description if final_description else None,
        image_url=data.image_url,
        reported_location=point_geom,
        status="reported",
        reporting_method=rep_method,
        location_type=loc_type,
        location_uncertainty_radius_m=data.location_uncertainty_radius_m,
        loss_date_time=data.loss_date_time,
        approximate_area=data.approximate_area,
        distance_from_coast_km=data.distance_from_coast_km,
        nearby_landmark=data.nearby_landmark,
        direction_from_landmark=data.direction_from_landmark,
        reporter_name=data.reporter_name,
        reporter_phone=data.reporter_phone,
        reporter_email=data.reporter_email,
        reporter_role=data.reporter_role or data.reporter_type,
        vessel_name=v_name,
        has_registered_vessel_name=data.has_registered_vessel_name,
        vessel_registration_number=data.vessel_registration_number,
        vessel_type=data.vessel_type,
        home_port=data.home_port,
        gear_quantity=data.gear_quantity or 1,
        gear_markings=data.gear_markings,
        water_position=data.water_position,
        estimated_size=data.estimated_size,
        sea_state=data.sea_state,
        declaration_confirmed=data.declaration_confirmed or False,
    )

    try:
        db.add(report)
        db.commit()
        db.refresh(report)
    except Exception:
        db.rollback()
        raise

    return format_report_response(report, db)


def get_gear_report_by_id(db: Session, report_id: int) -> Optional[GearReportResponse]:
    """
    Fetches a single report by ID.
    """
    report = db.get(GearReport, report_id)
    if not report:
        return None
    return format_report_response(report, db)


def list_gear_reports(
    db: Session,
    status: Optional[str] = None,
    gear_type: Optional[str] = None,
    reporting_method: Optional[str] = None,
    location_type: Optional[str] = None,
    search: Optional[str] = None,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lon: Optional[float] = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "reported_at",
    sort_order: str = "desc"
) -> Tuple[List[GearReportResponse], int]:
    """
    Queries reports with multi-criteria filtering, spatial bounding box, and pagination.
    """
    stmt = select(GearReport)
    conditions = []

    if status and status.upper() != "ALL":
        conditions.append(func.lower(GearReport.status) == status.lower().strip())

    if gear_type and gear_type.upper() != "ALL":
        conditions.append(func.lower(GearReport.gear_type) == gear_type.lower().strip())

    if reporting_method and reporting_method.upper() != "ALL":
        conditions.append(func.lower(GearReport.reporting_method) == reporting_method.lower().strip())

    if location_type and location_type.upper() != "ALL":
        conditions.append(func.lower(GearReport.location_type) == location_type.lower().strip())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(GearReport.gear_type).like(term),
                func.lower(GearReport.description).like(term),
            )
        )

    # Spatial Bounding Box Filter via ST_MakeEnvelope
    if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]):
        envelope = ST_SetSRID(ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat), 4326)
        conditions.append(func.ST_Intersects(GearReport.reported_location, envelope))

    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Total Count query
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = db.scalar(count_stmt) or 0

    # Sorting
    sort_column = getattr(GearReport, sort_by, GearReport.reported_at)
    if sort_order.lower() == "asc":
        stmt = stmt.order_by(asc(sort_column))
    else:
        stmt = stmt.order_by(desc(sort_column))

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    reports = db.scalars(stmt).all()
    results = [format_report_response(r, db) for r in reports]

    return results, total_count


def update_gear_report(db: Session, report_id: int, data: GearReportUpdate) -> Optional[GearReportResponse]:
    """
    Safely updates permitted report attributes.
    """
    report = db.get(GearReport, report_id)
    if not report:
        return None

    if data.gear_type is not None:
        report.gear_type = data.gear_type.strip().lower()
    if data.description is not None:
        report.description = data.description
    if data.image_url is not None:
        report.image_url = data.image_url
    if data.latitude is not None and data.longitude is not None:
        report.reported_location = ST_SetSRID(ST_MakePoint(data.longitude, data.latitude), 4326)
    if data.reporting_method is not None:
        report.reporting_method = data.reporting_method
    if data.location_type is not None:
        report.location_type = data.location_type
    if data.location_uncertainty_radius_m is not None:
        report.location_uncertainty_radius_m = data.location_uncertainty_radius_m
    if data.loss_date_time is not None:
        report.loss_date_time = data.loss_date_time
    if data.approximate_area is not None:
        report.approximate_area = data.approximate_area
    if data.distance_from_coast_km is not None:
        report.distance_from_coast_km = data.distance_from_coast_km
    if data.nearby_landmark is not None:
        report.nearby_landmark = data.nearby_landmark
    if data.direction_from_landmark is not None:
        report.direction_from_landmark = data.direction_from_landmark
    if data.reporter_name is not None:
        report.reporter_name = data.reporter_name
    if data.reporter_phone is not None:
        report.reporter_phone = data.reporter_phone
    if data.reporter_email is not None:
        report.reporter_email = data.reporter_email
    if data.reporter_role is not None:
        report.reporter_role = data.reporter_role
    if data.vessel_name is not None:
        report.vessel_name = data.vessel_name
    if data.has_registered_vessel_name is not None:
        report.has_registered_vessel_name = data.has_registered_vessel_name
    if data.vessel_registration_number is not None:
        report.vessel_registration_number = data.vessel_registration_number
    if data.vessel_type is not None:
        report.vessel_type = data.vessel_type
    if data.home_port is not None:
        report.home_port = data.home_port
    if data.gear_quantity is not None:
        report.gear_quantity = data.gear_quantity
    if data.gear_markings is not None:
        report.gear_markings = data.gear_markings
    if data.water_position is not None:
        report.water_position = data.water_position
    if data.estimated_size is not None:
        report.estimated_size = data.estimated_size
    if data.sea_state is not None:
        report.sea_state = data.sea_state
    if data.declaration_confirmed is not None:
        report.declaration_confirmed = data.declaration_confirmed

    report.updated_at = func.now()
    db.commit()
    db.refresh(report)

    return format_report_response(report, db)


def update_gear_report_status(db: Session, report_id: int, data: GearReportStatusUpdate) -> Optional[GearReportResponse]:
    """
    Safely transitions report status with optional audit note.
    """
    report = db.get(GearReport, report_id)
    if not report:
        return None

    report.status = data.status
    if data.notes:
        note_text = f"\n[Status Update ({data.status}) @ {func.now()}]: {data.notes}"
        report.description = (report.description or "") + note_text

    report.updated_at = func.now()
    db.commit()
    db.refresh(report)

    return format_report_response(report, db)


def get_reports_geojson(db: Session, status: Optional[str] = None) -> GeoJSONFeatureCollection:
    """
    Generates standard GeoJSON FeatureCollection directly from PostGIS geometries.
    """
    stmt = select(
        GearReport.id,
        GearReport.gear_type,
        GearReport.status,
        GearReport.reported_at,
        ST_AsGeoJSON(GearReport.reported_location).label("geojson_str")
    )
    if status and status.upper() != "ALL":
        stmt = stmt.where(func.lower(GearReport.status) == status.lower().strip())

    rows = db.execute(stmt).all()
    features = []

    for r in rows:
        geom_dict = json.loads(r.geojson_str)
        feature = GeoJSONFeature(
            type="Feature",
            geometry=GeoJSONGeometry(
                type=geom_dict.get("type", "Point"),
                coordinates=geom_dict.get("coordinates", [0.0, 0.0])
            ),
            properties={
                "id": r.id,
                "gear_type": r.gear_type,
                "status": r.status,
                "reported_at": r.reported_at.isoformat() if r.reported_at else None,
            }
        )
        features.append(feature)

    return GeoJSONFeatureCollection(type="FeatureCollection", features=features)


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas for dynamic total page count ('Page X of Y')
    and running tactical header/footer rules.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        # Header on pages > 1
        if self._pageNumber > 1:
            self.drawString(36, 565, "OceanRescue — Incident Management & Telemetry Report")
            self.drawRightString(806, 565, "Confidential Tactical Ledger • Arabian Sea Sector")
            self.setStrokeColor(colors.HexColor("#D8ECEC"))
            self.setLineWidth(0.5)
            self.line(36, 560, 806, 560)
        # Running Footer on all pages
        self.setStrokeColor(colors.HexColor("#D8ECEC"))
        self.setLineWidth(0.5)
        self.line(36, 30, 806, 30)
        footer_text = "OceanRescue AI-Driven Geospatial Decision-Support Platform • Ratnagiri / Konkan Coast Pilot"
        self.drawString(36, 20, footer_text)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(806, 20, page_str)
        self.restoreState()


def generate_incident_report_pdf(
    db: Session,
    status: Optional[str] = None,
    gear_type: Optional[str] = None,
    search: Optional[str] = None
) -> bytes:
    """
    Generates a professional, downloadable PDF containing:
    - OceanRescue branding and report title
    - Report generation timestamp & authorized officer metadata
    - Total cataloged incident count & verification summary (Pending, Verified, Rejected)
    - Risk distribution breakdown (High, Medium, Low)
    - Detailed incident records with telemetry, coordinates, loss date, AI predictions,
      confidence score, risk priority score, drift forecast status, and map/photo snapshots
    - Running headers, page numbers ('Page X of Y') and professional footer.
    """
    stmt = select(GearReport)
    if status and status.upper() != "ALL":
        stmt = stmt.where(func.lower(GearReport.status) == status.lower().strip())
    if gear_type and gear_type.upper() != "ALL":
        stmt = stmt.where(func.lower(GearReport.gear_type) == gear_type.lower().strip())
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(GearReport.gear_type.ilike(term), GearReport.description.ilike(term)))
    stmt = stmt.order_by(desc(GearReport.reported_at), desc(GearReport.id))
    reports = db.scalars(stmt).all()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=22,
        textColor=colors.HexColor('#173B4D'),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#087E8B'),
        spaceAfter=12,
    )
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=colors.HexColor('#334155'),
        leading=11,
    )
    cell_style = ParagraphStyle(
        'GridCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor('#1E293B'),
    )
    cell_bold = ParagraphStyle(
        'GridCellBold',
        parent=cell_style,
        fontName='Helvetica-Bold',
    )
    cell_center = ParagraphStyle(
        'GridCellCenter',
        parent=cell_style,
        alignment=1,  # Center
    )
    cell_center_bold = ParagraphStyle(
        'GridCellCenterBold',
        parent=cell_bold,
        alignment=1,  # Center
    )
    th_style = ParagraphStyle(
        'GridTH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.2,
        textColor=colors.HexColor('#173B4D'),
        leading=9.2,
    )
    th_center = ParagraphStyle(
        'GridTHCenter',
        parent=th_style,
        alignment=1,  # Center
    )

    story = []

    # 1. Header & Branding
    story.append(Paragraph("OceanRescue — Incident Management & Telemetry Report", title_style))
    story.append(Paragraph("AI-Driven Geospatial Decision Support for Detection, Drift Forecasting, and Retrieval Optimization of ALDFG", subtitle_style))

    # 2. Metadata Block
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    active_filter_str = f"Status: {status or 'ALL'} | Gear: {gear_type or 'ALL'}" + (f" | Search: '{search}'" if search else "")
    meta_data = [
        [
            Paragraph(f"<b>Generated:</b> {now_str}", meta_style),
            Paragraph(f"<b>Scope:</b> Arabian Sea – Ratnagiri / Konkan Coast", meta_style),
            Paragraph(f"<b>Authorized Officer:</b> Lead Recovery Operations Officer", meta_style),
        ],
        [
            Paragraph(f"<b>Total Cataloged Incidents:</b> {len(reports)}", meta_style),
            Paragraph(f"<b>Harbour Reference:</b> Mirkarwada (16.99° N, 73.30° E)", meta_style),
            Paragraph(f"<b>Active Filters:</b> {active_filter_str}", meta_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[250, 260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F2FAFA')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D8ECEC')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2EFEF')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Executive Metrics: Verification Summary & Risk Distribution
    verified_cnt = sum(1 for r in reports if r.status == 'verified')
    reported_cnt = sum(1 for r in reports if r.status in ('reported', 'draft'))
    review_cnt = sum(1 for r in reports if r.status in ('in_review', 'under_review', 'scheduled_recovery'))
    resolved_cnt = sum(1 for r in reports if r.status in ('resolved', 'recovered'))
    rejected_cnt = sum(1 for r in reports if r.status in ('rejected', 'cancelled'))

    high_risk = 0
    med_risk = 0
    low_risk = 0
    unassessed_risk = 0
    for r in reports:
        risk_rec = db.scalars(
            select(RiskAssessment)
            .where(RiskAssessment.report_id == r.id)
            .order_by(RiskAssessment.id.desc())
        ).first()
        if risk_rec and risk_rec.risk_score is not None:
            if risk_rec.risk_score >= 70:
                high_risk += 1
            elif risk_rec.risk_score >= 40:
                med_risk += 1
            else:
                low_risk += 1
        else:
            unassessed_risk += 1

    total_non_zero = max(len(reports), 1)

    summary_headers = [
        Paragraph("VERIFICATION SUMMARY", th_style),
        Paragraph("COUNT", th_center),
        Paragraph("PERCENTAGE", th_center),
        Paragraph("RISK DISTRIBUTION TIER", th_style),
        Paragraph("THRESHOLD", th_style),
        Paragraph("COUNT", th_center)
    ]
    summary_data = [
        summary_headers,
        [Paragraph("Verified Vectors (Telemetry Cleared)", cell_style), Paragraph(str(verified_cnt), cell_center_bold), Paragraph(f"{(verified_cnt/total_non_zero)*100:.1f}%", cell_center), Paragraph("High Priority", cell_style), Paragraph("Risk Score ≥ 70.0", cell_style), Paragraph(str(high_risk), cell_center_bold)],
        [Paragraph("Pending Triage (Reported Intake)", cell_style), Paragraph(str(reported_cnt), cell_center_bold), Paragraph(f"{(reported_cnt/total_non_zero)*100:.1f}%", cell_center), Paragraph("Medium Priority", cell_style), Paragraph("40.0 ≤ Score < 70.0", cell_style), Paragraph(str(med_risk), cell_center_bold)],
        [Paragraph("In Review / Drift Analysis Active", cell_style), Paragraph(str(review_cnt), cell_center_bold), Paragraph(f"{(review_cnt/total_non_zero)*100:.1f}%", cell_center), Paragraph("Low Priority", cell_style), Paragraph("Risk Score < 40.0", cell_style), Paragraph(str(low_risk), cell_center_bold)],
        [Paragraph("Resolved / Retrieved / Rejected", cell_style), Paragraph(str(resolved_cnt + rejected_cnt), cell_center_bold), Paragraph(f"{((resolved_cnt + rejected_cnt)/total_non_zero)*100:.1f}%", cell_center), Paragraph("Pending Assessment", cell_style), Paragraph("Unassessed telemetry", cell_style), Paragraph(str(unassessed_risk), cell_center_bold)],
    ]
    sum_table = Table(summary_data, colWidths=[200, 55, 75, 200, 180, 60])
    sum_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EAF7F7')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D8ECEC')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2EFEF')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(sum_table)
    story.append(Spacer(1, 12))

    # 4. Detailed Incident Records Table
    table_headers = [
        Paragraph("ID", th_center),
        Paragraph("GEAR TYPE", th_style),
        Paragraph("REPORTER / INTAKE", th_style),
        Paragraph("COORDINATES", th_style),
        Paragraph("LOSS TIME", th_center),
        Paragraph("NGO STATUS", th_center),
        Paragraph("AI DETECTION<br/>(PREDICTION)", th_style),
        Paragraph("CONFIDENCE", th_center),
        Paragraph("RISK SCORE", th_style),
        Paragraph("DRIFT STATUS", th_center),
        Paragraph("MAP SNAPSHOT", th_center),
    ]

    ledger_rows = [table_headers]

    if not reports:
        empty_row = [
            Paragraph("N/A", cell_center),
            Paragraph("No matching records found.", cell_style),
            Paragraph("N/A", cell_style),
            Paragraph("N/A", cell_style),
            Paragraph("N/A", cell_center),
            Paragraph("N/A", cell_center),
            Paragraph("N/A", cell_style),
            Paragraph("N/A", cell_center),
            Paragraph("N/A", cell_style),
            Paragraph("N/A", cell_center),
            Paragraph("N/A", cell_center),
        ]
        ledger_rows.append(empty_row)
    else:
        for r in reports:
            try:
                coords = db.execute(select(ST_X(r.reported_location), ST_Y(r.reported_location))).one()
                lon_f, lat_f = float(coords[0]), float(coords[1])
                coords_str = f"{lat_f:.4f}° N<br/>{lon_f:.4f}° E"
            except Exception:
                coords_str = "Not Available"

            # Parse reporter from description
            desc_str = r.description or ""
            reporter_display = "Anonymous / Public"
            if "Field Telemetry:" in desc_str:
                tele_part = desc_str.split("Field Telemetry:")[1].split("]")[0]
                items = [kv.strip() for kv in tele_part.split("|")]
                rep_name = next((i.split(":")[1].strip() for i in items if i.startswith("Vessel/Reporter:")), None)
                rep_role = next((i.split(":")[1].strip() for i in items if i.startswith("Role:")), None)
                if rep_name and rep_role:
                    reporter_display = f"{rep_name} ({rep_role})"
                elif rep_name:
                    reporter_display = rep_name
                elif rep_role:
                    reporter_display = f"Public ({rep_role})"
            elif r.description:
                reporter_display = (r.description[:25] + "...") if len(r.description) > 25 else r.description

            # AI Detections
            dets = db.scalars(select(AiDetection).where(AiDetection.report_id == r.id)).all()
            if dets:
                best_det = max(dets, key=lambda d: float(d.confidence or 0.0))
                det_label = best_det.detected_class.replace("_", " ").title()
                conf_str = f"{float(best_det.confidence)*100.0:.1f}%"
                ai_str = f"{len(dets)} target: {det_label}"
            else:
                ai_str = "No Target / Not Run"
                conf_str = "N/A"

            # Risk Score
            risk = db.scalars(
                select(RiskAssessment)
                .where(RiskAssessment.report_id == r.id)
                .order_by(RiskAssessment.id.desc())
            ).first()
            if risk and risk.risk_score is not None:
                priority_u = (risk.priority or 'N/A').upper()
                if risk.risk_score >= 70:
                    risk_str = f"<font color='#B91C1C'><b>{risk.risk_score:.1f}/100</b></font> ({priority_u})"
                elif risk.risk_score >= 40:
                    risk_str = f"<font color='#D97706'><b>{risk.risk_score:.1f}/100</b></font> ({priority_u})"
                else:
                    risk_str = f"<font color='#059669'><b>{risk.risk_score:.1f}/100</b></font> ({priority_u})"
            else:
                risk_str = "Not Available"

            # Drift Forecast
            drifts = db.scalar(select(func.count(DriftForecast.id)).where(DriftForecast.report_id == r.id)) or 0
            if drifts > 0:
                drift_str = f"Active ({drifts} steps)"
            else:
                drift_str = "No Forecast"

            # NGO Status with semantic styling
            status_u = (r.status or "REPORTED").upper()
            if r.status == 'verified':
                status_html = f"<font color='#087E8B'><b>{status_u}</b></font>"
            elif r.status in ('reported', 'draft'):
                status_html = f"<font color='#D97706'><b>{status_u}</b></font>"
            elif r.status in ('rejected', 'cancelled'):
                status_html = f"<font color='#DC2626'><b>{status_u}</b></font>"
            else:
                status_html = f"<b>{status_u}</b>"

            # Map snapshot / evidence availability
            map_snapshot = "Evidence Attached" if r.image_url else "Not Available"
            time_str = r.reported_at.strftime("%Y-%m-%d %H:%M") if r.reported_at else "Not Available"

            row = [
                Paragraph(f"<b>#{r.id}</b>", cell_center_bold),
                Paragraph(r.gear_type.replace("_", " ").title(), cell_style),
                Paragraph(reporter_display, cell_style),
                Paragraph(coords_str, cell_style),
                Paragraph(time_str, cell_center),
                Paragraph(status_html, cell_center),
                Paragraph(ai_str, cell_style),
                Paragraph(conf_str, cell_center),
                Paragraph(risk_str, cell_style),
                Paragraph(drift_str, cell_center),
                Paragraph(map_snapshot, cell_center),
            ]
            ledger_rows.append(row)

    col_widths = [34, 62, 96, 78, 68, 60, 92, 58, 78, 72, 72]
    ledger_table = Table(ledger_rows, colWidths=col_widths, repeatRows=1)

    t_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EAF7F7')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D8ECEC')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2EFEF')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]
    for i in range(1, len(ledger_rows)):
        if i % 2 == 0:
            t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8FCFC')))
    ledger_table.setStyle(TableStyle(t_style))
    story.append(ledger_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
