"""Comprehensive Integration & Security Test Suite for Business Domain Modules (Stage 2, Step 5)

Tests:
5A: Worker Profiles (Lifecycle, Trade Skills, Availability, Duty Status, Public Directory Privacy)
5B: Employer Profiles (Individual & Business Profiles, Location CRUD, IDOR Protection)
5C: Taxonomy (English & Marathi Localization, Operational Pilot Filtering, Skills Directory)
5D: Job Postings (Employer Creation, Public Discovery, RBAC Constraints, IDOR Protection)
5E: Job Applications (Worker Application, Duplicate Submission Prevention, Employer Review, Status Lifecycle, Cross-Role Access Guards)
"""

import uuid
import pytest
from decimal import Decimal
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.common import UserRoleType, DutyStatus, JobStatus, ApplicationStatus
from app.modules.auth.tokens import token_manager
from app.modules.taxonomy.service import taxonomy_service
from app.modules.workers.service import worker_service
from app.modules.employers.service import employer_service
from app.modules.jobs.service import job_service
from app.modules.applications.service import application_service


@pytest.fixture(autouse=True)
def clean_domain_state():
    """Resets in-memory business domain state before each test."""
    worker_service.clear()
    employer_service.clear()
    job_service.clear()
    application_service.clear()
    token_manager.clear()
    yield


@pytest.mark.asyncio
async def test_5c_taxonomy_categories_and_skills():
    """Verify localized category listings and skills directory for Sambhajinagar pilot."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. English categories
        res_en = await ac.get("/api/v1/categories?lang=en")
        assert res_en.status_code == 200
        cats_en = res_en.json()
        assert len(cats_en) >= 3
        slugs_en = [c["slug"] for c in cats_en]
        assert "construction" in slugs_en
        assert "skilled_services" in slugs_en
        assert "agriculture" in slugs_en

        # 2. Marathi categories (primary pilot language)
        res_mr = await ac.get("/api/v1/categories?lang=mr")
        assert res_mr.status_code == 200
        cats_mr = res_mr.json()
        names_mr = [c["name"] for c in cats_mr]
        assert "बांधकाम आणि सिव्हिल कामे" in names_mr
        assert "कुशल घरगुती सेवा" in names_mr
        assert "कृषी आणि शेती कामे" in names_mr

        # 3. Operational filter check
        res_op = await ac.get("/api/v1/categories?only_operational=true")
        assert res_op.status_code == 200
        for cat in res_op.json():
            assert cat["is_operational"] is True

        # 4. Fetch skills under construction in Marathi
        res_skills = await ac.get("/api/v1/categories/construction/skills?lang=mr")
        assert res_skills.status_code == 200
        skills = res_skills.json()
        assert len(skills) >= 4
        skill_names = [s["name"] for s in skills]
        assert "गवंडी (मेसन)" in skill_names

        # 5. Non-existent category returns 404
        res_404 = await ac.get("/api/v1/categories/nonexistent-xyz/skills")
        assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_5a_worker_profile_lifecycle_and_privacy():
    """Verify worker profile lifecycle, skill endorsements, and privacy protections:
    - Never expose raw phone numbers in public directories
    - Never expose precise GPS coordinates publicly
    - Provide contact relay tokens
    """
    worker_user_id = uuid.uuid4()
    worker_phone = "+919822100001"
    worker_token = token_manager.create_access_token(
        worker_user_id,
        [UserRoleType.WORKER.value],
        extra_claims={"phone": worker_phone}
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {worker_token}"}

        # 1. Create worker profile in Sambhajinagar (Cidco)
        create_payload = {
            "primary_area": "Cidco",
            "experience_years": 7,
            "hourly_rate": 180.0,
            "visiting_charge": 100.0,
            "min_charge": 300.0,
            "bio": "Expert tile mason and plastering specialist in Cidco."
        }
        res_create = await ac.post("/api/v1/workers/profile", json=create_payload, headers=headers)
        assert res_create.status_code == 201
        data = res_create.json()
        worker_id = data["id"]
        assert data["primary_area"] == "Cidco"
        assert data["experience_years"] == 7
        assert "phone_masked" in data
        assert "******" in data["phone_masked"]

        # 2. Get own private profile
        res_me = await ac.get("/api/v1/workers/profile/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["id"] == worker_id

        # 3. Add skill endorsement
        skills = taxonomy_service.list_all_skills()
        target_skill = skills[0]
        skill_payload = {
            "skill_id": str(target_skill.id),
            "experience_years": 7,
            "is_primary": True
        }
        res_skill = await ac.post("/api/v1/workers/profile/me/skills", json=skill_payload, headers=headers)
        assert res_skill.status_code == 200
        assert len(res_skill.json()["skills"]) == 1

        # 4. Update availability schedule
        avail_payload = [
            {"day_of_week": 0, "start_time": "09:00", "end_time": "18:00", "is_available": True},
            {"day_of_week": 1, "start_time": "09:00", "end_time": "18:00", "is_available": True},
            {"day_of_week": 2, "start_time": "09:00", "end_time": "18:00", "is_available": True},
            {"day_of_week": 3, "start_time": "09:00", "end_time": "18:00", "is_available": True},
            {"day_of_week": 4, "start_time": "09:00", "end_time": "18:00", "is_available": True},
            {"day_of_week": 5, "start_time": "09:00", "end_time": "18:00", "is_available": True},
            {"day_of_week": 6, "start_time": "10:00", "end_time": "14:00", "is_available": False}
        ]
        res_avail = await ac.put("/api/v1/workers/profile/me/availability", json=avail_payload, headers=headers)
        assert res_avail.status_code == 200

        # 5. Toggle duty status
        res_duty = await ac.patch(
            "/api/v1/workers/profile/me/duty",
            json={"duty_status": DutyStatus.BUSY.value},
            headers=headers
        )
        assert res_duty.status_code == 200
        assert res_duty.json()["duty_status"] == DutyStatus.BUSY.value

        # Switch back to online for public discovery
        await ac.patch(
            "/api/v1/workers/profile/me/duty",
            json={"duty_status": DutyStatus.ONLINE.value},
            headers=headers
        )

        # 6. Public Directory Search & PRIVACY CHECKS
        res_search = await ac.get("/api/v1/workers?area=Cidco")
        assert res_search.status_code == 200
        results = res_search.json()
        assert len(results) == 1
        worker_card = results[0]

        # STRICT PRIVACY INVARIANTS:
        # Never expose raw phone number
        assert "phone" not in worker_card
        assert "phone_number" not in worker_card
        assert worker_phone not in str(worker_card)
        # Never expose raw GPS coordinates publicly
        assert "latitude" not in worker_card
        assert "longitude" not in worker_card
        # Must provide contact relay token
        assert "contact_relay_token" in worker_card
        assert worker_card["contact_relay_token"].startswith("relay-ks-")

        # 7. Public Profile Detail & PRIVACY CHECKS
        res_pub = await ac.get(f"/api/v1/workers/{worker_id}")
        assert res_pub.status_code == 200
        pub_detail = res_pub.json()
        assert "phone" not in pub_detail
        assert worker_phone not in str(pub_detail)
        assert pub_detail["contact_relay_token"].startswith("relay-ks-")


@pytest.mark.asyncio
async def test_5b_employer_profile_and_locations():
    """Verify employer profile creation, address location management, and IDOR protection."""
    employer_a_user_id = uuid.uuid4()
    employer_b_user_id = uuid.uuid4()

    token_a = token_manager.create_access_token(employer_a_user_id, [UserRoleType.EMPLOYER.value])
    token_b = token_manager.create_access_token(employer_b_user_id, [UserRoleType.EMPLOYER.value])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 1. Employer A creates profile
        res_create = await ac.post(
            "/api/v1/employers/profile",
            json={"employer_type": "business", "company_name": "Ajanta Constructions", "default_area": "Waluj"},
            headers=headers_a
        )
        assert res_create.status_code == 201
        data_a = res_create.json()
        assert data_a["company_name"] == "Ajanta Constructions"
        assert data_a["default_area"] == "Waluj"

        # 2. Employer A adds service location
        loc_payload = {
            "label": "Waluj MIDC Site 3",
            "area": "Waluj",
            "address_line": "Plot 12, Sector D, MIDC Industrial Area",
            "is_default": True
        }
        res_loc = await ac.post("/api/v1/employers/profile/me/locations", json=loc_payload, headers=headers_a)
        assert res_loc.status_code == 201
        loc_id = res_loc.json()["id"]

        # 3. List locations for Employer A
        res_list = await ac.get("/api/v1/employers/profile/me/locations", headers=headers_a)
        assert res_list.status_code == 200
        assert len(res_list.json()) == 1

        # 4. Employer B registers
        await ac.post(
            "/api/v1/employers/profile",
            json={"employer_type": "individual", "company_name": None, "default_area": "Garkheda"},
            headers=headers_b
        )

        # 5. IDOR ATTACK PREVENTION: Employer B attempts to delete Employer A's location
        res_idor = await ac.delete(f"/api/v1/employers/profile/me/locations/{loc_id}", headers=headers_b)
        assert res_idor.status_code == 403
        assert "Forbidden" in res_idor.json()["error"]["message"]

        # 6. Employer A successfully deletes own location
        res_del = await ac.delete(f"/api/v1/employers/profile/me/locations/{loc_id}", headers=headers_a)
        assert res_del.status_code == 200

        # Verify location list is now empty
        res_empty = await ac.get("/api/v1/employers/profile/me/locations", headers=headers_a)
        assert len(res_empty.json()) == 0


@pytest.mark.asyncio
async def test_5d_job_posting_lifecycle_and_rbac():
    """Verify job posting lifecycle, discovery, server-side RBAC, and IDOR protections."""
    employer_a_user = uuid.uuid4()
    employer_b_user = uuid.uuid4()
    worker_user = uuid.uuid4()

    token_emp_a = token_manager.create_access_token(employer_a_user, [UserRoleType.EMPLOYER.value])
    token_emp_b = token_manager.create_access_token(employer_b_user, [UserRoleType.EMPLOYER.value])
    token_worker = token_manager.create_access_token(worker_user, [UserRoleType.WORKER.value])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_a = {"Authorization": f"Bearer {token_emp_a}"}
        headers_b = {"Authorization": f"Bearer {token_emp_b}"}
        headers_worker = {"Authorization": f"Bearer {token_worker}"}

        # Setup Employer A and B profiles
        await ac.post("/api/v1/employers/profile", json={"employer_type": "business", "company_name": "Emp A", "default_area": "Cidco"}, headers=headers_a)
        await ac.post("/api/v1/employers/profile", json={"employer_type": "business", "company_name": "Emp B", "default_area": "Waluj"}, headers=headers_b)

        # 1. RBAC CHECK: Worker cannot create a job posting
        job_payload = {
            "title": "Need 2 Masons for Foundation Work",
            "description": "Foundational bricklaying at Shahnoorwadi site. Tools provided.",
            "employment_type": "daily",
            "area": "Shahnoorwadi",
            "budget_min": 700.0,
            "budget_max": 850.0,
            "urgency": "normal"
        }
        res_worker_forbidden = await ac.post("/api/v1/jobs", json=job_payload, headers=headers_worker)
        assert res_worker_forbidden.status_code == 403

        # 2. Unauthenticated user cannot create a job
        res_unauth = await ac.post("/api/v1/jobs", json=job_payload)
        assert res_unauth.status_code == 401

        # 3. Employer A creates a job posting
        res_create = await ac.post("/api/v1/jobs", json=job_payload, headers=headers_a)
        assert res_create.status_code == 201
        job_data = res_create.json()
        job_id = job_data["id"]
        assert job_data["status"] == JobStatus.OPEN.value
        assert job_data["applications_count"] == 0

        # 4. Public discovery of open jobs
        res_list = await ac.get("/api/v1/jobs?area=Shahnoorwadi")
        assert res_list.status_code == 200
        jobs = res_list.json()
        assert len(jobs) == 1
        assert jobs[0]["id"] == job_id

        # 5. IDOR ATTACK: Employer B attempts to update Employer A's job
        update_payload = {"title": "Hacked Title by Competitor"}
        res_idor = await ac.put(f"/api/v1/jobs/{job_id}", json=update_payload, headers=headers_b)
        assert res_idor.status_code == 403

        # 6. Employer A successfully updates the job
        res_update = await ac.put(f"/api/v1/jobs/{job_id}", json={"budget_max": 900.0}, headers=headers_a)
        assert res_update.status_code == 200
        assert Decimal(str(res_update.json()["budget_max"])) == Decimal("900.0")

        # 7. Employer A updates job status to in_progress
        res_status = await ac.patch(
            f"/api/v1/jobs/{job_id}/status",
            json={"status": JobStatus.IN_PROGRESS.value},
            headers=headers_a
        )
        assert res_status.status_code == 200
        assert res_status.json()["status"] == JobStatus.IN_PROGRESS.value


@pytest.mark.asyncio
async def test_5e_job_application_flow_and_duplicate_prevention():
    """Verify worker application submission, duplicate prevention (HTTP 409),
    employer candidate review, worker withdrawal, and status lifecycle.
    """
    employer_user = uuid.uuid4()
    worker_1_user = uuid.uuid4()
    worker_2_user = uuid.uuid4()

    token_emp = token_manager.create_access_token(employer_user, [UserRoleType.EMPLOYER.value])
    token_w1 = token_manager.create_access_token(
        worker_1_user,
        [UserRoleType.WORKER.value],
        extra_claims={"phone": "+919822100011"}
    )
    token_w2 = token_manager.create_access_token(
        worker_2_user,
        [UserRoleType.WORKER.value],
        extra_claims={"phone": "+919822100012"}
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_emp = {"Authorization": f"Bearer {token_emp}"}
        headers_w1 = {"Authorization": f"Bearer {token_w1}"}
        headers_w2 = {"Authorization": f"Bearer {token_w2}"}

        # 1. Setup profiles
        await ac.post("/api/v1/employers/profile", json={"employer_type": "individual", "default_area": "Garkheda"}, headers=headers_emp)
        await ac.post("/api/v1/workers/profile", json={"primary_area": "Garkheda", "experience_years": 4, "hourly_rate": 150.0}, headers=headers_w1)
        await ac.post("/api/v1/workers/profile", json={"primary_area": "Hudco", "experience_years": 6, "hourly_rate": 200.0}, headers=headers_w2)

        # 2. Employer creates open job
        job_res = await ac.post(
            "/api/v1/jobs",
            json={
                "title": "Tile Repair in Bathroom",
                "description": "Fix loose tiles in Garkheda residence",
                "employment_type": "hourly",
                "area": "Garkheda",
                "budget_min": 150.0,
                "budget_max": 200.0
            },
            headers=headers_emp
        )
        job_id = job_res.json()["id"]

        # 3. Worker 1 applies for the job
        app_payload = {
            "proposed_wage": 180.0,
            "cover_note": "Available tomorrow morning at 9am with tiling kit."
        }
        res_app1 = await ac.post(f"/api/v1/jobs/{job_id}/applications", json=app_payload, headers=headers_w1)
        assert res_app1.status_code == 201
        app1_data = res_app1.json()
        app1_id = app1_data["id"]
        assert app1_data["status"] == ApplicationStatus.SUBMITTED.value

        # 4. DUPLICATE APPLICATION PREVENTION:
        # Worker 1 attempts to apply a second time for the same job
        res_dup = await ac.post(f"/api/v1/jobs/{job_id}/applications", json=app_payload, headers=headers_w1)
        assert res_dup.status_code == 409
        assert "already submitted" in res_dup.json()["error"]["message"].lower()

        # 5. Worker 2 applies for the job
        res_app2 = await ac.post(
            f"/api/v1/jobs/{job_id}/applications",
            json={"proposed_wage": 160.0, "cover_note": "Can complete in 3 hours."},
            headers=headers_w2
        )
        assert res_app2.status_code == 201
        app2_id = res_app2.json()["id"]

        # 6. Employer reviews candidates
        res_review = await ac.get(f"/api/v1/jobs/{job_id}/applications", headers=headers_emp)
        assert res_review.status_code == 200
        applications = res_review.json()
        assert len(applications) == 2

        # 7. Cross-role check: Worker cannot view employer candidate review list
        res_worker_peek = await ac.get(f"/api/v1/jobs/{job_id}/applications", headers=headers_w1)
        assert res_worker_peek.status_code == 403

        # 8. Worker 1 views own submitted applications
        res_my_apps = await ac.get("/api/v1/applications/my", headers=headers_w1)
        assert res_my_apps.status_code == 200
        assert len(res_my_apps.json()) == 1
        assert res_my_apps.json()[0]["id"] == app1_id

        # 9. Employer shortlists Worker 1
        res_shortlist = await ac.patch(
            f"/api/v1/applications/{app1_id}/status",
            json={"status": ApplicationStatus.SHORTLISTED.value},
            headers=headers_emp
        )
        assert res_shortlist.status_code == 200
        assert res_shortlist.json()["status"] == ApplicationStatus.SHORTLISTED.value

        # 10. Worker 1 withdraws their application
        res_withdraw = await ac.patch(
            f"/api/v1/applications/{app1_id}/status",
            json={"status": ApplicationStatus.WITHDRAWN.value},
            headers=headers_w1
        )
        assert res_withdraw.status_code == 200
        assert res_withdraw.json()["status"] == ApplicationStatus.WITHDRAWN.value

        # 11. Worker cannot accept their own application
        res_illegal = await ac.patch(
            f"/api/v1/applications/{app2_id}/status",
            json={"status": ApplicationStatus.ACCEPTED.value},
            headers=headers_w2
        )
        assert res_illegal.status_code == 403
        assert "withdraw" in res_illegal.json()["error"]["message"].lower()

        # 12. Employer accepts Worker 2
        res_accept = await ac.patch(
            f"/api/v1/applications/{app2_id}/status",
            json={"status": ApplicationStatus.ACCEPTED.value},
            headers=headers_emp
        )
        assert res_accept.status_code == 200
        assert res_accept.json()["status"] == ApplicationStatus.ACCEPTED.value
