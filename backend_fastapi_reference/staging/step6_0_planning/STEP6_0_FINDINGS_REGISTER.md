# KaamSetu — Stage 2, Step 6.0: Audit Findings Register

**Document Reference:** `STEP6_0_FINDINGS_REGISTER.md`  
**Workspace:** `C:\Users\ajay\.gemini\antigravity\scratch\kaamsetu\staging\step6_0_planning\`  
**Pilot District:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra  
**Audit Date:** November 18, 2026  
**Status:** FORMAL AUDIT FINDINGS REGISTER

---

## 1. Summary of Findings

| Severity | Count | Primary Impact |
|---|---|---|
| **CRITICAL** | **3** | Database schema deadlock (mutual reviews broken), missing payout tables, payment loss via webhook race condition. |
| **HIGH** | **6** | State machine enum truncation, missing columns, currency representation conflict, tax/PAN statutory compliance collision, gateway onboarding blockage. |
| **MEDIUM** | **4** | Journal policy contradictions, uncollectible cancellation fees, attendance confirmation lockup, multi-day temporal ambiguity. |
| **LOW** | **2** | SQLite trigger test incompatibility, dispute duplicate flood vulnerability. |
| **TOTAL** | **15** | **15 Formal Findings Cataloged** |

---

## 2. Detailed Findings Register

### Finding AUD-KS6-001 [CRITICAL]: Database Schema Bug in `reviews` Blocks Two-Way Mutual Reviews
* **Severity:** **CRITICAL**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Section 10, lines 195 & 208), `STEP6_0_MODULE_SPECIFICATIONS.md` (Module E).
* **Description:** In `STEP6_0_DATA_MODEL_REQUIREMENTS.md`, line 195 defines the foreign key constraint:  
  `booking_id -> bookings.id (UNIQUE, ON DELETE CASCADE)`.  
  Line 208 defines a second constraint: `UNIQUE (booking_id, author_role)`.
* **Root Cause:** Redundant and contradictory `UNIQUE` constraint placed on `booking_id` alone.
* **Impact:** Once an employer submits a review, the database creates a row with that `booking_id`. When the worker subsequently submits their review for the same completed booking, PostgreSQL will reject the insert with a unique constraint violation on `booking_id`. Two-way mutual reviews cannot function.
* **Recommended Remediation:** Remove the `UNIQUE` modifier from line 195. Retain solely the composite constraint: `UNIQUE (booking_id, author_role)`.

---

### Finding AUD-KS6-002 [CRITICAL]: Total Omission of Worker Payout Method Entity
* **Severity:** **CRITICAL**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md`, `STEP6_0_IMPLEMENTATION_ROADMAP.md` (Sub-Step 6.4, line 123).
* **Description:** Sub-Step 6.4 defines the function `dispatch_payout(worker_id, amount, vpa)` to transfer settled wages from platform accounts to worker bank/UPI accounts. However, Document 4 contains no table or entity for storing worker payout methods, bank account numbers, IFSC codes, UPI VPAs, penny-drop verification status, or gateway beneficiary IDs.
* **Root Cause:** Payout destination modeling was overlooked during data model design.
* **Impact:** Implementation of Sub-Step 6.4 is physically impossible without a schema migration to add payout accounts.
* **Recommended Remediation:** Add a new table `worker_payout_methods` to Document 4 with fields for `worker_id`, `payout_type` (`vpa`, `bank_account`), `account_number_encrypted`, `ifsc_code`, `vpa_address`, `beneficiary_name`, `is_verified`, and `is_primary`.

---

### Finding AUD-KS6-003 [CRITICAL]: Webhook Race Condition Prematurely Acknowledges Uncommitted Events
* **Severity:** **CRITICAL**
* **Affected Documents:** `STEP6_0_SECURITY_AND_FINANCIAL_INTEGRITY.md` (Section 3, lines 49–51).
* **Description:** The webhook specification states that when a duplicate webhook arrives with an existing `(provider, event_id)`, the handler catches the unique constraint violation and immediately responds with `HTTP 200 OK`. If two webhooks arrive concurrently, Thread 2 will return `HTTP 200 OK` before Thread 1 has committed its database transaction. If Thread 1 subsequently aborts, the payment is never credited, but the gateway assumes delivery succeeded and stops retrying.
* **Root Cause:** Acknowledging idempotency at insert time rather than commit/completion time.
* **Impact:** Permanent loss of captured customer payments, uncredited escrow balances, and stalled bookings.
* **Recommended Remediation:** Thread 2 must inspect `is_processed`. If `is_processed == FALSE`, Thread 2 must wait with a short timeout or return `HTTP 409 Conflict` / `HTTP 503 Service Unavailable`, prompting the gateway to retry until Thread 1 commits.

---

### Finding AUD-KS6-004 [HIGH]: State Machine Inconsistency — `booking_status_enum` Omits FSM States
* **Severity:** **HIGH**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Section 1, line 21), `STEP6_0_WORKFLOWS_AND_STATE_DIAGRAMS.md` (Section 1).
* **Description:** `STEP6_0_WORKFLOWS_AND_STATE_DIAGRAMS.md` includes states `employer_no_show` and `disputed` in the booking transition matrix. However, `STEP6_0_DATA_MODEL_REQUIREMENTS.md` omits both states from `booking_status_enum`.
* **Root Cause:** Desynchronization between workflow diagram drafting and relational schema drafting.
* **Impact:** Application attempts to transition a booking to `employer_no_show` or `disputed` will crash with database enum constraint errors.
* **Recommended Remediation:** Update `booking_status_enum` in Document 4 to explicitly include `employer_no_show` and `disputed`.

---

### Finding AUD-KS6-005 [HIGH]: Missing Lifecycle State Column in `wage_agreements`
* **Severity:** **HIGH**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Section 3, lines 58–67), `STEP6_0_WORKFLOWS_AND_STATE_DIAGRAMS.md` (Section 2).
* **Description:** The Wage Agreement lifecycle defines 7 distinct states (`draft`, `pending_counterparty`, `active`, `rejected`, `revision_pending`, `settled`, `disputed_hold`). The `wage_agreements` table schema in Document 4 has only a single boolean `is_settled`.
* **Root Cause:** Over-simplification of the `wage_agreements` entity in the data model.
* **Impact:** The application cannot persist intermediate negotiation, revision, or dispute states for wage contracts.
* **Recommended Remediation:** Add `status: wage_agreement_status_enum` (`draft`, `pending_counterparty`, `active`, `rejected`, `revision_pending`, `settled`, `disputed_hold`) to `wage_agreements`.

---

### Finding AUD-KS6-006 [HIGH]: Payment State Model Contradiction Across Documents
* **Severity:** **HIGH**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Section 7, line 140), `STEP6_0_WORKFLOWS_AND_STATE_DIAGRAMS.md` (Section 4), `STEP6_0_ACCEPTANCE_CRITERIA.md` (AC-SET-001).
* **Description:** Document 4 defines `payment_status_enum` with only `('pending', 'processing', 'paid', 'failed', 'refunded')`. Document 3 and Document 9 require `held_in_escrow`, `released_for_payout`, and `captured_settled`.
* **Root Cause:** Conflating inbound gateway transaction status with internal escrow holding status.
* **Impact:** The core architectural invariant "Separation of Booking, Payment, and Settlement" cannot be enforced because the payment record cannot distinguish between newly paid vs escrow-held vs settled funds.
* **Recommended Remediation:** Update `payment_status_enum` to include `pending`, `processing`, `held_in_escrow`, `captured_settled`, `disputed`, `refunded`, `failed`.

---

### Finding AUD-KS6-007 [HIGH]: Currency Data Type Contradiction (`NUMERIC(12, 2)` vs `BIGINT` in Paise)
* **Severity:** **HIGH**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Sections 3, 7, 9), `STEP6_0_RISK_REGISTER.md` (RSK-FIN-001), `STEP6_0_ACCEPTANCE_CRITERIA.md` (AC-FIN-002).
* **Description:** Document 4 specifies `NUMERIC(12, 2)` for all monetary columns. Conversely, RSK-FIN-001 and AC-FIN-002 explicitly mandate integer `BIGINT` representing Paise and state "Floating-point numbers strictly prohibited."
* **Root Cause:** Architectural vacillation between standard decimal SQL types and integer-paise representation.
* **Impact:** Automated test AC-FIN-002 will fail when testing the SQLAlchemy models. Developers will be unsure whether ₹500 is stored as `500.00` or `50000`.
* **Recommended Remediation:** Formalize the standard: Keep `NUMERIC(12, 2)` for database storage with strict `ROUND_HALF_UP` math (which is an exact fixed-point decimal, not a floating point), or adopt `BIGINT` integer paise everywhere. Update AC-FIN-002 and RSK-FIN-001 to align with the chosen representation.

---

### Finding AUD-KS6-008 [HIGH]: Statutory Tax Compliance Collision (Zero-PAN Policy vs Section 194-O)
* **Severity:** **HIGH**
* **Affected Documents:** `STEP6_0_SECURITY_AND_FINANCIAL_INTEGRITY.md` (Section 7, line 111), `STEP6_0_BUSINESS_POLICY_DECISIONS.md` (POL-007).
* **Description:** Document 5 states: *"No raw Aadhaar or PAN numbers are ever stored in the database."* However, Section 194-O of the Indian Income Tax Act mandates 1% TDS on e-commerce participants, and Section 206AA mandates a 20% penalty TDS rate if the participant fails to provide a PAN. Furthermore, Form 26Q quarterly tax reporting requires submitting the recipient's PAN.
* **Root Cause:** Applying Aadhaar privacy restrictions indiscriminately to PAN data.
* **Impact:** Inability to comply with statutory Indian income tax filing and risk of severe tax penalties for non-deduction or non-reporting.
* **Recommended Remediation:** Permit encrypted storage of worker PAN (or authorized hash/token from DigiLocker / NSDL API) in `worker_profiles` or `worker_payout_methods`, with masked display (`XXXXX1234X`).

---

### Finding AUD-KS6-009 [HIGH]: Indian Gateway Sub-Merchant Onboarding Feasibility
* **Severity:** **HIGH**
* **Affected Documents:** `STEP6_0_BUSINESS_POLICY_DECISIONS.md` (POL-006), `STEP6_0_IMPLEMENTATION_ROADMAP.md` (Sub-Step 6.3).
* **Description:** The roadmap assumes Razorpay Route or Cashfree Marketplace can be used for multi-party split payouts. In India, Razorpay Route requires each vendor/sub-merchant to undergo KYC and provide PAN and business registration. Blue-collar daily wage workers in Chhatrapati Sambhajinagar cannot satisfy sub-merchant onboarding.
* **Root Cause:** Assuming US-style Stripe Connect custom accounts work identically in India.
* **Impact:** Razorpay Route onboarding will fail for the vast majority of pilot workers.
* **Recommended Remediation:** Shift settlement architecture from "Sub-Merchant Split Route" to "Gateway Inbound Escrow Collection + Gateway Payout API (Cashfree Payouts / RazorpayX)" where funds disburse to bank accounts/VPAs verified via Penny Drop.

---

### Finding AUD-KS6-010 [MEDIUM]: Accounting Journal Template Contradicts Zero-Commission Policy
* **Severity:** **MEDIUM**
* **Affected Documents:** `STEP6_0_SECURITY_AND_FINANCIAL_INTEGRITY.md` (Section 4, lines 66–70), `STEP6_0_BUSINESS_POLICY_DECISIONS.md` (POL-001).
* **Description:** Document 5 contains a settlement journal deducting 10% from the worker:  
  `Debit: Escrow Holding ₹1000, Credit: Worker Payable ₹900, Credit: Platform Commission ₹100`.  
  This directly contradicts POL-001 in Document 6, which mandates a 0% deduction from worker wages and a 5% employer convenience fee.
* **Root Cause:** Document 5 used a generic marketplace example without reconciling with Document 6.
* **Impact:** Misleads developers during implementation of Sub-Step 6.3 ledger logic.
* **Recommended Remediation:** Replace the sample journal in Document 5 with the approved policy:  
  Employer pays ₹1,050.  
  `Debit: Escrow Holding ₹1050`  
  `Credit: Worker Payable ₹1000`  
  `Credit: Platform Commission Revenue ₹50`.

---

### Finding AUD-KS6-011 [MEDIUM]: Unenforceable Cancellation Penalties on Zero-Deposit Bookings
* **Severity:** **MEDIUM**
* **Affected Documents:** `STEP6_0_BUSINESS_POLICY_DECISIONS.md` (POL-002), `STEP6_0_MODULE_SPECIFICATIONS.md` (Module A).
* **Description:** POL-002 establishes a ₹150 mobilization compensation fee owed by the employer if cancelled after worker dispatch. If a booking has zero upfront escrow deposit (e.g. cash on completion), there is no mechanism in Indian banking to pull ₹150 from the employer's account without an active e-Mandate.
* **Root Cause:** Lack of dependency link between cancellation fee enforcement and advance escrow payment.
* **Impact:** Worker is left uncompensated, or platform incurs unbacked cash loss.
* **Recommended Remediation:** Restrict ₹150 dispatch mobilization guarantees to bookings where advance escrow deposit is confirmed, or debit the employer's platform credit balance with an outstanding negative balance that blocks future bookings until cleared.

---

### Finding AUD-KS6-012 [MEDIUM]: Attendance Stalling Risk Due to Lack of Auto-Approval Fallback
* **Severity:** **MEDIUM**
* **Affected Documents:** `STEP6_0_MODULE_SPECIFICATIONS.md` (Module C), `STEP6_0_WORKFLOWS_AND_STATE_DIAGRAMS.md` (Section 3).
* **Description:** Work completion requires employer check-out confirmation. If an employer is unresponsive, unavailable, or leaves the job site, the worker's shift remains trapped in `checked_out` without reaching `approved`.
* **Root Cause:** Missing SLA / auto-approval timeout in attendance lifecycle.
* **Impact:** Worker's wage release is stalled indefinitely by a passive employer.
* **Recommended Remediation:** Introduce a 12-hour auto-approval timer: If the employer does not confirm check-out or raise a discrepancy within 12 hours of worker check-out, the checkpoint automatically transitions to `approved`.

---

### Finding AUD-KS6-013 [MEDIUM]: Ambiguity in Multi-Day Booking Architecture
* **Severity:** **MEDIUM**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Section 1), `STEP6_0_MODULE_SPECIFICATIONS.md` (Module A).
* **Description:** The `bookings` table has single timestamp fields `en_route_at`, `arrived_at`, `started_at`, and `completed_at`. However, construction and agricultural jobs in Sambhajinagar often span multiple days. It is unclear whether a multi-day job is represented as one booking with multiple `attendance_checkpoints` or multiple linked single-day bookings.
* **Root Cause:** Unstated assumption regarding booking granularity.
* **Impact:** If one booking spans 5 days, `en_route_at` and `arrived_at` cannot accurately track days 2 through 5.
* **Recommended Remediation:** Explicitly define that a `Booking` represents a single-day work shift for the pilot, OR state that for multi-day bookings, `en_route` and `arrived` milestones are tracked within `attendance_checkpoints` rather than the parent `bookings` table.

---

### Finding AUD-KS6-014 [LOW]: SQLite Staging Harness Incompatibility with PostgreSQL Deferred Triggers
* **Severity:** **LOW**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Section 9, line 187), `STEP6_0_SECURITY_AND_FINANCIAL_INTEGRITY.md` (Section 4, line 80).
* **Description:** The ledger specification relies on PostgreSQL deferred procedural triggers to enforce debit/credit balance. The local staging test harness uses SQLite, which cannot execute PostgreSQL procedural triggers.
* **Root Cause:** Designing database constraints solely for production PostgreSQL without local test harness parity.
* **Impact:** Ledger balancing invariants will not be tested in automated SQLite staging runs unless replicated in Python ORM event hooks.
* **Recommended Remediation:** Implement SQLAlchemy `@event.listens_for(Session, "before_commit")` validator that verifies `sum(debits) == sum(credits)` in Python, ensuring identical enforcement across SQLite and PostgreSQL.

---

### Finding AUD-KS6-015 [LOW]: Missing Dispute Concurrency Check
* **Severity:** **LOW**
* **Affected Documents:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md` (Section 11).
* **Description:** The `disputes` table schema lacks a unique constraint or index preventing multiple simultaneous open disputes on the same booking.
* **Root Cause:** Omission of partial unique index on active disputes.
* **Impact:** A user could submit multiple concurrent dispute requests for a single booking, creating duplicate arbitration tickets.
* **Recommended Remediation:** Add a partial unique index in PostgreSQL:  
  `CREATE UNIQUE INDEX idx_single_open_dispute ON disputes (booking_id) WHERE status IN ('open', 'under_review');`.
