"""
Pydantic Schemas for NGO Operator Authentication & Session Management.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    operator_id: str = Field(..., min_length=3, max_length=150, description="Operator email or identifier")
    password: str = Field(..., min_length=4, max_length=150, description="Tactical access key / password")
    role: Optional[str] = Field("Field Recovery Specialist", max_length=100, description="Requested operational role")
    agency: Optional[str] = Field("Ghost Diving & Marine Alliance", max_length=150, description="Affiliated agency")


class AuthenticatedUser(BaseModel):
    operator_id: str
    role: str
    agency: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthenticatedUser

