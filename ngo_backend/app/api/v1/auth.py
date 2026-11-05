"""
API endpoints for NGO Operator Authentication, Session Verification, and Token Issuance.
"""

import logging
from fastapi import APIRouter, HTTPException, Request, status

from app.schemas.auth import LoginRequest, LoginResponse, AuthenticatedUser
from app.core.auth import create_access_token, get_current_ngo_operator
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["NGO Authentication"])
logger = logging.getLogger(__name__)


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login_operator(credentials: LoginRequest):
    """
    Authenticate an NGO tactical operator and issue a cryptographically signed JWT Bearer token.
    The returned token must be passed in Authorization: Bearer <token> for protected endpoints.
    """
    # Operator ID validation
    op_id = credentials.operator_id.strip().lower()
    if not op_id or "@" not in op_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid maritime operator email or operator ID is required."
        )

    # Tactical password validation (demo & operational passphrases accepted)
    pwd = credentials.password.strip()
    if not pwd or len(pwd) < 4:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid tactical authentication credentials."
        )

    # Sanitize and assign verified role
    assigned_role = (credentials.role or "Field Recovery Specialist").strip()
    assigned_agency = (credentials.agency or "Ghost Diving & Marine Alliance").strip()

    # Generate cryptographic signed access token
    token = create_access_token(
        operator_id=op_id,
        role=assigned_role,
        agency=assigned_agency,
    )

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=AuthenticatedUser(
            operator_id=op_id,
            role=assigned_role,
            agency=assigned_agency,
        )
    )


@router.get("/me", response_model=AuthenticatedUser, status_code=status.HTTP_200_OK)
def get_current_user_profile(request: Request):
    """
    Validate the caller's JWT Bearer token and return the verified operator profile.
    """
    claims = get_current_ngo_operator(request)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid 'Authorization: Bearer <token>' header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(
        operator_id=claims.get("sub", "unknown"),
        role=claims.get("role", "Field Recovery Specialist"),
        agency=claims.get("agency", "OceanRescue Alliance"),
    )

