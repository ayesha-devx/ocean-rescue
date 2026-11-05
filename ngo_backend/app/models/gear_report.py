"""
SQLAlchemy Model for gear_reports table.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import BigInteger, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base


class GearReport(Base):
    __tablename__ = "gear_reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    gear_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reported_location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="reported", index=True)
    
    # Extended Reporting Method & Location Telemetry (Stage 2)
    reporting_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    location_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    location_uncertainty_radius_m: Mapped[Optional[float]] = mapped_column(nullable=True)
    loss_date_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approximate_area: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    distance_from_coast_km: Mapped[Optional[float]] = mapped_column(nullable=True)
    nearby_landmark: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    direction_from_landmark: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Fisherman / Reporter Information
    reporter_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True, index=True)
    reporter_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reporter_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    reporter_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Vessel Information
    vessel_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True, index=True)
    has_registered_vessel_name: Mapped[Optional[bool]] = mapped_column(nullable=True, default=True)
    vessel_registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vessel_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    home_port: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Gear Telemetry & Markings
    gear_quantity: Mapped[Optional[int]] = mapped_column(nullable=True, default=1)
    gear_markings: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    water_position: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    estimated_size: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sea_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Submission Declaration
    declaration_confirmed: Mapped[Optional[bool]] = mapped_column(nullable=True, default=False)

    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    ai_detections: Mapped[List["AiDetection"]] = relationship(
        "AiDetection",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="desc(AiDetection.detected_at)"
    )
    drift_forecasts: Mapped[List["DriftForecast"]] = relationship(
        "DriftForecast",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="desc(DriftForecast.forecast_time)"
    )
    recovery_missions: Mapped[List["RecoveryMission"]] = relationship(
        "RecoveryMission",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="desc(RecoveryMission.created_at)"
    )
    recovery_outcomes: Mapped[List["RecoveryOutcome"]] = relationship(
        "RecoveryOutcome",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="desc(RecoveryOutcome.submitted_at)"
    )

    def __repr__(self) -> str:
        return f"<GearReport id={self.id} gear_type={self.gear_type} status={self.status}>"
