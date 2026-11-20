# KaamSetu — Stage 2, Step 6.0.1: Binary Acceptance Criteria & Verification Gates (CORRECTED)

**Document Reference:** `STEP6_0_1_ACCEPTANCE_CRITERIA.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Scope:** Hardened, 100% Objectively Testable Acceptance Criteria Matrix  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## 1. Acceptance Criteria Verification Matrix

Every criterion below is formulated as an unambiguous binary assertion (`PASS` / `FAIL`).

### Category A: Core Bookings & Wage Agreements (Sub-Step 6.1)

| Criterion ID | Description | Verification Method | Target Result |
|---|---|---|---|
| **AC-BKG-001** | Booking created from valid Job Application links worker, employer, job ID, and application ID. | Pytest integration test | Booking entity instantiated with matching UUIDs and status `requested`. |
| **AC-BKG-002** | Wage agreement captures immutable snapshot of payment type, agreed rate in integer Paise (`BIGINT`), and overtime rate. | Unit test on `WageAgreement` | Mutation attempt on agreed rate after status becomes `active` raises HTTP 422. |
| **AC-BKG-003** | Counterparty validation: Worker cannot accept booking where they are not assigned; employer cannot accept foreign booking. | Auth & RBAC pytest | Unauthorized user receives HTTP 403 Forbidden. |
| **AC-BKG-004** | State machine enforcement: Synchronized 10-state FSM rejects illegal transitions and prevents reopening terminal states. | FSM transition test | Attempting illegal transition (e.g. `requested` -> `completed`) returns HTTP 422. |
| **AC-BKG-005** | IDOR protection: Listing bookings filters strictly by authenticated user's ID (`worker_id == user.id` OR `employer_id == user.id`). | Security unit test | Third-party user cannot retrieve foreign booking details. |

---

### Category B: Attendance & Checkpoints (Sub-Step 6.2)

| Criterion ID | Description | Verification Method | Target Result |
|---|---|---|---|
| **AC-ATT-001** | Checkpoints enforce strict sequential order: `en_route` $\to$ `arrived` $\to$ `check_in` $\to$ `check_out`. | Sequence unit test | Submitting `check_in` before `arrived` returns HTTP 422. |
| **AC-ATT-002** | GPS optionality: Checkpoint submission without GPS latitude/longitude succeeds cleanly. | API schema test | Request payload omitting `check_in_lat`/`check_in_lng` returns HTTP 201 Created. |
| **AC-ATT-003** | Privacy preservation: GPS coordinates are never logged in application stdout, error logs, or public API responses. | Log audit & schema test | Coordinates excluded from public serialization; regex log scan confirms zero leakage. |
| **AC-ATT-004** | 12-Hour Auto-Approval SLA: Unconfirmed check-out auto-approves after 12 hours, updating booking to `completed`. | SLA background sweep test | Simulated 12h expiry transitions checkpoint to `approved` and booking to `completed`. |

---

### Category C: Inbound Payments & Double-Entry Ledger (Sub-Step 6.3)

| Criterion ID | Description | Verification Method | Target Result |
|---|---|---|---|
| **AC-FIN-001** | Double-entry invariant: Every journal transaction creates $\ge 2$ entries where $\sum \text{Debit Paise} = \sum \text{Credit Paise}$. | ORM listener & trigger test | Unbalanced journal creation raises `LedgerBalanceException` and transaction aborts. |
| **AC-FIN-002** | Integer Paise standard: All monetary values stored strictly as integer `BIGINT` representing Paise. | Schema & ORM validation | Attempting float assignment fails model validation; DB column type is `BIGINT`. |
| **AC-FIN-003** | Ledger balancing test harness parity: Double-entry balance validated via SQLAlchemy ORM `before_commit` event hook. | SQLite test suite execution | Unbalanced transaction aborts in SQLite test harness before commit. |
| **AC-FIN-004** | Webhook HMAC verification: Inbound payment webhook rejects payloads with invalid or missing HMAC signatures. | Webhook security test | Invalid HMAC header returns HTTP 401 Unauthorized; payload discarded. |
| **AC-FIN-005** | Two-phase webhook anti-race idempotency: Concurrent uncommitted duplicate returns HTTP 409; retry after commit returns HTTP 200. | Concurrency simulation test | Thread 2 receives HTTP 409 while Thread 1 is in-flight; subsequent retry returns HTTP 200. |
| **AC-FIN-006** | Zero-simulation policy: Mock payment gateway hard-blocked when `APP_ENV == 'production'`. | Configuration test | Starting app in production mode with mock gateway active raises fatal exception. |

---

### Category D: Worker Payouts, Escrow & Refunds (Sub-Step 6.4)

| Criterion ID | Description | Verification Method | Target Result |
|---|---|---|---|
| **AC-SET-001** | Decoupled state integrity: Booking status `completed` leaves payment in `held_in_escrow` pending inspection. | State decoupling test | Booking completes while payment remains `held_in_escrow` until inspection expiry. |
| **AC-SET-002** | 24-hour auto-release sweep: Completed bookings without active disputes auto-release escrow after 24 hours. | Sweep service test | Sweep transitions payment to `captured_settled` and creates worker payable journal entry. |
| **AC-SET-003** | Immediate employer release: Employer can manually trigger instant release, bypassing remaining inspection window. | API endpoint test | Calling `/confirm-and-pay` instantly moves funds from escrow to worker payable. |
| **AC-SET-004** | Concurrency safety: Multiple simultaneous release requests cannot double-credit worker payable. | Row-level locking test | `SELECT ... FOR UPDATE` ensures only the first request executes; others return idempotently. |
| **AC-SET-005** | Cancellation mobilization fee: Post-dispatch cancellation debits ₹150 (15,000 Paise) from advance escrow to worker payable. | Cancellation test | Employer cancel post-dispatch credits 15,000 Paise to worker payable account. |

---

### Category E: Reviews & Dispute Arbiter (Sub-Step 6.5)

| Criterion ID | Description | Verification Method | Target Result |
|---|---|---|---|
| **AC-REV-001** | Verification prerequisite: Reviews strictly forbidden unless booking is `completed` and payment is `captured_settled`. | Security gating test | Attempting review on in-progress booking returns HTTP 403 Forbidden. |
| **AC-REV-002** | Two-way mutual review verification: Both Employer and Worker submit reviews under composite `UNIQUE (booking_id, author_role)`. | Schema & integration test | Both parties submit reviews without unique constraint error; third review returns HTTP 409. |
| **AC-REV-003** | Blind review window: Submitted reviews remain unpublished until counterparty submits or 7 days elapse. | Blind review unit test | Public review query returns empty list while counterparty review is pending within 7 days. |
| **AC-DIS-001** | Dispute escrow freeze: Opening a dispute transitions payment to `disputed` and halts payout sweep. | Dispute integration test | Sweep skips disputed bookings; funds remain locked in escrow. |
| **AC-DIS-002** | Single-active dispute constraint: Submitting a second concurrent dispute on the same booking is blocked. | DB partial index test | Opening second dispute while first is `open` or `under_review` returns HTTP 409. |

---

### Category F: Governance, Code Quality & Immutability (Sub-Step 6.6)

| Criterion ID | Description | Verification Method | Target Result |
|---|---|---|---|
| **AC-GOV-001** | Zero baseline regressions: All 26 existing Stage 2 Step 5 tests continue to pass without modification. | Pytest suite execution | 26 passed, 0 failed, 0 skipped. |
| **AC-GOV-002** | Test coverage: Minimum 90% statement coverage across all new transaction, ledger, and state machine modules. | Pytest-cov report | Coverage $\ge 90.0\%$ for all new transaction modules. |
| **AC-GOV-003** | No hardcoded credentials: Zero test passwords, hardcoded phone fallbacks, or exposed API keys. | Static code scan | Regex scan for hardcoded credentials returns 0 matches. |
| **AC-GOV-004** | Prototype immutability: SHA-256 hash of prototype `2.html` and `index.html` matches verified baseline. | SHA-256 verification | Exact hash match: `489F4C38...` and `CD325D07...`. |
| **AC-GOV-005** | Migration safety: Offline Alembic migration script generated; zero unmigrated runtime DDL executed. | Alembic verification | Migration script verified offline; production DB untouched. |
