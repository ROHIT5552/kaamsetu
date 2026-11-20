# KaamSetu — Stage 2, Step 6: Detailed Implementation Roadmap

**Document Reference:** `STEP6_0_IMPLEMENTATION_ROADMAP.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Scope:** Phased breakdown of Step 6 transactional modules, dependency graph, entry/exit criteria, and governance gates.  
**Status:** PLANNING DOCUMENT — AWAITING HUMAN AUTHORIZATION

---

## 1. Roadmap Architecture & Staging Philosophy

The implementation of Step 6 must be rigorously segmented into distinct, sequential sub-steps (6.1 through 6.6). To uphold the established governance and safety invariants:
1. **Isolated Workspaces:** Each sub-step must be implemented and tested in its own isolated staging directory before human review and promotion.
2. **Zero In-Flight Coupling:** Financial ledger transactions must never depend on unverified external assumptions; each sub-step builds on the verified models of the prior sub-step.
3. **No Database Write Without Migrations:** No migration will be executed against any shared or external database. All tests will run on isolated development SQLite/Postgres test fixtures.
4. **Mandatory Audit Gate:** Every sub-step must conclude with an independent audit and human authorization prior to proceeding to the next sub-step.

```
       [ Step 5 Promoted Baseline: Auth, Profiles, Jobs, Applications ]
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │ Sub-Step 6.1: Bookings & Wage Agreements │
                └────────────────────┬─────────────────────┘
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │ Sub-Step 6.2: Attendance & Checkpoints   │
                └────────────────────┬─────────────────────┘
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │ Sub-Step 6.3: Inbound Payments & Ledger  │
                └────────────────────┬─────────────────────┘
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │ Sub-Step 6.4: Escrow Releases & Payouts  │
                └────────────────────┬─────────────────────┘
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │ Sub-Step 6.5: Reviews & Dispute Arbiter  │
                └────────────────────┬─────────────────────┘
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │ Sub-Step 6.6: E2E Stress & Promotion     │
                └──────────────────────────────────────────┘
```

---

## 2. Sub-Step Phased Breakdown

### Sub-Step 6.1: Core Bookings & Wage Agreements Foundation
* **Objective:** Implement the fundamental booking entity, wage agreement terms, mutual acceptance handshake, and initial state machine transitions.
* **Dependencies:** Step 5 baseline (`app/modules/jobs`, `app/modules/workers`, `app/modules/employers`, `app/modules/auth`).
* **Components to Implement:**
  * `app/models/booking.py`: Refine existing `BookingModel` and `WageAgreementModel` definitions.
  * `app/modules/bookings/schemas.py`: Pydantic V2 schemas (`BookingCreate`, `BookingResponse`, `WageAgreementTerms`, `BookingStatusUpdate`).
  * `app/modules/bookings/service.py`: Business logic for booking initiation from an approved job application, wage agreement locking, state machine validation, and cancellation checks.
  * `app/modules/bookings/router.py`: REST endpoints:
    * `POST /api/v1/bookings/`: Create booking from job application.
    * `GET /api/v1/bookings/{booking_id}`: Get booking details (IDOR-protected).
    * `GET /api/v1/bookings/my-bookings`: List bookings for authenticated worker or employer.
    * `POST /api/v1/bookings/{booking_id}/accept`: Counterparty agreement acceptance.
    * `POST /api/v1/bookings/{booking_id}/cancel`: Cancellation with reason.
* **Test Plan:**
  * `test_booking_creation_from_application`: Verify booking creation auto-populates terms from accepted application.
  * `test_booking_idor_protection`: Verify third-party users cannot view or mutate bookings.
  * `test_wage_agreement_immutability`: Verify agreed wage amount cannot be mutated once `accepted`.
  * `test_booking_fsm_invalid_transitions`: Verify terminal transitions and illegal jumps are rejected with HTTP 422.
* **Entry Gate:** Human authorization for Step 6.1 start.
* **Exit Gate:** 100% test pass rate, zero baseline modifications, staging audit pass.

---

### Sub-Step 6.2: Attendance & Milestone Lifecycle
* **Objective:** Implement the physical workflow tracking (en route, arrived, check-in, check-out) with optional non-invasive geolocation verification and completion handshakes.
* **Dependencies:** Sub-Step 6.1 (`app/modules/bookings`).
* **Components to Implement:**
  * `app/models/booking.py`: Refine `AttendanceCheckpointModel`.
  * `app/modules/attendance/schemas.py`: Pydantic schemas (`CheckpointSubmit`, `CheckpointResponse`, `AttendanceSummary`).
  * `app/modules/attendance/service.py`: Sequential milestone validation (`en_route` -> `arrived` -> `in_progress` -> `completed`), time validation, geofencing helper (Haversine formula check with 500m tolerance when GPS provided; graceful fallback when GPS absent).
  * `app/modules/attendance/router.py`: REST endpoints:
    * `POST /api/v1/bookings/{booking_id}/attendance/checkpoint`: Submit milestone event.
    * `GET /api/v1/bookings/{booking_id}/attendance`: Fetch timeline of checkpoints.
* **Test Plan:**
  * `test_sequential_checkpoint_enforcement`: Ensure worker cannot `check_in` without `arrived`.
  * `test_gps_optionality`: Ensure checkpoint succeeds when GPS coordinates are omitted.
  * `test_employer_confirmation`: Ensure check-out triggers transition to `completed` pending inspection.
* **Entry Gate:** Sub-Step 6.1 promoted or staged with full test pass.
* **Exit Gate:** Checkpoint unit tests pass; no GPS privacy leaks in public logs.

---

### Sub-Step 6.3: Inbound Payments, Escrow & Double-Entry Ledger
* **Objective:** Implement the immutable double-entry ledger, payment gateway adapter abstraction, customer escrow deposit capture, and secure webhook HMAC verification.
* **Dependencies:** Sub-Step 6.1 (`app/modules/bookings`).
* **Components to Implement:**
  * `app/models/finance.py`: Refine `AccountModel`, `TransactionModel`, `LedgerEntryModel`, `PaymentModel`.
  * `app/modules/finance/ledger.py`: Core double-entry engine: `record_double_entry(tx_type, debit_acc, credit_acc, amount, reference_id)`. Balanced entry validator (`sum(debits) == sum(credits)`).
  * `app/modules/finance/gateway_adapter.py`: Abstract `PaymentGatewayAdapter` protocol and `MockPaymentGatewayAdapter` for deterministic sandboxed testing.
  * `app/modules/finance/schemas.py`: `PaymentIntentCreate`, `PaymentIntentResponse`, `WebhookPayload`.
  * `app/modules/finance/service.py`: Escrow hold initiation, webhook processing, signature verification, duplicate webhook idempotency deduplication.
  * `app/modules/finance/router.py`: REST endpoints:
    * `POST /api/v1/payments/intent`: Create escrow payment intent for booking.
    * `POST /api/v1/payments/webhook`: Authenticated webhook receiver.
    * `GET /api/v1/finance/accounts/me`: View authenticated user account ledger balance.
* **Test Plan:**
  * `test_double_entry_balance_invariant`: Verify engine raises an assertion error if debit != credit.
  * `test_ledger_immutability`: Verify update or delete operations on ledger tables raise database exceptions.
  * `test_webhook_hmac_tamper_rejection`: Tampered webhook payload fails signature verification.
  * `test_webhook_idempotency`: Duplicate webhook with same transaction ID processes exactly once.
* **Entry Gate:** Sub-Step 6.2 completion.
* **Exit Gate:** Zero-drift ledger test suite passes; mock gateway tests succeed without real network calls.

---

### Sub-Step 6.4: Escrow Release, Worker Payouts & Refund Mechanics
* **Objective:** Implement the settlement engine: releasing escrowed funds upon work approval, processing payouts to worker bank/UPI, and handling refunds/cancellations.
* **Dependencies:** Sub-Step 6.3 (`app/modules/finance`).
* **Components to Implement:**
  * `app/modules/finance/settlement.py`: Settlement state machine:
    * `release_escrow(booking_id)`: Transitions payment from `held_in_escrow` -> `captured_settled`. Generates ledger movements: Debit `ESCROW_HOLDINGS`, Credit `WORKER_PAYABLE` (net) and `PLATFORM_REVENUE` (fee).
    * `process_refund(booking_id, amount, reason)`: Ledger movements: Debit `ESCROW_HOLDINGS`, Credit `EMPLOYER_FUNDS`.
    * `dispatch_payout(worker_id, amount, vpa)`: Initiates payout transfer via gateway adapter; moves `WORKER_PAYABLE` -> `SETTLEMENT_CLEARING`.
  * `app/modules/finance/sweep.py`: Background/cron task for auto-releasing escrow upon 24-hour inspection window expiration.
  * `app/modules/finance/router.py`:
    * `POST /api/v1/bookings/{booking_id}/confirm-and-pay`: Employer instant release.
    * `POST /api/v1/payouts/request`: Worker payout trigger.
* **Test Plan:**
  * `test_settlement_ledger_splits`: Verify net wage and commission split correctly to respective accounts.
  * `test_auto_release_sweep`: Verify expired inspection window safely auto-disburses funds.
  * `test_concurrency_double_release`: Concurrently invoking `confirm-and-pay` executes exactly once using row locking.
* **Entry Gate:** Sub-Step 6.3 completion.
* **Exit Gate:** Settlement tests pass with complete ledger reconciliation.

---

### Sub-Step 6.5: Verification-Gated Reviews & Dispute Arbiter
* **Objective:** Implement authentic mutual ratings/reviews and formal dispute resolution workflows, strictly gated by verified financial and booking completion.
* **Dependencies:** Sub-Steps 6.1 through 6.4.
* **Components to Implement:**
  * `app/models/review.py` & `app/models/dispute.py`: Refine review and dispute entities.
  * `app/modules/reviews/service.py`: Blind review mechanism (7-day window; reviews hidden until both submit or window closes); verification check (`booking.status == COMPLETED` and `payment.status == SETTLED`).
  * `app/modules/disputes/service.py`: Dispute filing, escrow freezing (`payment.status -> DISPUTED`), evidence collection, resolution state machine (`resolved_refund`, `resolved_release`, `resolved_split`).
  * `app/modules/reviews/router.py`: REST endpoints:
    * `POST /api/v1/bookings/{booking_id}/reviews`: Submit rating & review.
    * `GET /api/v1/workers/{worker_id}/reviews`: Public aggregated ratings.
  * `app/modules/disputes/router.py`: REST endpoints:
    * `POST /api/v1/bookings/{booking_id}/disputes`: Open formal dispute.
    * `POST /api/v1/disputes/{dispute_id}/resolve`: Admin/Arbiter resolution hook.
* **Test Plan:**
  * `test_review_forbidden_before_completion`: Submitting review on pending booking returns HTTP 403.
  * `test_blind_review_hidden`: Worker rating remains invisible until employer submits or 7 days elapse.
  * `test_dispute_freezes_escrow`: Opening dispute locks escrow release sweep from executing.
  * `test_dispute_resolution_ledger_split`: Partial dispute resolution accurately executes partial refund + partial release.
* **Entry Gate:** Sub-Step 6.4 completion.
* **Exit Gate:** Review and dispute test suites pass 100%.

---

### Sub-Step 6.6: E2E Integration Stress, Security Audit & Promotion
* **Objective:** End-to-end multi-user integration simulation, high-concurrency race condition testing, final pre-promotion integrity audit, and staged promotion to `backend/`.
* **Dependencies:** Sub-Steps 6.1 through 6.5.
* **Activities:**
  * Run comprehensive test suite across all modules (existing 26 tests + new Step 6 tests).
  * Concurrency stress test: 20 simultaneous webhook callbacks and concurrent release attempts against a single booking.
  * Generate formal Alembic migration script (`alembic/versions/xxxx_step6_transactional_schema.py`).
  * Verify SHA-256 hashes of all baseline files to guarantee zero regression.
  * Human authorization sign-off and final promotion.
* **Exit Gate:** Complete test suite passes with 0 failures; human authorization granted for baseline merge.

---

## 3. Rollback & Fault-Isolation Strategy

To prevent corrupted staging states or broken baselines:
1. **Per-Sub-Step Backups:** Before promoting any sub-step into `backend/`, a full timestamped backup of the target directory is generated and verified with `SHA256SUMS.txt`.
2. **Atomic Rollback Script:** In case of failure during integration testing, a single rollback command reverts all affected files to the pre-sub-step backup.
3. **Database Migration Safety:** Migrations are purely additive during Step 6 (new tables, nullable foreign keys, indexed UUID columns). No destructive column drops or table renames are permitted.
