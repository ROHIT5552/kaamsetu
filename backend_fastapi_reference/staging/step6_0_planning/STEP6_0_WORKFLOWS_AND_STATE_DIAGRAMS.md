# KAAMSETU STAGE 2, STEP 6.0 — WORKFLOWS & STATE DIAGRAMS
**Component:** State Machines & Transition Validation  
**Pilot Geography:** Chhatrapati Sambhajinagar, Maharashtra  
**Document:** `STEP6_0_WORKFLOWS_AND_STATE_DIAGRAMS.md`

---

## 1. Booking Operational Lifecycle

The operational lifecycle tracks the real-world progression of a work order. Booking completion is decoupled from payment capture and payout settlement.

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
    arrived --> employer_no_show : Site Inaccessible / Employer Absent

    in_progress --> completed : Work Concluded & Hours Approved
    in_progress --> disputed : Quality/Scope Dispute Raised

    disputed --> completed : Dispute Resolved with Completion
    disputed --> cancelled : Dispute Resolved with Cancellation

    completed --> [*]
    cancelled --> [*]
    no_show --> [*]
    employer_no_show --> [*]
```

### Transition Matrix & Permitted Actors
| Current Status | Target Status | Permitted Actor | Prerequisite / Rule |
| :--- | :--- | :--- | :--- |
| `requested` | `confirmed` | Worker | Worker explicitly confirms availability for scheduled time slot. |
| `requested` | `cancelled` | Employer / Worker | Either party can cancel prior to confirmation without penalty. |
| `confirmed` | `en_route` | Worker | Permitted up to 2 hours before `scheduled_at`. |
| `confirmed` | `cancelled` | Employer / Worker | Reason required. Cancellation fees may apply to employer if $<2$ hrs. |
| `confirmed` | `no_show` | Employer | Worker has not triggered `arrived` within 2 hours of `scheduled_at`. |
| `en_route` | `arrived` | Worker | Worker is at site address (verified by locality/optional GPS). |
| `arrived` | `in_progress` | Worker + Employer | Check-in triggered by worker and confirmed by employer. |
| `arrived` | `employer_no_show`| Worker | Employer absent from premises after 30 minutes. |
| `in_progress` | `completed` | Employer | Final shift check-out confirmed and deliverables accepted. |
| `in_progress` | `disputed` | Employer / Worker | Formal dispute lodged prior to final sign-off. |
| `completed` | *Any* | **NONE** | **Terminal State.** Immutable; cannot be reopened. |
| `cancelled` | *Any* | **NONE** | **Terminal State.** Immutable; cannot be reopened. |

---

## 2. Wage Agreement Lifecycle

Governs the contractual rate and versioned scope amendments.

```mermaid
stateDiagram-v2
    [*] --> draft : Initial Rate Proposed
    draft --> pending_counterparty : Submitted for Review
    pending_counterparty --> active : Counterparty Approves
    pending_counterparty --> rejected : Counterparty Declines

    active --> revision_pending : Scope/Rate Amendment Proposed
    revision_pending --> active : Amendment Approved (New Version Activated)
    revision_pending --> active : Amendment Rejected (Prior Terms Retained)

    active --> settled : Final Wages Disbursed & Reconciled
    active --> disputed_hold : Financial Grievance Filed

    disputed_hold --> settled : Arbitration Completed
    rejected --> [*]
    settled --> [*]
```

---

## 3. Attendance Checkpoint Lifecycle

Governs daily check-in, breaks, check-out, and correction workflows.

```mermaid
stateDiagram-v2
    [*] --> not_started
    not_started --> checked_in : Worker Check-In (Time + Locality)
    checked_in --> on_break : Break Started
    on_break --> checked_in : Break Ended

    checked_in --> checked_out : Worker Check-Out
    checked_out --> approved : Employer Confirms Hours
    checked_out --> correction_requested : Discrepancy Reported

    correction_requested --> approved : Adjusted Hours Mutually Accepted
    correction_requested --> disputed : Disagreement Escalated to Support

    approved --> [*]
    disputed --> [*]
```

---

## 4. Inbound Customer Payment Lifecycle

Tracks customer payment transactions from payment intent through gateway verification.

```mermaid
stateDiagram-v2
    [*] --> payment_intent_created : Employer Initiates Payment
    payment_intent_created --> processing : Gateway Dispatch / UPI Intent Launched

    processing --> paid : Webhook Verified (HMAC Validated)
    processing --> paid : Manual Bank UTR Verified by Ops
    processing --> failed : Gateway Payment Failure / User Abandoned
    processing --> expired : Window Expired without Confirmation

    paid --> held_in_escrow : Funds Held for Job Completion
    held_in_escrow --> released_for_payout : Job Completed & Inspection Passed
    held_in_escrow --> refunded : Job Cancelled or Full Refund Awarded

    failed --> [*]
    expired --> [*]
    refunded --> [*]
    released_for_payout --> [*]
```

---

## 5. Double-Entry Ledger Transaction Lifecycle

Tracks financial journals ensuring complete auditability and zero balance discrepancy.

```mermaid
stateDiagram-v2
    [*] --> pending_posting : Ledger Journal Prepared (Balanced DR = CR)
    pending_posting --> posted : Atomically Committed to Ledger Tables
    pending_posting --> rejected : Validation Failure (DR != CR or Inactive Account)

    posted --> reconciled : Matched with Bank Settlement Statement
    posted --> reversed : Compensating Journal Posted (Dispute/Correction)

    reconciled --> [*]
    reversed --> [*]
    rejected --> [*]
```

---

## 6. Review & Rating Lifecycle

Enforces verification gating and blind-review retaliation protections.

```mermaid
stateDiagram-v2
    [*] --> locked : Booking in Progress (Review Forbidden)
    locked --> review_eligible : Booking Completed & Funds Settled

    review_eligible --> submitted_blind : First Party Submits Review
    submitted_blind --> published : Second Party Submits Review
    submitted_blind --> published : 7-Day Blind Window Expires

    published --> under_moderation : Flagged for Abusive Language / PII
    under_moderation --> published : Moderation Cleared
    under_moderation --> suppressed : Removed by Admin Policy

    published --> [*]
    suppressed --> [*]
```

---

## 7. Dispute & Grievance Arbitration Lifecycle

Governs formal grievances, evidence evaluation, and financial adjustments.

```mermaid
stateDiagram-v2
    [*] --> dispute_opened : Grievance Filed (Category + Description)
    dispute_opened --> evidence_gathering : Supporting Photos / Logs Uploaded
    evidence_gathering --> under_review : Assigned to Support Arbiter

    under_review --> resolved_full_refund : Arbiter Rules 100% Employer Refund
    under_review --> resolved_full_payout : Arbiter Rules 100% Worker Payout
    under_review --> resolved_split_settlement : Arbiter Rules Partial Split
    under_review --> dismissed : Unsubstantiated Claim

    resolved_full_refund --> compensating_ledger_posted
    resolved_full_payout --> compensating_ledger_posted
    resolved_split_settlement --> compensating_ledger_posted

    compensating_ledger_posted --> closed : Final Ledger Entries Reconciled
    dismissed --> closed : Case Closed without Adjustment

    closed --> [*]
```
