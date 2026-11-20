# KaamSetu — Stage 2, Step 6.0.1: Detailed Implementation Roadmap (CORRECTED)

**Document Reference:** `STEP6_0_1_IMPLEMENTATION_ROADMAP.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra  
**Scope:** Hardened Sub-Step Breakdown (6.1 through 6.6), Dependencies, Testing & Rollback Gates  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## 1. Staged Execution Topology

The Step 6 transactional implementation is partitioned into six sequential sub-steps. Each sub-step incorporates the architectural corrections from the independent audit to prevent downstream breakage.

```
                  [ Step 5 Promoted Baseline: 26/26 Tests Passing ]
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │ Sub-Step 6.1: Bookings & Wage Agreements     │
                  │ - 10-State Booking FSM, Single-Day Granularity│
                  │ - 7-State Wage FSM, Integer Paise Standard   │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │ Sub-Step 6.2: Attendance & Milestone Lifecycle│
                  │ - Milestones, 12h Auto-Approval SLA          │
                  │ - Break Duration Constraints, Optional GPS   │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │ Sub-Step 6.3: Inbound Payments & Ledger      │
                  │ - Two-Phase Webhook Ingestion Anti-Race      │
                  │ - Integer Paise Double-Entry (0% Worker Fee) │
                  │ - ORM Session Hook (SQLite/Postgres Parity)  │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │ Sub-Step 6.4: Worker Payouts & Disbursal     │
                  │ - worker_payout_methods (Encrypted VPA/Bank) │
                  │ - Direct Payout API Adapter (Cashfree/RazorX)│
                  │ - 24h Escrow Release & Cancellation Payouts  │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │ Sub-Step 6.5: Mutual Reviews & Disputes      │
                  │ - Composite UNIQUE (booking_id, author_role) │
                  │ - 7-Day Blind Review Window                  │
                  │ - Single-Active Dispute Constraint           │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │ Sub-Step 6.6: E2E Concurrency Stress & Merge │
                  │ - 20 Simultaneous Webhook Stress Test        │
                  │ - Alembic Migration Generation & Promotion   │
                  └──────────────────────────────────────────────┘
```

---

## 2. Detailed Sub-Step Specifications

### Sub-Step 6.1: Core Bookings & Wage Agreements Foundation (Corrected)
* **Scope:**
  * Implement `BookingModel` and `WageAgreementModel` in `backend/app/models/booking.py`.
  * Synchronize `booking_status_enum` with all 10 states: `requested`, `confirmed`, `en_route`, `arrived`, `in_progress`, `completed`, `cancelled`, `no_show`, `employer_no_show`, `disputed` (**AUD-KS6-004**).
  * Implement `wage_agreement_status_enum` with all 7 states: `draft`, `pending_counterparty`, `active`, `rejected`, `revision_pending`, `settled`, `disputed_hold` (**AUD-KS6-005**).
  * Standardize all monetary values to integer Paise (`BIGINT`) (**AUD-KS6-007**).
  * Implement single-day dispatch granularity with multi-day parent contract support (**AUD-KS6-013**).
* **Endpoints:**
  * `POST /api/v1/bookings/`: Create booking with idempotency key.
  * `GET /api/v1/bookings/{id}`: IDOR-protected booking retrieval.
  * `POST /api/v1/bookings/{id}/accept`: Counterparty acceptance.
  * `POST /api/v1/bookings/{id}/cancel`: Cancellation with reason.
  * `POST /api/v1/bookings/{id}/wage-agreements/amend`: Scope/rate revision proposal.
* **Test Plan:**
  * `test_booking_fsm_ten_states`: Verify all 10 states and reject illegal transitions.
  * `test_wage_agreement_seven_states`: Verify 7-state lifecycle transitions.
  * `test_integer_paise_precision`: Verify arithmetic avoids floating-point drift.
  * `test_booking_idor_guards`: Verify third-party users receive HTTP 403.
* **Exit Gate:** 100% test pass rate, staging audit pass.

---

### Sub-Step 6.2: Attendance & Milestone Lifecycle (Corrected)
* **Scope:**
  * Implement `AttendanceCheckpointModel` in `backend/app/models/booking.py`.
  * Sequential milestones: `en_route` $\to$ `arrived` $\to$ `check_in` $\to$ `check_out`.
  * Implement **12-Hour Automated Employer Confirmation SLA** (**AUD-KS6-012**).
  * Enforce break duration constraint: `break_duration_minutes <= elapsed_shift_minutes`.
  * Non-invasive consent-based geolocation with 500m urban tolerance in Sambhajinagar.
* **Endpoints:**
  * `POST /api/v1/bookings/{id}/attendance/checkpoint`: Submit milestone event.
  * `GET /api/v1/bookings/{id}/attendance`: Fetch timeline of checkpoints.
  * `POST /api/v1/bookings/{id}/attendance/sweep-sla`: Background sweep for 12h auto-approvals.
* **Test Plan:**
  * `test_sequential_checkpoint_order`: Ensure check-in cannot precede arrival.
  * `test_attendance_12h_auto_approval_sweep`: Verify unconfirmed check-outs auto-approve after 12h.
  * `test_break_duration_validation`: Verify break greater than elapsed time raises HTTP 422.
* **Exit Gate:** Attendance tests pass with zero GPS privacy leakage.

---

### Sub-Step 6.3: Inbound Payments, Escrow & Double-Entry Ledger (Corrected)
* **Scope:**
  * Implement `PaymentModel`, `AccountModel`, `TransactionModel`, `LedgerEntryModel` in `backend/app/models/finance.py`.
  * Synchronize `payment_status_enum`: `pending_intent`, `processing`, `held_in_escrow`, `captured_settled`, `released_for_payout`, `disputed`, `refunded`, `failed` (**AUD-KS6-006**).
  * Implement **Two-Phase Webhook Ingestion Anti-Race Handler** (**AUD-KS6-003**):
    * Concurrent uncommitted arrivals return `HTTP 409 Conflict`.
    * Acknowledges `HTTP 200 OK` only when `is_processed == TRUE`.
  * Implement POL-001 compliant journal templates: 0% worker fee, 5% employer convenience fee (**AUD-KS6-010**).
  * Implement SQLAlchemy `@event.listens_for(Session, "before_commit")` ledger balance hook for SQLite/Postgres parity (**AUD-KS6-014**).
* **Endpoints:**
  * `POST /api/v1/payments/intent`: Create escrow payment intent.
  * `POST /api/v1/payments/webhook`: Authenticated webhook ingestion receiver.
  * `GET /api/v1/finance/ledger/accounts/me`: View ledger balances.
* **Test Plan:**
  * `test_double_entry_balance_invariant`: Verify debit == credit enforced in integer Paise.
  * `test_webhook_two_phase_anti_race`: Simulate simultaneous duplicate webhooks; assert Thread 2 receives HTTP 409 while Thread 1 in-flight, and HTTP 200 on retry after Thread 1 commits.
  * `test_journal_zero_worker_deduction`: Verify worker payable receives 100% of wage.
* **Exit Gate:** Zero-drift ledger tests pass.

---

### Sub-Step 6.4: Worker Payout Methods & Direct Settlements (NEW)
* **Scope:**
  * Implement `WorkerPayoutMethodModel` in `backend/app/models/finance.py` (**AUD-KS6-002**).
  * AES-GCM-256 encrypted storage for bank account numbers (`account_number_encrypted`).
  * Integrate **Direct Payout API Adapter** (Cashfree Payouts / RazorpayX) bypassing sub-merchant underwriting (**AUD-KS6-009**).
  * Implement 24-hour escrow inspection release sweep.
  * Implement ₹150 mobilization cancellation payout backed by advance escrow (**AUD-KS6-011**).
* **Endpoints:**
  * `POST /api/v1/workers/me/payout-methods`: Register UPI VPA or Bank Account.
  * `GET /api/v1/workers/me/payout-methods`: View masked payout methods.
  * `POST /api/v1/payouts/dispatch`: Trigger batch payout to worker destination.
* **Test Plan:**
  * `test_payout_method_encryption`: Verify raw account numbers are encrypted in DB.
  * `test_direct_payout_dispatch`: Verify funds transfer from worker payable to clearing.
  * `test_cancellation_mobilization_release`: Verify ₹150 transfers to worker on post-dispatch cancel.
* **Exit Gate:** Payout tests pass with verified bank/VPA masking.

---

### Sub-Step 6.5: Mutual Reviews & Dispute Arbiter (Corrected)
* **Scope:**
  * Implement `ReviewModel`, `DisputeModel`, `DisputeResolutionModel` in `backend/app/models/review.py` and `dispute.py`.
  * Enforce **`UNIQUE (booking_id, author_role)`** in `reviews` table, enabling two-way mutual ratings (**AUD-KS6-001**).
  * Enforce **Single-Active Dispute Constraint** via partial unique index (**AUD-KS6-015**).
  * 7-day blind review window; verification check (`COMPLETED` + `CAPTURED_SETTLED`).
* **Endpoints:**
  * `POST /api/v1/bookings/{id}/reviews`: Submit rating & review.
  * `GET /api/v1/workers/{id}/reviews`: Public published reviews.
  * `POST /api/v1/bookings/{id}/disputes`: Open formal grievance.
  * `POST /api/v1/disputes/{id}/resolve`: Admin arbitration hook with compensating journals.
* **Test Plan:**
  * `test_mutual_review_submission`: Verify both Employer and Worker submit reviews without unique constraint violation.
  * `test_blind_review_hidden_until_both_submit`: Verify ratings remain unpublished until mutual submission or 7-day expiry.
  * `test_single_active_dispute_constraint`: Verify opening second active dispute raises HTTP 409.
* **Exit Gate:** Review and dispute test suites pass 100%.

---

### Sub-Step 6.6: E2E Integration Stress, Concurrency Verification & Promotion
* **Scope:**
  * Run full unified test suite (Step 5 baseline + all Step 6 tests).
  * Concurrency stress test: 20 simultaneous webhooks and 10 simultaneous release attempts against single work orders.
  * Generate formal offline Alembic migration script.
  * SHA-256 pre/post-promotion verification.
  * Staged promotion into `backend/`.
* **Exit Gate:** 100% test pass rate, 0 baseline regressions, human authorization for merge.
