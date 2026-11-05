"""
SQLAlchemy Model for environmental_observations table.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.db.base import Base


class EnvironmentalObservation(Base):
    __tablename__ = "environmental_observations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    observation_location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    current_speed: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    current_direction: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    wind_speed: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    wind_direction: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    wave_height: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    report_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("gear_reports.id", ondelete="SET NULL"), nullable=True, index=True)
    status_message: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    retrieved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, server_default=func.now())
    meta_info = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<EnvironmentalObservation id={self.id} observed_at={self.observed_at} source={self.source}>"

