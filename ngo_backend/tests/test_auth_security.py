"""
Unit and integration tests for cryptographic JWT authentication, session verification,
and forged header protection.
"""

from datetime import timedelta
import pytest
from fastapi import status
from app.core.auth import create_access_token, verify_access_token, is_authorized_ngo


def test_auth_login_successful(client):
    """Test successful NGO operator authentication issuing signed JWT Bearer token."""
    payload = {
        "operator_id": "officer.maritime@oceanrescue.org",
        "password": "oceanrescue-demo",
        "role": "Field Recovery Specialist",
        "agency": "Ghost Diving & Marine Alliance"
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert data["user"]["operator_id"] == "officer.maritime@oceanrescue.org"
    assert data["user"]["role"] == "Field Recovery Specialist"


def test_auth_login_invalid_inputs(client):
    """Test login input validation for missing email or short password."""
    # Missing email
    res1 = client.post("/api/v1/auth/login", json={
        "operator_id": "invalid-no-at-sign",
        "password": "valid-password-123"
    })
    assert res1.status_code == status.HTTP_400_BAD_REQUEST

    # Too short password (caught by Pydantic schema validation as 422)
    res2 = client.post("/api/v1/auth/login", json={
        "operator_id": "officer@oceanrescue.org",
        "password": "12"
    })
    assert res2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_auth_me_protected_endpoint(client):
    """Test /api/v1/auth/me endpoint verification with valid vs invalid tokens."""
    # 1. No token -> 401 Unauthorized
    res_none = client.get("/api/v1/auth/me")
    assert res_none.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Forged custom header without token -> Still 401 Unauthorized
    res_forged = client.get("/api/v1/auth/me", headers={"X-NGO-Authorized": "true", "X-NGO-Role": "admin"})
    assert res_forged.status_code == status.HTTP_401_UNAUTHORIZED

    # 3. Valid login and verify /me
    login_res = client.post("/api/v1/auth/login", json={
        "operator_id": "sarah.connor@oceanrescue.org",
        "password": "secret-passphrase",
        "role": "GIS Telemetry & Drift Analyst",
        "agency": "GGGI"
    })
    token = login_res.json()["access_token"]
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == status.HTTP_200_OK
    me_data = res_me.json()
    assert me_data["operator_id"] == "sarah.connor@oceanrescue.org"
    assert me_data["role"] == "GIS Telemetry & Drift Analyst"
    assert me_data["agency"] == "GGGI"


def test_expired_token_rejected():
    """Test that cryptographically expired JWT tokens are rejected."""
    expired_token = create_access_token(
        operator_id="expired.officer@oceanrescue.org",
        role="Field Recovery Specialist",
        expires_delta=timedelta(seconds=-10)  # Expired 10s ago
    )
    claims = verify_access_token(expired_token)
    assert claims is None, "Expired token must return None"


def test_tampered_token_signature_rejected():
    """Test that tokens with tampered signatures or wrong secret keys are rejected."""
    valid_token = create_access_token(
        operator_id="valid.officer@oceanrescue.org",
        role="Field Recovery Specialist"
    )
    # Tamper with the token string
    tampered_token = valid_token[:-4] + "abcd"
    claims = verify_access_token(tampered_token)
    assert claims is None, "Tampered signature must return None"
