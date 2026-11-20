# KAAMSETU STAGE 2, STEP 6.0 — EXECUTIVE ARCHITECTURE SPECIFICATION
**System:** KaamSetu Marketplace Transaction Engine  
**Pilot Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra, India  
**Scope:** Architecture Design & Implementation Planning (Step 6.0)  
**Governance:** Strict Planning Only — Zero Source Code Modifications, Zero DB Writes

---

## 1. Architectural Mission & Context

KaamSetu (कामसेतू) bridges skilled blue-collar workers (गवंडी, सुतार, प्लंबर, इलेक्ट्रिशियन, रंगारी, शेतमजूर) and employers across Chhatrapati Sambhajinagar. Having established the foundational identity, taxonomy, worker directory, job postings, and application lifecycle in Stage 2 Steps 1 through 5, **Step 6 introduces the transactional core of the marketplace**.

A transaction in KaamSetu is not merely a payment gateway callback; it is a legally sound, auditable, multi-stage contract between two parties that governs:
1. **Binding Work Commitments (Bookings):** Transitioning an accepted candidate into a scheduled work order with concrete checkpoints.
2. **Explicit Financial Terms (Wage Agreements):** Defining agreed wage rates (hourly, daily, or fixed-price), overtime multipliers, advance deposits, and platform commissions.
3. **Physical Verification (Attendance Checkpoints):** Verifying on-site presence and working duration through non-invasive, consent-based checkpoints without invasive or simulated tracking.
4. **Immutable Ledger & Payments:** Segregating authorization, captured funds, escrow holding, and settlement into an append-only double-entry ledger.
5. **Verified Mutual Reputation (Reviews & Ratings):** Permitting two-way evaluations strictly after verified work completion to prevent retaliatory or fake reviews.
6. **Arbitration & Resolution (Disputes):** Formal dispute workflows with auditable evidence, administrative reviews, and automated adjustment disbursements.

```
       [ Stage 2 Steps 1-5 ]                      [ Stage 2 Step 6 ]
+----------------------------------+    +------------------------------------+
|  Identity & OTP Authentication   |    |    6A: Bookings & Scheduling       |
|  Taxonomy (Marathi/English)      |--->|    6B: Wage Agreements             |
|  Worker & Employer Profiles      |    |    6C: Attendance Checkpoints      |
|  Job Postings & Discovery        |    |    6D: Payments & Double-Entry     |
|  Applications & Candidate Review |    |    6E: Reviews & Disputes          |
+----------------------------------+    +------------------------------------+
```

---

## 2. Core Architectural Invariants

### Invariant 1: Separation of Booking, Payment, and Settlement
In informal labor markets, payment authorization, job execution, and final wage settlement occur at distinct times. KaamSetu strictly separates:
- **Booking State:** Physical operational lifecycle (`requested` $\to$ `confirmed` $\to$ `en_route` $\to$ `arrived` $\to$ `in_progress` $\to$ `completed` / `cancelled`).
- **Payment Transaction State:** Inbound employer payment capture (`pending` $\to$ `processing` $\to$ `paid` / `failed` / `refunded`).
- **Worker Settlement State:** Outbound disbursal to worker bank/UPI (`pending` $\to$ `held_in_escrow` $\to$ `settled` / `reversed`).

A booking may be `completed` while payment settlement remains `held_in_escrow` during the post-job inspection window. A job cancellation does not erase payment history; it emits compensatory ledger entries.

### Invariant 2: Immutable Append-Only Ledger
Financial state is never modified in place (`UPDATE payment_records SET amount = ...` is forbidden). All balances, platform fees, refunds, and adjustments are derived from immutable ledger journal entries with balanced debits and credits:
$$\sum \text{Debits} = \sum \text{Credits}$$

### Invariant 3: Zero Simulation Policy
Per core project governance:
- No fake workers, fake reviews, or synthetic ratings.
- No client-side "Mark as Paid" bypasses; payments require verified provider webhooks or bank UTR verification.
- No simulated GPS live-tracking animations; physical presence is verified via explicit checkpoints with optional, consent-based geolocation.

### Invariant 4: Privacy & Anti-Harassment Safeguards
- Worker phone numbers are never returned in public APIs. Contact relay tokens route communications.
- Attendance geolocation coordinates are retained strictly for verification audits and never broadcast publicly.

---

## 3. High-Level Transaction Engine Topology

```
+-----------------------------------------------------------------------------------+
|                            FASTAPI APPLICATION LAYER                              |
+-----------------------------------------------------------------------------------+
|  /bookings  |  /wage-agreements  |  /attendance  |  /payments  |  /reviews  |  /disputes  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              DOMAIN SERVICES LAYER                                |
+-----------------------------------------------------------------------------------+
| - BookingService         (FSM transitions, scheduling conflicts, dispatch)         |
| - WageAgreementService   (Rate locking, overtime formulas, scope adjustments)     |
| - AttendanceService      (Check-in/out, hours computation, employer approvals)    |
| - PaymentLedgerService   (Double-entry journals, provider abstraction, webhooks)  |
| - ReviewService          (Verification gates, mutual rating calculation)         |
| - DisputeService         (Evidence ingestion, arbitration workflows)              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                          SECURITY & GOVERNANCE GUARDS                             |
+-----------------------------------------------------------------------------------+
| - Role Guards (WORKER, EMPLOYER, ADMIN, SUPPORT)                                  |
| - Resource Ownership & IDOR Protection                                            |
| - Idempotency Key Validation                                                      |
| - Webhook HMAC Signature Verification                                             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                          PERSISTENCE LAYER (PostgreSQL 16)                        |
+-----------------------------------------------------------------------------------+
| - Row-Level Locking (SELECT ... FOR UPDATE)                                       |
| - ACID Transaction Isolation (READ COMMITTED / SERIALIZABLE)                      |
| - Append-Only Financial Ledgers & Audit Event Logs                                |
+-----------------------------------------------------------------------------------+
```

---

## 4. Substage Breakdown

* **Step 6.1: Bookings & Wage Agreements** — Binding dispatch creation, status FSM, conflict detection, wage scope and rate definitions.
* **Step 6.2: Attendance Checkpoints** — Daily work logging, hours calculation, employer confirmation, and correction workflows.
* **Step 6.3: Financial Ledger & Inbound Payments** — Provider abstraction, double-entry accounting, idempotency, webhook ingestion, and platform commission.
* **Step 6.4: Settlements, Payouts & Adjustments** — Worker earnings ledger, UTR manual reconciliation, refunds, and penalty adjustments.
* **Step 6.5: Reviews, Ratings & Dispute Arbitration** — Verified post-job reviews, grievance filing, evidence uploads, and administrative resolution.
* **Step 6.6: Integration Testing & Security Audit** — Multi-party end-to-end integration tests, race-condition validation, and baseline promotion.
