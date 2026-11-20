"""Test Suite for KaamSetu Stage 2 Step 6.1 — Core Bookings & Wage Agreements

Verifies:
- 10-state Booking FSM transition matrix & terminal-state immutability
- 7-state Wage Agreement lifecycle with integer Paise standard (BIGINT)
- Versioned wage agreement amendments with counterparty acceptance
- Ownership validation and anti-IDOR security guards
- Linked daily bookings for multi-day project parent contracts
- Conditional ₹150 (15,000 Paise) mobilization compensation calculation
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.common import BookingStatus, WageAgreementStatus, AgreementType, UserRoleType
from app.modules.auth.otp_service import otp_service
from app.modules.auth.tokens import token_manager
from app.modules.auth.router import _staging_users_db
from app.integrations.sms.factory import get_sms_provider
from app.modules.workers.service import worker_service
from app.modules.employers.service import employer_service
from app.modules.jobs.service import job_service
from app.modules.applications.service import application_service
from app.modules.bookings.service import booking_service


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
    booking_service.clear()
    provider = get_sms_provider()
    if hasattr(provider, "clear"):
        provider.clear()
    yield


async def _create_user_and_auth(ac: AsyncClient, phone: str, role_intent: str) -> tuple[uuid.UUID, str]:
    """Helper to register and authenticate a user via OTP flow."""
    await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
    provider = get_sms_provider()
    otp = provider.get_latest_otp_for_phone(phone)
    verify_res = await ac.post(
        "/api/v1/auth/otp/verify",
        json={"phone": phone, "otp": otp, "role_intent": role_intent}
    )
    assert verify_res.status_code == 200, f"Auth failed for {phone}: {verify_res.text}"
    data = verify_res.json()
    user_id_val = data.get("user_id") or (data.get("user") or {}).get("id")
    return uuid.UUID(str(user_id_val)), data["access_token"]


@pytest.mark.asyncio
async def test_booking_creation_from_application_in_paise():
    """Verify:
    1. Employer creates job, worker applies, employer accepts application.
    2. Employer creates booking referencing application_id with integer Paise.
    3. Status initializes to REQUESTED; wage agreement initializes to DRAFT in Paise.
    4. 5% platform commission computed in integer Paise.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register employer
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110001", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        emp_prof_res = await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual",
            "company_name": "Sharma Household",
            "default_area": "Cidco"
        }, headers=emp_hdr)
        assert emp_prof_res.status_code == 201

        # Register worker
        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110002", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wrk_prof_res = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Cidco",
            "experience_years": 5,
            "hourly_rate": 150.00,
            "visiting_charge": 50.00,
            "min_charge": 100.00,
            "bio": "Expert electrician"
        }, headers=wrk_hdr)
        assert wrk_prof_res.status_code == 201
        worker_id = wrk_prof_res.json()["id"]

        # Employer posts job
        job_res = await ac.post("/api/v1/jobs", json={
            "title": "House Rewiring",
            "description": "Wiring repair for 2BHK flat",
            "area": "Cidco",
            "address": "Plot 12, N-2 Cidco",
            "employment_type": "daily",
            "budget_min": 700.00,
            "budget_max": 900.00,
            "required_skill_ids": []
        }, headers=emp_hdr)
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # Worker applies
        app_res = await ac.post(f"/api/v1/jobs/{job_id}/applications", json={
            "proposed_wage": 800.00,
            "cover_note": "Ready to start tomorrow"
        }, headers=wrk_hdr)
        assert app_res.status_code == 201, f"App submit failed: {app_res.text}"
        app_id = app_res.json()["id"]

        # Employer accepts application
        accept_res = await ac.patch(f"/api/v1/applications/{app_id}/status", json={
            "status": "accepted"
        }, headers=emp_hdr)
        assert accept_res.status_code == 200

        # Employer creates booking
        sched_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        bkg_res = await ac.post("/api/v1/bookings/", json={
            "application_id": app_id,
            "service_address": "Plot 12, N-2 Cidco, Chhatrapati Sambhajinagar",
            "area": "Cidco",
            "scheduled_at": sched_time,
            "agreement_type": "daily",
            "agreed_wage_paise": 80000,       # ₹800.00
            "advance_amount_paise": 15000     # ₹150.00 advance
        }, headers=emp_hdr)
        assert bkg_res.status_code == 201
        bdata = bkg_res.json()

        assert bdata["status"] == "requested"
        assert bdata["booking_code"].startswith("BK-")
        assert bdata["primary_worker_id"] == worker_id

        # Verify wage agreement in Paise
        wage = bdata["wage_agreement"]
        assert wage is not None
        assert wage["agreed_wage_paise"] == 80000
        assert wage["agreed_wage_inr"] == 800.0
        assert wage["advance_amount_paise"] == 15000
        assert wage["advance_amount_inr"] == 150.0
        assert wage["platform_commission_paise"] == 4000  # 5% of 80,000 = 4,000 Paise
        assert wage["platform_commission_inr"] == 40.0
        assert wage["status"] == "draft"
        assert wage["current_version"] == 1
        assert len(wage["versions"]) == 1
        assert wage["versions"][0]["proposed_wage_paise"] == 80000


@pytest.mark.asyncio
async def test_worker_acceptance_and_active_agreement():
    """Verify:
    1. Assigned worker accepts booking -> transitions to CONFIRMED.
    2. Wage agreement transitions to ACTIVE.
    3. Unauthorized worker cannot accept foreign booking (HTTP 403).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110011", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Patil House", "default_area": "Waluj"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110012", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Waluj", "experience_years": 3, "hourly_rate": 100.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Plumber"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        # Create direct booking
        sched = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        bres = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id,
            "service_address": "Sector 4, MIDC Waluj",
            "area": "Waluj",
            "scheduled_at": sched,
            "agreement_type": "daily",
            "agreed_wage_paise": 60000
        }, headers=emp_hdr)
        assert bres.status_code == 201
        booking_id = bres.json()["id"]

        # Third-party worker tries to accept
        intruder_uid, intruder_token = await _create_user_and_auth(ac, "+919822110099", "worker")
        intruder_hdr = {"Authorization": f"Bearer {intruder_token}"}
        await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Waluj", "experience_years": 1, "hourly_rate": 50.0,
            "visiting_charge": 20.0, "min_charge": 20.0, "bio": "Helper"
        }, headers=intruder_hdr)

        intruder_res = await ac.post(f"/api/v1/bookings/{booking_id}/accept", headers=intruder_hdr)
        assert intruder_res.status_code == 403

        # Assigned worker accepts
        accept_res = await ac.post(f"/api/v1/bookings/{booking_id}/accept", headers=wrk_hdr)
        assert accept_res.status_code == 200
        bdata = accept_res.json()
        assert bdata["status"] == "confirmed"
        assert bdata["wage_agreement"]["status"] == "active"


@pytest.mark.asyncio
async def test_booking_ten_state_fsm_exhaustive():
    """Verify:
    1. Exhaustive 10-state progression:
       REQUESTED -> CONFIRMED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED.
    2. Checkpoint timestamps populated.
    3. Wage agreement transitions to SETTLED upon completion.
    4. Illegal jump (e.g. COMPLETED -> CONFIRMED) returns HTTP 422.
    5. Terminal status COMPLETED rejects all subsequent mutations.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110021", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Joshi Villa", "default_area": "Garkheda"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110022", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Garkheda", "experience_years": 4, "hourly_rate": 120.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Carpenter"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        sched = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
        bres = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id,
            "service_address": "Garkheda Parisar, Sambhajinagar",
            "area": "Garkheda",
            "scheduled_at": sched,
            "agreed_wage_paise": 75000
        }, headers=emp_hdr)
        booking_id = bres.json()["id"]

        # 1. Illegal transition: cannot go directly from REQUESTED to IN_PROGRESS
        bad_jump = await ac.post(f"/api/v1/bookings/{booking_id}/status", json={
            "target_status": "in_progress"
        }, headers=emp_hdr)
        assert bad_jump.status_code == 422

        # 2. Worker accepts -> CONFIRMED
        await ac.post(f"/api/v1/bookings/{booking_id}/accept", headers=wrk_hdr)

        # 3. Worker sets EN_ROUTE
        r_enroute = await ac.post(f"/api/v1/bookings/{booking_id}/status", json={
            "target_status": "en_route"
        }, headers=wrk_hdr)
        assert r_enroute.status_code == 200
        assert r_enroute.json()["en_route_at"] is not None

        # 4. Worker sets ARRIVED
        r_arrived = await ac.post(f"/api/v1/bookings/{booking_id}/status", json={
            "target_status": "arrived"
        }, headers=wrk_hdr)
        assert r_arrived.status_code == 200
        assert r_arrived.json()["arrived_at"] is not None

        # 5. Employer starts job -> IN_PROGRESS
        r_prog = await ac.post(f"/api/v1/bookings/{booking_id}/status", json={
            "target_status": "in_progress"
        }, headers=emp_hdr)
        assert r_prog.status_code == 200
        assert r_prog.json()["started_at"] is not None

        # 6. Employer completes job -> COMPLETED
        r_comp = await ac.post(f"/api/v1/bookings/{booking_id}/status", json={
            "target_status": "completed"
        }, headers=emp_hdr)
        assert r_comp.status_code == 200
        cdata = r_comp.json()
        assert cdata["status"] == "completed"
        assert cdata["completed_at"] is not None
        assert cdata["wage_agreement"]["status"] == "settled"

        # 7. Terminal check: cannot alter completed booking
        alter_res = await ac.post(f"/api/v1/bookings/{booking_id}/status", json={
            "target_status": "confirmed"
        }, headers=emp_hdr)
        assert alter_res.status_code == 422


@pytest.mark.asyncio
async def test_no_show_and_employer_no_show_transitions():
    """Verify:
    1. Worker no-show: CONFIRMED -> NO_SHOW (reported by employer).
    2. Employer no-show: ARRIVED -> EMPLOYER_NO_SHOW (reported by worker).
    3. Both reach terminal state.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110031", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Test Emp", "default_area": "Cidco"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110032", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Cidco", "experience_years": 2, "hourly_rate": 100.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Mason"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        # Case 1: Worker No-Show
        sched = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        b1 = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id, "service_address": "Site 1", "area": "Cidco",
            "scheduled_at": sched, "agreed_wage_paise": 60000
        }, headers=emp_hdr)
        b1_id = b1.json()["id"]
        await ac.post(f"/api/v1/bookings/{b1_id}/accept", headers=wrk_hdr)

        ns_res = await ac.post(f"/api/v1/bookings/{b1_id}/status", json={
            "target_status": "no_show"
        }, headers=emp_hdr)
        assert ns_res.status_code == 200
        assert ns_res.json()["status"] == "no_show"

        # Case 2: Employer No-Show
        b2 = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id, "service_address": "Site 2", "area": "Cidco",
            "scheduled_at": sched, "agreed_wage_paise": 60000
        }, headers=emp_hdr)
        b2_id = b2.json()["id"]
        await ac.post(f"/api/v1/bookings/{b2_id}/accept", headers=wrk_hdr)
        await ac.post(f"/api/v1/bookings/{b2_id}/status", json={"target_status": "en_route"}, headers=wrk_hdr)
        await ac.post(f"/api/v1/bookings/{b2_id}/status", json={"target_status": "arrived"}, headers=wrk_hdr)

        ens_res = await ac.post(f"/api/v1/bookings/{b2_id}/status", json={
            "target_status": "employer_no_show"
        }, headers=wrk_hdr)
        assert ens_res.status_code == 200
        assert ens_res.json()["status"] == "employer_no_show"


@pytest.mark.asyncio
async def test_dispute_transition_and_resolution():
    """Verify:
    1. IN_PROGRESS -> DISPUTED freezes wage agreement (DISPUTED_HOLD).
    2. DISPUTED -> COMPLETED resolves grievance and settles agreement.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110041", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Commercial Site", "default_area": "Waluj"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110042", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Waluj", "experience_years": 8, "hourly_rate": 200.0,
            "visiting_charge": 100.0, "min_charge": 100.0, "bio": "Master Electrician"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        sched = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        bres = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id, "service_address": "Waluj MIDC Sector C", "area": "Waluj",
            "scheduled_at": sched, "agreed_wage_paise": 150000
        }, headers=emp_hdr)
        b_id = bres.json()["id"]

        # Advance to IN_PROGRESS
        await ac.post(f"/api/v1/bookings/{b_id}/accept", headers=wrk_hdr)
        await ac.post(f"/api/v1/bookings/{b_id}/status", json={"target_status": "en_route"}, headers=wrk_hdr)
        await ac.post(f"/api/v1/bookings/{b_id}/status", json={"target_status": "arrived"}, headers=wrk_hdr)
        await ac.post(f"/api/v1/bookings/{b_id}/status", json={"target_status": "in_progress"}, headers=emp_hdr)

        # Raise dispute
        disp_res = await ac.post(f"/api/v1/bookings/{b_id}/status", json={
            "target_status": "disputed"
        }, headers=emp_hdr)
        assert disp_res.status_code == 200
        assert disp_res.json()["status"] == "disputed"
        assert disp_res.json()["wage_agreement"]["status"] == "disputed_hold"

        # Resolve dispute to COMPLETED
        res_res = await ac.post(f"/api/v1/bookings/{b_id}/status", json={
            "target_status": "completed"
        }, headers=emp_hdr)
        assert res_res.status_code == 200
        assert res_res.json()["status"] == "completed"
        assert res_res.json()["wage_agreement"]["status"] == "settled"


@pytest.mark.asyncio
async def test_booking_idor_security_guards():
    """Verify anti-IDOR security:
    Unauthorized third-party user cannot view, accept, or cancel foreign bookings.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110051", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Private House", "default_area": "Cidco"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110052", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Cidco", "experience_years": 2, "hourly_rate": 100.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Painter"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        sched = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        bres = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id, "service_address": "Confidential Road", "area": "Cidco",
            "scheduled_at": sched, "agreed_wage_paise": 50000
        }, headers=emp_hdr)
        b_id = bres.json()["id"]

        # Attacker user registers
        att_uid, att_token = await _create_user_and_auth(ac, "+919822110059", "employer")
        att_hdr = {"Authorization": f"Bearer {att_token}"}

        # Attacker attempts GET
        get_res = await ac.get(f"/api/v1/bookings/{b_id}", headers=att_hdr)
        assert get_res.status_code == 403

        # Attacker attempts CANCEL
        cancel_res = await ac.post(f"/api/v1/bookings/{b_id}/cancel", json={
            "reason": "Malicious attempt to cancel"
        }, headers=att_hdr)
        assert cancel_res.status_code == 403


@pytest.mark.asyncio
async def test_cancellation_mobilization_compensation_policy():
    """Verify conditional mobilization policy (POL-002, AUD-KS6-011):
    1. Employer cancels post-dispatch (EN_ROUTE) -> flags ₹150 (15,000 Paise) mobilization fee.
    2. Worker cancels before dispatch -> zero mobilization compensation.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110061", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Kulkarni Home", "default_area": "Beed Bypass"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110062", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Beed Bypass", "experience_years": 3, "hourly_rate": 100.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Welder"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        sched = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
        bres = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id, "service_address": "Beed Bypass Road", "area": "Beed Bypass",
            "scheduled_at": sched, "agreed_wage_paise": 60000, "advance_amount_paise": 15000
        }, headers=emp_hdr)
        b_id = bres.json()["id"]

        await ac.post(f"/api/v1/bookings/{b_id}/accept", headers=wrk_hdr)
        await ac.post(f"/api/v1/bookings/{b_id}/status", json={"target_status": "en_route"}, headers=wrk_hdr)

        # Employer cancels post-dispatch
        c_res = await ac.post(f"/api/v1/bookings/{b_id}/cancel", json={
            "reason": "Emergency changed site schedule"
        }, headers=emp_hdr)
        assert c_res.status_code == 200
        cdata = c_res.json()
        assert cdata["status"] == "cancelled"
        # 15,000 Paise (₹150.00) mobilization fee flagged
        assert cdata["mobilization_compensation_due_paise"] == 15000
        assert cdata["mobilization_compensation_due_inr"] == 150.0

        # Case 2: Worker cancels before dispatch -> zero mobilization compensation (AUD-KS61-007)
        sched2 = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        b2_res = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id, "service_address": "Beed Bypass Road Site 2", "area": "Beed Bypass",
            "scheduled_at": sched2, "agreed_wage_paise": 60000, "advance_amount_paise": 10000
        }, headers=emp_hdr)
        assert b2_res.status_code == 201
        b2_id = b2_res.json()["id"]

        await ac.post(f"/api/v1/bookings/{b2_id}/accept", headers=wrk_hdr)
        c2_res = await ac.post(f"/api/v1/bookings/{b2_id}/cancel", json={
            "reason": "Personal medical emergency"
        }, headers=wrk_hdr)
        assert c2_res.status_code == 200
        c2data = c2_res.json()
        assert c2data["status"] == "cancelled"
        assert c2data["mobilization_compensation_due_paise"] == 0
        assert c2data["mobilization_compensation_due_inr"] == 0.0


@pytest.mark.asyncio
async def test_wage_agreement_versioned_amendment_negotiation():
    """Verify versioned wage agreement amendments:
    1. Agreement active at 80,000 Paise (Version 1).
    2. Worker proposes revision to 100,000 Paise -> Version 2 PENDING, status REVISION_PENDING.
    3. Self-acceptance rejected (HTTP 422).
    4. Employer declines -> status returns to ACTIVE, wage remains 80,000 Paise, Version 2 REJECTED.
    5. Worker proposes Version 3 (110,000 Paise).
    6. Employer accepts -> wage updates to 110,000 Paise, current_version=3, status ACTIVE.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110071", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Chavan Site", "default_area": "Cidco"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110072", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Cidco", "experience_years": 6, "hourly_rate": 150.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Carpenter"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        sched = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        bres = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id, "service_address": "N-4 Cidco", "area": "Cidco",
            "scheduled_at": sched, "agreed_wage_paise": 80000
        }, headers=emp_hdr)
        b_id = bres.json()["id"]
        await ac.post(f"/api/v1/bookings/{b_id}/accept", headers=wrk_hdr)

        # 1. Worker proposes Version 2 revision
        rev1 = await ac.post(f"/api/v1/bookings/{b_id}/wage-agreement/revision", json={
            "proposed_wage_paise": 100000,
            "scope_change_description": "Additional door frame carpentry required"
        }, headers=wrk_hdr)
        assert rev1.status_code == 201
        r1_data = rev1.json()
        assert r1_data["status"] == "revision_pending"
        assert len(r1_data["versions"]) == 2
        assert r1_data["versions"][1]["status"] == "pending"

        # 2. Worker attempts self-acceptance -> HTTP 422
        self_acc = await ac.post(f"/api/v1/bookings/{b_id}/wage-agreement/revision/2/respond", json={
            "accept": True
        }, headers=wrk_hdr)
        assert self_acc.status_code == 422

        # 3. Employer declines Version 2
        dec_res = await ac.post(f"/api/v1/bookings/{b_id}/wage-agreement/revision/2/respond", json={
            "accept": False
        }, headers=emp_hdr)
        assert dec_res.status_code == 200
        d_data = dec_res.json()
        assert d_data["status"] == "active"
        assert d_data["agreed_wage_paise"] == 80000  # Unchanged
        assert d_data["current_version"] == 1
        assert d_data["versions"][1]["status"] == "rejected"

        # 4. Worker proposes Version 3
        rev2 = await ac.post(f"/api/v1/bookings/{b_id}/wage-agreement/revision", json={
            "proposed_wage_paise": 110000,
            "scope_change_description": "Agreed overtime + 2 window frames"
        }, headers=wrk_hdr)
        assert rev2.status_code == 201

        # 5. Employer accepts Version 3
        acc_res = await ac.post(f"/api/v1/bookings/{b_id}/wage-agreement/revision/3/respond", json={
            "accept": True
        }, headers=emp_hdr)
        assert acc_res.status_code == 200, f"Employer accept failed: {acc_res.text}"
        a_data = acc_res.json()
        assert a_data["status"] == "active"
        assert a_data["agreed_wage_paise"] == 110000  # Updated
        assert a_data["current_version"] == 3
        assert a_data["versions"][2]["status"] == "accepted"


@pytest.mark.asyncio
async def test_multi_day_parent_contract_child_linkage():
    """Verify linked single-day dispatches for multi-day parent contracts (AUD-KS6-013):
    1. Employer creates parent project booking contract.
    2. Employer creates Day 2 child booking referencing parent_contract_id.
    3. Child links to parent cleanly.
    4. Mismatched counterparty in child creation returns HTTP 400.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        emp_uid, emp_token = await _create_user_and_auth(ac, "+919822110081", "employer")
        emp_hdr = {"Authorization": f"Bearer {emp_token}"}
        await ac.post("/api/v1/employers/profile", json={
            "employer_type": "individual", "company_name": "Deshmukh Construction", "default_area": "Cidco"
        }, headers=emp_hdr)

        wrk_uid, wrk_token = await _create_user_and_auth(ac, "+919822110082", "worker")
        wrk_hdr = {"Authorization": f"Bearer {wrk_token}"}
        wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Cidco", "experience_years": 10, "hourly_rate": 180.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Senior Mason"
        }, headers=wrk_hdr)
        worker_id = wres.json()["id"]

        # Day 1: Parent contract booking
        sched1 = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        parent_res = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id,
            "service_address": "Plot 55, Sector N-1, Cidco",
            "area": "Cidco",
            "scheduled_at": sched1,
            "agreed_wage_paise": 90000
        }, headers=emp_hdr)
        assert parent_res.status_code == 201
        parent_id = parent_res.json()["id"]

        # Day 2: Child dispatch booking linked to parent
        sched2 = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        child_res = await ac.post("/api/v1/bookings/", json={
            "worker_id": worker_id,
            "parent_contract_id": parent_id,
            "service_address": "Plot 55, Sector N-1, Cidco",
            "area": "Cidco",
            "scheduled_at": sched2,
            "agreed_wage_paise": 90000
        }, headers=emp_hdr)
        assert child_res.status_code == 201
        cdata = child_res.json()
        assert cdata["parent_contract_id"] == parent_id
        assert cdata["primary_worker_id"] == worker_id

        # Case 4: Mismatched counterparty in child creation returns HTTP 400 (AUD-KS61-007)
        wrk_other_uid, wrk_other_token = await _create_user_and_auth(ac, "+919822110089", "worker")
        wrk_other_hdr = {"Authorization": f"Bearer {wrk_other_token}"}
        other_wres = await ac.post("/api/v1/workers/profile", json={
            "primary_area": "Cidco", "experience_years": 2, "hourly_rate": 100.0,
            "visiting_charge": 50.0, "min_charge": 50.0, "bio": "Helper"
        }, headers=wrk_other_hdr)
        mismatched_worker_id = other_wres.json()["id"]

        sched3 = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        bad_child_res = await ac.post("/api/v1/bookings/", json={
            "worker_id": mismatched_worker_id,
            "parent_contract_id": parent_id,
            "service_address": "Plot 55, Sector N-1, Cidco",
            "area": "Cidco",
            "scheduled_at": sched3,
            "agreed_wage_paise": 90000
        }, headers=emp_hdr)
        assert bad_child_res.status_code == 400
        assert "mismatch" in bad_child_res.text.lower()
