# KaamSetu Stage 2 Step 6.1 — Independent Audit Findings Register

**Audit Date:** 2026-11-18  
**Auditor:** Antigravity Independent Adversarial Reviewer  
**Target Workspace:** `staging/step6_1_bookings/backend/`  
**Baseline Compared:** Step 5 Promoted Baseline (70 files) & Step 6.0.1 Approved Architecture  
**Total Findings:** 10  
- **CRITICAL:** 0  
- **HIGH:** 2  
- **MEDIUM:** 5  
- **LOW:** 2  
- **INFORMATIONAL:** 1  

---

## Findings Summary Matrix

| Finding ID | Severity | Category | Title | Status |
| :--- | :---: | :--- | :--- | :---: |
| **AUD-KS61-001** | **HIGH** | State Machine | Direct cancellation permitted from `IN_PROGRESS` and `ARRIVED` states bypassing FSM & dispute escalation | **OPEN** |
| **AUD-KS61-002** | **HIGH** | Concurrency / Idempotency | Missing `idempotency_key` handling on booking work order creation | **OPEN** |
| **AUD-KS61-003** | **MEDIUM** | Financial Integrity | Unvalidated advance deposit amount permitting advance greater than agreed total wage | **OPEN** |
| **AUD-KS61-004** | **MEDIUM** | Security / Integrity | Missing application status and duplicate booking validation on work order creation | **OPEN** |
| **AUD-KS61-005** | **MEDIUM** | Ledger Accounting | Wage agreement status marked as `SETTLED` upon booking cancellation | **OPEN** |
| **AUD-KS61-006** | **MEDIUM** | Business Policy | Uncapped mobilization compensation fee calculation on micro-bookings | **OPEN** |
| **AUD-KS61-007** | **MEDIUM** | Test Quality | Docstring test assertions promised in test specification omitted from actual test execution | **OPEN** |
| **AUD-KS61-008** | **LOW** | API Routing | Trailing slash on root booking route inducing HTTP 307 redirects | **OPEN** |
| **AUD-KS61-009** | **LOW** | Concurrency | In-memory service store lacks concurrency synchronization for version increment counter | **OPEN** |
| **AUD-KS61-010** | **INFO** | Model / Enum | Unused enum states `PENDING_COUNTERPARTY` and `REJECTED` in direct booking flow | **OPEN** |

---

## Detailed Audit Findings

### AUD-KS61-001: Direct Cancellation Permitted from In-Progress & Arrived States Bypassing FSM & Dispute Escalation
* **Severity:** **HIGH**
* **Audit Area:** 1 (Booking State Machine Correctness & Terminal-State Protection)
* **Affected File & Line:** `staging/step6_1_bookings/backend/app/modules/bookings/service.py` (lines 382–386)
* **Evidence:**
  ```python
  current = booking["status"]
  if current in TERMINAL_BOOKING_STATES:
      raise InvalidBookingStatusTransitionError(
          f"Booking is in terminal state '{current.value}' and cannot be cancelled."
      )
  ```
* **Reproduction Method:**
  1. Advance a booking to `IN_PROGRESS` (`REQUESTED -> CONFIRMED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS`).
  2. Send `POST /api/v1/bookings/{booking_id}/cancel` with reason `"Cancelling on site"`.
  3. The request succeeds with HTTP 200 and transitions status to `CANCELLED`.
* **Impact:** Violates the formal FSM matrix (`ALLOWED_BOOKING_STATUS_TRANSITIONS` line 64 and `STEP6_0_1_WORKFLOWS_AND_STATE_DIAGRAMS.md`). Once work has commenced (`IN_PROGRESS`), unilateral cancellation without grievance arbitration allows an employer to dismiss a worker mid-shift without dispute documentation or wage reconciliation.
* **Recommended Correction:** In `BookingService.cancel_booking`, validate `BookingStatus.CANCELLED in ALLOWED_BOOKING_STATUS_TRANSITIONS.get(current, set())`. If `current` is `IN_PROGRESS`, reject with `HTTP 422` with message `"Cannot cancel in-progress work order directly; file a dispute via target_status='disputed'"`.

---

### AUD-KS61-002: Missing Idempotency Key Handling on Booking Work Order Creation
* **Severity:** **HIGH**
* **Audit Area:** 4 (Concurrent Revision and Booking Requests) & 7 (Input Validation)
* **Affected File & Line:**
  - `staging/step6_1_bookings/backend/app/modules/bookings/schemas.py` (lines 65–113)
  - `staging/step6_1_bookings/backend/app/modules/bookings/service.py` (lines 94–164)
* **Evidence:** `BookingCreateRequest` schema does not define `idempotency_key`, and `BookingService.create_booking` never checks or populates an idempotency key. While `Booking.idempotency_key` column exists in `app/models/booking.py:23`, it is permanently populated as `None`.
* **Reproduction Method:**
  1. An employer triggers two rapid consecutive `POST /api/v1/bookings/` requests with identical payloads (simulating a mobile network retry or double-click).
  2. Both requests succeed with HTTP 201, generating two different booking IDs and codes (`BK-...`).
* **Impact:** Violates Step 6.0.1 architecture requirement `AUD-KS6-004` (Idempotency across payment and booking lifecycles). Creates duplicate work orders, double-reserves worker time slots, and triggers duplicate advance escrow charges.
* **Recommended Correction:** Add `idempotency_key: Optional[str] = Field(None, max_length=64)` to `BookingCreateRequest`. In `BookingService.create_booking`, check `self._idempotency_index`; if present, return the existing booking record instead of creating a duplicate.

---

### AUD-KS61-003: Unvalidated Advance Deposit Amount Permitting Advance Greater Than Agreed Total Wage
* **Severity:** **MEDIUM**
* **Audit Area:** 5 (Monetary Precision, Ledger Consistency) & 7 (Input Validation)
* **Affected File & Line:**
  - `staging/step6_1_bookings/backend/app/modules/bookings/schemas.py` (lines 103–113)
  - `staging/step6_1_bookings/backend/app/modules/bookings/service.py` (lines 167–170)
* **Evidence:**
  ```python
  agreed_paise = payload.agreed_wage_paise
  advance_paise = payload.advance_amount_paise
  ...
  outstanding_paise = agreed_paise - advance_paise
  ```
* **Reproduction Method:**
  1. Call `POST /api/v1/bookings/` with `agreed_wage_paise = 10000` (₹100.00) and `advance_amount_paise = 50000` (₹500.00).
  2. Request succeeds with HTTP 201. The resulting wage agreement has `outstanding_balance_paise = -40000` (negative balance).
* **Impact:** Negative outstanding balances violate the financial ledger invariant where `outstanding_balance = agreed_wage - advance_amount >= 0`. Distorts escrow lockups and downstream settlement calculations.
* **Recommended Correction:** Add a model validator in `BookingCreateRequest` enforcing `advance_amount_paise <= agreed_wage_paise`.

---

### AUD-KS61-004: Missing Application Status and Duplicate Booking Validation on Work Order Creation
* **Severity:** **MEDIUM**
* **Audit Area:** 3 (Worker/Employer Ownership & IDOR) & 6 (Multi-Day Parent-Child Integrity)
* **Affected File & Line:** `staging/step6_1_bookings/backend/app/modules/bookings/service.py` (lines 107–119)
* **Evidence:** When `payload.application_id` is supplied, `create_booking` retrieves the application and checks employer ownership of the parent job, but never validates `app_record["status"] == ApplicationStatus.ACCEPTED`. Furthermore, it does not check if an active booking already references this application.
* **Reproduction Method:**
  1. Worker applies for job (`SUBMITTED`).
  2. Employer creates a booking without accepting the application, or creates a booking for a `REJECTED` / `WITHDRAWN` application.
  3. The booking is successfully created.
* **Impact:** Employers can bypass the application workflow to book candidates who have withdrawn or were rejected, or create multiple competing bookings from a single candidate application.
* **Recommended Correction:** Verify `app_record["status"] == ApplicationStatus.ACCEPTED` and check that `application_id` has not already been assigned to an active booking.

---

### AUD-KS61-005: Wage Agreement Status Marked as SETTLED upon Booking Cancellation
* **Severity:** **MEDIUM**
* **Audit Area:** 2 (Wage Agreement Negotiation) & 5 (Monetary Precision & Ledger Consistency)
* **Affected File & Line:** `staging/step6_1_bookings/backend/app/modules/bookings/service.py` (lines 413–415)
* **Evidence:**
  ```python
  # Terminate wage agreement
  wage = self._wage_agreements[booking_id]
  wage["status"] = WageAgreementStatus.SETTLED
  wage["updated_at"] = now
  ```
* **Reproduction Method:**
  1. Create a booking in `REQUESTED` status.
  2. Cancel the booking immediately.
  3. Inspect `wage_agreement.status` in the response: it reports `"settled"`.
* **Impact:** `SETTLED` in double-entry accounting designates finalized disbursement of earned wages. A cancelled booking prior to dispatch has zero earned wages and must be recorded as `TERMINATED` or `VOIDED` to avoid corrupting financial reporting and reconciliation audits.
* **Recommended Correction:** Add `TERMINATED = "terminated"` to `WageAgreementStatus` enum in `app/models/common.py` and assign `wage["status"] = WageAgreementStatus.TERMINATED` upon booking cancellation.

---

### AUD-KS61-006: Uncapped Mobilization Compensation Fee Calculation on Micro-Bookings
* **Severity:** **MEDIUM**
* **Audit Area:** 5 (Monetary Precision & Cancellation Compensation)
* **Affected File & Line:** `staging/step6_1_bookings/backend/app/modules/bookings/service.py` (lines 408–410)
* **Evidence:**
  ```python
  if is_employer and (current in (BookingStatus.EN_ROUTE, BookingStatus.ARRIVED) or time_until_start < 7200):
      # Flag ₹150 (15,000 Paise) mobilization compensation
      booking["mobilization_compensation_due_paise"] = 15000
  ```
* **Reproduction Method:**
  1. Employer creates a quick 1-hour micro-task booking with `agreed_wage_paise = 8000` (₹80.00).
  2. Worker marks `EN_ROUTE`.
  3. Employer cancels: `mobilization_compensation_due_paise` is assigned `15000` (₹150.00), which exceeds the entire contract value by ₹70.00.
* **Impact:** In micro-jobs or low-value service calls, the cancellation penalty exceeds the full contract amount, creating an inequitable penalty not proportional to contract value.
* **Recommended Correction:** In `cancel_booking`, cap mobilization compensation at `min(15000, booking["agreed_wage_paise"])`.

---

### AUD-KS61-007: Test Quality: Docstring Assertions Promised in Test Specification Omitted from Actual Execution
* **Severity:** **MEDIUM**
* **Audit Area:** 11 (Test Quality)
* **Affected File & Line:**
  - `staging/step6_1_bookings/backend/app/tests/test_bookings.py` (lines 443, 480)
  - `staging/step6_1_bookings/backend/app/tests/test_bookings.py` (lines 568, 610)
* **Evidence:**
  1. `test_cancellation_mobilization_compensation_policy`: Docstring explicitly states: `2. Worker cancels before dispatch -> zero mobilization compensation`. The function body ends at line 480 without ever testing or asserting Case 2.
  2. `test_multi_day_parent_contract_child_linkage`: Docstring explicitly states: `4. Mismatched counterparty in child creation returns HTTP 400`. The function body ends at line 610 without ever executing a mismatched child creation request.
* **Reproduction Method:** Compare docstrings of the two test functions with their actual implementation lines.
* **Impact:** Incomplete test coverage. The test suite passes 100%, but negative branches documented in test specifications are untested.
* **Recommended Correction:** Implement the omitted test assertions in `app/tests/test_bookings.py`.

---

### AUD-KS61-008: Trailing Slash on Root Booking Route Inducing HTTP 307 Redirects
* **Severity:** **LOW**
* **Audit Area:** 10 (Route Registration & Step 5 Compatibility)
* **Affected File & Line:** `staging/step6_1_bookings/backend/app/modules/bookings/router.py` (line 42)
* **Evidence:** `@router.post("/")` with `prefix="/api/v1/bookings"` binds to `/api/v1/bookings/`. In contrast, Step 5 routers (`/api/v1/jobs`, `/api/v1/workers/profile`) bind without trailing slash.
* **Reproduction Method:** Sending `POST http://test/api/v1/bookings` returns HTTP 307 Temporary Redirect to `/api/v1/bookings/`.
* **Impact:** API clients that do not automatically follow redirects with method preservation will drop the POST request body or fail.
* **Recommended Correction:** Change route decorator to `@router.post("")` (or support both `""` and `"/"`).

---

### AUD-KS61-009: In-Memory Service Store Lacks Concurrency Synchronization for Version Increments
* **Severity:** **LOW**
* **Audit Area:** 4 (Concurrent Revision and Booking Requests) & 9 (Transaction Atomicity)
* **Affected File & Line:** `staging/step6_1_bookings/backend/app/modules/bookings/service.py` (lines 444–465)
* **Evidence:** `self._wage_versions[booking_id]` is read and appended without an `asyncio.Lock` or threading lock.
* **Reproduction Method:** Two concurrent asynchronous coroutines proposing revisions simultaneously will both read the same version length and generate conflicting duplicate version numbers.
* **Impact:** Race conditions during rapid asynchronous concurrent revision submissions in staging.
* **Recommended Correction:** Wrap in-memory dictionary modifications in an `asyncio.Lock()` per booking.

---

### AUD-KS61-010: Unused Enum States in WageAgreementStatus During Direct Booking Flow
* **Severity:** **INFORMATIONAL**
* **Audit Area:** 2 (Wage Agreement Negotiation)
* **Affected File & Line:** `staging/step6_1_bookings/backend/app/models/common.py` (lines 91–99)
* **Evidence:** `WageAgreementStatus.PENDING_COUNTERPARTY` and `WageAgreementStatus.REJECTED` exist in the enum, but `create_booking` initializes to `DRAFT` and `accept_booking` transitions directly to `ACTIVE`.
* **Reproduction Method:** Trace lifecycle transitions in `create_booking` and `accept_booking`.
* **Impact:** Semantic inconsistency between architecture state diagram (which specifies `draft -> pending_counterparty -> active`) and staging service implementation.
* **Recommended Correction:** Utilize `PENDING_COUNTERPARTY` while a booking is in `REQUESTED` status, transitioning to `ACTIVE` upon worker acceptance and `REJECTED` upon worker cancellation.
