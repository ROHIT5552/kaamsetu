# KaamSetu — Stage 2, Step 6.0: Recommended Architecture Corrections

**Document Reference:** `STEP6_0_RECOMMENDED_CORRECTIONS.md`  
**Workspace:** `C:\Users\ajay\.gemini\antigravity\scratch\kaamsetu\staging\step6_0_planning\`  
**Pilot District:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra  
**Audit Date:** November 18, 2026  
**Status:** ACTIONABLE CORRECTIONS PLAN — PRE-STEP 6.1 IMPLEMENTATION GATE

---

## 1. Overview & Objective

This document translates the findings from [STEP6_0_FINDINGS_REGISTER.md](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_0_planning/STEP6_0_FINDINGS_REGISTER.md) into concrete, actionable architectural corrections. 

These corrections must be formally adopted by human governance prior to authorizing the commencement of Sub-Step 6.1 (`staging/step6_1_bookings/`).

---

## 2. Core Architectural Correction Plans

### Correction Plan 1: Fix Fatal Database Constraints & Missing Entities (AUD-KS6-001, AUD-KS6-002)

#### 1.1 Correct `reviews` Table Constraints
* **Problem:** `booking_id` was marked `UNIQUE` on line 195 of `STEP6_0_DATA_MODEL_REQUIREMENTS.md`, preventing mutual reviews.
* **Correction:**
  * Remove `UNIQUE` from foreign key column definition `booking_id -> bookings.id (ON DELETE CASCADE)`.
  * Retain solely the composite unique constraint: `UNIQUE (booking_id, author_role)`.
  * Ensure `author_role` check constraint enforces `CHECK (author_role IN ('employer', 'worker'))`.

#### 1.2 Introduce `worker_payout_methods` Entity
* **Problem:** Omission of payout account storage renders Sub-Step 6.4 payouts impossible.
* **Correction:** Add the following schema specification to the data model:
  ```sql
  CREATE TABLE worker_payout_methods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE RESTRICT,
      payout_type VARCHAR(20) NOT NULL CHECK (payout_type IN ('vpa', 'bank_account')),
      account_number_encrypted TEXT,
      ifsc_code VARCHAR(11),
      vpa_address VARCHAR(100),
      beneficiary_name VARCHAR(150) NOT NULL,
      gateway_beneficiary_id VARCHAR(100), -- Token from Cashfree/RazorpayX
      is_penny_drop_verified BOOLEAN DEFAULT FALSE,
      is_primary BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT uq_worker_primary_payout UNIQUE (worker_id, is_primary)
  );
  CREATE INDEX idx_payout_worker ON worker_payout_methods(worker_id);
  ```

---

### Correction Plan 2: Synchronize State Machine Enums & Add Missing Columns (AUD-KS6-004, AUD-KS6-005, AUD-KS6-006)

#### 2.1 Update `booking_status_enum`
Include all states present in the workflow state diagram:
```sql
CREATE TYPE booking_status_enum AS ENUM (
    'requested',
    'confirmed',
    'en_route',
    'arrived',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'employer_no_show',
    'disputed'
);
```

#### 2.2 Add `status` to `wage_agreements`
Replace the primitive boolean `is_settled` with a full status lifecycle:
```sql
CREATE TYPE wage_agreement_status_enum AS ENUM (
    'draft',
    'pending_counterparty',
    'active',
    'rejected',
    'revision_pending',
    'settled',
    'disputed_hold'
);

ALTER TABLE wage_agreements ADD COLUMN status wage_agreement_status_enum NOT NULL DEFAULT 'draft';
```

#### 2.3 Synchronize `payment_status_enum`
Harmonize the payment transaction status to decouple gateway capture from escrow hold:
```sql
CREATE TYPE payment_status_enum AS ENUM (
    'pending_intent',
    'processing',
    'held_in_escrow',
    'captured_settled',
    'released_for_payout',
    'disputed',
    'refunded',
    'failed'
);
```

---

### Correction Plan 3: Eliminate Webhook Concurrency Race Conditions (AUD-KS6-003)

#### 3.1 Two-Phase Webhook Ingestion & Commit Protection
* **Problem:** Webhook handler catches unique constraint and immediately acknowledges `HTTP 200 OK` even if the concurrent thread is uncommitted.
* **Correction:**
  Implement pessimistic advisory locking or row locking on webhook events:
  ```python
  # Pseudocode for robust webhook deduplication:
  async def handle_payment_webhook(payload: dict, event_id: str, provider: str):
      # Step 1: Select existing event with row lock if it exists
      stmt = select(PaymentWebhookEvent).where(
          PaymentWebhookEvent.provider == provider,
          PaymentWebhookEvent.event_id == event_id
      ).with_for_update()
      
      existing_event = await db.scalar(stmt)
      
      if existing_event:
          if existing_event.is_processed:
              # Already safely committed in prior transaction
              return Response(status_code=200, content={"status": "already_processed"})
          else:
              # Concurrent thread is currently executing; return HTTP 409 so gateway retries if thread fails
              raise HTTPException(status_code=409, detail="Concurrent webhook in progress")
      
      # Step 2: Insert new event marked is_processed=False
      new_event = PaymentWebhookEvent(provider=provider, event_id=event_id, is_processed=False)
      db.add(new_event)
      await db.flush()
      
      # Step 3: Execute ledger entry & escrow updates inside transaction
      await execute_payment_capture(payload)
      
      # Step 4: Mark processed and commit
      new_event.is_processed = True
      await db.commit()
      return Response(status_code=200, content={"status": "processed"})
  ```

---

### Correction Plan 4: Harmonize Currency Representation (AUD-KS6-007)

#### 4.1 Adopt `NUMERIC(12, 2)` Standard with Formal Decimal Class
* **Decision:** Retain `NUMERIC(12, 2)` across all database schemas and Pydantic models.
* **Justification:** `NUMERIC(12, 2)` in PostgreSQL is an exact fixed-point representation that does not suffer from IEEE-754 floating-point inaccuracies. It aligns with Indian banking reporting (INR and Paise) and avoids constant $\times 100$ and $/ 100$ translation errors between frontend display and database storage.
* **Action:**
  * Update `STEP6_0_RISK_REGISTER.md` (RSK-FIN-001) and `STEP6_0_ACCEPTANCE_CRITERIA.md` (AC-FIN-002) to remove references to `BIGINT` in Paise.
  * Formally define Python `decimal.Decimal` with `ROUND_HALF_UP` as the mandatory type across all financial domain services.

---

### Correction Plan 5: Indian Payment & Regulatory Realities (AUD-KS6-008, AUD-KS6-009)

#### 5.1 Shift from Sub-Merchant Splits to Direct Payout API
* **Problem:** Razorpay Route / Cashfree Split requires sub-merchant KYC (PAN, business registration), which blue-collar workers in Sambhajinagar do not possess.
* **Correction:**
  * **Inbound Collection:** Customer payments deposited into Platform Escrow/Nodal Account via standard Payment Gateway (Cards, UPI, Netbanking).
  * **Outbound Disbursals:** Automated Payout transfers via Cashfree Payouts / RazorpayX Payouts directly to worker UPI VPAs or Bank Accounts. Payout transfers require only account penny-drop / VPA validation, bypassing merchant onboarding barriers.

#### 5.2 Statutory Tax & PAN Policy Refinement
* **Problem:** Total zero-PAN storage policy conflicts with Section 194-O (1% TDS) and Section 206AA (20% penalty TDS) compliance.
* **Correction:**
  * Allow optional encrypted storage of worker PAN.
  * If a worker provides PAN and annual earnings are below ₹5,00,000: Zero TDS deducted.
  * If annual earnings exceed ₹5,00,000 with PAN: 1% TDS deducted under Section 194-O.
  * If worker does not provide PAN: Provide clear in-app disclosure of threshold monitoring, and consult professional tax counsel before enforcing 20% Section 206AA withholding on micro-earners.
  * PAN numbers must be encrypted at rest (`account_number_encrypted` style) and masked in all UI responses (`XXXXX1234X`).

---

### Correction Plan 6: Attendance Auto-Approval SLA & Multi-Day Clarity (AUD-KS6-012, AUD-KS6-013)

#### 6.1 12-Hour Attendance Auto-Approval Fallback
* Add the following rule to `STEP6_0_MODULE_SPECIFICATIONS.md` (Module C):
  *"If an employer does not approve a worker's check-out or file an attendance discrepancy within 12 hours of check-out submission, the attendance checkpoint automatically transitions to `approved`, enabling inspection window countdown."*

#### 6.2 Define Multi-Day Booking Architecture
* Clarify in `STEP6_0_MODULE_SPECIFICATIONS.md` (Module A):
  *"For the pilot, a `Booking` represents a single daily dispatch work order. For multi-day projects, the employer creates a multi-day parent contract that spawns discrete daily `Booking` dispatches, ensuring each day has a distinct scheduling, travel, check-in, and check-out lifecycle."*

---

### Correction Plan 7: SQLite / PostgreSQL Staging Test Parity (AUD-KS6-014)

#### 7.1 SQLAlchemy ORM Ledger Balancing Hook
* Since SQLite in-memory test databases cannot run PostgreSQL procedural triggers, implement an ORM session event validator:
  ```python
  @event.listens_for(Session, "before_commit")
  def validate_ledger_transaction_balance(session):
      for obj in session.new:
          if isinstance(obj, LedgerTransaction):
              debits = sum(e.amount for e in obj.entries if e.entry_type == "DR")
              credits = sum(e.amount for e in obj.entries if e.entry_type == "CR")
              if debits != credits:
                  raise ValueError(f"Ledger transaction unbalanced: Debits ({debits}) != Credits ({credits})")
  ```
  This guarantees that double-entry balance tests execute identically in SQLite staging and production PostgreSQL.

---

## 3. Human Governance Pre-Step 6.1 Action Checklist

Before human authorization is granted to initiate Sub-Step 6.1 (`staging/step6_1_bookings/`):

- [ ] **Acknowledge Audit Findings:** Confirm review of `AUD-KS6-001` through `AUD-KS6-015`.
- [ ] **Approve Review Constraint Fix:** Authorize removing `UNIQUE (booking_id)` from foreign key and enforcing `UNIQUE (booking_id, author_role)`.
- [ ] **Approve `worker_payout_methods` Entity:** Authorize adding the payout account model.
- [ ] **Approve Enums Synchronization:** Authorize adding `employer_no_show`, `disputed` to booking status, and `status` to wage agreements.
- [ ] **Approve Direct Payout Architecture:** Authorize Cashfree/RazorpayX Direct Payout API over Sub-Merchant split onboarding.
- [ ] **Approve `NUMERIC(12, 2)` Currency Standard:** Align AC-FIN-002 with `NUMERIC(12, 2)` fixed-point decimals.
- [ ] **Formal Authorization for Sub-Step 6.1:** Explicitly authorize starting Sub-Step 6.1 implementation in `staging/step6_1_bookings/`.
