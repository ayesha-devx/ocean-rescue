"""
Pydantic Schemas for Gear Reports.
"""

import re
from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator


class GearTypeEnum(str, Enum):
    GILLNET = "gillnet"
    TRAWL_NET = "trawl_net"
    CRAB_POT = "crab_pot"
    LOBSTER_TRAP = "lobster_trap"
    LONGLINE = "longline"
    FAD = "fad"
    PURSE_SEINE = "purse_seine"
    TRAP = "trap"
    MONOFILAMENT = "monofilament"
    NET = "net"
    ROPE = "rope"
    OTHER = "other"


class ReportStatusEnum(str, Enum):
    REPORTED = "reported"
    VERIFIED = "verified"
    IN_REVIEW = "in_review"
    UNDER_REVIEW = "under_review"
    SCHEDULED_RECOVERY = "scheduled_recovery"
    RESOLVED = "resolved"
    RECOVERED = "recovered"
    PARTIALLY_RECOVERED = "partially_recovered"
    RECOVERY_UNSUCCESSFUL = "recovery_unsuccessful"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class GearReportBase(BaseModel):
    gear_type: str = Field(..., min_length=2, max_length=100, description="Type or classification of fishing gear")
    description: Optional[str] = Field(None, max_length=5000, description="Detailed observations, dimensions, notes")
    image_url: Optional[str] = Field(None, max_length=2000, description="URL or relative path to evidence photo")

    @field_validator("gear_type")
    def clean_gear_type(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Gear type cannot be empty")
        raw = v.strip().lower()
        if "gillnet" in raw or "monofilament" in raw:
            return "gillnet"
        elif "trawl" in raw:
            return "trawl_net"
        elif "crab" in raw or "lobster" in raw or "pot" in raw:
            return "crab_pot"
        elif "longline" in raw or "gangion" in raw:
            return "longline"
        elif "fad" in raw or "buoy" in raw:
            return "fad"
        elif "seine" in raw:
            return "purse_seine"
        elif "trap" in raw:
            return "crab_pot"
        elif "net" in raw:
            return "gillnet"
        
        cleaned = raw.replace(" ", "_").replace("/", "_").replace("&", "_")
        # Remove consecutive underscores
        while "__" in cleaned:
            cleaned = cleaned.replace("__", "_")
        return cleaned.strip("_")


class GearReportCreate(GearReportBase):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate (-90.0 to 90.0)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate (-180.0 to 180.0)")
    
    # Supplementary citizen / mariner intake fields
    reporter_type: Optional[str] = Field(None, max_length=100)
    reporter_name: Optional[str] = Field(None, max_length=150)
    reporter_phone: Optional[str] = Field(None, max_length=50)
    reporter_email: Optional[str] = Field(None, max_length=150)
    reporter_role: Optional[str] = Field(None, max_length=50)
    contact_info: Optional[str] = Field(None, max_length=255)
    is_anonymous: Optional[bool] = False

    # Vessel Information
    vessel_name: Optional[str] = Field(None, max_length=150)
    has_registered_vessel_name: Optional[bool] = True
    vessel_registration_number: Optional[str] = Field(None, max_length=100)
    vessel_type: Optional[str] = Field(None, max_length=100)
    home_port: Optional[str] = Field(None, max_length=150)

    # Gear Telemetry & Markings
    gear_quantity: Optional[int] = Field(1, ge=1, description="Quantity of gear lost, positive integer >= 1")
    gear_markings: Optional[str] = Field(None, max_length=255)
    water_position: Optional[str] = Field(None, max_length=100)
    estimated_size: Optional[str] = Field(None, max_length=100)
    location_notes: Optional[str] = Field(None, max_length=1000)
    sea_state: Optional[str] = Field(None, max_length=100)
    wildlife_entangled: Optional[str] = Field(None, max_length=50)
    wildlife_details: Optional[str] = Field(None, max_length=1000)

    # Submission Declaration
    declaration_confirmed: Optional[bool] = False

    # Extended Reporting Method & Location Telemetry (Stage 2)
    reporting_method: Optional[str] = Field(None, max_length=50, description="Reporting method ('gps' or 'manual')")
    location_type: Optional[str] = Field(None, max_length=50, description="Location fix type ('exact' or 'estimated')")
    location_uncertainty_radius_m: Optional[float] = Field(None, ge=0.0, description="Uncertainty radius in meters")
    loss_date_time: Optional[datetime] = Field(None, description="Actual date and time gear was lost at sea")
    approximate_area: Optional[str] = Field(None, max_length=150)
    distance_from_coast_km: Optional[float] = Field(None, ge=0.0)
    nearby_landmark: Optional[str] = Field(None, max_length=150)
    direction_from_landmark: Optional[str] = Field(None, max_length=50)

    @field_validator("reporter_phone")
    def validate_reporter_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        cleaned = v.strip()
        if not re.match(r"^\+?[0-9\s\-().]{7,25}$", cleaned):
            raise ValueError("Invalid mobile number format. Please provide a valid mobile number with country code (e.g. +91 9876543210).")
        digits_only = re.sub(r"\D", "", cleaned)
        if len(digits_only) < 7 or len(digits_only) > 15:
            raise ValueError("Mobile number must contain between 7 and 15 digits including country code.")
        return cleaned

    @field_validator("reporter_email")
    def validate_reporter_email(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        cleaned = v.strip()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
            raise ValueError("Invalid email address format.")
        return cleaned

    @field_validator("gear_quantity")
    def validate_gear_quantity(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("Quantity of gear lost must be a positive integer (at least 1).")
        return v or 1

    @model_validator(mode="after")
    def validate_vessel_name_consistency(self):
        if self.has_registered_vessel_name is False and (not self.vessel_name or not self.vessel_name.strip()):
            self.vessel_name = "No registered name"
        return self


class GearReportUpdate(BaseModel):
    gear_type: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[str] = Field(None, max_length=2000)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    reporting_method: Optional[str] = None
    location_type: Optional[str] = None
    location_uncertainty_radius_m: Optional[float] = None
    loss_date_time: Optional[datetime] = None
    approximate_area: Optional[str] = None
    distance_from_coast_km: Optional[float] = None
    nearby_landmark: Optional[str] = None
    direction_from_landmark: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    reporter_email: Optional[str] = None
    reporter_role: Optional[str] = None
    vessel_name: Optional[str] = None
    has_registered_vessel_name: Optional[bool] = None
    vessel_registration_number: Optional[str] = None
    vessel_type: Optional[str] = None
    home_port: Optional[str] = None
    gear_quantity: Optional[int] = None
    gear_markings: Optional[str] = None
    water_position: Optional[str] = None
    estimated_size: Optional[str] = None
    sea_state: Optional[str] = None
    declaration_confirmed: Optional[bool] = None


class GearReportStatusUpdate(BaseModel):
    status: str = Field(..., description="New report status (reported, verified, in_review, scheduled_recovery, resolved, cancelled)")
    notes: Optional[str] = Field(None, max_length=1000, description="Operational justification or verification notes")

    @field_validator("status")
    def validate_status(cls, v: str) -> str:
        cleaned = v.strip().lower().replace(" ", "_")
        valid_statuses = [s.value for s in ReportStatusEnum]
        if cleaned not in valid_statuses:
            raise ValueError(f"Invalid status '{v}'. Allowed statuses: {', '.join(valid_statuses)}")
        return cleaned


class GearReportResponse(BaseModel):
    id: int
    gear_type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    latitude: float
    longitude: float
    reporting_method: Optional[str] = None
    location_type: Optional[str] = None
    location_uncertainty_radius_m: Optional[float] = None
    loss_date_time: Optional[datetime] = None
    approximate_area: Optional[str] = None
    distance_from_coast_km: Optional[float] = None
    nearby_landmark: Optional[str] = None
    direction_from_landmark: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    reporter_email: Optional[str] = None
    reporter_role: Optional[str] = None
    vessel_name: Optional[str] = None
    has_registered_vessel_name: Optional[bool] = None
    vessel_registration_number: Optional[str] = None
    vessel_type: Optional[str] = None
    home_port: Optional[str] = None
    gear_quantity: Optional[int] = 1
    gear_markings: Optional[str] = None
    water_position: Optional[str] = None
    estimated_size: Optional[str] = None
    sea_state: Optional[str] = None
    declaration_confirmed: Optional[bool] = False
    reported_at: datetime
    updated_at: datetime
    ai_detections_count: int = 0
    drift_forecasts_count: int = 0
    recovery_missions_count: int = 0

    model_config = {"from_attributes": True}
