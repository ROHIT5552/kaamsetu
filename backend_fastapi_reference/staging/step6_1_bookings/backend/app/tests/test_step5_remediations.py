"""Test Suite for KaamSetu Stage 2 Step 5 Remediations

Verifies closure of:
- AUDIT-KS5-001: Verified phone resolution and refresh-token rotation preservation without dummy fallbacks
- AUDIT-KS5-002: Job lifecycle FSM transition validation & terminal-state immutability
- AUDIT-KS5-003: Application status FSM validation, terminal-state protection & employer IDOR checks
"""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.common import UserRoleType, JobStatus, ApplicationStatus
from app.modules.auth.otp_service import otp_service
from app.modules.auth.tokens import token_manager
from app.modules.auth.router import _staging_users_db
from app.integrations.sms.factory import get_sms_provider
from app.modules.workers.service import worker_service
from app.modules.employers.service import employer_service
from app.modules.jobs.service import job_service
from app.modules.applications.service import application_service


@pytest.fixture(autouse=True)
def clean_state():
    """Resets all in-memory domain and authentication stores between tests."""
    otp_service.clear()
    token_manager.clear()
    _staging_users_db.clear()
    worker_service.clear()
    employer_service.clear()
    job_service.clear()
    application_service.clear()
    provider = get_sms_provider()
    if hasattr(provider, "clear"):
        provider.clear()
    yield


@pytest.mark.asyncio
async def test_remediation_ks5_001_phone_resolution_and_refresh_rotation():
    """Verify AUDIT-KS5-001:
    1. Authenticate worker via OTP.
    2. Rotate refresh token; verify new access token preserves phone resolution.
    3. Worker profile creation succeeds with server-resolved phone (no dummy fallback).
    4. Unresolvable phone cleanly rejects profile creation with HTTP 400.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = "+919822334455"

        # 1. Complete OTP verification
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        provider = get_sms_provider()
        otp = provider.get_latest_otp_for_phone(phone)
        verify_res = await ac.post(
            "/api/v1/auth/otp/verify",
            json={"phone": phone, "otp": otp, "role_intent": "worker"}
        )
        assert verify_res.status_code == 200
        auth_data = verify_res.json()
        refresh_token = auth_data["refresh_token"]

        # 2. Rotate refresh token
        rotate_res = await ac.post("/api/v1/auth/token/refresh", json={"refresh_token": refresh_token})
        assert rotate_res.status_code == 200
        rotated_access_token = rotate_res.json()["access_token"]

        # 3. Create worker profile using rotated token
        profile_payload = {
            "primary_area": "Cidco",
            "experience_years": 4,
            "hourly_rate": 160.0
        }
        res_profile = await ac.post(
            "/api/v1/workers/profile",
            json=profile_payload,
            headers={"Authorization": f"Bearer {rotated_access_token}"}
        )
        assert res_profile.status_code == 201
        created_profile = res_profile.json()
        # Verify phone was resolved to genuine registered number and masked properly
        assert created_profile["phone_masked"] == "+91******4455"
        assert "+919822000000" not in created_profile["phone_masked"]

        # 4. Negative Case: Token without phone claim and no record in identity store
        unknown_user_id = uuid.uuid4()
        orphan_token = token_manager.create_access_token(
            user_id=unknown_user_id,
            roles=[UserRoleType.WORKER.value]
        )
        res_orphan = await ac.post(
            "/api/v1/workers/profile",
            json=profile_payload,
            headers={"Authorization": f"Bearer {orphan_token}"}
        )
        assert res_orphan.status_code == 400
        assert "unable to resolve verified phone" in res_orphan.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_remediation_ks5_002_job_status_fsm_validation():
    """Verify AUDIT-KS5-002:
    - Enforce explicit JobStatus lifecycle transitions.
    - Disallow reopening completed or cancelled jobs.
    - Return consistent HTTP 400 for illegal transitions.
    """
    employer_user_id = uuid.uuid4()
    emp_token = token_manager.create_access_token(employer_user_id, [UserRoleType.EMPLOYER.value])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {emp_token}"}

        # Setup employer
        await ac.post(
            "/api/v1/employers/profile",
            json={"employer_type": "individual", "default_area": "Waluj"},
            headers=headers
        )

        # Create Job (initial status: OPEN)
        job_res = await ac.post(
            "/api/v1/jobs",
            json={
                "title": "Masonry Construction Work",
                "description": "Construct compound wall at Waluj site",
                "employment_type": "daily",
                "area": "Waluj",
                "budget_min": 700.0,
                "budget_max": 900.0
            },
            headers=headers
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]
        assert job_res.json()["status"] == JobStatus.OPEN.value

        # 1. Valid transition: OPEN -> IN_PROGRESS
        res_prog = await ac.patch(
            f"/api/v1/jobs/{job_id}/status",
            json={"status": JobStatus.IN_PROGRESS.value},
            headers=headers
        )
        assert res_prog.status_code == 200
        assert res_prog.json()["status"] == JobStatus.IN_PROGRESS.value

        # 2. Valid transition: IN_PROGRESS -> COMPLETED
        res_comp = await ac.patch(
            f"/api/v1/jobs/{job_id}/status",
            json={"status": JobStatus.COMPLETED.value},
            headers=headers
        )
        assert res_comp.status_code == 200
        assert res_comp.json()["status"] == JobStatus.COMPLETED.value

        # 3. Invalid transition: COMPLETED -> OPEN (Reopening completed job must fail)
        res_reopen = await ac.patch(
            f"/api/v1/jobs/{job_id}/status",
            json={"status": JobStatus.OPEN.value},
            headers=headers
        )
        assert res_reopen.status_code == 400
        assert "terminal status" in res_reopen.json()["error"]["message"].lower()

        # 4. Invalid transition: COMPLETED -> CANCELLED
        res_cancel_comp = await ac.patch(
            f"/api/v1/jobs/{job_id}/status",
            json={"status": JobStatus.CANCELLED.value},
            headers=headers
        )
        assert res_cancel_comp.status_code == 400

        # Create second Job to test CANCELLED terminal state
        job2_res = await ac.post(
            "/api/v1/jobs",
            json={
                "title": "Painting Exterior Wall",
                "description": "Paint wall at Garkheda",
                "employment_type": "daily",
                "area": "Garkheda",
                "budget_min": 500.0,
                "budget_max": 600.0
            },
            headers=headers
        )
        job2_id = job2_res.json()["id"]

        # Valid transition: OPEN -> CANCELLED
        res_cancel = await ac.patch(
            f"/api/v1/jobs/{job2_id}/status",
            json={"status": JobStatus.CANCELLED.value},
            headers=headers
        )
        assert res_cancel.status_code == 200

        # Invalid transition: CANCELLED -> IN_PROGRESS
        res_reopen_cancel = await ac.patch(
            f"/api/v1/jobs/{job2_id}/status",
            json={"status": JobStatus.IN_PROGRESS.value},
            headers=headers
        )
        assert res_reopen_cancel.status_code == 400
        assert "terminal status" in res_reopen_cancel.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_remediation_ks5_003_application_status_fsm_and_ownership():
    """Verify AUDIT-KS5-003:
    - Employer cannot accept withdrawn or rejected applications.
    - Worker cannot withdraw an already accepted application.
    - Unauthorized employers cannot alter application status (IDOR).
    - Return consistent HTTP 400 for illegal status transitions.
    """
    employer_a_user = uuid.uuid4()
    employer_b_user = uuid.uuid4()
    worker_1_user = uuid.uuid4()
    worker_2_user = uuid.uuid4()
    worker_3_user = uuid.uuid4()

    token_emp_a = token_manager.create_access_token(employer_a_user, [UserRoleType.EMPLOYER.value])
    token_emp_b = token_manager.create_access_token(employer_b_user, [UserRoleType.EMPLOYER.value])
    token_w1 = token_manager.create_access_token(worker_1_user, [UserRoleType.WORKER.value], extra_claims={"phone": "+919822111111"})
    token_w2 = token_manager.create_access_token(worker_2_user, [UserRoleType.WORKER.value], extra_claims={"phone": "+919822222222"})
    token_w3 = token_manager.create_access_token(worker_3_user, [UserRoleType.WORKER.value], extra_claims={"phone": "+919822333333"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_emp_a = {"Authorization": f"Bearer {token_emp_a}"}
        headers_emp_b = {"Authorization": f"Bearer {token_emp_b}"}
        headers_w1 = {"Authorization": f"Bearer {token_w1}"}
        headers_w2 = {"Authorization": f"Bearer {token_w2}"}
        headers_w3 = {"Authorization": f"Bearer {token_w3}"}

        # Setup profiles
        await ac.post("/api/v1/employers/profile", json={"employer_type": "individual", "default_area": "Cidco"}, headers=headers_emp_a)
        await ac.post("/api/v1/employers/profile", json={"employer_type": "individual", "default_area": "Waluj"}, headers=headers_emp_b)
        await ac.post("/api/v1/workers/profile", json={"primary_area": "Cidco", "hourly_rate": 150.0}, headers=headers_w1)
        await ac.post("/api/v1/workers/profile", json={"primary_area": "Cidco", "hourly_rate": 160.0}, headers=headers_w2)
        await ac.post("/api/v1/workers/profile", json={"primary_area": "Cidco", "hourly_rate": 170.0}, headers=headers_w3)

        # Employer A creates a job
        job_res = await ac.post(
            "/api/v1/jobs",
            json={"title": "Electrical Rewiring", "description": "Rewiring 2 rooms", "area": "Cidco", "budget_min": 500.0, "budget_max": 800.0},
            headers=headers_emp_a
        )
        job_id = job_res.json()["id"]

        # Worker 1 applies and withdraws
        app1_res = await ac.post(f"/api/v1/jobs/{job_id}/applications", json={"proposed_wage": 600.0}, headers=headers_w1)
        app1_id = app1_res.json()["id"]
        res_withdrawn = await ac.patch(f"/api/v1/applications/{app1_id}/status", json={"status": ApplicationStatus.WITHDRAWN.value}, headers=headers_w1)
        assert res_withdrawn.status_code == 200

        # 1. Employer A attempts to ACCEPT a WITHDRAWN application -> MUST FAIL WITH HTTP 400
        res_illegal_accept = await ac.patch(
            f"/api/v1/applications/{app1_id}/status",
            json={"status": ApplicationStatus.ACCEPTED.value},
            headers=headers_emp_a
        )
        assert res_illegal_accept.status_code == 400
        assert "terminal status 'withdrawn'" in res_illegal_accept.json()["error"]["message"].lower()

        # Worker 2 applies, Employer A rejects Worker 2
        app2_res = await ac.post(f"/api/v1/jobs/{job_id}/applications", json={"proposed_wage": 700.0}, headers=headers_w2)
        app2_id = app2_res.json()["id"]
        res_reject = await ac.patch(f"/api/v1/applications/{app2_id}/status", json={"status": ApplicationStatus.REJECTED.value}, headers=headers_emp_a)
        assert res_reject.status_code == 200

        # 2. Employer A attempts to SHORTLIST a REJECTED application -> MUST FAIL WITH HTTP 400
        res_illegal_shortlist = await ac.patch(
            f"/api/v1/applications/{app2_id}/status",
            json={"status": ApplicationStatus.SHORTLISTED.value},
            headers=headers_emp_a
        )
        assert res_illegal_shortlist.status_code == 400
        assert "terminal status 'rejected'" in res_illegal_shortlist.json()["error"]["message"].lower()

        # Worker 3 applies, Employer A accepts Worker 3
        app3_res = await ac.post(f"/api/v1/jobs/{job_id}/applications", json={"proposed_wage": 750.0}, headers=headers_w3)
        app3_id = app3_res.json()["id"]
        res_accept = await ac.patch(f"/api/v1/applications/{app3_id}/status", json={"status": ApplicationStatus.ACCEPTED.value}, headers=headers_emp_a)
        assert res_accept.status_code == 200

        # 3. Worker 3 attempts to withdraw after acceptance -> MUST FAIL WITH HTTP 400
        res_illegal_withdraw = await ac.patch(
            f"/api/v1/applications/{app3_id}/status",
            json={"status": ApplicationStatus.WITHDRAWN.value},
            headers=headers_w3
        )
        assert res_illegal_withdraw.status_code == 400
        assert "already been accepted" in res_illegal_withdraw.json()["error"]["message"].lower()

        # 4. Cross-Employer IDOR check: Employer B attempts to change status of Employer A's job application -> HTTP 403
        res_idor = await ac.patch(
            f"/api/v1/applications/{app3_id}/status",
            json={"status": ApplicationStatus.REJECTED.value},
            headers=headers_emp_b
        )
        assert res_idor.status_code == 403
        assert "forbidden" in res_idor.json()["error"]["message"].lower()
