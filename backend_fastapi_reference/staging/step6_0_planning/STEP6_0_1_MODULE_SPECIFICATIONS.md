# KAAMSETU STAGE 2, STEP 6.0.1 — MODULE SPECIFICATIONS (CORRECTED)

**Modules:** Bookings, Wage Agreements, Attendance, Payments & Ledger, Reviews, Disputes  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document Reference:** `STEP6_0_1_MODULE_SPECIFICATIONS.md`  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## Module A: Bookings & Scheduling (Hardened)

### 1. Purpose & Booking Granularity
The Booking module orchestrates the binding engagement between an employer and a worker.
* **Granularity Standard:** To eliminate temporal ambiguities in construction and agricultural engagements (addressing **AUD-KS6-013**):
  * A `Booking` entity represents a **discrete single-day dispatch work order** (one shift).
  * For multi-day projects (e.g. 5 days of masonry), the employer creates a `ProjectContract` that spawns discrete daily `Booking` dispatches, ensuring each day possesses a distinct travel, check-in, check-out, and attendance verification lifecycle.
* **Status Synchronization:** The booking lifecycle strictly adheres to the complete 10-state machine (**AUD-KS6-004**):
  `requested`, `confirmed`, `en_route`, `arrived`, `in_progress`, `completed`, `cancelled`, `no_show`, `employer_no_show`, `disputed`.

### 2. Creation & Reference Generation
* **Reference Format:** `BK-YYYYMMDD-XXXX` (alphanumeric, unique, non-sequential).
* **Idempotency:** Client must supply `Idempotency-Key` header on creation. Duplicate requests return existing booking.

### 3. Scheduling & Rescheduling
* Scheduled time stored in UTC (`scheduled_at`).
* Rescheduling permitted only while in `requested` or `confirmed` status. Counterparty acceptance required. Max 2 reschedule requests per booking.

### 4. Cancellation & Mobilization Protection Rules (AUD-KS6-011)
* **Worker Cancellation:** Permitted prior to `en_route`. Cancellation reason required and logged. Repeated cancellations incur temporary dispatch cooldowns.
* **Employer Cancellation:**
  * $>12$ hours before `scheduled_at`: Full 100% refund of advance deposit.
  * $<2$ hours before `scheduled_at` or after worker triggers `en_route`: Employer is charged a **₹150 (15,000 Paise) mobilization fee**, credited 100% to worker payable.
  * **Collection Enforceability Rule:** The ₹150 mobilization guarantee is strictly applicable to bookings with **confirmed advance escrow deposits**. For bookings with zero advance deposit, the employer's platform account is debited with a negative balance of ₹150; new bookings are blocked until the default is settled.

### 5. No-Show & Employer Absence Handshakes
* **Worker No-Show:** If worker fails to trigger `arrived` within 2 hours of `scheduled_at`, employer can mark `no_show`. Booking transitions to terminal `no_show`; advance escrow refunded 100% to employer.
* **Employer No-Show:** If worker reaches site (`arrived`) and employer is absent/unresponsive after 30 minutes, worker marks `employer_no_show`. Booking transitions to `employer_no_show`; ₹150 mobilization fee released to worker from advance escrow.

---

## Module B: Wage Agreements (Hardened)

### 1. Purpose & Integer Paise Standard (AUD-KS6-007)
Governs agreed financial terms. Every booking has exactly one active Wage Agreement prior to work dispatch.
* **All monetary fields are stored strictly as integer `BIGINT` representing Paise.**
* Float arithmetic is prohibited; integer arithmetic prevents fractional rounding drift.

### 2. Agreement Types & Rates
1. **Daily Wage (दैनिक मजुरी):** Standard 8-hour shift rate (e.g. ₹800/day = 80,000 Paise).
2. **Hourly Wage (ताशी मजुरी):** Rate per hour (e.g. ₹150/hr = 15,000 Paise) with defined minimum billable hours (e.g. 2 hours).
3. **Fixed-Price Scope (ठोक काम / उजरा):** Fixed lumpsum for agreed deliverables (e.g. ₹4,500 = 450,000 Paise).

### 3. Seven-State Lifecycle (AUD-KS6-005)
The `wage_agreements` table explicitly persists its full lifecycle via `status: wage_agreement_status_enum`:
* `draft`: Initial wage proposal generated upon booking creation.
* `pending_counterparty`: Submitted to other party for review.
* `active`: Approved terms governing active work.
* `rejected`: Terms declined by counterparty.
* `revision_pending`: Scope or overtime amendment proposed during job execution.
* `settled`: Final wages reconciled and disbursed.
* `disputed_hold`: Financial terms locked during grievance arbitration.

### 4. Overtime & Scope Additions
* Overtime rate defaults to $1.5\times$ base hourly rate (calculated via integer division: `(base_hourly_paise * 150) // 100`).
* Scope adjustments require a new pending `wage_agreement_versions` row. Once accepted by counterparty, active balances update atomically.

---

## Module C: Attendance Checkpoints (Hardened)

### 1. Purpose & Non-Invasive Verification
Tracks on-site presence without continuous GPS surveillance or simulated tracking animations.

### 2. Sequential Milestone Lifecycle
1. `en_route`: Worker indicates transit to work location.
2. `arrived`: Worker reaches site address.
3. `check_in`: Worker initiates physical work shift.
4. `check_out`: Worker concludes physical work shift. Total hours computed.

### 3. Automated Employer Approval SLA (AUD-KS6-012)
* When a worker submits `check_out`, the employer receives an immediate push notification / SMS to review and approve the hours.
* **12-Hour Auto-Approval Fallback:** If the employer takes no action and lodges no dispute within **12 hours** of worker check-out, the checkpoint automatically transitions to `approved`, and the booking status updates to `completed`. This prevents passive or negligent employers from stalling worker compensation.

### 4. Break & Duration Consistency Constraints
* Total active hours = $\sum (\text{check\_out} - \text{check\_in}) - \text{breaks}$.
* Schema enforces: `break_duration_minutes <= EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 60`. Negative working durations are rejected.

### 5. Geolocation Policy (Consent-Based)
* GPS capture is purely optional. If granted, distance to service address is validated within a 500-meter tolerance in Chhatrapati Sambhajinagar urban zones.
* If GPS is absent, employer confirmation serves as primary proof. Raw coordinates are never logged or exposed in public responses.

---

## Module D: Payments, Ledger & Direct Payouts (Hardened)

### 1. Decoupled Payment State Machine (AUD-KS6-006)
Customer payment records track capture into platform escrow independently of booking completion:
* `pending_intent`: Payment session created; awaiting employer gateway completion.
* `processing`: Gateway webhook / intent launched.
* `held_in_escrow`: Payment verified and held in platform escrow liability.
* `captured_settled`: Work completed and inspection window passed; funds released for payout.
* `released_for_payout`: Funds transferred to worker payout clearing.
* `disputed`: Escrow locked pending grievance resolution.
* `refunded`: Returned to employer.
* `failed`: Payment attempt failed or abandoned.

### 2. Double-Entry Append-Only Ledger Design
* All journal amounts are stored as integer `BIGINT` representing Paise.
* Every journal transaction contains $\ge 2$ entries where:
  $$\sum \text{Debit Paise} = \sum \text{Credit Paise}$$
* Immutability: Database triggers and SQLAlchemy event hooks forbid `UPDATE` and `DELETE` on ledger entries. Adjustments require compensating reversing journals.

### 3. Direct Payout API Integration (AUD-KS6-009)
* Rather than attempting sub-merchant onboarding (Razorpay Route) which requires business registration and PAN cards unavailable to unorganized workers:
  * Inbound payments are received into an RBI-compliant Payment Aggregator Escrow/Nodal Account.
  * Outbound payouts are executed via **Direct Payout APIs (Cashfree Payouts / RazorpayX)** directly to worker UPI VPAs or Bank Accounts verified via Penny Drop.

### 4. Cash on Completion Accounting Limits (AUD-KS6-010)
* When cash on completion is authorized:
  * Platform debits a designated `Worker Commission Receivable` asset account for the platform fee.
  * If the worker's outstanding unpaid platform commission balance exceeds ₹500 (50,000 Paise), the worker cannot accept further cash bookings until the balance is settled via digital payment.

---

## Module E: Reviews & Ratings (Hardened)

### 1. Strict Verification Gate
Reviews are strictly prohibited unless:
1. `booking.status == 'completed'`
2. `payment.status == 'captured_settled'`

### 2. Composite Uniqueness for Two-Way Mutual Reviews (AUD-KS6-001)
* To permit both the Employer and the Worker to evaluate each other for the same engagement without database constraint failure:
  * The schema removes any single-column unique constraint on `booking_id`.
  * The table enforces: **`UNIQUE (booking_id, author_role)`**, where `author_role IN ('employer', 'worker')`.

### 3. Retaliation Prevention (Blind Review Window)
* Reviews remain unpublished (`is_published = FALSE`) until **both parties submit** or until a 7-day review window elapses.
* Once published, ratings cannot be edited directly; corrections require an administrative appeal.

---

## Module F: Disputes & Arbitration (Hardened)

### 1. Grievance Filing & Single-Active Dispute Constraint (AUD-KS6-015)
* Either party may file a dispute prior to payout release.
* Schema enforces a partial unique index:
  `CREATE UNIQUE INDEX uq_single_active_dispute ON disputes (booking_id) WHERE status IN ('open', 'under_review');`
  This prevents concurrent duplicate dispute tickets on the same booking.

### 2. Dispute Escrow Freeze
* Filing a dispute immediately transitions payment to `disputed`, locking the automated payout sweep.
* Evidence attachments are uploaded to secure storage with short-lived (15-minute) pre-signed URLs.

### 3. Resolution Outcomes & Balanced Journals
* `FULL_REFUND_EMPLOYER`: 100% of escrow returned to employer.
* `FULL_PAYOUT_WORKER`: 100% of wage disbursed to worker.
* `SPLIT_ADJUSTMENT`: Arbitrated partial payout to worker, partial refund to employer.
* Administrative resolutions automatically post balanced compensating ledger journals before closing the dispute.
