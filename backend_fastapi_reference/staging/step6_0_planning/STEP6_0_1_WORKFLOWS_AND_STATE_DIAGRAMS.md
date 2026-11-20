# KAAMSETU STAGE 2, STEP 6.0.1 — WORKFLOWS & STATE DIAGRAMS (CORRECTED)

**Component:** State Machines & Transition Validation  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document Reference:** `STEP6_0_1_WORKFLOWS_AND_STATE_DIAGRAMS.md`  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## 1. Booking Operational Lifecycle (Synchronized 10-State FSM)

The operational lifecycle tracks physical milestones. It is fully synchronized with database enum `booking_status_enum` (addressing **AUD-KS6-004**).

```mermaid
stateDiagram-v2
    [*] --> requested : Employer Creates Booking
    requested --> confirmed : Worker Accepts
    requested --> cancelled : Employer/Worker Cancels

    confirmed --> en_route : Worker Starts Travel
    confirmed --> cancelled : Worker/Employer Cancels (with reason)
    confirmed --> no_show : Worker Fails to Arrive within 2 hrs

    en_route --> arrived : Worker Reaches Site Address
    en_route --> cancelled : Emergency Cancellation

    arrived --> in_progress : Attendance Check-in Validated
    arrived --> employer_no_show : Site Inaccessible / Employer Absent >30m

    in_progress --> completed : Work Concluded & Check-out Confirmed
    in_progress --> disputed : Grievance Filed by Either Party

    disputed --> completed : Dispute Resolved with Work Acceptance
    disputed --> cancelled : Dispute Resolved with Work Cancellation

    completed --> [*]
    cancelled --> [*]
    no_show --> [*]
    employer_no_show --> [*]
```

### Transition Matrix & Permitted Actors
| Current Status | Target Status | Permitted Actor | Prerequisite / Rule | Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| `requested` | `confirmed` | Worker | Worker confirms availability for scheduled time slot. | Wage agreement transitions to `pending_counterparty`. |
| `requested` | `cancelled` | Employer / Worker | Either party cancels prior to confirmation. | Zero penalty; advance deposit refunded 100%. |
| `confirmed` | `en_route` | Worker | Permitted up to 2 hours before `scheduled_at`. | Triggers travel timestamp `en_route_at`. |
| `confirmed` | `cancelled` | Employer / Worker | Reason required. | If employer cancels $<2$ hrs, ₹150 mobilization fee debited. |
| `confirmed` | `no_show` | Employer | Worker has not triggered `arrived` within 2 hours of `scheduled_at`. | Full refund to employer; worker reliability cooldown. |
| `en_route` | `arrived` | Worker | Worker reaches destination (optional GPS within 500m). | Triggers timestamp `arrived_at`. |
| `arrived` | `in_progress` | Worker + Employer | Check-in triggered by worker and confirmed by employer. | Triggers `started_at`; shift checkpoint begins. |
| `arrived` | `employer_no_show`| Worker | Employer absent from premises after 30 minutes. | ₹150 mobilization fee released to worker from escrow. |
| `in_progress` | `completed` | Employer / Auto-Timer | Employer confirms check-out OR 12h SLA timer elapses. | Sets `completed_at`; starts 24h payment inspection window. |
| `in_progress` | `disputed` | Employer / Worker | Formal grievance lodged prior to final sign-off. | Freezes escrow payout sweep (`payment.status -> disputed`). |
| `completed` | *Any* | **NONE** | **Terminal State.** Immutable; cannot be reopened. | Unlocks review submission. |
| `cancelled` | *Any* | **NONE** | **Terminal State.** Immutable; cannot be reopened. | Terminal. |
| `no_show` | *Any* | **NONE** | **Terminal State.** Immutable; cannot be reopened. | Terminal. |
| `employer_no_show`| *Any* | **NONE** | **Terminal State.** Immutable; cannot be reopened. | Terminal. |

---

## 2. Wage Agreement Lifecycle (7-State FSM)

Persisted explicitly via `status: wage_agreement_status_enum` (addressing **AUD-KS6-005**).

```mermaid
stateDiagram-v2
    [*] --> draft : Initial Wage Proposed on Booking Creation
    draft --> pending_counterparty : Terms Submitted for Acceptance
    pending_counterparty --> active : Counterparty Approves Terms
    pending_counterparty --> rejected : Counterparty Declines Terms

    active --> revision_pending : Scope/Overtime Amendment Proposed
    revision_pending --> active : Amendment Approved (New Version Activated)
    revision_pending --> active : Amendment Rejected (Prior Terms Retained)

    active --> settled : Final Wages Reconciled & Disbursed
    active --> disputed_hold : Financial Grievance Filed

    disputed_hold --> settled : Arbitration Completed
    rejected --> [*]
    settled --> [*]
```

### Transition Matrix
| Current Status | Target Status | Permitted Actor | Prerequisite / Rule |
| :--- | :--- | :--- | :--- |
| `draft` | `pending_counterparty` | Creator | Initial base rate and terms entered. |
| `pending_counterparty` | `active` | Counterparty | Counterparty accepts wage rate and agreement type. |
| `pending_counterparty` | `rejected` | Counterparty | Counterparty rejects proposed terms. |
| `active` | `revision_pending` | Worker / Employer | Scope expansion or extra hours proposed with justification. |
| `revision_pending` | `active` | Counterparty | Counterparty approves amendment (updates active amounts). |
| `active` | `disputed_hold` | Worker / Employer | Formal wage grievance lodged. |
| `disputed_hold` | `settled` | Admin / Arbiter | Arbitration resolution posted to ledger. |
| `active` | `settled` | System | Payout disbursed and reconciled. Terminal state. |

---

## 3. Attendance Checkpoint Lifecycle (With 12-Hour Auto-Approval SLA)

Addresses **AUD-KS6-012** by preventing unconfirmed check-outs from stalling payouts.

```mermaid
stateDiagram-v2
    [*] --> not_started
    not_started --> checked_in : Worker Check-In (Time + Locality)
    checked_in --> on_break : Break Started
    on_break --> checked_in : Break Ended

    checked_in --> checked_out : Worker Check-Out (Shift Finished)
    checked_out --> approved : Employer Confirms Hours
    checked_out --> approved : 12-Hour SLA Timer Elapses (Auto-Approved)
    checked_out --> correction_requested : Employer Disputes Hours

    correction_requested --> approved : Adjusted Hours Mutually Accepted
    correction_requested --> disputed : Discrepancy Escalated to Support

    approved --> [*]
    disputed --> [*]
```

---

## 4. Inbound Customer Payment & Escrow Lifecycle (Synchronized)

Addresses **AUD-KS6-006** by explicitly tracking escrow custody and inspection release.

```mermaid
stateDiagram-v2
    [*] --> pending_intent : Employer Creates Payment Intent
    pending_intent --> processing : Gateway Dispatch / UPI Intent Launched

    processing --> held_in_escrow : Webhook Confirmed (HMAC Validated)
    processing --> held_in_escrow : Bank UTR Reconciled by Ops
    processing --> failed : Gateway Payment Failure / User Abandoned

    held_in_escrow --> captured_settled : 24h Inspection Window Expires (Auto-Release)
    held_in_escrow --> captured_settled : Employer Manually Confirms Release
    held_in_escrow --> disputed : Formal Dispute Filed (Escrow Frozen)
    held_in_escrow --> refunded : Booking Cancelled with Valid Refund

    captured_settled --> released_for_payout : Dispatched to Worker Payout Clearing
    disputed --> captured_settled : Dispute Resolved with Worker Payout
    disputed --> refunded : Dispute Resolved with Employer Refund

    failed --> [*]
    refunded --> [*]
    released_for_payout --> [*]
```

---

## 5. Webhook Ingestion & Anti-Race Idempotency FSM

Addresses **AUD-KS6-003** by guaranteeing duplicate webhooks cannot acknowledge `HTTP 200` before the primary transaction commits.

```mermaid
sequenceDiagram
    autonumber
    actor Gateway as Payment Gateway
    participant API as Webhook Receiver
    participant DB as PostgreSQL DB
    participant Ledger as Ledger Engine

    Gateway->>API: POST /payments/webhook (Event A, Thread 1)
    Gateway->>API: POST /payments/webhook (Event A, Thread 2 concurrent)

    API->>DB: Thread 1: INSERT event_id, is_processed=FALSE
    DB-->>API: Thread 1: Row Created
    
    API->>DB: Thread 2: Check event_id
    DB-->>API: Thread 2: Row exists with is_processed=FALSE
    Note over API,DB: Thread 2 detects concurrent uncommitted event
    API-->>Gateway: Thread 2: Return HTTP 409 Conflict (Gateway will retry)

    API->>Ledger: Thread 1: Post Escrow Journal (Balanced DR=CR)
    API->>DB: Thread 1: UPDATE is_processed=TRUE
    API->>DB: Thread 1: COMMIT TRANSACTION
    API-->>Gateway: Thread 1: Return HTTP 200 OK

    opt Gateway Retries Thread 2
        Gateway->>API: POST /payments/webhook (Event A, Retry)
        API->>DB: Check event_id
        DB-->>API: Row exists with is_processed=TRUE
        API-->>Gateway: Return HTTP 200 OK (already_processed)
    end
```

---

## 6. Review & Rating Lifecycle (Composite Uniqueness)

Addresses **AUD-KS6-001** by enforcing `UNIQUE (booking_id, author_role)`.

```mermaid
stateDiagram-v2
    [*] --> locked : Booking in Progress or Unsettled
    locked --> review_eligible : Booking Completed AND Payment Settled

    review_eligible --> submitted_blind : Party A Submits Review (Worker or Employer)
    submitted_blind --> published : Party B Submits Review (Worker or Employer)
    submitted_blind --> published : 7-Day Blind Window Expires

    published --> under_moderation : Flagged for Abusive Language / PII
    under_moderation --> published : Moderation Cleared
    under_moderation --> suppressed : Removed by Policy

    published --> [*]
    suppressed --> [*]
```

---

## 7. Dispute & Grievance Arbitration Lifecycle

Addresses **AUD-KS6-015** by enforcing single active dispute per booking.

```mermaid
stateDiagram-v2
    [*] --> dispute_opened : Grievance Filed (Single Open Constraint Enforced)
    dispute_opened --> evidence_gathering : Photos & Job Notes Uploaded
    evidence_gathering --> under_review : Assigned to Admin Arbiter

    under_review --> resolved_full_refund : Arbiter Rules 100% Employer Refund
    under_review --> resolved_full_payout : Arbiter Rules 100% Worker Payout
    under_review --> resolved_split_settlement : Arbiter Rules Partial Split
    under_review --> dismissed : Unsubstantiated Grievance

    resolved_full_refund --> compensating_ledger_posted
    resolved_full_payout --> compensating_ledger_posted
    resolved_split_settlement --> compensating_ledger_posted

    compensating_ledger_posted --> closed : Compensating Journals Reconciled
    dismissed --> closed : Case Closed without Adjustment

    closed --> [*]
```
