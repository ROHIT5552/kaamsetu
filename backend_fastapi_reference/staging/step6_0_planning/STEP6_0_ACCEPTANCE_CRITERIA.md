# KaamSetu — Stage 2, Step 6: Binary Acceptance Criteria & Verification Gates

**Document Reference:** `STEP6_0_ACCEPTANCE_CRITERIA.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Scope:** Explicit, unambiguous pass/fail criteria governing every transactional component in Step 6.  
**Status:** PLANNING DOCUMENT — AUDIT GATED

---

## 1. Acceptance Framework

All acceptance criteria are formulated as verifiable binary assertions (`PASS` / `FAIL`). No module or sub-step will be authorized for baseline promotion if any single criterion fails.

---

## 2. Sub-Step Acceptance Matrices

### Category A: Core Bookings & Wage Agreements (Sub-Step 6.1)

| Criterion ID | Description | Verification Method | Target Result | Status |
|---|---|---|---|---|
| **AC-BKG-001** | Booking created from valid Job Application automatically links worker, employer, job ID, and application ID. | Pytest integration test | Booking object created with matching UUIDs and status `OFFERED` or `ACCEPTED`. | PENDING STAGE 6.1 |
| **AC-BKG-002** | Wage agreement captures immutable snapshot of payment type, agreed rate (in paise), overtime rate, and hours. | Unit test on `WageAgreement` | Mutation attempt on agreed rate after status becomes `ACCEPTED` raises HTTP 400/422. | PENDING STAGE 6.1 |
| **AC-BKG-003** | Counterparty validation: Worker cannot accept a booking where they are not the designated worker; employer cannot accept a foreign booking. | Auth & RBAC pytest | Unauthorized user receives HTTP 403 Forbidden. | PENDING STAGE 6.1 |
| **AC-BKG-004** | State machine enforcement: Terminal booking states (`COMPLETED`, `CANCELLED`) reject all subsequent state change requests. | FSM transition test | Transition attempt from terminal state returns HTTP 422 Unprocessable Entity. | PENDING STAGE 6.1 |
| **AC-BKG-005** | IDOR protection: Listing bookings filters strictly by authenticated user's ID (`worker_id == user.id` OR `employer_id == user.id`). | Security unit test | Third-party cannot retrieve foreign booking details. | PENDING STAGE 6.1 |

---

### Category B: Attendance & Checkpoints (Sub-Step 6.2)

| Criterion ID | Description | Verification Method | Target Result | Status |
|---|---|---|---|---|
| **AC-ATT-001** | Checkpoints must follow strict sequential order: `en_route` -> `arrived` -> `in_progress` -> `completed`. | Sequence unit test | Submitting `in_progress` before `arrived` returns HTTP 422 with descriptive error. | PENDING STAGE 6.2 |
| **AC-ATT-002** | GPS optionality: Checkpoint submission without GPS latitude/longitude succeeds cleanly without error. | API schema test | Request payload omitting `latitude` and `longitude` returns HTTP 201 Created. | PENDING STAGE 6.2 |
| **AC-ATT-003** | Privacy preservation: GPS coordinates are never logged in application stdout, error logs, or public API responses. | Log audit & schema test | Coordinates excluded from public serialization; logs verify zero GPS leakage. | PENDING STAGE 6.2 |
| **AC-ATT-004** | Check-out triggers booking transition to `COMPLETED`, initiating inspection window. | Integration test | Booking status transitions to `COMPLETED` and timestamp `checked_out_at` is set. | PENDING STAGE 6.2 |

---

### Category C: Inbound Payments & Double-Entry Ledger (Sub-Step 6.3)

| Criterion ID | Description | Verification Method | Target Result | Status |
|---|---|---|---|---|
| **AC-FIN-001** | Double-entry invariant: Every financial transaction creates >= 2 ledger entries where `sum(debits) == sum(credits)`. | Database trigger & test | Unbalanced entry creation raises `LedgerBalanceException` and transaction aborts. | PENDING STAGE 6.3 |
| **AC-FIN-002** | Integer paise arithmetic: All monetary amounts stored as integer `BIGINT` representing Paise. Floating-point numbers strictly prohibited. | Schema & ORM validation | Floating-point assignment to monetary columns fails model validation. | PENDING STAGE 6.3 |
| **AC-FIN-003** | Ledger immutability: `ledger_entries` and `transactions` tables reject any `UPDATE` or `DELETE` statements. | PostgreSQL trigger test | SQL `UPDATE` on `ledger_entries` raises database error: `Ledger entries are immutable`. | PENDING STAGE 6.3 |
| **AC-FIN-004** | Webhook HMAC verification: Payment gateway webhook rejects payloads with missing or invalid cryptographic signatures. | Webhook security test | Invalid HMAC header returns HTTP 401 Unauthorized; payload discarded. | PENDING STAGE 6.3 |
| **AC-FIN-005** | Webhook idempotency: Transmitting the identical webhook payload multiple times results in exactly one database state change. | Concurrency & duplicate test | Subsequent calls return HTTP 200 with `status: already_processed`, 0 duplicate rows. | PENDING STAGE 6.3 |
| **AC-FIN-006** | Zero-simulation policy: No mock payment logic is executed in production configuration; test suite uses explicit `MockPaymentGatewayAdapter`. | Config & DI audit | Production environment requires valid gateway credentials; mock only enabled in test env. | PENDING STAGE 6.3 |

---

### Category D: Escrow Release, Payouts & Refunds (Sub-Step 6.4)

| Criterion ID | Description | Verification Method | Target Result | Status |
|---|---|---|---|---|
| **AC-SET-001** | Decoupled state integrity: Booking status `COMPLETED` does NOT automatically mark payment as `CAPTURED_SETTLED`. | State decoupling test | Booking completes while payment remains `HELD_IN_ESCROW` until inspection period elapses. | PENDING STAGE 6.4 |
| **AC-SET-002** | 24-hour auto-release sweep: Completed bookings without active disputes auto-release escrow after 24 hours. | Sweep service test | Background sweep releases payment and records ledger transfer to worker payable. | PENDING STAGE 6.4 |
| **AC-SET-003** | Immediate employer release: Employer can manually trigger instant release, bypassing remaining inspection window. | API endpoint test | Calling `/confirm-and-pay` instantly moves funds from escrow to worker payable. | PENDING STAGE 6.4 |
| **AC-SET-004** | Concurrency safety: Multiple simultaneous release requests cannot double-credit worker payable. | Row-level locking test | `SELECT ... FOR UPDATE` ensures only the first request executes; others return idempotently. | PENDING STAGE 6.4 |
| **AC-SET-005** | Cancellation refund accounting: Cancelled booking accurately computes refund and compensation based on policy tiers. | Tiered refund test | Pre-dispatch cancellation refunds 100%; post-dispatch deducts ₹150 mobilization to worker. | PENDING STAGE 6.4 |

---

### Category E: Reviews & Dispute Arbiter (Sub-Step 6.5)

| Criterion ID | Description | Verification Method | Target Result | Status |
|---|---|---|---|---|
| **AC-REV-001** | Verification prerequisite: Reviews strictly forbidden unless booking is `COMPLETED` and payment is `CAPTURED_SETTLED`. | Security gating test | Attempting review on uncompleted booking returns HTTP 403 Forbidden. | PENDING STAGE 6.5 |
| **AC-REV-002** | Blind review window: Submitted reviews remain unpublished until counterparty submits or 7 days elapse. | Blind review unit test | Public review query returns empty list while counterparty review is pending within 7 days. | PENDING STAGE 6.5 |
| **AC-DIS-001** | Dispute escrow freeze: Opening a dispute transitions payment to `DISPUTED` and halts automated release sweep. | Dispute integration test | Sweep skips disputed bookings; funds remain locked in escrow. | PENDING STAGE 6.5 |
| **AC-DIS-002** | Arbiter settlement ledger: Resolving dispute with partial refund accurately splits escrow to both employer and worker. | Financial split test | Partial resolution splits debit from `ESCROW_HOLDINGS` to both `EMPLOYER_FUNDS` and `WORKER_PAYABLE`. | PENDING STAGE 6.5 |

---

### Category F: Code Quality, Governance & Integrity (Sub-Step 6.6)

| Criterion ID | Description | Verification Method | Target Result | Status |
|---|---|---|---|---|
| **AC-GOV-001** | Zero baseline regressions: All 26 existing Stage 2 Step 5 tests continue to pass without modification. | Pytest suite execution | 26 passed, 0 failed, 0 skipped. | PENDING STAGE 6.6 |
| **AC-GOV-002** | Test coverage: Minimum 90% statement coverage across all new transaction, ledger, and state machine modules. | Pytest-cov report | Coverage >= 90.0% for `app/modules/bookings/`, `finance/`, `attendance/`, etc. | PENDING STAGE 6.6 |
| **AC-GOV-003** | No hardcoded credentials: Zero test passwords, hardcoded phone fallbacks (`+919822000000`), or fake credentials. | Static code scan | Regex scan for hardcoded patterns returns 0 matches. | PENDING STAGE 6.6 |
| **AC-GOV-004** | Prototype immutability: SHA-256 hash of `2.html` and `backend/baseline/prototype/2.html` matches baseline exactly. | SHA-256 verification | Exact hash match: `489F4C38178B12CDBC349C3BA49349EE6A184407EE61CC24EFC466C7CC42E900`. | PENDING STAGE 6.6 |
| **AC-GOV-005** | Migration safety: Offline Alembic migration script generated; zero unmigrated runtime DDL executed. | Alembic check | Migration script verified offline; production DB untouched. | PENDING STAGE 6.6 |
