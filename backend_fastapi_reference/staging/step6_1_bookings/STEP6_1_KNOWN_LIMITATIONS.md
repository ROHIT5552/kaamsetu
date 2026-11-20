# KaamSetu Stage 2 Step 6.1 — Known Limitations & Scope Boundaries

**Version:** 1.0.0  
**Step:** Stage 2 Step 6.1 Core Bookings & Wage Agreements Foundation  
**Workspace:** `staging/step6_1_bookings/backend/`  

---

## 1. Staging In-Memory Storage vs. Persistent Database Migrations

- **Current State:** For Step 6.1 staging validation, `BookingService` operates an isolated, thread-safe in-memory domain store. This adheres strictly to the governance rule prohibiting unapproved database migrations or persistent database writes during foundation testing.
- **ORM Alignment:** SQLAlchemy models in `app/models/booking.py` and `app/models/common.py` have been updated with all 10 booking states, 7 wage agreement states, `BIGINT` integer Paise columns, `WageAgreementVersion`, and `parent_contract_id`.
- **Roadmap Resolution:** Persistent database schema migrations will be applied via Alembic only upon human-authorized baseline promotion.

---

## 2. Payment Gateway & Escrow Settlement Boundaries

- **Current State:** Step 6.1 establishes the contract foundation and wage agreement state machine. It does **not** execute real payment captures, refunds, or bank payouts.
- **Monetary Integrity:** All monetary amounts are rigorously standardized and tested in integer Paise (e.g. ₹800.00 = 80,000 Paise), preventing floating-point imprecision.
- **Roadmap Resolution:** Escrow holds, idempotency tables, capture webhooks, and ledger transactions are scheduled for Step 6.3 (Payment Gateway & Escrow Integration) and Step 6.4 (Double-Entry Ledger).

---

## 3. Geofencing & QR Code Attendance Verification

- **Current State:** The booking FSM validates the operational flow `EN_ROUTE -> ARRIVED -> IN_PROGRESS` and validates actor permissions (worker vs employer). However, physical GPS geofence checks and rotating QR code attendance tokens are not yet enforced in Step 6.1 endpoints.
- **Roadmap Resolution:** Live attendance verification, geofence radius checks (50m threshold), and secure QR code tokens will be implemented in Step 6.2 (Attendance & Service Execution).

---

## 4. SMS Provider Test Double

- **Current State:** Authentication in testing and staging uses `MockConsoleOTPProvider`, which maintains an in-memory test mailbox and does not connect to external telecom networks.
- **Roadmap Resolution:** Live SMS dispatch via MSG91 (DLT entity ID: 1701170000000000000) will be enabled exclusively in production environments upon deployment approval.

---

## 5. Dispute Arbitration Workflow

- **Current State:** Transitioning a booking to `DISPUTED` successfully freezes the linked wage agreement into `DISPUTED_HOLD`, preventing unauthorized funds release or settlement. Full dispute arbitration and administrative evidence upload endpoints will be implemented in Step 6.5.
