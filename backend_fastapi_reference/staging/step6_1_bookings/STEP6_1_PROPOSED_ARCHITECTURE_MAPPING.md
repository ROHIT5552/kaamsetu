# KaamSetu — Stage 2, Step 6.1: Proposed Architecture Mapping

**Sub-Step:** Stage 2, Step 6.1 — Core Bookings & Wage Agreements Foundation  
**Workspace:** `scratch/kaamsetu/staging/step6_1_bookings/`  
**Pilot District:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra  
**Document Reference:** `STEP6_1_PROPOSED_ARCHITECTURE_MAPPING.md`  
**Status:** PREFLIGHT SPECIFICATION — AWAITING HUMAN AUTHORIZATION

---

## 1. Architectural Source Traceability

This document maps the approved requirements from the Step 6.0.1 corrected planning suite ([`STEP6_0_1_DATA_MODEL_REQUIREMENTS.md`](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_0_planning/STEP6_0_1_DATA_MODEL_REQUIREMENTS.md), [`STEP6_0_1_MODULE_SPECIFICATIONS.md`](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_0_planning/STEP6_0_1_MODULE_SPECIFICATIONS.md), and [`STEP6_0_1_WORKFLOWS_AND_STATE_DIAGRAMS.md`](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_0_planning/STEP6_0_1_WORKFLOWS_AND_STATE_DIAGRAMS.md)) directly to the proposed source files, schemas, APIs, services, and tests for Sub-Step 6.1.

---

## 2. Proposed Database Model Refinements

### File 1: `backend/app/models/common.py`
* **Changes to Apply:**
  1. **Synchronize `BookingStatus` enum (AUD-KS6-004):**
     Add missing states `no_show`, `employer_no_show`, and `disputed` to match the 10-state FSM:
     ```python
     class BookingStatus(str, enum.Enum):
         REQUESTED = "requested"
         CONFIRMED = "confirmed"
         EN_ROUTE = "en_route"
         ARRIVED = "arrived"
         IN_PROGRESS = "in_progress"
         COMPLETED = "completed"
         CANCELLED = "cancelled"
         NO_SHOW = "no_show"
         EMPLOYER_NO_SHOW = "employer_no_show"
         DISPUTED = "disputed"
     ```
  2. **Introduce `WageAgreementStatus` enum (AUD-KS6-005):**
     Implement the approved 7-state lifecycle:
     ```python
     class WageAgreementStatus(str, enum.Enum):
         DRAFT = "draft"
         PENDING_COUNTERPARTY = "pending_counterparty"
         ACTIVE = "active"
         REJECTED = "rejected"
         REVISION_PENDING = "revision_pending"
         SETTLED = "settled"
         DISPUTED_HOLD = "disputed_hold"
     ```
  3. **Introduce `AgreementType` enum:**
     ```python
     class AgreementType(str, enum.Enum):
         DAILY = "daily"
         HOURLY = "hourly"
         FIXED_PRICE = "fixed_price"
     ```

### File 2: `backend/app/models/booking.py`
* **Changes to Apply:**
  1. **`Booking` Model Refinement:**
     * Add `parent_contract_id`: `Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)` to support multi-day parent contracts spawning discrete daily single-day dispatches (**AUD-KS6-013**).
     * Add self-referential relationship:
       `child_dispatches = relationship("Booking", backref="parent_contract", remote_side="Booking.id")`.
  2. **`WageAgreement` Model Refinement (AUD-KS6-007, AUD-KS6-005):**
     * Replace `Numeric(12, 2)` with integer `BigInteger` representing Paise:
       * `agreed_wage_paise = Column(BigInteger, nullable=False)`
       * `advance_amount_paise = Column(BigInteger, default=0, nullable=False)`
       * `amount_due_paise = Column(BigInteger, nullable=False)`
       * `amount_paid_paise = Column(BigInteger, default=0, nullable=False)`
       * `refund_amount_paise = Column(BigInteger, default=0, nullable=False)`
       * `disputed_amount_paise = Column(BigInteger, default=0, nullable=False)`
       * `outstanding_balance_paise = Column(BigInteger, nullable=False)`
       * `platform_commission_paise = Column(BigInteger, default=0, nullable=False)`
       * `tip_amount_paise = Column(BigInteger, default=0, nullable=False)`
     * Add `status`:
       `Column(SAEnum(WageAgreementStatus, name="wage_agreement_status_enum"), default=WageAgreementStatus.DRAFT, nullable=False, index=True)`
     * Add `agreement_type`:
       `Column(SAEnum(AgreementType, name="agreement_type_enum"), default=AgreementType.DAILY, nullable=False)`
     * Add `current_version`: `Column(Integer, default=1, nullable=False)`
  3. **Introduce `WageAgreementVersion` Model:**
     * Implements audit trail of proposed amendments.
     * Table: `wage_agreement_versions`
     * Columns: `id`, `wage_agreement_id`, `version_number`, `proposed_wage_paise`, `scope_change_description`, `status`, `proposed_by_id`, `decided_at`.
     * Constraint: `UniqueConstraint("wage_agreement_id", "version_number")`.

---

## 3. Proposed Schema Specifications

### File: `backend/app/modules/bookings/schemas.py` (New Module)
* **`BookingCreate`:**
  * `application_id`: Optional UUID (for bookings originating from accepted applications).
  * `worker_id`: UUID.
  * `service_address`: String (min length 5).
  * `area`: String (locality in Sambhajinagar).
  * `scheduled_at`: Datetime (UTC, future timestamp).
  * `agreement_type`: `AgreementType` enum.
  * `agreed_wage_paise`: Integer ($\ge 5,000$ Paise = ₹50.00).
  * `advance_amount_paise`: Integer ($\ge 0$).
* **`BookingResponse`:**
  * Full booking details including UUID, `booking_code`, status, addresses, timestamps, primary worker summary, employer summary, active wage agreement.
* **`BookingCancelRequest`:**
  * `reason`: String (min length 10).
* **`WageAgreementRevisionRequest`:**
  * `proposed_wage_paise`: Integer ($\ge 5,000$).
  * `scope_change_description`: String (min length 10).
* **`WageAgreementRevisionResponse`:**
  * Version number, status, proposed amount in Paise, decision timestamp.

---

## 4. Proposed Domain Service Logic

### File: `backend/app/modules/bookings/service.py` (New Module)
* **`BookingService` Responsibilities:**
  1. **Booking Creation:**
     * Validate counterparty identities (employer profile and worker profile exist and are active).
     * Verify no overlapping confirmed bookings for worker.
     * Generate unique non-sequential `booking_code` (`BK-YYYYMMDD-XXXX`).
     * Instantiate `Booking` in `REQUESTED` status.
     * Instantiate linked `WageAgreement` in `DRAFT` status with integer Paise values.
  2. **Counterparty Acceptance Handshake:**
     * Authenticated worker verifies they are `primary_worker_id`.
     * Transitions `Booking` from `REQUESTED` to `CONFIRMED`.
     * Transitions `WageAgreement` from `PENDING_COUNTERPARTY` to `ACTIVE`.
  3. **Strict 10-State FSM Validator:**
     * Verifies allowed transitions and permitted actors per `STEP6_0_1_WORKFLOWS_AND_STATE_DIAGRAMS.md`.
     * Rejects illegal transitions and attempts to reopen terminal states (`COMPLETED`, `CANCELLED`, `NO_SHOW`, `EMPLOYER_NO_SHOW`) with HTTP 422.
  4. **Cancellation & Mobilization Accounting:**
     * If employer cancels $<2$ hours before `scheduled_at` or post-dispatch (`EN_ROUTE`/`ARRIVED`):
       * Flags ₹150 (15,000 Paise) mobilization compensation owed to worker.
  5. **Wage Agreement Revision Engine:**
     * Creates new pending `WageAgreementVersion`.
     * Transitions agreement to `REVISION_PENDING`.
     * Counterparty acceptance updates active `agreed_wage_paise` and increments `current_version`.

---

## 5. Proposed API Endpoints

### File: `backend/app/modules/bookings/router.py` (New Module)
Prefix: `/api/v1/bookings` (Protected by JWT Authentication)

| Method | Path | Required Role | Description | IDOR Protection Rule |
|---|---|---|---|---|
| `POST` | `/` | `EMPLOYER` | Create booking (from application or direct). | User must own `employer_id`. |
| `GET` | `/{booking_id}` | Any Authenticated | Retrieve booking details. | User must be assigned Worker, Employer, or Admin. |
| `GET` | `/my-bookings` | Any Authenticated | List bookings for current user. | Filter strictly by `worker.user_id` or `employer.user_id`. |
| `POST` | `/{booking_id}/accept` | `WORKER` | Accept offered booking. | User must be assigned Worker. |
| `POST` | `/{booking_id}/cancel` | `EMPLOYER` / `WORKER` | Cancel booking with reason. | User must be booking participant. |
| `POST` | `/{booking_id}/wage-agreement/revision` | `EMPLOYER` / `WORKER` | Propose wage/scope revision. | User must be booking participant. |
| `POST` | `/{booking_id}/wage-agreement/revision/{version_num}/respond` | `EMPLOYER` / `WORKER` | Accept/reject revision. | User must be counterparty to proposer. |

---

## 6. Proposed Test Suite Coverage

### File: `backend/app/tests/test_bookings.py` (New Test File)
1. `test_booking_creation_from_application`: Verify booking creation links application, sets UTC timestamps, and initializes wage agreement in Paise.
2. `test_booking_idor_security_guards`: Verify third-party users receive HTTP 403 when attempting to view or accept foreign bookings.
3. `test_booking_ten_state_fsm_enforcement`: Exhaustively test transition matrix; verify illegal jumps return HTTP 422.
4. `test_terminal_states_immutable`: Verify `COMPLETED`, `CANCELLED`, and `NO_SHOW` reject all subsequent status updates.
5. `test_wage_agreement_seven_state_lifecycle`: Verify `draft` -> `pending_counterparty` -> `active` -> `revision_pending` -> `settled`.
6. `test_wage_agreement_revision_mutual_handshake`: Verify revision updates wage amount only upon counterparty acceptance.
7. `test_integer_paise_arithmetic`: Verify wage calculations, overtime ($1.5\times$), and commission storage prevent decimal precision drift.
8. `test_cancellation_mobilization_fee_flag`: Verify employer cancellation $<2$ hours flags 15,000 Paise compensation.
9. `test_multi_day_parent_contract_linkage`: Verify parent contract spawns child daily dispatches with `parent_contract_id`.
