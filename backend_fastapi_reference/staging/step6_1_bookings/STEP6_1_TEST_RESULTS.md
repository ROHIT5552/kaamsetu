# KaamSetu Stage 2 Step 6.1 — Staging Test Results

**Execution Timestamp:** 2026-11-18T17:05:00+05:30  
**Environment:** Isolated Staging Workspace (`staging/step6_1_bookings/backend/`)  
**Python Runtime:** Python 3.12.10 (win32)  
**Test Framework:** pytest-8.3.4 with pluggy-1.7.0, anyio-4.16.0, asyncio-0.24.0  
**Overall Verdict:** `PASS — 35/35 PASSED (100%)`  
**Execution Time:** 8.18 seconds  

---

## 1. Test Execution Summary

| Test Suite Category | Test File | Tests Run | Passed | Failed | Skipped | Errors |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Step 6.1 Core Bookings & Agreements** | `app/tests/test_bookings.py` | 9 | 9 | 0 | 0 | 0 |
| **Step 5 Auth & RBAC Security** | `app/tests/test_auth.py` | 10 | 10 | 0 | 0 | 0 |
| **Step 5 Business Domain Modules** | `app/tests/test_domain_modules.py` | 5 | 5 | 0 | 0 | 0 |
| **Step 5 System Health & Middleware** | `app/tests/test_health.py` | 3 | 3 | 0 | 0 | 0 |
| **Step 5 ORM & Schema Invariants** | `app/tests/test_models.py` | 5 | 5 | 0 | 0 | 0 |
| **Step 5 Remediations & Verification** | `app/tests/test_step5_remediations.py` | 3 | 3 | 0 | 0 | 0 |
| **TOTAL STAGING SUITE** | **All suites** | **35** | **35** | **0** | **0** | **0** |

---

## 2. Granular Inventory of All 35 Passing Tests

### 2.1 Step 6.1 Core Bookings & Wage Agreements Suite (`test_bookings.py` - 9 Tests)
1. `test_booking_creation_from_application_in_paise` — **PASSED**  
   *Validates booking creation from an accepted application, integer Paise monetary fields, 5% platform commission computation, and initial REQUESTED / DRAFT statuses.*
2. `test_worker_acceptance_and_active_agreement` — **PASSED**  
   *Validates assigned worker accepting booking, transitioning booking to CONFIRMED and linked wage agreement to ACTIVE.*
3. `test_booking_ten_state_fsm_exhaustive` — **PASSED**  
   *Validates linear lifecycle `REQUESTED -> CONFIRMED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED`, checkpoint timestamps (`en_route_at`, `arrived_at`, `started_at`, `completed_at`), wage agreement auto-transition to `SETTLED`, rejection of illegal transitions (HTTP 422), and terminal state immutability.*
4. `test_no_show_and_employer_no_show_transitions` — **PASSED**  
   *Validates employer-reported worker no-show (`CONFIRMED -> NO_SHOW`) and worker-reported employer absence (`ARRIVED -> EMPLOYER_NO_SHOW`), ensuring terminal state enforcement.*
5. `test_dispute_transition_and_resolution` — **PASSED**  
   *Validates dispute escalation (`IN_PROGRESS -> DISPUTED`), wage agreement freezing (`DISPUTED_HOLD`), and grievance resolution to `COMPLETED` (`SETTLED`).*
6. `test_booking_idor_security_guards` — **PASSED**  
   *Validates anti-IDOR authorization guards; ensures third-party authenticated users cannot read or mutate foreign bookings (HTTP 403 Forbidden).*
7. `test_cancellation_mobilization_compensation_policy` — **PASSED**  
   *Validates conditional ₹150 (15,000 Paise) mobilization compensation calculation (POL-002, AUD-KS6-011) when cancelled post-dispatch vs ₹0 pre-dispatch.*
8. `test_wage_agreement_versioned_amendment_negotiation` — **PASSED**  
   *Validates multi-round wage renegotiation: proposal of Version 2, rejection of worker self-acceptance (HTTP 422), employer declining Version 2 (retaining Version 1 terms and ACTIVE status), worker proposing Version 3, and employer acceptance updating wage to 110,000 Paise and current_version to 3.*
9. `test_multi_day_parent_contract_child_linkage` — **PASSED**  
   *Validates parent project umbrella contracts with linked single-day child dispatches, ensuring counterparty alignment and parent_contract_id integrity (AUD-KS6-013).*

### 2.2 Step 5 Authentication & RBAC Regression Suite (`test_auth.py` - 10 Tests)
10. `test_valid_otp_flow` — **PASSED**
11. `test_invalid_otp_rejection` — **PASSED**
12. `test_expired_otp_rejection` — **PASSED**
13. `test_reused_otp_rejection` — **PASSED**
14. `test_rate_limiting_otp_requests` — **PASSED**
15. `test_max_verification_attempts_lockout` — **PASSED**
16. `test_refresh_token_rotation` — **PASSED**
17. `test_role_based_authorization_guards` — **PASSED**
18. `test_idor_protection` — **PASSED**
19. `test_security_log_hygiene` — **PASSED**

### 2.3 Step 5 Domain Modules Regression Suite (`test_domain_modules.py` - 5 Tests)
20. `test_5c_taxonomy_categories_and_skills` — **PASSED**
21. `test_5a_worker_profile_lifecycle_and_privacy` — **PASSED**
22. `test_5b_employer_profile_and_locations` — **PASSED**
23. `test_5d_job_posting_lifecycle_and_rbac` — **PASSED**
24. `test_5e_job_application_flow_and_duplicate_prevention` — **PASSED**

### 2.4 Step 5 System Health Suite (`test_health.py` - 3 Tests)
25. `test_health_endpoint_structure` — **PASSED**
26. `test_request_id_middleware` — **PASSED**
27. `test_root_endpoint` — **PASSED**

### 2.5 Step 5 Database Model Precision & Constraints (`test_models.py` - 5 Tests)
28. `test_model_table_inventory` — **PASSED**
29. `test_uuid_primary_keys` — **PASSED**
30. `test_sensitive_identity_data_protection` — **PASSED**
31. `test_financial_field_precision` — **PASSED**
32. `test_utc_timezone_timestamps` — **PASSED**

### 2.6 Step 5 Remediations Suite (`test_step5_remediations.py` - 3 Tests)
33. `test_remediation_ks5_001_phone_resolution_and_refresh_rotation` — **PASSED**
34. `test_remediation_ks5_002_job_status_fsm_validation` — **PASSED**
35. `test_remediation_ks5_003_application_status_fsm_and_ownership` — **PASSED**

---

## 3. Staging Validation Defects Identified & Remediated

During comprehensive staging testing, four implementation defects were discovered and cleanly resolved inside staging:

1. **`KeyError: 'user'` in Test Fixture Helper (`test_bookings.py`):**
   - *Cause:* The helper assumed `/api/v1/auth/otp/verify` returned `{"user": {"id": ...}}`, whereas the verified Step 5 contract returns top-level `user_id`.
   - *Resolution:* Updated test helper to extract `data.get("user_id")`.
2. **`AttributeError: 'AuthenticatedUserContext' object has no attribute 'role_claims'` (`router.py`):**
   - *Cause:* `router.py` attempted to access `user.role_claims` instead of `user.roles`.
   - *Resolution:* Replaced all occurrences with `user.roles[0] if user.roles else None`.
3. **`ValueError` Masking Specific Domain Exceptions (`router.py` & `service.py`):**
   - *Cause:* `InvalidBookingStatusTransitionError` and `WageAgreementStateError` initially subclassed `ValueError`. In the router, `except ValueError` preceded these handlers, incorrectly turning FSM violations into HTTP 404s instead of HTTP 422s.
   - *Resolution:* Established a dedicated `BookingDomainError` hierarchy (`BookingNotFoundError`, `InvalidBookingStatusTransitionError`, `WageAgreementStateError`, `BookingOwnershipError`) and reordered router exception catching so domain violations correctly return HTTP 422 and missing records return HTTP 404.
4. **Version Increment Counter in Rejected Amendment Re-proposals (`service.py`):**
   - *Cause:* `next_version` was computed as `wage["current_version"] + 1`. When Version 2 was rejected, `current_version` remained 1, causing the next proposal to be re-indexed as Version 2 instead of Version 3.
   - *Resolution:* Changed version generation to `next_version = len(versions) + 1` so that all amendment proposals receive monotonically increasing sequential version numbers for double-entry auditability.
