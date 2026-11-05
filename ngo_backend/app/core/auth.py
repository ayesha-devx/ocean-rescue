"""
OceanRescue Cryptographic JWT Authentication & Authorization Service.
Validates NGO operator identity using signed JWT Bearer tokens.
Strictly ignores forgeable client-supplied headers.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Set
import jwt
from fastapi import Request

from app.core.config import settings

logger = logging.getLogger(__name__)

# Canonical roles recognized for NGO recovery operations
AUTHORIZED_NGO_ROLES: Set[str] = {
    "field recovery specialist",
    "field_recovery_specialist",
    "gis telemetry & drift analyst",
    "gis_analyst",
    "ai sonar review officer",
    "sonar_officer",
    "mission commander",
    "mission_commander",
    "lead recovery officer",
    "ngo_officer",
    "coordinator",
    "administrator",
    "admin",
}

# Roles that are strictly unauthorized from accessing confidential contact records
UNAUTHORIZED_ROLES: Set[str] = {
    "fisherman",
    "public",
    "guest",
    "anonymous",
    "vessel_owner",
}


def create_access_token(
    operator_id: str,
    role: str = "Field Recovery Specialist",
    agency: Optional[str] = "Ghost Diving & Marine Alliance",
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Creates a cryptographically signed HMAC-SHA256 JWT access token for an NGO operator.
    Contains verified operator identity and role claims.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": operator_id.strip().lower(),
        "role": role.strip(),
        "agency": (agency or "OceanRescue Alliance").strip(),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": "oceanrescue-platform",
    }
    if extra_claims:
        payload.update(extra_claims)

    encoded = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Cryptographically verifies a JWT token's signature, expiration, and issuer.
    Returns the decoded token claims dictionary if valid, or None if invalid/expired.
    """
    if not token or not isinstance(token, str):
        return None
    try:
        payload = jwt.decode(
            token.strip(),
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer="oceanrescue-platform",
            options={"require": ["exp", "sub", "role"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("Access token signature expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.debug(f"Invalid access token: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected token verification error: {e}")
        return None


def extract_bearer_token(request: Optional[Request]) -> Optional[str]:
    """
    Extracts Bearer token strictly from the standard HTTP Authorization header.
    Format: 'Bearer <token>'
    """
    if not request:
        return None
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth_header:
        return None
    parts = auth_header.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def get_current_ngo_operator(request: Optional[Request]) -> Optional[Dict[str, Any]]:
    """
    Resolves the authenticated operator claims from the request's Bearer token.
    Never inspects forgeable custom role headers.
    """
    token = extract_bearer_token(request)
    if not token:
        return None
    return verify_access_token(token)


def is_authorized_ngo(request: Optional[Request]) -> bool:
    """
    Strict authorization check:
    1. Extracts signed JWT token from Authorization: Bearer <token>.
    2. Cryptographically validates token signature and expiration.
    3. Derives operator role strictly from validated token claims.
    4. Checks that the verified role belongs to authorized NGO operations personnel.
    5. Returns False for all unauthenticated, forged, or unauthorized callers.
    """
    claims = get_current_ngo_operator(request)
    if not claims:
        return False

    # Extract role from verified token payload (never from client headers)
    verified_role = str(claims.get("role", "")).strip().lower()
    if not verified_role:
        return False

    if verified_role in UNAUTHORIZED_ROLES:
        return False

    return verified_role in AUTHORIZED_NGO_ROLES or any(
        auth_word in verified_role for auth_word in ("specialist", "officer", "analyst", "commander", "admin")
    )

