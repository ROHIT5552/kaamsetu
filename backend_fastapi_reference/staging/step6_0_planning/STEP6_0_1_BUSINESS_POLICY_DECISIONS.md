# KaamSetu — Stage 2, Step 6.0.1: Business Policy & Statutory Catalog (CORRECTED)

**Document Reference:** `STEP6_0_1_BUSINESS_POLICY_DECISIONS.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Scope:** Policy Decisions, Statutory Assumptions & Legal Uncertainties Catalog  
**Version:** 2.0.0 (Post-Adversarial Audit Revision)

---

## 1. Executive Summary & Policy Philosophy

KaamSetu operates as an ethical, two-sided marketplace connecting blue-collar workers and employers in Maharashtra. The financial policies must balance:
1. **Worker Protection:** Zero deductions from agreed wages; guaranteed compensation for wasted travel dispatches.
2. **Employer Trust:** Certainty of worker arrival, transparent convenience fees, and 24-hour inspection windows.
3. **Integer Currency Rigor:** All monetary values stored and calculated in integer Paise (`BIGINT`).
4. **Statutory Awareness without Unsupported Claims:** Clearly separating engineering policies from legal interpretations that require formal sign-off by qualified Indian tax and legal counsel.

---

## 2. Hardened Business Policies

### POL-001: Platform Commission & Take Rate Structure
* **Status:** `[HUMAN APPROVED DEFAULT]`
* **Policy Rule:**
  * **0% deduction from worker wages.** (The worker receives 100% of their contracted wage).
  * **5% convenience fee billed to employer** on top of the agreed wage.
  * Tips are 100% credited to the worker with 0% platform fee.
* **Example Calculation (Integer Paise):**
  * Agreed Wage: ₹1,000.00 (100,000 Paise)
  * Employer Convenience Fee (5%): ₹50.00 (5,000 Paise)
  * Total Billed to Employer: ₹1,050.00 (105,000 Paise)
  * Disbursed to Worker: ₹1,000.00 (100,000 Paise)
  * Platform Revenue: ₹50.00 (5,000 Paise)

---

### POL-002: Cancellation & Mobilization Protection (AUD-KS6-011)
* **Status:** `[HUMAN APPROVED DEFAULT]`
* **Policy Rules:**
  * **Tier 1 (> 12h before start time):** Either party can cancel. 100% refund of advance deposit to employer. No worker penalty.
  * **Tier 2 (Employer cancels < 2h before start or after worker triggers `en_route`):** Employer forfeits a **₹150 (15,000 Paise) mobilization fee**. This is credited 100% to the worker's payable account as travel compensation.
* **Collection Enforceability Rule (AUD-KS6-011 Resolved):**
  * Mobilization compensation is **strictly guaranteed for bookings with confirmed advance escrow deposits**.
  * For bookings with zero advance deposit (e.g. cash on completion), the system debits the employer's platform account with an outstanding penalty balance of ₹150; further bookings are blocked until the balance is cleared via digital payment.

---

### POL-003: Attendance SLA & Escrow Inspection Windows (AUD-KS6-012)
* **Status:** `[HUMAN APPROVED DEFAULT]`
* **Policy Rules:**
  1. **12-Hour Attendance Confirmation SLA:** When a worker triggers `check_out`, the employer has 12 hours to review and confirm or raise a discrepancy. If no action is taken within **12 hours**, the checkpoint automatically transitions to `approved`, and the booking updates to `completed`.
  2. **24-Hour Payment Inspection Window:** Following booking completion, escrowed funds remain in `held_in_escrow` for **24 hours**. If no formal dispute is filed, funds automatically transition to `captured_settled` and release for worker payout. The employer can tap "Confirm & Release Now" to disburse immediately.

---

### POL-004: Overtime & Scope Additions
* **Status:** `[HUMAN APPROVED DEFAULT]`
* **Policy Rules:**
  * Standard shift is 8 working hours.
  * Overtime multiplier is $1.5\times$ base hourly rate: `(base_hourly_paise * 150) // 100`.
  * Extra hours and scope revisions require mutual in-app acceptance before becoming billable.
  * Escrow strictly covers **labor charges**; material reimbursements must be settled directly or handled as separate line items.

---

### POL-005: Worker Payout Frequency & Thresholds
* **Status:** `[HUMAN APPROVED DEFAULT]`
* **Policy Rules:**
  * All settled funds are disbursed daily via an automated **18:00 IST batch payout**.
  * Minimum payout threshold: **₹100.00 (10,000 Paise)**. Balances below ₹100 roll over to the following day.
  * Instant on-demand payouts available for emergencies (with gateway pass-through fee if authorized).

---

### POL-006: Indian Gateway Architecture & Payout Strategy (AUD-KS6-009)
* **Status:** `[ARCHITECTURAL DECISION]`
* **Strategy:**
  * **Inbound Collection:** Customer payments deposited into an RBI-compliant Payment Aggregator Escrow/Nodal Account via standard Payment Gateway (UPI Intent, Netbanking, Debit/Credit Cards).
  * **Outbound Disbursals:** Automated Payout transfers via **Cashfree Payouts / RazorpayX Payouts** directly to worker UPI VPAs or Bank Accounts verified via automated Penny Drop.
  * *Reasoning:* Sub-merchant split models (Razorpay Route) require formal merchant underwriting and GST/PAN registrations that are inaccessible to unorganized informal labor. Direct Payouts require only beneficiary bank/VPA verification.

---

## 3. Statutory Uncertainties & Items Requiring Legal / CA Verification

To avoid making unsupported legal assertions, the following four regulatory areas are explicitly cataloged as **uncertainties requiring professional verification by licensed Indian Chartered Accountants and Legal Counsel**:

### REG-001: Section 194-O Income Tax TDS on Blue-Collar E-Commerce Participants
* **Statutory Requirement:** Section 194-O of the Income Tax Act, 1961 mandates that an e-commerce operator deduct 1% TDS on the gross amount of sales/services facilitated through its digital platform.
* **Exemption Threshold:** For individuals, TDS is not required if gross receipts through the platform do not exceed ₹5,00,000 in a financial year **provided the individual furnishes PAN or Aadhaar**.
* **Uncertainty & Legal Issue:**
  1. Under Section 206AA, if a participant does not provide PAN, the mandatory TDS deduction rate jumps to **20%**.
  2. If an informal worker in Chhatrapati Sambhajinagar earns ₹800/day and does not possess a PAN card, deducting 20% (₹160/day) would be devastating to worker livelihood, while failing to deduct could expose the platform to tax non-compliance penalties.
  3. Form 26Q quarterly tax filings mandate submitting recipient PANs for all payments.
* **Action Required:** Obtain formal written opinion from a licensed Indian Tax Advocate on whether KaamSetu qualifies as a "pure technology facilitator / contact relay" vs "e-commerce operator" under Section 194-O, and establish a compliant PAN-collection threshold policy.

---

### REG-002: Section 52 CGST Act (Tax Collection at Source - TCS)
* **Statutory Requirement:** Section 52 of the Central Goods and Services Tax (CGST) Act, 2017 mandates that e-commerce operators collect TCS @ 1% (0.5% CGST + 0.5% SGST) on net taxable supplies.
* **Exemption Context:** Notification No. 34/2023 - Central Tax allows unregistered persons with turnover below ₹20 Lakhs to supply services through e-commerce operators subject to obtaining a designated Enrolment ID on the GST portal.
* **Uncertainty:** Whether daily wage informal laborers in Maharashtra must obtain a GST Enrolment ID before accepting work through KaamSetu, or whether services provided by unregistered individual artisans are exempt from Section 52 TCS.
* **Action Required:** Retain a GST consultant in Maharashtra to confirm GST registration and Enrolment ID requirements for pilot workers.

---

### REG-003: RBI Payment Aggregator Guidelines (Nodal / Escrow Compliance)
* **Statutory Requirement:** Under the Reserve Bank of India (RBI) Master Directions on Regulation of Payment Aggregators and Payment Gateways (PPO Act, 2007), entities facilitating payments between buyers and merchants/service providers must not hold customer funds in proprietary commercial bank accounts.
* **Architecture Assumption:** KaamSetu assumes that partnering with an RBI-authorized Payment Aggregator (Cashfree Payments / Razorpay) and utilizing their certified Nodal/Escrow sub-account architecture satisfies RBI escrow compliance.
* **Uncertainty:** Confirmation that holding funds in escrow for a 24-hour inspection window falls within permissible PA settlement cycles ($T+1 / T+2$).
* **Action Required:** Review gateway merchant agreement with legal counsel to confirm PA escrow terms and conditions.

---

### REG-004: Code on Social Security 2020 (Gig & Platform Workers)
* **Context:** The Code on Social Security, 2020 introduces provisions for the welfare of gig workers and platform workers, including potential state-level cess or contribution mandates (1–2% of annual turnover).
* **Uncertainty:** Maharashtra State Government rules on aggregator contributions for informal marketplace labor.
* **Action Required:** Monitor Maharashtra labor department gazette notifications regarding platform worker welfare schemes.

---

## 4. Policy Decision Matrix Summary

| Policy ID | Policy Area | Hardened Parameter (Integer Paise) | Governance Status |
|---|---|---|---|
| **POL-001** | Platform Commission | 0% Worker / 5% Employer Convenience Fee | Human Approved Default |
| **POL-002** | Cancellation Fee | ₹150 (15,000 Paise) Escrow-Backed Only | Human Approved Default |
| **POL-003** | Attendance SLA | 12h Auto-Approval / 24h Escrow Release | Human Approved Default |
| **POL-004** | Overtime Rate | $1.5\times$ Base Rate (Labor Escrow Only) | Human Approved Default |
| **POL-005** | Payout Schedule | Daily 18:00 IST / ₹100 (10,000 Paise) Min | Human Approved Default |
| **POL-006** | Gateway Settlement | Cashfree/RazorpayX Direct Payout API | Architectural Standard |
| **REG-001** | Section 194-O TDS | Encrypted PAN Support; Legal Review Req. | Legal Review Required |
| **REG-002** | Section 52 GST TCS | Micro-Enterprise Enrolment Review Req. | Legal Review Required |
