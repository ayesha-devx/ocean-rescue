"""
Common Pydantic Schemas and GeoJSON types.
"""

from typing import Generic, TypeVar, List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")


class CoordinatesInput(BaseModel):
    """
    Validates geographical coordinates according to WGS84 standards.
    Latitude: [-90.0, 90.0]
    Longitude: [-180.0, 180.0]
    """
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees (-90.0 to 90.0)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees (-180.0 to 180.0)")


class GeoJSONGeometry(BaseModel):
    type: str = Field(..., description="Geometry type, e.g., Point, LineString")
    coordinates: Union[List[float], List[List[float]], List[List[List[float]]]]


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: Dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]


class PaginatedResponse(BaseModel, Generic[T]):
    total: int = Field(..., ge=0, description="Total number of items matching query")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    total_pages: int = Field(..., ge=0, description="Total pages available")
    items: List[T] = Field(..., description="List of items for current page")


class MessageResponse(BaseModel):
    success: bool = True
    message: str
    detail: Optional[str] = None
