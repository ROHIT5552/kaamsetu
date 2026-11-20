# KAAMSETU STAGE 2, STEP 6.0 — DATA MODEL REQUIREMENTS
**Target Engine:** PostgreSQL 16 + PostGIS 3.4  
**ORM / Migration Framework:** SQLAlchemy 2.0 (asyncio) + Alembic  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document:** `STEP6_0_DATA_MODEL_REQUIREMENTS.md`

---

## 1. Entity Specifications

### 1. `bookings`
* **Purpose:** Core work order record governing lifecycle, scheduling, and checkpoints.
* **Primary Key:** `id` (`UUID`, generated via `uuid4()`).
* **Foreign Keys:**
  * `employer_id` $\to$ `employer_profiles.id` (`ON DELETE RESTRICT`)
  * `primary_worker_id` $\to$ `worker_profiles.id` (`ON DELETE RESTRICT`)
  * `job_id` $\to$ `jobs.id` (`ON DELETE SET NULL`, optional)
* **Key Fields:**
  * `booking_code`: `VARCHAR(32)` unique reference (`BK-YYYYMMDD-XXXX`).
  * `idempotency_key`: `VARCHAR(64)` unique client deduplication token.
  * `status`: `booking_status_enum` (`requested`, `confirmed`, `en_route`, `arrived`, `in_progress`, `completed`, `cancelled`, `no_show`).
  * `service_address`: `TEXT` (full physical destination in Sambhajinagar).
  * `area`: `VARCHAR(80)` (locality: Cidco, Waluj, Garkheda, etc.).
  * `scheduled_at`: `TIMESTAMPTZ` (UTC).
  * `en_route_at`, `arrived_at`, `started_at`, `completed_at`, `cancelled_at`: `TIMESTAMPTZ`.
  * `cancellation_reason`: `TEXT`.
* **Constraints & Indexes:**
  * `UNIQUE (booking_code)`
  * `UNIQUE (idempotency_key)`
  * `INDEX idx_bookings_employer_status (employer_id, status)`
  * `INDEX idx_bookings_worker_status (primary_worker_id, status)`
  * `INDEX idx_bookings_area_scheduled (area, scheduled_at)`
* **Data Retention:** Indefinite (statutory requirement for labor and commercial records).
* **Access Permissions:** Read: Employer owner, Assigned Worker, Support/Admin. Write: Role-guarded per FSM.

---

### 2. `booking_participants`
* **Purpose:** Staffing roster for bookings requiring multiple workers (e.g. 1 Lead Mason + 2 Helpers).
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `booking_id` $\to$ `bookings.id` (`ON DELETE CASCADE`)
  * `worker_id` $\to$ `worker_profiles.id` (`ON DELETE RESTRICT`)
* **Key Fields:**
  * `role`: `VARCHAR(50)` (`lead`, `specialist`, `helper`).
  * `assigned_at`: `TIMESTAMPTZ`.
  * `is_confirmed`: `BOOLEAN` default `FALSE`.
* **Constraints:** `UNIQUE (booking_id, worker_id)`.
* **Access Permissions:** Restricted to Booking participants and Support.

---

### 3. `wage_agreements`
* **Purpose:** Active financial agreement and escrow summary for a booking.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:** `booking_id` $\to$ `bookings.id` (`UNIQUE`, `ON DELETE CASCADE`).
* **Key Fields:**
  * `agreement_type`: `VARCHAR(30)` (`hourly`, `daily`, `fixed_price`).
  * `agreed_wage`: `NUMERIC(12, 2)` (contracted amount in INR).
  * `advance_amount`: `NUMERIC(12, 2)` default `0.00`.
  * `amount_due`: `NUMERIC(12, 2)`.
  * `amount_paid`: `NUMERIC(12, 2)` default `0.00`.
  * `platform_commission`: `NUMERIC(12, 2)` default `0.00`.
  * `tip_amount`: `NUMERIC(12, 2)` default `0.00` (100% pass-through to worker).
  * `currency`: `VARCHAR(3)` default `'INR'`.
  * `is_settled`: `BOOLEAN` default `FALSE`.
  * `current_version`: `INTEGER` default `1`.
* **Constraints:**
  * `CHECK (agreed_wage >= 50.00)`
  * `CHECK (amount_paid >= 0.00)`
  * `CHECK (tip_amount >= 0.00)`
* **Access Permissions:** Read/Write: Booking owner and assigned worker.

---

### 4. `wage_agreement_versions`
* **Purpose:** Immutable audit trail of proposed and accepted wage/scope revisions.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `wage_agreement_id` $\to$ `wage_agreements.id` (`ON DELETE CASCADE`)
  * `proposed_by` $\to$ `users.id` (`ON DELETE SET NULL`)
* **Key Fields:**
  * `version_number`: `INTEGER` (monotonic per agreement).
  * `proposed_wage`: `NUMERIC(12, 2)`.
  * `scope_change_description`: `TEXT`.
  * `status`: `VARCHAR(20)` (`pending`, `accepted`, `rejected`).
  * `decided_at`: `TIMESTAMPTZ`.
* **Constraints:** `UNIQUE (wage_agreement_id, version_number)`.

---

### 5. `attendance_checkpoints`
* **Purpose:** Daily shifts and physical verification milestones.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `booking_id` $\to$ `bookings.id` (`ON DELETE CASCADE`)
  * `worker_id` $\to$ `worker_profiles.id` (`ON DELETE RESTRICT`)
* **Key Fields:**
  * `shift_date`: `DATE`.
  * `check_in_at`: `TIMESTAMPTZ`.
  * `check_out_at`: `TIMESTAMPTZ` (nullable).
  * `break_duration_minutes`: `INTEGER` default `0`.
  * `total_hours_worked`: `NUMERIC(5, 2)` (computed).
  * `is_employer_verified`: `BOOLEAN` default `FALSE`.
  * `check_in_lat`, `check_in_lng`: `NUMERIC(9, 6)` (optional, consent-based).
  * `check_in_geom`: `GEOMETRY(Point, 4326)` (spatial index).
* **Constraints & Indexes:**
  * `INDEX idx_attendance_booking_shift (booking_id, shift_date)`
  * `CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)`

---

### 6. `attendance_corrections`
* **Purpose:** Dispute and correction requests for missed or faulty check-in/out stamps.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `attendance_id` $\to$ `attendance_checkpoints.id` (`ON DELETE CASCADE`)
  * `requested_by` $\to$ `users.id` (`ON DELETE RESTRICT`)
* **Key Fields:**
  * `corrected_check_in`: `TIMESTAMPTZ`.
  * `corrected_check_out`: `TIMESTAMPTZ`.
  * `reason`: `TEXT`.
  * `status`: `VARCHAR(20)` (`pending`, `approved`, `rejected`).

---

### 7. `payment_intents` & `payment_transactions`
* **Purpose:** Inbound customer payment records and gateway references.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `booking_id` $\to$ `bookings.id` (`ON DELETE RESTRICT`)
  * `payer_user_id` $\to$ `users.id` (`ON DELETE RESTRICT`)
* **Key Fields:**
  * `intent_id`: `VARCHAR(64)` unique gateway order identifier.
  * `transaction_ref`: `VARCHAR(100)` unique bank UTR or gateway payment ID.
  * `idempotency_key`: `VARCHAR(64)` unique client key.
  * `amount`: `NUMERIC(12, 2)`.
  * `currency`: `VARCHAR(3)` default `'INR'`.
  * `payment_method`: `payment_method_enum` (`upi`, `bank_transfer`, `cash`, `gateway`).
  * `payment_status`: `payment_status_enum` (`pending`, `processing`, `paid`, `failed`, `refunded`).
  * `verified_by_webhook`: `BOOLEAN` default `FALSE`.
  * `verified_at`: `TIMESTAMPTZ`.
* **Constraints:**
  * `UNIQUE (intent_id)`
  * `UNIQUE (transaction_ref)`
  * `UNIQUE (idempotency_key)`

---

### 8. `payment_webhook_events`
* **Purpose:** Raw webhook payload store ensuring idempotent delivery and replay protection.
* **Primary Key:** `id` (`UUID`).
* **Key Fields:**
  * `event_id`: `VARCHAR(100)` unique provider webhook identifier.
  * `provider`: `VARCHAR(50)` (e.g. `mock`, `razorpay`, `cashfree`).
  * `event_type`: `VARCHAR(50)`.
  * `payload`: `JSONB` (raw body).
  * `signature`: `VARCHAR(255)`.
  * `is_processed`: `BOOLEAN` default `FALSE`.
  * `processed_at`: `TIMESTAMPTZ`.
* **Constraints:** `UNIQUE (provider, event_id)`.

---

### 9. `ledger_accounts`, `ledger_transactions`, `ledger_entries`
* **Purpose:** Core double-entry immutable financial ledger.
* **`ledger_accounts`:**
  * `id`: `UUID`.
  * `account_number`: `VARCHAR(50)` unique (e.g. `1010-CASH`, `2010-ESCROW`, `4010-COMMISSION`).
  * `account_type`: `VARCHAR(20)` (`asset`, `liability`, `equity`, `revenue`, `expense`).
  * `currency`: `VARCHAR(3)` default `'INR'`.
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
  * `amount`: `NUMERIC(12, 2)` (positive).
* **Constraints:**
  * `CHECK (amount > 0.00)`
  * Deferred PostgreSQL trigger validating $\sum \text{Debit} = \sum \text{Credit}$ per transaction before commit.

---

### 10. `reviews`
* **Purpose:** Verified customer ratings tied strictly to completed bookings.
* **Primary Key:** `id` (`UUID`).
* **Foreign Keys:**
  * `booking_id` $\to$ `bookings.id` (`UNIQUE`, `ON DELETE CASCADE`)
  * `worker_id` $\to$ `worker_profiles.id` (`ON DELETE CASCADE`)
  * `employer_id` $\to$ `employer_profiles.id` (`ON DELETE CASCADE`)
* **Key Fields:**
  * `author_role`: `VARCHAR(20)` (`employer`, `worker`).
  * `rating`: `INTEGER` (1 to 5).
  * `feedback`: `TEXT`.
  * `punctuality_rating`: `INTEGER` (1 to 5).
  * `work_quality_rating`: `INTEGER` (1 to 5).
  * `behavior_rating`: `INTEGER` (1 to 5).
  * `is_published`: `BOOLEAN` default `FALSE` (blind-review hold).
* **Constraints:**
  * `CHECK (rating >= 1 AND rating <= 5)`
  * `UNIQUE (booking_id, author_role)`

---

### 11. `disputes`, `dispute_evidence`, `dispute_resolutions`
* **Purpose:** Grievance arbitration and resolution engine.
* **`disputes`:**
  * `id`: `UUID`.
  * `booking_id` $\to$ `bookings.id` (`ON DELETE RESTRICT`).
  * `initiator_id` $\to$ `users.id` (`ON DELETE RESTRICT`).
  * `category`: `VARCHAR(50)` (`wage`, `quality`, `attendance`, `safety`).
  * `description`: `TEXT`.
  * `status`: `dispute_status_enum` (`open`, `under_review`, `resolved`, `closed`).
* **`dispute_evidence`:**
  * `id`: `UUID`.
  * `dispute_id` $\to$ `disputes.id` (`ON DELETE CASCADE`).
  * `uploaded_by` $\to$ `users.id`.
  * `file_ref`: `VARCHAR(255)` (secure object storage reference).
  * `file_type`: `VARCHAR(50)`.
  * `description`: `TEXT`.
* **`dispute_resolutions`:**
  * `id`: `UUID`.
  * `dispute_id` $\to$ `disputes.id` (`UNIQUE`).
  * `resolver_id` $\to$ `users.id` (Admin/Support role).
  * `outcome`: `VARCHAR(50)` (`full_refund`, `full_payout`, `split_adjustment`, `dismissed`).
  * `worker_payout_amount`: `NUMERIC(12, 2)`.
  * `employer_refund_amount`: `NUMERIC(12, 2)`.
  * `arbitration_notes`: `TEXT`.
  * `resolved_at`: `TIMESTAMPTZ`.

---

### 12. `transaction_audit_events`
* **Purpose:** Append-only security audit log recording every state transition, financial journal, and administrative action.
* **Fields:** `id`, `event_type`, `aggregate_type`, `aggregate_id`, `actor_user_id`, `actor_role`, `ip_address`, `request_id`, `payload_before`, `payload_after`, `timestamp`.
