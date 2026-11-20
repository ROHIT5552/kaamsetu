# KAAMSETU STAGE 2, STEP 6.0 — SECURITY & FINANCIAL INTEGRITY
**Domain:** Transaction Security, Accounting Controls & Data Protection  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document:** `STEP6_0_SECURITY_AND_FINANCIAL_INTEGRITY.md`

---

## 1. Role-Based Authorization & IDOR Protection

### Default-Deny Access Control
Every transaction endpoint enforces server-side role validation via FastAPI dependencies:
* `require_employer`: Restricts booking creation, payment initiation, candidate acceptance, and employer reviews.
* `require_worker`: Restricts travel checkpoints (`en_route`, `arrived`), attendance check-in/out, and worker reviews.
* `require_admin` / `require_support`: Required for dispute arbitration, manual ledger adjustments, and payout approvals.

### Ownership Validation (Anti-IDOR)
In every endpoint accepting an ID (`booking_id`, `agreement_id`, `dispute_id`, etc.):
1. Query the aggregate entity by primary key.
2. Verify that the authenticated `user_id` matches either `employer.user_id` or `worker.user_id`.
3. If neither, return `HTTP 403 Forbidden` with a standardized audit alert.
4. Administrative users (`ADMIN`, `SUPPORT`) bypass ownership checks through explicit logged override.

---

## 2. Server-Side Financial Validation

* **Zero Trust for Client Pricing:** The client application never supplies fee amounts, commission rates, or tax figures. Client payloads supply only requested units (e.g. hours worked or agreed base rate); all arithmetic is calculated server-side.
* **Non-Negative Rates & Ranges:**
  * Base hourly rate: $\ge ₹50.00$ and $\le ₹10,000.00$.
  * Base daily rate: $\ge ₹200.00$ and $\le ₹25,000.00$.
  * Fixed-price agreements: $\ge ₹100.00$ and $\le ₹500,000.00$.
* **Tip Pass-Through Protection:** Platform commission is **never** deducted from customer tips. Tips are 100% credited to the worker's payable ledger account.

---

## 3. Idempotency & Webhook Integrity

### Client Idempotency Keys
* Inbound payment intents and booking creations require an `Idempotency-Key` header (UUID or client-generated token).
* Process:
  1. Check if `idempotency_key` exists in `payment_intents` / `bookings`.
  2. If found with status `completed` / `paid`, return cached response immediately without re-executing.
  3. If found with status `processing`, return `HTTP 409 Conflict` ("Request currently being processed").
  4. If not found, insert key in an active transaction and proceed.

### Webhook Verification & Replay Protection
* Inbound payment webhooks (e.g. Razorpay / Cashfree / UPI Switch):
  1. Verify the `X-Webhook-Signature` header using HMAC-SHA256 computed over raw request body with `PAYMENT_WEBHOOK_SECRET`.
  2. Insert event into `payment_webhook_events` with `UNIQUE (provider, event_id)`.
  3. If a duplicate event arrives, database returns a unique violation; the webhook handler acknowledges `HTTP 200 OK` immediately without re-crediting.

---

## 4. Double-Entry Ledger Invariants & Audit Trail

### Accounting Equation & Balance Invariant
Every transaction creates a `ledger_transaction` and at least two balanced `ledger_entries`:
$$\sum_{\text{entries}} \text{Debit} - \sum_{\text{entries}} \text{Credit} = 0.00$$

### Standard Transaction Journal Patterns

#### 1. Inbound Employer Payment (Escrow Deposit)
* **Debit:** `Asset: Bank Account (UPI/Gateway)` ($+₹1,000.00$)
* **Credit:** `Liability: Employer Escrow Holding` ($+₹1,000.00$)

#### 2. Booking Completion & Platform Settlement
* **Debit:** `Liability: Employer Escrow Holding` ($-₹1,000.00$)
* **Credit:** `Liability: Worker Payable Account` ($+₹900.00$)
* **Credit:** `Revenue: Platform Commission (10%)` ($+₹100.00$)

#### 3. Worker Payout Disbursal
* **Debit:** `Liability: Worker Payable Account` ($-₹900.00$)
* **Credit:** `Asset: Bank Account (Payout Clearing)` ($-₹900.00$)

#### 4. Dispute Refund to Employer
* **Debit:** `Liability: Employer Escrow Holding` ($-₹1,000.00$)
* **Credit:** `Asset: Bank Account (Refund Clearing)` ($-₹1,000.00$)

### Immutability Enforcement
* PostgreSQL trigger `trg_prevent_ledger_entry_mutation` forbids `UPDATE` and `DELETE` on `ledger_entries` and `payment_records`.
* Corrections must be made by creating a new `ledger_transaction` of type `REVERSAL` or `ADJUSTMENT`.

---

## 5. Fund State Disambiguation

To prevent confusion and financial fraud, the system explicitly distinguishes three fund states:
1. **Simulated Payments (Mock Provider):** Used strictly in local development and staging tests. Hard-blocked in production (`settings.APP_ENV == 'production'` raises fatal configuration error if mock provider is active).
2. **Provider-Confirmed Payments:** Gateway webhook or bank UTR has verified authorization and capture of customer funds into platform bank accounts.
3. **Settled Funds:** Monies transferred out of Escrow Holding into the worker's bank/UPI account following inspection period expiration or dispute resolution.

---

## 6. Concurrency Protection & Transaction Isolation

* **PostgreSQL Isolation Level:** All financial routines execute inside `READ COMMITTED` or `SERIALIZABLE` transaction scopes.
* **Pessimistic Row-Level Locking:**
  When transitioning a booking or releasing escrow balances:
  ```sql
  SELECT * FROM bookings WHERE id = :booking_id FOR UPDATE;
  SELECT * FROM wage_agreements WHERE booking_id = :booking_id FOR UPDATE;
  ```
  This eliminates race conditions where two simultaneous API requests attempt to complete, cancel, or payout the same work order.

---

## 7. PII, Privacy & Evidence Access

* **Phone Privacy:** Worker phone numbers remain hidden behind `contact_relay_token`.
* **Geolocation Discretion:** Check-in coordinates are stored with restricted permissions (`SELECT` granted only to audit logs and dispute reviewers).
* **Identity Documents:** No raw Aadhaar or PAN numbers are ever stored in the database.
* **Evidence Uploads:** Dispute attachments are stored in private S3/GCS buckets with short-lived (15-minute) pre-signed URLs.
