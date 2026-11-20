# KaamSetu Stage 2 Step 6.1.1 — Findings Resolution Matrix

**Remediation Date:** 2026-11-18  
**Scope:** Remediation of Independent Adversarial Audit Findings (`AUD-KS61-001` through `AUD-KS61-010`)  
**Target Workspace:** `staging/step6_1_bookings/backend/`  
**Status:** **ALL 10 FINDINGS RESOLVED AND VERIFIED**

---

## 1. Resolution Summary Matrix

| Finding ID | Severity | Category | Remediation Applied | Test Verification | Status |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **AUD-KS61-001** | **HIGH** | State Machine | In `cancel_booking()`, enforced `ALLOWED_BOOKING_STATUS_TRANSITIONS`. Direct cancellation from `IN_PROGRESS` or `ARRIVED` is strictly rejected with HTTP 422, mandating dispute escalation or attendance no-show handling. | `test_remediation_aud_ks61_001_cancellation_fsm_enforcement` | **RESOLVED** |
| **AUD-KS61-002** | **HIGH** | Concurrency / Idempotency | Added `idempotency_key` field to `BookingCreateRequest` schema and deduplication indexing in `BookingService`. Duplicate submissions with same key safely return cached booking (HTTP 201). | `test_remediation_aud_ks61_002_booking_creation_idempotency` | **RESOLVED** |
| **AUD-KS61-003** | **MEDIUM** | Financial Integrity | Added Pydantic `@model_validator(mode="after")` and service-layer check asserting `advance_amount_paise <= agreed_wage_paise`. Advance exceeding wage is rejected with HTTP 422. Outstanding balance cannot become negative. | `test_remediation_aud_ks61_003_advance_wage_validation` | **RESOLVED** |
| **AUD-KS61-004** | **MEDIUM** | Security / Integrity | In `create_booking()`, added assertion that referenced application must be in status `ACCEPTED` (HTTP 400). Added duplicate booking check across active bookings for the same `application_id`. | `test_remediation_aud_ks61_004_application_status_and_duplicate_booking` | **RESOLVED** |
| **AUD-KS61-005** | **MEDIUM** | Ledger Accounting | Added `TERMINATED = "terminated"` to `WageAgreementStatus` enum in `app/models/common.py`. In `cancel_booking()`, wage agreement status transitions to `TERMINATED` instead of `SETTLED`. | `test_remediation_aud_ks61_005_wage_agreement_terminated_on_cancellation` | **RESOLVED** |
| **AUD-KS61-006** | **MEDIUM** | Business Policy | In `cancel_booking()`, capped mobilization compensation at `min(15000, agreed_wage_paise)`. On micro-bookings (e.g. ₹100), the cancellation fee cannot exceed the contract value. | `test_remediation_aud_ks61_006_mobilization_compensation_capped_at_agreed_wage` | **RESOLVED** |
| **AUD-KS61-007** | **MEDIUM** | Test Quality | Implemented missing assertions in `test_bookings.py`: Case 2 in `test_cancellation_mobilization_compensation_policy` (worker cancel -> 0 fee) and Case 4 in `test_multi_day_parent_contract_child_linkage` (counterparty mismatch -> 400). | `test_cancellation_mobilization_compensation_policy` & `test_multi_day_parent_contract_child_linkage` | **RESOLVED** |
| **AUD-KS61-008** | **LOW** | API Routing | Mounted both `@router.post("")` and `@router.post("/", include_in_schema=False)` on `create_booking()`. Requests to `/api/v1/bookings` succeed directly with HTTP 201 without HTTP 307 redirects. | `test_remediation_aud_ks61_008_post_route_slash_and_no_slash` | **RESOLVED** |
| **AUD-KS61-009** | **LOW** | Concurrency | Added `asyncio.Lock()` to `BookingService` for staging in-memory synchronization across wage revision methods (`propose_wage_revision`, `respond_wage_revision`). Documented PostgreSQL row-level locking (`FOR UPDATE`) requirements for production. | `test_remediation_aud_ks61_009_wage_revision_concurrency_lock` | **RESOLVED** |
| **AUD-KS61-010** | **INFO** | Model / Enum | Documented explicit state semantics for `PENDING_COUNTERPARTY` and `REJECTED`. Implemented full lifecycle test traversing all states (`DRAFT` -> `ACTIVE` -> `REVISION_PENDING` -> `REJECTED` -> `DISPUTED_HOLD` -> `SETTLED` & `TERMINATED`). | `test_remediation_aud_ks61_010_complete_wage_agreement_lifecycle` | **RESOLVED** |

---

## 2. Granular Code Changes and Verification Detail

### AUD-KS61-001: Cancellation FSM Enforcement
- **Root Cause:** `cancel_booking()` in `service.py` checked only `current in TERMINAL_BOOKING_STATES`, bypassing `ALLOWED_BOOKING_STATUS_TRANSITIONS`.
- **Change:**
  ```python
  allowed_targets = ALLOWED_BOOKING_STATUS_TRANSITIONS.get(current, set())
  if BookingStatus.CANCELLED not in allowed_targets:
      raise InvalidBookingStatusTransitionError(
          f"Cannot directly cancel booking in '{current.value}' status. "
          "In-progress or arrived work must be resolved via dispute escalation or attendance no-show handling."
      )
  ```
- **Verification:** Verified by `test_remediation_aud_ks61_001_cancellation_fsm_enforcement` passing cleanly with HTTP 422 for both `ARRIVED` and `IN_PROGRESS` direct cancellation attempts.

### AUD-KS61-002: Idempotency Key Support
- **Root Cause:** `BookingCreateRequest` lacked `idempotency_key`, and `BookingService` had no deduplication cache.
- **Change:**
  - Added `idempotency_key: Optional[str] = Field(None, max_length=128)` to `BookingCreateRequest`.
  - Added `self._idempotency_index: Dict[str, uuid.UUID]` to `BookingService`.
  - Check in `create_booking`: if key exists, return cached `_format_booking()`.
  - Clear in `clear()` for clean test fixtures.
- **Verification:** Verified by `test_remediation_aud_ks61_002_booking_creation_idempotency` passing cleanly; identical ID and booking code returned on duplicate submission.

### AUD-KS61-003: Advance Wage Amount Capped
- **Root Cause:** Schema validated `advance_amount_paise >= 0` but permitted `advance > agreed`, yielding negative outstanding balance.
- **Change:**
  - Added Pydantic model validator to `BookingCreateRequest`:
    ```python
    @model_validator(mode="after")
    def validate_advance_not_exceeding_wage(self) -> "BookingCreateRequest":
        if self.advance_amount_paise > self.agreed_wage_paise:
            raise ValueError(
                f"Advance deposit ({self.advance_amount_paise} Paise) cannot exceed total agreed wage ({self.agreed_wage_paise} Paise)."
            )
        return self
    ```
  - Added service-level defense-in-depth check in `create_booking()`.
- **Verification:** Verified by `test_remediation_aud_ks61_003_advance_wage_validation` (80,000 > 50,000 rejected with HTTP 422; 50,000 == 50,000 accepted with 0 balance; 20,000 < 50,000 accepted with 30,000 balance).

### AUD-KS61-004: Application Acceptance & Uniqueness
- **Root Cause:** Service did not check `application.status == ACCEPTED` and did not verify if an active booking already existed.
- **Change:**
  - Added assertion `app_status == ApplicationStatus.ACCEPTED` raising `ValueError` (HTTP 400) if application is still `SUBMITTED`, `SHORTLISTED`, or `REJECTED`.
  - Added duplicate check iterating `_bookings` for active records with matching `application_id`.
- **Verification:** Verified by `test_remediation_aud_ks61_004_application_status_and_duplicate_booking` (submitted app rejected; accepted app accepted; duplicate booking rejected).

### AUD-KS61-005: Wage Agreement TERMINATED on Cancellation
- **Root Cause:** `cancel_booking()` set `wage["status"] = WageAgreementStatus.SETTLED`.
- **Change:**
  - Added `TERMINATED = "terminated"` to `WageAgreementStatus` enum in `app/models/common.py`.
  - In `cancel_booking()`, set `wage["status"] = WageAgreementStatus.TERMINATED`.
- **Verification:** Verified by `test_remediation_aud_ks61_005_wage_agreement_terminated_on_cancellation` asserting `status == 'terminated'`.

### AUD-KS61-006: Mobilization Compensation Capped
- **Root Cause:** Compensation was hardcoded to `15000` Paise without checking total contract amount.
- **Change:**
  - Updated compensation calculation:
    ```python
    agreed_paise = booking.get("agreed_wage_paise") or self._wage_agreements[booking_id]["agreed_wage_paise"]
    booking["mobilization_compensation_due_paise"] = min(15000, agreed_paise)
    ```
- **Verification:** Verified by `test_remediation_aud_ks61_006_mobilization_compensation_capped_at_agreed_wage` on a ₹100 (10,000 Paise) booking, asserting fee is exactly 10,000 Paise (capped), not 15,000.

### AUD-KS61-007: Completed Test Specifications
- **Root Cause:** Two promised test cases in docstrings were not written in test function bodies.
- **Change:**
  - Added Case 2 to `test_cancellation_mobilization_compensation_policy`: worker pre-dispatch cancel yields `mobilization_compensation_due_paise == 0`.
  - Added Case 4 to `test_multi_day_parent_contract_child_linkage`: mismatched worker in child booking returns HTTP 400.
- **Verification:** Verified by executing `test_bookings.py` with 9/9 passing.

### AUD-KS61-008: Router Trailing Slash Normalization
- **Root Cause:** `@router.post("/")` triggered HTTP 307 redirects for unslashed URLs.
- **Change:**
  - Registered `@router.post("")` as primary route and `@router.post("/", include_in_schema=False)` as secondary alias.
- **Verification:** Verified by `test_remediation_aud_ks61_008_post_route_slash_and_no_slash` (both return HTTP 201 without redirects).

### AUD-KS61-009: Revision Concurrency Lock
- **Root Cause:** In-memory store lacked lock around revision proposals, risking race conditions.
- **Change:**
  - Added `self._lock = asyncio.Lock()` to `BookingService`.
  - Wrapped `propose_wage_revision` and `respond_wage_revision` with `async with self._lock:`.
  - Added documentation explaining PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) strategy for multi-worker production.
- **Verification:** Verified by `test_remediation_aud_ks61_009_wage_revision_concurrency_lock` asserting overlapping revision proposal is safely rejected with HTTP 422.

### AUD-KS61-010: Wage Agreement Lifecycle State Semantics
- **Root Cause:** Enums `PENDING_COUNTERPARTY` and `REJECTED` were unutilized in direct booking flow.
- **Change:**
  - Clarified and documented semantic boundaries: `DRAFT` for new bookings; `PENDING_COUNTERPARTY` for quote/bidding flows; `REJECTED` for declined revision items; `TERMINATED` for cancelled contracts; `SETTLED` for completed payouts.
  - Implemented full lifecycle test traversing all active and transitionary states.
- **Verification:** Verified by `test_remediation_aud_ks61_010_complete_wage_agreement_lifecycle` passing 100%.
