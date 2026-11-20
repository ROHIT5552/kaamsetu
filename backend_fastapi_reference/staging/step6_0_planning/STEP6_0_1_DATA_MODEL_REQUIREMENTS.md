# KAAMSETU STAGE 2, STEP 6.0.1 — DATA MODEL REQUIREMENTS (CORRECTED)

**Target Engine:** PostgreSQL 16 + PostGIS 3.4  
**ORM / Migration Framework:** SQLAlchemy 2.0 (asyncio) + Alembic  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document Reference:** `STEP6_0_1_DATA_MODEL_REQUIREMENTS.md`  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## 1. Global Data Model Invariants

1. **Integer Paise Standard (AUD-KS6-007):** Every monetary column in the database is defined strictly as `BIGINT` representing Paise (1 Rupee = 100 Paise). Floating-point and decimal columns for money are strictly prohibited to prevent IEEE-754 and rounding drift.
2. **Primary Keys:** All primary keys are `UUID` generated via `uuid_generate_v4()` or Python `uuid.uuid4()`.
3. **UTC Timestamps:** All datetime fields use `TIMESTAMPTZ` with timezone set to UTC.

---

## 2. Entity Specifications

### 1. `bookings` (Hardened)
* **Purpose:** Single-day dispatch work order record governing physical execution and checkpoints.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `employer_id` $\to$ `employer_profiles.id` (`ON DELETE RESTRICT`)
  * `primary_worker_id` $\to$ `worker_profiles.id` (`ON DELETE RESTRICT`)
  * `job_id` $\to$ `jobs.id` (`ON DELETE SET NULL`, optional)
  * `parent_contract_id` $\to$ `bookings.id` (`ON DELETE SET NULL`, optional for multi-day parent links)
* **Key Fields:**
  * `booking_code`: `VARCHAR(32)` unique reference (`BK-YYYYMMDD-XXXX`).
  * `idempotency_key`: `VARCHAR(64)` unique client key.
  * `status`: `booking_status_enum` (**AUD-KS6-004** synchronized with all 10 states: `requested`, `confirmed`, `en_route`, `arrived`, `in_progress`, `completed`, `cancelled`, `no_show`, `employer_no_show`, `disputed`).
  * `service_address`: `TEXT` (site location in Sambhajinagar).
  * `area`: `VARCHAR(80)` (Cidco, Waluj, Chikalthana, etc.).
  * `scheduled_at`: `TIMESTAMPTZ` (UTC).
  * `en_route_at`, `arrived_at`, `started_at`, `completed_at`, `cancelled_at`: `TIMESTAMPTZ`.
  * `cancellation_reason`: `TEXT`.
* **Constraints & Indexes:**
  * `UNIQUE (booking_code)`
  * `UNIQUE (idempotency_key)`
  * `INDEX idx_bookings_employer_status (employer_id, status)`
  * `INDEX idx_bookings_worker_status (primary_worker_id, status)`
  * `INDEX idx_bookings_area_scheduled (area, scheduled_at)`

---

### 2. `wage_agreements` (Hardened)
* **Purpose:** Contractual financial terms for a booking, governed by a 7-state FSM.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:** `booking_id` $\to$ `bookings.id` (`UNIQUE`, `ON DELETE CASCADE`).
* **Key Fields (Integer Paise - AUD-KS6-007):**
  * `agreement_type`: `VARCHAR(30)` (`hourly`, `daily`, `fixed_price`).
  * `agreed_wage_paise`: `BIGINT` (contracted amount in Paise).
  * `advance_amount_paise`: `BIGINT` default `0`.
  * `amount_due_paise`: `BIGINT`.
  * `amount_paid_paise`: `BIGINT` default `0`.
  * `platform_commission_paise`: `BIGINT` default `0`.
  * `tip_amount_paise`: `BIGINT` default `0` (100% pass-through to worker).
  * `status`: `wage_agreement_status_enum` (**AUD-KS6-005**: `draft`, `pending_counterparty`, `active`, `rejected`, `revision_pending`, `settled`, `disputed_hold`).
  * `current_version`: `INTEGER` default `1`.
  * `currency`: `VARCHAR(3)` default `'INR'`.
* **Constraints:**
  * `CHECK (agreed_wage_paise >= 5000)` (Minimum ₹50.00).
  * `CHECK (amount_paid_paise >= 0)`
  * `CHECK (tip_amount_paise >= 0)`

---

### 3. `wage_agreement_versions`
* **Purpose:** Immutable audit trail of proposed and accepted wage amendments.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `wage_agreement_id` $\to$ `wage_agreements.id` (`ON DELETE CASCADE`)
  * `proposed_by` $\to$ `users.id` (`ON DELETE SET NULL`)
* **Key Fields:**
  * `version_number`: `INTEGER` (monotonic).
  * `proposed_wage_paise`: `BIGINT`.
  * `scope_change_description`: `TEXT`.
  * `status`: `VARCHAR(20)` (`pending`, `accepted`, `rejected`).
  * `decided_at`: `TIMESTAMPTZ`.
* **Constraints:** `UNIQUE (wage_agreement_id, version_number)`.

---

### 4. `attendance_checkpoints` (Hardened)
* **Purpose:** Physical verification milestones for daily work shifts.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `booking_id` $\to$ `bookings.id` (`ON DELETE CASCADE`)
  * `worker_id` $\to$ `worker_profiles.id` (`ON DELETE RESTRICT`)
* **Key Fields:**
  * `shift_date`: `DATE`.
  * `check_in_at`: `TIMESTAMPTZ`.
  * `check_out_at`: `TIMESTAMPTZ` (nullable).
  * `break_duration_minutes`: `INTEGER` default `0`.
  * `total_minutes_worked`: `INTEGER` (computed).
  * `is_employer_verified`: `BOOLEAN` default `FALSE`.
  * `is_auto_approved`: `BOOLEAN` default `FALSE` (**AUD-KS6-012**).
  * `auto_approved_at`: `TIMESTAMPTZ` (nullable).
  * `check_in_lat`, `check_in_lng`: `NUMERIC(9, 6)` (optional).
* **Constraints & Indexes:**
  * `INDEX idx_attendance_booking_shift (booking_id, shift_date)`
  * `CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)`
  * `CHECK (check_out_at IS NULL OR break_duration_minutes <= EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 60)`

---

### 5. `worker_payout_methods` (NEW TABLE - AUD-KS6-002)
* **Purpose:** Secure destination account store for worker payouts, eliminating sub-merchant underwriting barriers.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:** `worker_id` $\to$ `worker_profiles.id` (`ON DELETE RESTRICT`).
* **Key Fields:**
  * `payout_type`: `VARCHAR(20)` (`CHECK (payout_type IN ('vpa', 'bank_account'))`).
  * `account_number_encrypted`: `TEXT` (AES-256 encrypted at rest; nullable if VPA).
  * `ifsc_code`: `VARCHAR(11)` (nullable if VPA).
  * `vpa_address`: `VARCHAR(100)` (e.g. `9822000000@upi`; nullable if bank account).
  * `beneficiary_name`: `VARCHAR(150)` (verified counterparty name).
  * `gateway_beneficiary_id`: `VARCHAR(100)` (tokenized beneficiary ID from Cashfree/RazorpayX).
  * `is_penny_drop_verified`: `BOOLEAN` default `FALSE`.
  * `verified_at`: `TIMESTAMPTZ`.
  * `is_primary`: `BOOLEAN` default `TRUE`.
* **Constraints & Indexes:**
  * `CONSTRAINT uq_worker_primary_payout UNIQUE (worker_id, is_primary)`
  * `INDEX idx_payout_worker (worker_id)`

---

### 6. `payment_transactions` & `payment_intents` (Hardened)
* **Purpose:** Inbound customer payment records with synchronized escrow status.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `booking_id` $\to$ `bookings.id` (`ON DELETE RESTRICT`)
  * `payer_user_id` $\to$ `users.id` (`ON DELETE RESTRICT`)
* **Key Fields (Integer Paise - AUD-KS6-007):**
  * `intent_id`: `VARCHAR(64)` unique gateway order ID.
  * `transaction_ref`: `VARCHAR(100)` unique bank UTR or gateway payment ID.
  * `idempotency_key`: `VARCHAR(64)` unique client key.
  * `amount_paise`: `BIGINT`.
  * `currency`: `VARCHAR(3)` default `'INR'`.
  * `payment_status`: `payment_status_enum` (**AUD-KS6-006**: `pending_intent`, `processing`, `held_in_escrow`, `captured_settled`, `released_for_payout`, `disputed`, `refunded`, `failed`).
  * `verified_by_webhook`: `BOOLEAN` default `FALSE`.
  * `verified_at`: `TIMESTAMPTZ`.
* **Constraints:**
  * `UNIQUE (intent_id)`
  * `UNIQUE (transaction_ref)`
  * `UNIQUE (idempotency_key)`

---

### 7. `payment_webhook_events` (Hardened - AUD-KS6-003)
* **Purpose:** Raw webhook payload store with anti-race commit tracking.
* **Primary Key:** `id` (`UUID`).
* **Key Fields:**
  * `event_id`: `VARCHAR(100)` unique provider event ID.
  * `provider`: `VARCHAR(50)` (`mock`, `razorpay`, `cashfree`).
  * `event_type`: `VARCHAR(50)`.
  * `payload`: `JSONB` (raw payload).
  * `signature`: `VARCHAR(255)`.
  * `is_processed`: `BOOLEAN` default `FALSE`.
  * `processing_started_at`: `TIMESTAMPTZ` default `now()`.
  * `processed_at`: `TIMESTAMPTZ`.
* **Constraints:** `UNIQUE (provider, event_id)`.

---

### 8. `ledger_accounts`, `ledger_transactions`, `ledger_entries` (Hardened)
* **Purpose:** Immutable append-only double-entry ledger in integer Paise.
* **`ledger_accounts`:**
  * `id`: `UUID`.
  * `account_number`: `VARCHAR(50)` unique (e.g. `1010-CASH`, `2010-ESCROW`, `2020-WORKER-PAYABLE`, `4010-COMMISSION`).
  * `account_type`: `VARCHAR(20)` (`asset`, `liability`, `equity`, `revenue`, `expense`).
* **`ledger_transactions`:**
  * `id`: `UUID`.
  * `transaction_code`: `VARCHAR(50)` unique (`TX-YYYYMMDD-XXXX`).
  * `description`: `TEXT`.
  * `reference_type`: `VARCHAR(50)` (`booking_payment`, `payout`, `refund`, `fee`).
  * `reference_id`: `UUID`.
  * `posted_at`: `TIMESTAMPTZ` default `now()`.
* **`ledger_entries`:**
  * `id`: `UUID`.
  * `ledger_transaction_id` $\to$ `ledger_transactions.id` (`ON DELETE RESTRICT`).
  * `account_id` $\to$ `ledger_accounts.id` (`ON DELETE RESTRICT`).
  * `entry_type`: `VARCHAR(2)` (`DR` for debit, `CR` for credit).
  * `amount_paise`: `BIGINT` (`CHECK (amount_paise > 0)`).
* **Constraints:**
  * PostgreSQL deferred procedural trigger validating $\sum \text{Debit Paise} = \sum \text{Credit Paise}$ before commit.
  * SQLAlchemy ORM `@event.listens_for(Session, "before_commit")` event listener ensuring balance on both SQLite and PostgreSQL (**AUD-KS6-014**).

---

### 9. `reviews` (CORRECTED SCHEMA - AUD-KS6-001)
* **Purpose:** Mutual ratings tied to completed bookings with composite uniqueness.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `booking_id` $\to$ `bookings.id` (`ON DELETE CASCADE`) **[NON-UNIQUE TO PERMIT MUTUAL REVIEWS]**
  * `worker_id` $\to$ `worker_profiles.id` (`ON DELETE CASCADE`)
  * `employer_id` $\to$ `employer_profiles.id` (`ON DELETE CASCADE`)
* **Key Fields:**
  * `author_role`: `VARCHAR(20)` (`CHECK (author_role IN ('employer', 'worker'))`).
  * `rating`: `INTEGER` (`CHECK (rating >= 1 AND rating <= 5)`).
  * `feedback`: `TEXT`.
  * `is_published`: `BOOLEAN` default `FALSE` (blind-review hold).
  * `created_at`: `TIMESTAMPTZ` default `now()`.
* **Constraints (AUD-KS6-001 Resolved):**
  * **`UNIQUE (booking_id, author_role)`** (permits exactly one review from Employer and one review from Worker per booking).

---

### 10. `disputes` & `dispute_resolutions` (Hardened)
* **Purpose:** Grievance arbitration with single-active dispute protection (**AUD-KS6-015**).
* **`disputes` Table:**
  * `id`: `UUID`.
  * `booking_id` $\to$ `bookings.id` (`ON DELETE RESTRICT`).
  * `initiator_id` $\to$ `users.id` (`ON DELETE RESTRICT`).
  * `category`: `VARCHAR(50)` (`wage`, `quality`, `attendance`, `safety`).
  * `description`: `TEXT`.
  * `status`: `dispute_status_enum` (`open`, `under_review`, `resolved`, `closed`).
* **Constraint:**
  * `CREATE UNIQUE INDEX uq_single_active_dispute ON disputes (booking_id) WHERE status IN ('open', 'under_review');`
* **`dispute_resolutions` Table:**
  * `id`: `UUID`.
  * `dispute_id` $\to$ `disputes.id` (`UNIQUE`).
  * `resolver_id` $\to$ `users.id` (Admin/Support).
  * `outcome`: `VARCHAR(50)` (`full_refund`, `full_payout`, `split_adjustment`, `dismissed`).
  * `worker_payout_amount_paise`: `BIGINT`.
  * `employer_refund_amount_paise`: `BIGINT`.
  * `resolved_at`: `TIMESTAMPTZ`.

---

### 11. `transaction_audit_events`
* **Purpose:** Append-only security audit log recording every transition, payment event, and administrative override.
* **Fields:** `id`, `event_type`, `aggregate_type`, `aggregate_id`, `actor_user_id`, `actor_role`, `ip_address`, `request_id`, `payload_before`, `payload_after`, `timestamp`.
