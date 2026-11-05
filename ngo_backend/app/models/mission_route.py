"""
SQLAlchemy Model for mission_routes table.
Stores calculated maritime routes, waypoints, algorithm metadata,
feasibility status, and version history for recovery missions.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, Boolean, Integer, Float, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base


class MissionRoute(Base):
    __tablename__ = "mission_routes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mission_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("recovery_missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("gear_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    route_type: Mapped[str] = mapped_column(String(50), nullable=False, default="primary")  # "primary" or "alternative"
    is_selected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    
    # Departure & Destination
    departure_port: Mapped[str] = mapped_column(String(150), nullable=False)
    departure_lat: Mapped[float] = mapped_column(Float, nullable=False)
    departure_lon: Mapped[float] = mapped_column(Float, nullable=False)
    destination_target: Mapped[str] = mapped_column(String(150), nullable=False)
    destination_lat: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lon: Mapped[float] = mapped_column(Float, nullable=False)

    # Route Metrics
    total_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    total_distance_nm: Mapped[float] = mapped_column(Float, nullable=False)
    direct_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    route_deviation_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    waypoint_count: Mapped[int] = mapped_column(Integer, nullable=False)
    waypoints_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, nullable=False)

    # Spatial Geometry (LineString in EPSG:4326)
    route_geometry = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=False)

    # Algorithm & Feasibility
    algorithm: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        default="A* Marine Grid (Admissible Haversine Heuristic)"
    )
    feasibility_status: Mapped[str] = mapped_column(String(50), nullable=False, default="feasible")
    feasibility_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    constraints_applied: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    constraints_encountered: Mapped[List[str]] = mapped_column(JSONB, nullable=False, default=list)

    # Environmental & Vessel Context
    environmental_context: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    vessel_speed_knots: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_duration_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Versioning & Audit
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    selected_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    selected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    mission: Mapped["RecoveryMission"] = relationship("RecoveryMission", backref="mission_routes")
    report: Mapped["GearReport"] = relationship("GearReport", backref="mission_routes")

    def __repr__(self) -> str:
        return (
            f"<MissionRoute id={self.id} mission_id={self.mission_id} "
            f"type={self.route_type} dist={self.total_distance_km:.2f}km "
            f"selected={self.is_selected}>"
        )
