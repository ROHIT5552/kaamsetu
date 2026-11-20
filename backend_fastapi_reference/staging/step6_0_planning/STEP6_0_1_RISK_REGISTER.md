# KaamSetu — Stage 2, Step 6.0.1: Risk Register & Mitigation Strategy (CORRECTED)

**Document Reference:** `STEP6_0_1_RISK_REGISTER.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Scope:** Hardened Risk Register Incorporating Audit Findings (AUD-KS6-001 to AUD-KS6-015)  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## 1. Risk Evaluation Summary Matrix

| Risk ID | Domain | Risk Description | Prob | Sev | Risk Level | Mitigation Architecture |
|---|---|---|---|---|---|---|
| **RSK-TECH-001** | TECH | Windows Sandbox Loopback Socket Hang | High | High | **HIGH** | Run test runners with `BypassSandbox: true` and 30s timeouts. Keep audit sandboxed. |
| **RSK-TECH-002** | TECH | Webhook Race False-Positive HTTP 200 (AUD-KS6-003) | Med | Critical | **CRITICAL** | Two-phase ingestion: Return `HTTP 409 Conflict` on concurrent uncommitted events. |
| **RSK-TECH-003** | TECH | SQLite Staging vs Postgres Trigger Parity (AUD-KS6-014) | Med | Med | **MED** | SQLAlchemy `@event.listens_for(Session, "before_commit")` ledger balance hook. |
| **RSK-TECH-004** | TECH | Multi-Day Booking Timestamp Collisions (AUD-KS6-013) | Med | Med | **MED** | Model `Booking` as a single daily dispatch; multi-day contracts spawn daily dispatches. |
| **RSK-FIN-001** | FIN | Fractional Paise Rounding Drift (AUD-KS6-007) | Med | High | **HIGH** | Integer `BIGINT` representing Paise across all DB columns and models. Zero float. |
| **RSK-FIN-002** | FIN | Two-Phase Settlement Limbo (Escrow Released, Payout Failed) | Med | High | **HIGH** | Decouple escrow release (`captured_settled`) from payout clearing (`released_for_payout`). |
| **RSK-FIN-003** | FIN | Uncollectible Mobilization Fees on Zero Deposit (AUD-KS6-011) | High | Med | **MED** | Mobilization guaranteed strictly for advance escrow bookings; account balance freeze. |
| **RSK-FIN-004** | FIN | Cash-on-Completion Commission Leakage (AUD-KS6-010) | High | Med | **MED** | Track via `Worker Platform Receivables` with ₹500 (50,000 Paise) credit limit. |
| **RSK-OPS-001** | OPS | Attendance Stalling by Negligent Employer (AUD-KS6-012) | High | High | **HIGH** | 12-hour automated auto-approval SLA fallback after worker check-out. |
| **RSK-OPS-002** | OPS | Two-Way Review DB Deadlock (AUD-KS6-001) | High | Critical | **CRITICAL** | Schema correction: Replace unique booking foreign key with `UNIQUE (booking_id, author_role)`. |
| **RSK-OPS-003** | OPS | Concurrent Duplicate Dispute Floods (AUD-KS6-015) | Med | Low | **LOW** | Partial unique index: `UNIQUE (booking_id) WHERE status IN ('open', 'under_review')`. |
| **RSK-REG-001** | REG | Sub-Merchant KYC Failure for Informal Workers (AUD-KS6-009) | High | Critical | **CRITICAL** | Shift to Direct Payout API (Cashfree Payouts / RazorpayX) with Penny Drop verification. |
| **RSK-REG-002** | REG | Section 194-O / 206AA TDS Statutory Collision (AUD-KS6-008) | High | High | **HIGH** | Encrypted PAN support; cataloged as uncertainty requiring professional Tax Counsel review. |
| **RSK-REG-003** | REG | Section 52 CGST TCS & Enrolment ID Mandate | Med | Med | **MED** | Cataloged as uncertainty requiring formal review by Maharashtra GST consultant. |

---

## 2. In-Depth Mitigations for Critical Post-Audit Risks

### RSK-TECH-002: Webhook Race False-Positive HTTP 200 (AUD-KS6-003)
* **Threat:** When duplicate webhooks arrive simultaneously, Thread 2 returns `HTTP 200 OK` while Thread 1 is uncommitted. If Thread 1 aborts, the payment is never credited and the gateway ceases retries.
* **Mitigation:**
  1. Thread 2 queries the webhook event with a pessimistic row lock (`with_for_update()`).
  2. If the row exists but `is_processed == FALSE`, Thread 2 aborts with `HTTP 409 Conflict`.
  3. The payment gateway treats HTTP 409 as a transient error and retries with exponential backoff.
  4. Once Thread 1 successfully commits (`is_processed == TRUE`), subsequent retries safely return `HTTP 200 OK`.

### RSK-OPS-002: Two-Way Review Database Constraint Deadlock (AUD-KS6-001)
* **Threat:** Single-column unique constraint on `booking_id` in `reviews` table causes database abort when worker attempts to review employer after employer has already reviewed worker.
* **Mitigation:**
  1. Alembic migration drops `uq_reviews_booking_id`.
  2. Migration adds composite constraint `CONSTRAINT uq_reviews_booking_author UNIQUE (booking_id, author_role)`.
  3. API service verifies that only one review per author role can be inserted per booking.

### RSK-REG-001: Sub-Merchant KYC Failure for Informal Workers (AUD-KS6-009)
* **Threat:** Razorpay Route / Cashfree Split requires merchant underwriting and PAN cards, which informal laborers in Chhatrapati Sambhajinagar do not have.
* **Mitigation:**
  1. Inbound customer payments flow into the platform's Payment Aggregator Nodal Account.
  2. Worker settlements flow out via **Direct Payout API (Cashfree Payouts / RazorpayX)**.
  3. Direct Payouts require only the worker's Bank Account + IFSC or UPI VPA, verified via an automated ₹1.00 Penny Drop (NPCI API). Sub-merchant business documentation is completely bypassed.

### RSK-REG-002: Section 194-O / 206AA Tax Statutory Collision (AUD-KS6-008)
* **Threat:** A total zero-PAN storage policy prevents Form 26Q tax reporting and triggers potential 20% penalty withholding under Section 206AA.
* **Mitigation:**
  1. Schema supports voluntary encrypted PAN storage (`pan_encrypted`) with masked display (`XXXXX1234X`).
  2. Financial ledger tracks `tds_deduction_paise` as a configurable parameter.
  3. Platform retains a licensed Indian Chartered Accountant / Tax Advocate to provide formal written guidance on e-commerce operator thresholds before enabling automated TDS deductions on pilot workers.
