# KAAMSETU STAGE 2, STEP 6.0.1 — EXECUTIVE ARCHITECTURE SPECIFICATION (CORRECTED)

**System:** KaamSetu Marketplace Transaction Engine  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Scope:** Corrected Transaction Architecture & Implementation Planning (Step 6.0.1)  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)  
**Governance:** Strict Planning Only — Zero Source Code Modifications, Zero DB Writes, Original Step 6.0 Preserved

---

## 1. Architectural Mission & Context

KaamSetu (कामसेतू) bridges skilled blue-collar workers (गवंडी, सुतार, प्लंबर, इलेक्ट्रिशियन, रंगारी, शेतमजूर) and employers across Chhatrapati Sambhajinagar. Having established the foundational identity, taxonomy, worker directory, job postings, and application lifecycle in Stage 2 Steps 1 through 5, **Step 6 introduces the transactional core of the marketplace**.

Following the Stage 2 Step 6.0 independent adversarial architecture audit (which identified 15 findings across schema constraints, concurrency, and regulatory realities), **Step 6.0.1 establishes a hardened, fully synchronized architecture**.

A transaction in KaamSetu is a legally sound, auditable, multi-stage contract between two parties that governs:
1. **Binding Work Commitments (Bookings):** Discrete single-day dispatch orders or multi-day project parent contracts with synchronized operational states.
2. **Explicit Financial Terms (Wage Agreements):** Defining agreed wage rates stored strictly in **integer Paise (`BIGINT`)**, overtime formulas, advance deposits, and platform convenience fees.
3. **Physical Verification (Attendance Checkpoints):** Non-invasive milestones (`en_route`, `arrived`, `check_in`, `check_out`) with a **12-hour automated employer sign-off fallback SLA** and optional consent-based geolocation.
4. **Immutable Double-Entry Ledger & Direct Payouts:** Append-only journal entries tracking balanced debits and credits, decoupled escrow custody, and automated disbursals via **Direct UPI/IMPS Payout APIs** (bypassing sub-merchant onboarding hurdles for unorganized workers).
5. **Verified Mutual Reputation (Reviews & Ratings):** Strict verification gating, **composite uniqueness `(booking_id, author_role)`** enabling genuine two-way evaluations, and 7-day blind review windows.
6. **Arbitration & Resolution (Disputes):** Single-active dispute protection, formal evidence ingestion, and administrative compensating ledger adjustments.

```
       [ Stage 2 Steps 1-5 ]                     [ Stage 2 Step 6.0.1 Corrected ]
+----------------------------------+    +-------------------------------------------------+
|  Identity & OTP Authentication   |    |  6.1: Bookings (Single/Multi-day FSM)           |
|  Taxonomy (Marathi/English)      |--->|  6.1: Wage Agreements (7-state FSM, Paise)      |
|  Worker & Employer Profiles      |    |  6.2: Attendance (12h Auto-Approval SLA)        |
|  Job Postings & Discovery        |    |  6.3: Ledger & Webhooks (Pessimistic Ingestion) |
|  Applications & Candidate Review |    |  6.4: Direct Payouts (Bank/UPI VPA Storage)     |
|                                  |    |  6.5: Mutual Reviews (Composite Key) & Disputes |
+----------------------------------+    +-------------------------------------------------+
```

---

## 2. Foundational Architectural Invariants (Hardened)

### Invariant 1: Separation of Booking, Payment, and Settlement
In informal labor markets, operational dispatch, payment capture, and wage settlement occur at distinct times. KaamSetu strictly decouples:
* **Booking State:** Physical operational lifecycle (`requested` $\to$ `confirmed` $\to$ `en_route` $\to$ `arrived` $\to$ `in_progress` $\to$ `completed` / `cancelled` / `no_show` / `employer_no_show` / `disputed`).
* **Inbound Payment State:** Customer payment capture into platform escrow (`pending_intent` $\to$ `processing` $\to$ `held_in_escrow` $\to$ `captured_settled` $\to$ `released_for_payout` / `refunded` / `disputed` / `failed`).
* **Worker Settlement State:** Disbursal to worker destination (`pending_disbursal` $\to$ `dispatched` $\to$ `cleared` / `reversed`).

A booking may reach `completed` while payment remains `held_in_escrow` pending the 24-hour inspection window. Payout disbursal moves funds from platform liability to external clearing only upon inspection expiration or explicit employer release.

### Invariant 2: Integer Paise Currency Standard
To eliminate floating-point rounding errors and fractional currency discrepancies across all financial services, database tables, and API contracts:
* **All monetary values are stored strictly as integer `BIGINT` representing Paise** (₹1.00 = 100 paise; ₹800.00 = 80,000 paise).
* Floating-point numbers (`float`, `double`) are strictly prohibited in application models, database schemas, and ledger logic.
* Formatting to Rupees (e.g. `₹800.00`) is handled strictly at the API serialization boundary.

### Invariant 3: Immutable Append-Only Ledger
Financial state is never modified in place (`UPDATE ledger_entries` and `DELETE FROM ledger_entries` are physically blocked). All balances, platform fees, refunds, and adjustments are derived from immutable journal entries where:
$$\sum \text{Debits (Paise)} = \sum \text{Credits (Paise)}$$
Both PostgreSQL deferred procedural triggers and SQLAlchemy ORM session event listeners enforce this equation prior to commit.

### Invariant 4: Direct Payout Architecture over Sub-Merchant Splits
Because unorganized blue-collar laborers in Chhatrapati Sambhajinagar do not possess registered business entities or formal merchant tax documentation:
* Inbound payments are collected into an RBI-regulated Payment Aggregator Nodal/Escrow Account.
* Outbound settlements are dispatched via **Direct Payout APIs** (e.g. Cashfree Payouts / RazorpayX) directly to worker UPI VPAs or Bank Accounts verified via automated Penny Drop.
* Sub-merchant underwriting (Razorpay Route) is avoided for worker settlement.

### Invariant 5: Two-Phase Webhook Ingestion & Anti-Race Idempotency
Duplicate webhooks arriving concurrently must never acknowledge `HTTP 200 OK` until the primary ingestion transaction has **committed** (`is_processed == TRUE`). Concurrent uncommitted duplicate arrivals return `HTTP 409 Conflict`, guaranteeing that payment gateways will retry if the primary thread aborts.

### Invariant 6: Zero Simulation & Verified Reputation
* No fake workers, fake reviews, or simulated GPS routes.
* Physical presence relies on timestamped milestone checkpoints and counterparty confirmation.
* Reviews require a completed booking and settled payment, governed by a 7-day mutual blind review period with composite uniqueness `UNIQUE (booking_id, author_role)`.

---

## 3. High-Level Transaction Engine Topology (Version 2.0.0)

```
+-----------------------------------------------------------------------------------+
|                            FASTAPI APPLICATION LAYER                              |
+-----------------------------------------------------------------------------------+
|  /bookings  |  /wage-agreements  |  /attendance  |  /payments  |  /payouts  |  ...|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              DOMAIN SERVICES LAYER                                |
+-----------------------------------------------------------------------------------+
| - BookingService         (FSM validation, single/multi-day scheduling)            |
| - WageAgreementService   (7-state FSM, versioned amendments, integer Paise)       |
| - AttendanceService      (Check-in/out, 12h auto-approval SLA, optional GPS)      |
| - PaymentLedgerService   (Double-entry engine, Paise balance, provider adapters)  |
| - PayoutService          (Worker payout methods, penny-drop, direct dispatch)     |
| - ReviewService          (Verification gate, composite uniqueness, blind window)  |
| - DisputeService         (Single-open constraint, evidence, arbitration split)    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                          SECURITY & GOVERNANCE GUARDS                             |
+-----------------------------------------------------------------------------------+
| - Role Guards (WORKER, EMPLOYER, ADMIN, SUPPORT)                                  |
| - Ownership & IDOR Protection (Anti-tamper aggregate verification)                |
| - Two-Phase Webhook Ingestion & Advisory Locking                                  |
| - Encrypted PII Storage (Worker PAN / Bank Account Encryption)                    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                          PERSISTENCE LAYER (PostgreSQL 16)                        |
+-----------------------------------------------------------------------------------+
| - Row-Level Locking (SELECT ... FOR UPDATE)                                       |
| - ACID Transaction Isolation (READ COMMITTED)                                     |
| - Synchronized Enums & Composite Unique Constraints                               |
| - Immutable Append-Only Ledger (Triggers & ORM listeners)                         |
+-----------------------------------------------------------------------------------+
```

---

## 4. Substage Implementation Roadmap (Post-Audit Structure)

* **Step 6.1: Core Bookings & Wage Agreements** — Synchronized FSMs, single/multi-day dispatches, 7-state wage agreements, integer Paise models.
* **Step 6.2: Attendance & Milestone Lifecycle** — Checkpoint sequence, 12-hour auto-approval SLA, break constraints, non-invasive optional geolocation.
* **Step 6.3: Inbound Payments, Escrow & Double-Entry Ledger** — Two-phase webhook handler, integer Paise ledger, POL-001 compliant journal templates (0% worker fee).
* **Step 6.4: Worker Payout Methods & Direct Settlements** — `worker_payout_methods` table, encrypted account storage, direct UPI/IMPS payout integration.
* **Step 6.5: Reviews, Ratings & Dispute Arbitration** — Composite unique review constraints, blind reviews, single-open dispute protection.
* **Step 6.6: E2E Integration Stress, Concurrency Verification & Promotion** — SQLite/Postgres trigger parity verification, webhook race-condition stress tests, final baseline merge.
