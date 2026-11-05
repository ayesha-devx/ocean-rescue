"""
SQLAlchemy Model for ai_detections table.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Any, List
from sqlalchemy import BigInteger, String, Numeric, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AiDetection(Base):
    __tablename__ = "ai_detections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("gear_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    detected_class: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    # NGO Review Workflow Fields
    review_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True
    )
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Spatial / Mask Geometry
    bbox: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    polygon: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)

    # Relationships
    report: Mapped["GearReport"] = relationship("GearReport", back_populates="ai_detections")

    def __repr__(self) -> str:
        return f"<AiDetection id={self.id} report_id={self.report_id} class={self.detected_class} conf={self.confidence} status={self.review_status}>"
