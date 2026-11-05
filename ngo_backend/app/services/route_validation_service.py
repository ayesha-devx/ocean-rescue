"""
Route Validation Service.
Validates geographic coordinates, terrestrial land boundaries,
sector limits, and operational parameters for recovery route planning.
"""

import math
from typing import Tuple, Dict, Any, Optional
from fastapi import HTTPException, status

from app.services.drift_service import (
    is_land_coordinate,
    get_approximate_coastline_lon,
    calculate_haversine_distance_km,
)

# Study region bounding limits (Arabian Sea – Konkan Coast)
STUDY_BBOX = {
    "min_lat": 14.0,
    "max_lat": 20.0,
    "min_lon": 68.0,
    "max_lon": 74.5,
    "sector_name": "Arabian Sea – Ratnagiri / Konkan Coast (14°–20° N, 68°–74° E)",
}


class RouteValidationError(Exception):
    """Custom exception for route validation failures with HTTP status mapping."""
    def __init__(self, message: str, status_code: int = status.HTTP_422_UNPROCESSABLE_ENTITY, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class RouteValidationService:
    """Provides pure-validation routines for route planning inputs."""

    @staticmethod
    def validate_wgs84_coordinates(lat: Any, lon: Any, field_name: str = "Coordinates") -> Tuple[float, float]:
        """
        Validates numeric existence, finiteness, and WGS84 range.
        """
        if lat is None or lon is None:
            raise RouteValidationError(
                f"{field_name} are required and cannot be null.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        try:
            num_lat = float(lat)
            num_lon = float(lon)
        except (ValueError, TypeError):
            raise RouteValidationError(
                f"{field_name} must be valid floating-point numbers.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not math.isfinite(num_lat) or not math.isfinite(num_lon):
            raise RouteValidationError(
                f"{field_name} must be finite numbers.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not (-90.0 <= num_lat <= 90.0):
            raise RouteValidationError(
                f"Latitude {num_lat}° is out of valid WGS84 range [-90, +90].",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not (-180.0 <= num_lon <= 180.0):
            raise RouteValidationError(
                f"Longitude {num_lon}° is out of valid WGS84 range [-180, +180].",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        return round(num_lat, 6), round(num_lon, 6)

    @staticmethod
    def validate_study_sector_bounds(lat: float, lon: float, point_label: str = "Point") -> None:
        """
        Ensures coordinates reside within the designated Arabian Sea / Konkan Coast study region.
        """
        if not (STUDY_BBOX["min_lat"] <= lat <= STUDY_BBOX["max_lat"] and
                STUDY_BBOX["min_lon"] <= lon <= STUDY_BBOX["max_lon"]):
            raise RouteValidationError(
                f"{point_label} ({lat:.4f}° N, {lon:.4f}° E) is outside the authorized operational sector "
                f"[{STUDY_BBOX['sector_name']}].",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

    @staticmethod
    def validate_departure_location(lat: float, lon: float, port_name: str = "Departure Harbour") -> None:
        """
        Ensures departure harbour coordinates are navigable water, not deep inland.
        """
        RouteValidationService.validate_study_sector_bounds(lat, lon, point_label=port_name)

        if is_land_coordinate(lat, lon):
            coast_lon = get_approximate_coastline_lon(lat)
            dist_inland = calculate_haversine_distance_km(lat, lon, lat, coast_lon)
            if dist_inland > 1.0:
                raise RouteValidationError(
                    f"Selected departure harbour '{port_name}' ({lat:.4f}° N, {lon:.4f}° E) "
                    f"is located {dist_inland:.1f} km inland. Marine vessels cannot stage from terrestrial land.",
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

    @staticmethod
    def validate_recovery_target(lat: float, lon: float, target_label: str = "Recovery Target") -> None:
        """
        Verifies target is not landlocked. If target is situated on terrestrial land,
        explains clearly that salvage vessels cannot navigate over land.
        """
        RouteValidationService.validate_study_sector_bounds(lat, lon, point_label=target_label)

        if is_land_coordinate(lat, lon):
            coast_lon = get_approximate_coastline_lon(lat)
            dist_inland = calculate_haversine_distance_km(lat, lon, lat, coast_lon)
            raise RouteValidationError(
                f"{target_label} coordinates ({lat:.4f}° N, {lon:.4f}° E) are located on terrestrial landmass "
                f"({dist_inland:.1f} km east of the coastline). Salvage vessels cannot navigate over land. "
                f"Target must be recovered via coastal shoreline team or amphibious unit.",
                status_code=status.HTTP_400_BAD_REQUEST,
                details={
                    "is_land": True,
                    "dist_inland_km": dist_inland,
                    "coastline_lon": coast_lon,
                }
            )

    @staticmethod
    def validate_vessel_speed(speed_knots: Optional[float]) -> Optional[float]:
        """
        Validates optional vessel speed in knots.
        """
        if speed_knots is None:
            return None
        try:
            val = float(speed_knots)
        except (ValueError, TypeError):
            raise RouteValidationError(
                "Vessel cruising speed must be a valid number.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        if val <= 0.0 or val > 60.0:
            raise RouteValidationError(
                f"Vessel speed must be between 1 and 60 knots (received: {val} kts).",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        return round(val, 1)
