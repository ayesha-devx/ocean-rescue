"""
SQLAlchemy Model for drift_forecasts table.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base


class DriftForecast(Base):
    __tablename__ = "drift_forecasts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("gear_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    predicted_location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    forecast_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    risk_score: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    model_name: Mapped[str] = mapped_column(String, nullable=False)
    step_index: Mapped[Optional[int]] = mapped_column(nullable=True, default=0)
    simulation_mode: Mapped[Optional[bool]] = mapped_column(nullable=True, default=False)
    current_u: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    current_v: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    current_speed: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    current_direction: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    distance_km: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    wind_speed: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    wind_direction: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    windage_coefficient: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    boundary_contained: Mapped[Optional[bool]] = mapped_column(nullable=True, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )


    # Relationships
    report: Mapped["GearReport"] = relationship("GearReport", back_populates="drift_forecasts")

    def __repr__(self) -> str:
        return f"<DriftForecast id={self.id} report_id={self.report_id} time={self.forecast_time} risk={self.risk_score}>"
