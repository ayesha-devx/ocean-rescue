"""
SQLAlchemy Model for recovery_missions table.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, Boolean, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base


class RecoveryMission(Base):
    __tablename__ = "recovery_missions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("gear_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    departure_port: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        default="Mirkarwada Fishing Harbour, Ratnagiri"
    )
    target_sector: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        default="Arabian Sea – Ratnagiri / Konkan Coast"
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="planned", index=True)
    priority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="HIGH")
    operational_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    planned_route = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    clearances: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    signed_off: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    signed_off_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_off_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    report: Mapped["GearReport"] = relationship("GearReport", back_populates="recovery_missions")
    outcomes: Mapped[List["RecoveryOutcome"]] = relationship(
        "RecoveryOutcome",
        back_populates="mission",
        cascade="all, delete-orphan",
        order_by="desc(RecoveryOutcome.submitted_at)"
    )

    def __repr__(self) -> str:
        return f"<RecoveryMission id={self.id} report_id={self.report_id} title={self.title} status={self.status}>"
