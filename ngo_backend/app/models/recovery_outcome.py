"""
SQLAlchemy Model for recovery_outcomes table.
Tracks actual physical recovery operation results for ghost gear recovery missions.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RecoveryOutcome(Base):
    __tablename__ = "recovery_outcomes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mission_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("recovery_missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    incident_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("gear_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    outcome: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # "successfully_recovered", "partially_recovered", "unsuccessful"

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_by: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="Lead Recovery Officer"
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )

    # Correction / Revision Tracking
    is_correction: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True
    )
    correction_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    original_outcome_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("recovery_outcomes.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    mission: Mapped["RecoveryMission"] = relationship(
        "RecoveryMission",
        back_populates="outcomes"
    )
    report: Mapped["GearReport"] = relationship(
        "GearReport",
        back_populates="recovery_outcomes"
    )

    def __repr__(self) -> str:
        return f"<RecoveryOutcome id={self.id} mission_id={self.mission_id} outcome={self.outcome} submitted_by={self.submitted_by}>"
