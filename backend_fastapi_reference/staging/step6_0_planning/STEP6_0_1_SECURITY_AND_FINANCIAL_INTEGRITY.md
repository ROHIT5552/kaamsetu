# KAAMSETU STAGE 2, STEP 6.0.1 — SECURITY & FINANCIAL INTEGRITY (CORRECTED)

**Domain:** Transaction Security, Accounting Controls & Data Protection  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document Reference:** `STEP6_0_1_SECURITY_AND_FINANCIAL_INTEGRITY.md`  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## 1. Role-Based Authorization & IDOR Protection

### Default-Deny Access Control
Every transaction endpoint strictly enforces server-side role validation via FastAPI dependencies:
* `require_employer`: Restricts booking creation, payment initiation, candidate acceptance, and employer reviews.
* `require_worker`: Restricts travel checkpoints (`en_route`, `arrived`), attendance check-in/out, payout method registration, and worker reviews.
* `require_admin` / `require_support`: Required for dispute arbitration, manual ledger adjustments, and payout approvals.

### Ownership Validation (Anti-IDOR)
In every endpoint accepting an entity ID (`booking_id`, `agreement_id`, `payout_method_id`, `dispute_id`):
1. Query the aggregate entity by primary key.
2. Verify that the authenticated `user_id` matches the designated owner (`employer.user_id` or `worker.user_id`).
3. For payout methods, verify strictly that `payout_method.worker_id == current_worker.id`.
4. If ownership does not match, return `HTTP 403 Forbidden` and emit an audit security alert.

---

## 2. Server-Side Financial Validation & Policy-Compliant Journals

### Integer Paise Standard (AUD-KS6-007)
* All monetary amounts are handled strictly as integer `BIGINT` representing Paise.
* Float arithmetic is prohibited; divisions utilize integer arithmetic with floor or explicit rounding helpers.

### Corrected Accounting Journal Templates (Reconciled with POL-001 - AUD-KS6-010)
Under the approved platform policy (0% worker wage deduction; 5% employer convenience fee):

#### 1. Inbound Employer Escrow Deposit (₹1,000 Wage + 5% Fee = ₹1,050.00 / 105,000 Paise)
* **Debit:** `Asset: Gateway Clearing Account (1010)` (+105,000 Paise)
* **Credit:** `Liability: Employer Escrow Holdings (2010)` (+105,000 Paise)

#### 2. Work Completion & Escrow Settlement (Worker Receives 100% of Agreed Wage)
* **Debit:** `Liability: Employer Escrow Holdings (2010)` (-105,000 Paise)
* **Credit:** `Liability: Worker Payable Account (2020)` (+100,000 Paise)
* **Credit:** `Revenue: Platform Convenience Fees (4010)` (+5,000 Paise)

#### 3. Worker Payout Disbursal (Direct UPI/IMPS Transfer)
* **Debit:** `Liability: Worker Payable Account (2020)` (-100,000 Paise)
* **Credit:** `Asset: Bank Payout Clearing (1020)` (-100,000 Paise)

#### 4. Tip Pass-Through (100% Worker Pass-Through)
Customer tips are 100% credited to the worker with zero platform commission:
* **Debit:** `Liability: Employer Escrow Holdings (2010)` (-20,000 Paise)
* **Credit:** `Liability: Worker Payable Account (2020)` (+20,000 Paise)

#### 5. Cash on Completion Accounting (AUD-KS6-010)
When an employer settles wages directly in physical cash at the job site:
* Platform creates an uncollected receivable for the platform convenience fee:
  * **Debit:** `Asset: Worker Platform Receivables (1030)` (+5,000 Paise)
  * **Credit:** `Revenue: Platform Convenience Fees (4010)` (+5,000 Paise)
* **Credit Limit Guardrail:** If a worker's uncollected platform receivables balance exceeds ₹500 (50,000 Paise), new cash bookings are locked until settled via digital payment.

---

## 3. Webhook Integrity & Concurrency Race Elimination (AUD-KS6-003)

### Two-Phase Ingestion & Commit Protection
To eliminate the race condition where duplicate webhooks prematurely acknowledge `HTTP 200 OK` before the primary transaction commits:

```python
async def ingest_payment_webhook(
    provider: str,
    event_id: str,
    raw_payload: bytes,
    signature_header: str,
    session: AsyncSession
) -> dict:
    # 1. Cryptographic HMAC validation over raw request body
    verify_hmac_sha256(raw_payload, signature_header, settings.WEBHOOK_SECRET)
    
    # 2. Check existing event record with pessimistic row locking
    stmt = (
        select(PaymentWebhookEvent)
        .where(
            PaymentWebhookEvent.provider == provider,
            PaymentWebhookEvent.event_id == event_id
        )
        .with_for_update()
    )
    result = await session.execute(stmt)
    existing_event = result.scalar_one_or_none()

    if existing_event is not None:
        if existing_event.is_processed:
            # Safely committed in prior completed transaction
            return {"status": "already_processed", "event_id": event_id}
        else:
            # Concurrent thread is currently in-flight; return HTTP 409
            # This instructs the payment gateway to retry if the active thread aborts
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Concurrent webhook processing in progress. Retry requested."
            )

    # 3. Insert new event record marked is_processed=False
    new_event = PaymentWebhookEvent(
        provider=provider,
        event_id=event_id,
        is_processed=False
    )
    session.add(new_event)
    await session.flush()

    # 4. Execute atomic payment status update and double-entry ledger posting
    await process_payment_capture(new_event, session)

    # 5. Mark processed and commit atomically
    new_event.is_processed = True
    new_event.processed_at = datetime.now(timezone.utc)
    await session.commit()

    return {"status": "processed", "event_id": event_id}
```

---

## 4. PII, Tax Data & Sensitive Storage (AUD-KS6-002, AUD-KS6-008)

### Worker Payout Destination Security
* Worker bank account numbers are encrypted at rest using AES-GCM-256 (`account_number_encrypted`) using keys managed in AWS KMS / GCP Secret Manager.
* Bank account numbers and UPI VPAs are masked in API responses:
  * Bank Account: `XXXXXXXX1234`
  * UPI VPA: `9822XXXXXX@upi`

### Statutory Tax Compliance (PAN Data Handling - AUD-KS6-008)
* To comply with **Section 194-O** (1% TDS on e-commerce participants) and **Section 206AA** (20% penalty TDS rate if PAN is absent) for Form 26Q reporting:
  * The platform permits secure, voluntary encrypted storage of worker PAN (`pan_encrypted`).
  * PAN values are encrypted at rest, masked in UI responses (`XXXXX1234X`), and accessible solely to authorized tax reporting services.
  * Raw Aadhaar numbers remain strictly prohibited.

### Geolocation Discretion
* Geolocation coordinates (`check_in_lat`, `check_in_lng`) are captured only upon explicit worker device consent.
* Coordinates are used solely for distance checks ($\le 500$ meters) and are never exposed in public directories or operational logs.

---

## 5. Concurrency Protection & Transaction Isolation

* **Isolation Level:** All financial routines execute inside `READ COMMITTED` transactions with pessimistic row-level locking.
* **Row-Level Locking:**
  ```sql
  SELECT * FROM bookings WHERE id = :booking_id FOR UPDATE;
  SELECT * FROM wage_agreements WHERE booking_id = :booking_id FOR UPDATE;
  SELECT * FROM payment_transactions WHERE booking_id = :booking_id FOR UPDATE;
  ```
  This eliminates race conditions where simultaneous API requests attempt to complete, cancel, or payout the same work order.

---

## 6. Testing Harness Parity (SQLite & PostgreSQL Parity - AUD-KS6-014)

Because the development and staging test suites run on SQLite in-memory databases (which do not support PostgreSQL deferred procedural triggers):
* Double-entry balancing is enforced in both application and persistence layers via a SQLAlchemy ORM session listener:
  ```python
  @event.listens_for(Session, "before_commit")
  def validate_ledger_transaction_balance(session):
      for obj in session.new:
          if isinstance(obj, LedgerTransaction):
              debits = sum(e.amount_paise for e in obj.entries if e.entry_type == "DR")
              credits = sum(e.amount_paise for e in obj.entries if e.entry_type == "CR")
              if debits != credits:
                  raise ValueError(
                      f"Unbalanced Ledger Transaction: Debits ({debits}) != Credits ({credits})"
                  )
  ```
  This ensures 100% identical validation of ledger invariants across SQLite staging test runs and PostgreSQL production deployments.
