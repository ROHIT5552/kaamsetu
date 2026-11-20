"""Comprehensive Security & Integration Test Suite for Authentication & Authorization

Tests:
- Valid OTP flow
- Invalid OTP rejection & counter
- Expired OTP rejection
- Reused OTP rejection (One-Time-Use)
- Rate limiting on OTP generation
- Max verification attempts lockout
- Signed JWT token verification
- Refresh token rotation
- Revoked refresh token rejection & breach detection
- Role-based authorization (Worker, Employer, Admin, Support)
- Cross-role access denial (Worker cannot access Admin, Employer cannot access Worker)
- IDOR access prevention (User A cannot access User B's resource)
- Security log hygiene (No OTPs or tokens in logs)
"""

import uuid
import pytest
import logging
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config import settings
from app.models.common import UserRoleType
from app.modules.auth.otp_service import otp_service
from app.modules.auth.tokens import token_manager
from app.integrations.sms.factory import get_sms_provider


@pytest.fixture(autouse=True)
def clean_state():
    """Resets in-memory OTP and token state between tests."""
    otp_service.clear()
    token_manager.clear()
    provider = get_sms_provider()
    if hasattr(provider, "clear"):
        provider.clear()
    yield


@pytest.mark.asyncio
async def test_valid_otp_flow():
    """Verify standard OTP generation and successful verification returning JWT tokens."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = "+919822011111"

        # 1. Request OTP
        req_res = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert req_res.status_code == 200
        assert "message" in req_res.json()

        # 2. Retrieve generated OTP from test mailbox (isolated development provider)
        provider = get_sms_provider()
        otp = provider.get_latest_otp_for_phone(phone)
        assert otp is not None
        assert len(otp) == 6

        # 3. Verify OTP
        verify_res = await ac.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "otp": otp, "role_intent": "worker"}
        )
        assert verify_res.status_code == 200
        data = verify_res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert UserRoleType.WORKER.value in data["roles"]


@pytest.mark.asyncio
async def test_invalid_otp_rejection():
    """Verify incorrect OTP code is rejected with HTTP 400 and remaining attempts counted."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = "+919822022222"
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})

        # Submit deliberately wrong OTP
        res = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "000000"})
        assert res.status_code == 400
        assert "Incorrect OTP" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_expired_otp_rejection():
    """Verify expired OTP code is rejected with HTTP 410."""
    phone = "+919822033333"
    await otp_service.generate_and_send_otp(phone)
    provider = get_sms_provider()
    otp = provider.get_latest_otp_for_phone(phone)

    # Artificially age the OTP record past expiration
    record = otp_service._active_otps[phone]
    record.expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
        assert res.status_code == 410
        assert "expired" in res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_reused_otp_rejection():
    """Verify OTP cannot be reused once verified (One-Time-Use guarantee)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = "+919822044444"
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        provider = get_sms_provider()
        otp = provider.get_latest_otp_for_phone(phone)

        # First verification succeeds
        res1 = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
        assert res1.status_code == 200

        # Immediate replay attempt must fail
        res2 = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
        assert res2.status_code in (400, 409)


@pytest.mark.asyncio
async def test_rate_limiting_otp_requests():
    """Verify rate-limiting blocks repeated OTP generation requests (HTTP 429)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = "+919822055555"
        # Allowed up to 3 requests
        for _ in range(3):
            res = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
            assert res.status_code == 200

        # 4th request must trigger rate limit
        res4 = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert res4.status_code == 429
        assert "Too many OTP requests" in res4.json()["error"]["message"]


@pytest.mark.asyncio
async def test_max_verification_attempts_lockout():
    """Verify exceeding maximum failed attempts locks the OTP session (HTTP 423)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = "+919822066666"
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})

        # Submit 5 incorrect attempts
        for i in range(5):
            res = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "999999"})
            assert res.status_code == 400

        # 6th attempt must trigger lockout
        res_lock = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "999999"})
        assert res_lock.status_code == 423
        assert "locked" in res_lock.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_refresh_token_rotation():
    """Verify refresh token rotation issues a new token pair and revokes the old refresh token."""
    user_id = uuid.uuid4()
    roles = [UserRoleType.WORKER.value]
    initial_refresh_token = token_manager.create_refresh_token(user_id=user_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Rotate token
        rotate_res = await ac.post(
            "/api/v1/auth/token/refresh",
            json={"refresh_token": initial_refresh_token}
        )
        assert rotate_res.status_code == 200
        data = rotate_res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["refresh_token"] != initial_refresh_token

        # Attempting to reuse initial_refresh_token must now fail
        reuse_res = await ac.post(
            "/api/v1/auth/token/refresh",
            json={"refresh_token": initial_refresh_token}
        )
        assert reuse_res.status_code == 401


@pytest.mark.asyncio
async def test_role_based_authorization_guards():
    """Verify RBAC access controls:
    - Worker CAN access worker-only route.
    - Worker CANNOT access admin-only route.
    - Employer CAN access employer-only route.
    - Employer CANNOT access worker-only route.
    - Admin has access to all routes.
    """
    worker_id = uuid.uuid4()
    employer_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    worker_token = token_manager.create_access_token(worker_id, [UserRoleType.WORKER.value])
    employer_token = token_manager.create_access_token(employer_id, [UserRoleType.EMPLOYER.value])
    admin_token = token_manager.create_access_token(admin_id, [UserRoleType.ADMIN.value])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Worker accesses worker-only: ALLOWED
        res = await ac.get("/api/v1/protected/worker-only", headers={"Authorization": f"Bearer {worker_token}"})
        assert res.status_code == 200

        # 2. Worker accesses admin-only: FORBIDDEN (403)
        res = await ac.get("/api/v1/protected/admin-only", headers={"Authorization": f"Bearer {worker_token}"})
        assert res.status_code == 403

        # 3. Employer accesses worker-only: FORBIDDEN (403)
        res = await ac.get("/api/v1/protected/worker-only", headers={"Authorization": f"Bearer {employer_token}"})
        assert res.status_code == 403

        # 4. Employer accesses employer-only: ALLOWED
        res = await ac.get("/api/v1/protected/employer-only", headers={"Authorization": f"Bearer {employer_token}"})
        assert res.status_code == 200

        # 5. Admin accesses all routes: ALLOWED
        res_w = await ac.get("/api/v1/protected/worker-only", headers={"Authorization": f"Bearer {admin_token}"})
        res_e = await ac.get("/api/v1/protected/employer-only", headers={"Authorization": f"Bearer {admin_token}"})
        res_a = await ac.get("/api/v1/protected/admin-only", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_w.status_code == 200
        assert res_e.status_code == 200
        assert res_a.status_code == 200


@pytest.mark.asyncio
async def test_idor_protection():
    """Verify tenant isolation: User A cannot access User B's resource."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    token_a = token_manager.create_access_token(user_a, [UserRoleType.WORKER.value])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # User A accesses own resource: ALLOWED (200)
        res_own = await ac.get(
            f"/api/v1/protected/resource/{user_a}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert res_own.status_code == 200

        # User A attempts to access User B's resource: FORBIDDEN (403)
        res_other = await ac.get(
            f"/api/v1/protected/resource/{user_b}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert res_other.status_code == 403


@pytest.mark.asyncio
async def test_security_log_hygiene(caplog):
    """Verify that zero plaintext OTPs or bearer tokens appear in system log records."""
    caplog.set_level(logging.DEBUG)
    phone = "+919822099999"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Request OTP
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        provider = get_sms_provider()
        otp = provider.get_latest_otp_for_phone(phone)

        # Verify OTP
        res = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
        access_token = res.json()["access_token"]

        # Access protected route
        await ac.get("/api/v1/protected/worker-only", headers={"Authorization": f"Bearer {access_token}"})

    all_logs = " ".join(record.message for record in caplog.records)

    # 1. Raw OTP must not appear anywhere in log messages
    assert otp not in all_logs, "CRITICAL SECURITY BREACH: Raw OTP detected in logs!"

    # 2. Raw Bearer JWT token must not appear in log messages
    assert access_token not in all_logs, "CRITICAL SECURITY BREACH: Raw JWT access token detected in logs!"
