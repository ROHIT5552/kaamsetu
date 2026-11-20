# KaamSetu — Stage 2, Step 6: Risk Register & Mitigation Strategy

**Document Reference:** `STEP6_0_RISK_REGISTER.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Scope:** Risk identification, probability/impact matrix, and concrete mitigation architectures across technical, financial, operational, and regulatory domains.  
**Status:** PLANNING DOCUMENT — AUDIT READY

---

## 1. Risk Evaluation Framework

Risks are categorized across four distinct domains:
* **TECH:** Technical & Architecture
* **FIN:** Financial & Accounting Integrity
* **OPS:** Operational & Field Realities (Pilot Specific)
* **REG:** Regulatory & Legal Compliance (India / Maharashtra)

Severity and Probability are evaluated on a 3-point scale (Low, Medium, High), resulting in an overall Risk Level (Low, Medium, High, Critical).

---

## 2. Risk Matrix Summary

| Risk ID | Domain | Risk Description | Prob | Sev | Risk Level | Mitigation Overview |
|---|---|---|---|---|---|---|
| **RSK-TECH-001** | TECH | Windows Sandbox Loopback Socket Hang | High | High | **HIGH** | Run test executions with `BypassSandbox: true` while keeping file manipulation sandboxed. |
| **RSK-TECH-002** | TECH | Webhook Race Conditions & Double-Spend | Med | High | **HIGH** | Database unique constraint on gateway event ID + `SELECT FOR UPDATE` on payment rows. |
| **RSK-TECH-003** | TECH | In-Memory Staging vs PostgreSQL Semantic Drift | Med | Med | **MED** | Use identical SQLAlchemy 2.0 ORM expressions and isolated test PostgreSQL instance for promotion. |
| **RSK-TECH-004** | TECH | GPS Signal Deprivation / Spoofing in Peri-Urban Areas | High | Med | **MED** | GPS is non-blocking; fallback to milestone timestamps, cell-tower locality, and employer confirmation. |
| **RSK-FIN-001** | FIN | Fractional Paise Rounding Imbalance | Med | High | **HIGH** | Enforce integer `BIGINT` representing amounts in smallest currency units (Paise). Zero floating-point. |
| **RSK-FIN-002** | FIN | Two-Phase Settlement Failure (Partial Disbursal) | Med | Critical | **CRITICAL** | Two-phase ledger commit; funds transition to intermediate `SETTLEMENT_CLEARING` account. |
| **RSK-FIN-003** | FIN | Off-Platform Cash Leakage & Platform Disintermediation | High | Med | **HIGH** | Value-added trust incentives (verified work records, micro-insurance, guaranteed payment protection). |
| **RSK-OPS-001** | OPS | Low Digital Literacy / Accidental Checkpoints | High | Med | **HIGH** | High-contrast visual UI, Marathi audio prompts, explicit confirmation modals, SMS fallbacks. |
| **RSK-OPS-002** | OPS | Unjustified Employer Disputing & Wage Withholding | Med | High | **HIGH** | Mandatory photographic evidence upload, dispute arbiter review, anti-retaliatory blind rating period. |
| **RSK-REG-001** | REG | RBI Nodal / Escrow Compliance Violation | Low | Critical | **CRITICAL** | Utilize certified Payment Aggregator Route/Marketplace nodal sub-accounts (Razorpay/Cashfree). |
| **RSK-REG-002** | REG | TDS Section 194-O / GST TCS Compliance Overhead | Med | Med | **MED** | Design transaction lines with explicit tax parameters; maintain decoupled ledger accounts for tax payable. |

---

## 3. Detailed Risk Analysis & Action Plans

### Domain: Technical & Architecture (TECH)

#### RSK-TECH-001: Windows Sandbox Loopback Socket Hang
* **Impact:** Pytest execution stalls indefinitely (~25 minutes observed during Step 5 remediation) due to Python 3.12 `ProactorEventLoop` socket binding restrictions within the standard container sandbox.
* **Mitigation Plan:**
  1. Continue executing pytest test runners with `BypassSandbox: true` as empirically validated in Step 5 diagnosis (`diag_asyncio.py` passed in 0.063s).
  2. Implement an automated `--timeout=30` flag in all pytest invocations to prevent orphaned processes.
  3. Keep all preparatory tasks, code audits, and hash generations strictly sandboxed (`BypassSandbox: false`).

#### RSK-TECH-002: Webhook Duplicate Delivery & Race Conditions
* **Impact:** Payment gateway transmits duplicate `payment.captured` webhooks concurrently, potentially causing double-crediting of escrow balances or duplicate ledger journal entries.
* **Mitigation Plan:**
  1. Unique database constraint on `gateway_event_id` in `payment_events` table.
  2. Use pessimistic row locking (`SELECT * FROM payments WHERE id = :id FOR UPDATE`) within the database transaction prior to state transitions.
  3. If payment status is already `held_in_escrow`, the duplicate webhook is acknowledged with HTTP 200 and discarded idempotently without writing new ledger entries.

#### RSK-TECH-003: In-Memory Staging vs PostgreSQL Semantic Drift
* **Impact:** In-memory repository mocks used in staging tests may mask PostgreSQL-specific issues (e.g., transaction isolation levels, UUID casting, trigger errors).
* **Mitigation Plan:**
  1. Maintain strict adherence to SQLAlchemy 2.0 unified expressions without database-specific hacks.
  2. Provide an isolated test database container / connection string for pre-promotion verification in Sub-Step 6.6.

#### RSK-TECH-004: GPS Inaccuracy & Spoofing in Chhatrapati Sambhajinagar
* **Impact:** Construction sites in industrial zones (e.g., Waluj MIDC, Shendra DMIC, Chikalthana) or rural fringe areas often suffer from poor GPS fixes or multipath distortion. Workers may be unfairly rejected during check-in.
* **Mitigation Plan:**
  1. GPS capture is explicitly **optional and non-invasive**.
  2. Checkpoints accept a liberal geofence tolerance (500 meters) when coordinates are available.
  3. If GPS is unavailable or disabled, the system accepts a zero-GPS checkpoint validated by mutual counterparty timestamp and optional OTP/SMS confirmation.

---

### Domain: Financial & Accounting Integrity (FIN)

#### RSK-FIN-001: Fractional Currency & Rounding Imbalance
* **Impact:** Calculating percentages (e.g. 5% commission, 18% GST) using floating-point math causes rounding drift, violating the fundamental ledger equation `sum(debits) == sum(credits)`.
* **Mitigation Plan:**
  1. All currency fields are stored as `BIGINT` representing integer Paise (₹1.00 = 100 paise).
  2. Bankers' rounding (round half to even) is applied strictly at the boundary of line-item calculation.
  3. The core ledger engine validates that total debits equal total credits to the exact single paisa before committing any database transaction.

#### RSK-FIN-002: Two-Phase Settlement Failure (Escrow Released, Payout Failed)
* **Impact:** Platform releases escrow funds from employer hold, but the subsequent IMPS/UPI payout to the worker's bank fails due to invalid VPA or bank downtime, leaving money in limbo.
* **Mitigation Plan:**
  1. Decouple escrow release from payout execution:
     * Phase 1: Escrow Release -> Funds move from `ESCROW_HOLDINGS` to internal `WORKER_PAYABLE` account. Status becomes `captured_settled`. The worker's in-app balance reflects available funds.
     * Phase 2: Payout Dispatch -> Asynchronous payout transfer moves funds from `WORKER_PAYABLE` to `SETTLEMENT_CLEARING`.
  2. If the bank transfer fails, webhook marks payout as `FAILED` and funds revert automatically to `WORKER_PAYABLE` for retry.

#### RSK-FIN-003: Off-Platform Cash Leakage
* **Impact:** Once worker and employer connect, they agree to cancel the booking on-platform and settle in unrecorded cash to avoid fees.
* **Mitigation Plan:**
  1. Zero worker commission removes economic incentive for workers to bypass the platform.
  2. Platform offers built-in incentives that require on-platform completion: verified job history, public reviews, micro-insurance coverage during working hours, and guaranteed dispute protection.
  3. Employers who repeatedly cancel after contact exchange are flagged for algorithmic reliability demotion.

---

### Domain: Operational & Field Realities (OPS)

#### RSK-OPS-001: Low Digital Literacy & Accidental Checkpoints
* **Impact:** Workers unfamiliar with smartphone apps accidentally tap "Check-Out" midday, or employers fail to confirm completion, stalling payments.
* **Mitigation Plan:**
  1. Mobile UI features bilingual English and Marathi audio-visual prompts.
  2. High-contrast milestone buttons with clear 2-step confirmation dialogs ("Confirm Check-In at Site").
  3. Automated 24-hour sweep guarantees that passive employers cannot hold worker wages indefinitely.

#### RSK-OPS-002: Retaliatory Ratings & Unjustified Disputing
* **Impact:** Unscrupulous employers file bad faith disputes or give 1-star reviews to intimidate workers into accepting lower pay or doing unpaid extra work.
* **Mitigation Plan:**
  1. Blind review window (7 days): Ratings remain completely private until both sides submit.
  2. Mandatory photo evidence and description required to open a dispute.
  3. Verified completion and financial settlement required before review submission is unlocked.
  4. Disputes decided in favor of workers automatically void employer reviews.

---

### Domain: Regulatory & Legal Compliance (REG)

#### RSK-REG-001: RBI Payment Aggregator / Nodal Account Regulations
* **Impact:** Holding customer deposits in non-compliant commercial bank accounts risks severe regulatory sanctions and freezing of platform funds by financial authorities.
* **Mitigation Plan:**
  1. Direct integration with RBI-authorized Payment Aggregators (Razorpay / Cashfree) utilizing their certified nodal escrow sub-account architecture.
  2. Platform does not touch intermediate fiat funds directly; the gateway routes settled funds directly from employer escrow to worker bank account.

#### RSK-REG-002: Tax Compliance (GST TCS & Section 194-O TDS)
* **Impact:** Inaccurate withholding or misreporting under Indian tax statutes leads to corporate penalties.
* **Mitigation Plan:**
  1. Financial schema includes explicit audit fields for `tax_rate`, `tax_amount`, `tds_rate`, and `tds_amount`.
  2. Configurable tax policies allow dynamic adjustment of thresholds without requiring database schema migrations.
  3. Detailed audit trails and transaction export capabilities for periodic GST/TDS filings.
