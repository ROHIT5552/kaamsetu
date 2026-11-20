# KAAMSETU STAGE 2, STEP 6.0 — MODULE SPECIFICATIONS
**Modules:** Bookings, Wage Agreements, Attendance, Payments & Ledger, Reviews, Disputes  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document:** `STEP6_0_MODULE_SPECIFICATIONS.md`

---

## Module A: Bookings & Scheduling

### 1. Purpose & Responsibilities
The Booking module orchestrates the binding engagement between an employer and a worker. Once an application is `accepted` on a job posting (or through direct locality booking), a Booking record is instantiated to govern scheduling, dispatch checkpoints, and operational completion.

### 2. Creation & Reference Generation
* **Trigger:** Employer accepts an application (`POST /api/v1/applications/{id}/status` $\to$ `accepted`), or creates a direct booking from a public worker card.
* **Reference Format:** `BK-YYYYMMDD-XXXX` (e.g. `BK-20261118-8A3F`), alphanumeric, unique, non-sequential to prevent enumeration.
* **Idempotency:** Client must provide `Idempotency-Key` header on creation to prevent duplicate orders caused by network retries.

### 3. Scheduling & Rescheduling
* **Initial Schedule:** Set at creation with UTC timestamp (`scheduled_at`).
* **Rescheduling:** Permitted only when status is `requested` or `confirmed`.
  * Either party can propose a new time slot.
  * Rescheduling requires acceptance by the counterparty before `scheduled_at` is updated.
  * Maximum 2 reschedule requests per booking.

### 4. Cancellation & No-Show Policies
* **Worker Cancellation:** Permitted prior to `en_route`. If cancelled after `confirmed`, cancellation reason is required and recorded in audit log.
* **Employer Cancellation:** Permitted prior to `arrived`. Cancellation fees may apply depending on timing (refer to Business Policy Decisions).
* **No-Show:** If worker fails to trigger `arrived` within 2 hours of `scheduled_at`, employer can mark `no_show`. If employer is absent from site upon arrival, worker can mark `employer_no_show`.

### 5. Duplicate Prevention
* A worker cannot have overlapping `confirmed` or `in_progress` bookings for the same time window.
* An employer cannot generate multiple active bookings from the same single-worker job application.

---

## Module B: Wage Agreements

### 1. Purpose & Contractual Types
Governs the agreed financial terms and rate structure. Every booking must have exactly one active Wage Agreement prior to work commencement.

### 2. Agreement Types
1. **Daily Wage (दैनिक मजुरी):** Standard 8-hour shift rate (e.g. ₹800/day for Mason, ₹500/day for Helper).
2. **Hourly Wage (ताशी मजुरी):** Rate per hour with defined minimum billable hours (e.g. ₹150/hour, minimum 2 hours).
3. **Fixed-Price Scope (ठोक काम / उजरा):** Fixed lumpsum for agreed deliverables (e.g. ₹4,500 for painting 2 rooms).

### 3. Overtime & Scope Additions
* **Standard Shift:** 8 hours of work with 1 hour meal break.
* **Overtime Rate:** Calculated at $1.5\times$ or $2.0\times$ base hourly rate for hours exceeding standard shift.
* **Scope Changes:** Material scope additions (e.g., additional plastering work) cannot be orally assumed; they must be submitted as a **Wage Agreement Revision**.

### 4. Mutual Consent Revisions & Versioning
* Revisions can be initiated by worker or employer.
* A revision creates a new pending `WageAgreementVersion`.
* The counterparty must accept via API; upon acceptance, active balances on `WageAgreement` update atomically.
* Full version history is retained immutably for dispute auditing.

---

## Module C: Attendance Checkpoints

### 1. Purpose & Non-Invasive Verification
Tracks on-site presence without invasive constant tracking or fake simulated live updates. Real physical verification is grounded in verifiable milestones.

### 2. Real-World Milestones
1. **`en_route`:** Worker indicates transit to site.
2. **`arrived`:** Worker reaches the employer's designated locality/address.
3. **`check_in`:** Worker initiates work shift. Employer is notified to acknowledge.
4. **`check_out`:** Worker concludes work shift. Total active hours computed.

### 3. Geolocation Policy (Consent-Based & Optional)
* GPS capture at check-in/out is **strictly optional and consent-based**.
* If granted, coordinate distance to designated service location is verified within a tolerance radius (e.g. 500 meters in Sambhajinagar urban areas).
* If GPS is denied or unavailable, employer explicit in-app confirmation serves as the primary verification mechanism.
* Raw coordinates are never exposed in public directories or to unauthorized third parties.

### 4. Hours Calculation & Corrections
* Active working hours = $\sum (\text{check\_out} - \text{check\_in}) - \text{breaks}$.
* If worker forgets to check out or employer disputes hours, an `AttendanceCorrection` request is submitted with reason and proposed hours. Requires mutual confirmation.

---

## Module D: Payments & Financial Ledger

### 1. Inbound Payments & Escrow Holding
* Payments are initiated via `PaymentIntent` with client-supplied idempotency key.
* **Supported Methods (Pilot Architecture):**
  * UPI (BHIM, Google Pay, PhonePe, Paytm).
  * Bank Transfer / NEFT / IMPS with manual UTR verification.
  * Cash on Completion (recorded on-platform for audit and commission tracking).
* Inbound payments are credited to a platform Escrow Holding liability account, held until job completion and inspection window expire.

### 2. Double-Entry Append-Only Ledger Design
The transaction engine uses strict double-entry bookkeeping:
* **Account Classes:**
  * `ASSET`: Cash at Bank, Gateway Clearing Account.
  * `LIABILITY`: Employer Escrow Deposits, Worker Payable Balances.
  * `REVENUE`: Platform Commission, Convenience Fees.
  * `EXPENSE`: Gateway Processing Fees, Referral Payouts.
* **Rule:** Every ledger transaction contains $\ge 2$ entries where:
  $$\sum \text{Debit Amounts} = \sum \text{Credit Amounts}$$
* **Immutability:** Modifying or deleting ledger entries is blocked by database constraints. Adjustments require compensating reversing entries.

### 3. Provider Abstraction & Webhook Safety
```
              +--------------------------+
              |   BasePaymentProvider    |
              +--------------------------+
                           ^
          +----------------+----------------+
          |                                 |
+----------------------+         +----------------------+
|  MockPaymentProvider |         | Real Gateway Adapter |
| (Dev/Staging tests)  |         | (Razorpay / Cashfree)|
+----------------------+         +----------------------+
```
* In development/staging, `MockPaymentProvider` is used. In production, mock provider execution is hard-blocked.
* Webhook endpoints verify HMAC-SHA256 signatures over raw request payloads.
* Idempotent webhook processing prevents double-crediting on duplicate delivery.

### 4. Currency & Rounding Invariants
* Currency: Strictly `INR` (Indian Rupee).
* Precision: `NUMERIC(12, 2)` across all monetary fields.
* Rounding Rule: `ROUND_HALF_UP` to the nearest whole paisa (₹0.01). Float arithmetic is strictly prohibited.

---

## Module E: Reviews & Ratings

### 1. Purpose & Authenticity Guard
Reputation is the foundation of trust in blue-collar employment. Fake reviews, paid ratings, and retaliatory feedback destroy marketplace credibility.

### 2. Strict Verification Gate
* Reviews are **strictly prohibited** unless the corresponding booking is in `completed` status and payment is settled/verified.
* One review per participant per booking:
  * Employer reviews Worker (quality, punctuality, behavior).
  * Worker reviews Employer (workplace safety, promptness of payment, behavior).

### 3. Retaliation Prevention (Blind Review Period)
* To prevent retaliatory reviews, reviews remain hidden until **both parties submit** or until a 7-day review window elapses.
* Once published, ratings cannot be edited directly; corrections require an administrative appeal.

---

## Module F: Disputes & Arbitration

### 1. Grievance Filing & Categories
Either party may file a formal dispute prior to final payout settlement.
* **Categories:**
  * `WAGE_DISPUTE`: Disagreement over hours, overtime, or unpaid balance.
  * `WORK_QUALITY`: Incomplete, substandard, or damaged work.
  * `ATTENDANCE_DISCREPANCY`: Disputed check-in times or no-show.
  * `BEHAVIORAL_SAFETY`: Unprofessional conduct or safety violation.

### 2. Evidence Submission & Access Control
* Both parties may upload photos, job notes, or attendance logs.
* Files are stored in secure object storage with non-public signed URLs.
* PII (Aadhaar cards, bank account numbers) is strictly prohibited from public evidence attachments.

### 3. Arbitration Workflow & Resolution Outcomes
* **States:** `OPEN` $\to$ `UNDER_REVIEW` $\to$ `RESOLVED` $\to$ `CLOSED`.
* **Outcomes:**
  * `FULL_REFUND_EMPLOYER`: Booking cancelled; funds returned to employer.
  * `FULL_PAYOUT_WORKER`: Dispute dismissed; full wage disbursed to worker.
  * `SPLIT_ADJUSTMENT`: Partial payout to worker, partial refund to employer.
* Administrative resolutions generate automatic compensating ledger entries, ensuring zero discrepancy between dispute decisions and ledger balances.
