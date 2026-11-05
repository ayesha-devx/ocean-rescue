"""
Pydantic Schemas for Environmental Observations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class EnvironmentalObservationBase(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Observation latitude (-90.0 to 90.0)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Observation longitude (-180.0 to 180.0)")
    current_speed: Optional[Decimal] = Field(None, ge=0.0, description="Current speed in m/s")
    current_direction: Optional[Decimal] = Field(None, ge=0.0, le=360.0, description="Current direction in degrees (0-360)")
    wind_speed: Optional[Decimal] = Field(None, ge=0.0, description="Wind speed in m/s")
    wind_direction: Optional[Decimal] = Field(None, ge=0.0, le=360.0, description="Wind direction in degrees (0-360)")
    wave_height: Optional[Decimal] = Field(None, ge=0.0, description="Significant wave height in meters")
    observed_at: datetime = Field(..., description="Timestamp of sensor observation")
    source: Optional[str] = Field(None, max_length=255, description="Data source e.g. Open-Meteo Marine, Open-Meteo Weather")
    report_id: Optional[int] = Field(None, description="Associated gear report ID")
    status_message: Optional[str] = Field(None, description="Observation status or validation message")
    retrieved_at: Optional[datetime] = Field(None, description="Timestamp when observation was retrieved")
    meta_info: Optional[Dict[str, Any]] = Field(None, description="Provider metadata and grid coordinates")


class EnvironmentalObservationCreate(EnvironmentalObservationBase):
    pass


class EnvironmentalObservationResponse(EnvironmentalObservationBase):
    id: int

    model_config = {"from_attributes": True}

