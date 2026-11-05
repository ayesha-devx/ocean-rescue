"""
SQLAlchemy Model for risk_assessments table.
Stores calculated multi-criteria risk scores, factor breakdowns,
and explainability metadata for ALDFG incidents.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from sqlalchemy import BigInteger, String, Numeric, DateTime, ForeignKey, func, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("gear_reports.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    risk_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # critical, high, medium, low
    data_confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="medium", index=True)  # high, medium, low
    needs_inputs: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    # Human-readable explanations
    primary_reason: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)

    # Detailed factor breakdown and metadata JSONB
    factors: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    missing_inputs: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    metadata_info: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)

    assessed_at: Mapped[datetime] = mapped_column(
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
    report: Mapped["GearReport"] = relationship("GearReport", backref="risk_assessment")

    def __repr__(self) -> str:
        return f"<RiskAssessment id={self.id} report_id={self.report_id} score={self.risk_score} priority={self.priority}>"
