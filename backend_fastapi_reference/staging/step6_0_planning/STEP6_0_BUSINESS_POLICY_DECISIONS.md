# KaamSetu — Stage 2, Step 6.0: Business Policy & Governance Catalog

**Document Reference:** `STEP6_0_BUSINESS_POLICY_DECISIONS.md`  
**Pilot Geography:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Status:** PLANNING DOCUMENT — AWAITING HUMAN GOVERNANCE APPROVAL  
**Governance Marker:** All policies cataloged below require explicit human sign-off prior to code implementation in Sub-Steps 6.1 through 6.5.

---

## 1. Executive Summary & Policy Philosophy

KaamSetu operates as an ethical, two-sided marketplace connecting blue-collar skilled workers (masons, electricians, carpenters, plumbers, agricultural laborers) and employers (households, contractors, commercial enterprises) in Maharashtra. 

The financial and operational policies must balance four critical imperatives:
1. **Worker Welfare & Protection:** Blue-collar workers must never be subjected to predatory deductions, unfair dispute resolutions, or withheld wages for performed labor.
2. **Employer Trust & Commitment:** Employers require certainty of worker arrival, transparent pricing with no hidden gouging, and swift recourse if work is substandard or abandoned.
3. **Regulatory & Tax Compliance:** Adherence to Reserve Bank of India (RBI) payment aggregator and nodal guidelines, Section 52 of the CGST Act (TCS), Section 194-O of the Income Tax Act (TDS on e-commerce), and the Code on Social Security 2020.
4. **Zero-Simulation Integrity:** No payment or payout flow will be faked. Every operational fee, tax deduction, and escrow release must map directly to verifiable ledger transactions.

---

## 2. Catalog of Critical Business Policy Decisions

### POL-001: Platform Commission & Take Rate Structure
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** Determining how the platform generates sustainable revenue while incentivizing rapid liquidity in the pilot district of Chhatrapati Sambhajinagar.
* **Options Under Consideration:**
  * **Option A (0% Zero Commission Pilot):** 0% fee charged to both worker and employer during the first 6 months of the pilot. Platform absorbs payment gateway processing costs (~1.5–2% UPI/Card interchange).
    * *Pros:* Maximum worker onboarding and employer adoption; eliminates friction.
    * *Cons:* Operating cash burn; establishes an expectation of free service that may resist future monetization.
  * **Option B (Employer Convenience Fee - Recommended):** 0% deduction from worker wages; 5% convenience fee added to employer invoices at booking confirmation.
    * *Pros:* Preserves 100% of worker earnings (strong moral and marketing stance for blue-collar labor); transparent to employers.
    * *Cons:* Slightly increases employer upfront cost.
  * **Option C (Split Take Rate):** 3% deducted from worker settlement + 3% charged to employer.
    * *Pros:* Low individual perceived burden on each party.
    * *Cons:* Complex to communicate in local languages; worker perception of wage loss.
* **Engineering Recommendation:** **Option B** (0% worker deduction, 5% employer fee). For the Chhatrapati Sambhajinagar pilot launch, the employer fee can be rebated via promo credit if authorized, but the accounting ledger must be implemented with full support for distinct fee splits.
* **Formal Decision Record:**
  * **Selected Option:** `[PENDING HUMAN APPROVAL]`
  * **Authorized Rate:** `[PENDING]`
  * **Authorizer Signature / Timestamp:** `[UNASSIGNED]`

---

### POL-002: Cancellation Policy & Tiered Windows
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** In blue-collar daily wage labor, a last-minute cancellation inflicts severe opportunity loss on a worker who passed up other jobs, or on an employer whose site work stalls.
* **Options Under Consideration:**
  * **Tier 1 (Cancellation > 12 Hours before Start Time):**
    * *Rule:* Full 100% refund of deposit to employer. No penalty to worker.
  * **Tier 2 (Employer Cancellation within 2 Hours of Start Time or after Worker Marked `en_route`):**
    * *Rule:* Employer forfeits a minimum mobilization fee (e.g., flat ₹150 or 25% of day wage, whichever is higher). This fee is credited directly to the worker's wallet/bank as dispatch compensation. Platform retains 0% commission on cancellation fee.
  * **Tier 3 (Worker Cancellation within 2 Hours of Start Time):**
    * *Rule:* Employer receives 100% immediate refund. Worker receives an internal reliability cooldown (cannot accept new bookings for 4 hours) unless an emergency reason is validated. No financial penalty is docked from worker bank accounts to prevent predatory labor practices.
* **Engineering Recommendation:** Adopt Tiers 1, 2, and 3. Financial penalties should never be unilaterally levied against worker personal bank accounts; reliability tracking and cooldowns prevent abuse safely.
* **Formal Decision Record:**
  * **Selected Option:** `[PENDING HUMAN APPROVAL]`
  * **Mobilization Fee Amount:** `[PENDING]`
  * **Authorizer Signature / Timestamp:** `[UNASSIGNED]`

---

### POL-003: Completion Inspection & Dispute Windows
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** How long after worker check-out does the employer have to inspect the work and confirm completion or raise a formal dispute before funds automatically disburse?
* **Options Under Consideration:**
  * **Option A (Instant Auto-Release):** Immediate release upon employer signing check-out or worker submitting completion code.
    * *Pros:* Instant settlement to worker.
    * *Cons:* High risk if defects are discovered hours later; creates friction if employer wasn't physically present at departure.
  * **Option B (24-Hour Inspection Window - Recommended):** Funds remain in `held_in_escrow` for 24 hours following worker `check_out`. Employer can manually tap "Confirm & Release Now" anytime. If employer takes no action and files no dispute within 24 hours, the system auto-transitions the payment to `captured_settled` and initiates payout.
    * *Pros:* Ample time for quality inspection while guaranteeing worker payment within 24 hours.
    * *Cons:* Requires automated scheduler / worker cron to execute expiry sweeps.
  * **Option C (48-Hour Inspection Window):** Extended 48-hour window.
    * *Pros:* Favors complex construction / plumbing jobs where leaks or defects take time to show.
    * *Cons:* Excessive delay for daily wage earners who require cash flow for sustenance.
* **Engineering Recommendation:** **Option B** (24 hours standard, with one-tap instant approval). Construction / specialized categories can optionally be configured for 36 hours.
* **Formal Decision Record:**
  * **Selected Option:** `[PENDING HUMAN APPROVAL]`
  * **Window Duration:** `[PENDING]`
  * **Authorizer Signature / Timestamp:** `[UNASSIGNED]`

---

### POL-004: Overtime, Scope Extension & Material Reimbursement
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** Daily wage work frequently extends beyond scheduled hours (e.g., an 8-hour shift extending to 10 hours) or requires the worker to purchase hardware supplies (cement, pipes, wires).
* **Options Under Consideration:**
  * **Policy on Extra Hours:**
    * Pro-rata hourly rate calculation based on agreed daily rate (Daily Rate / 8 * 1.0 or 1.25x overtime multiplier).
    * Requires explicit in-app confirmation from employer before overtime is billed.
  * **Policy on Material Purchases:**
    * *Strict Exclusion from Platform Escrow:* Materials must be settled directly in cash or separate bill between employer and store; KaamSetu only escrows labor charges.
    * *OR In-App Reimbursement Adjustment:* Worker uploads receipt; employer approves add-on payment to existing booking escrow.
* **Engineering Recommendation:** Escrow strictly covers **labor charges**. Material reimbursements should not be processed through labor escrow in Phase 6 to prevent GST misclassification and invoice inflation. Extra hours must require mutual in-app digital signature/approval.
* **Formal Decision Record:**
  * **Selected Option:** `[PENDING HUMAN APPROVAL]`
  * **Material Handling Policy:** `[PENDING]`
  * **Authorizer Signature / Timestamp:** `[UNASSIGNED]`

---

### POL-005: Worker Payout Frequency & Minimum Payout Threshold
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** Payout timing and method for transferring settled wages from platform nodal account to worker bank accounts / UPI IDs.
* **Options Under Consideration:**
  * **Option A (Immediate On-Demand IMPS/UPI Payout):** Worker taps "Withdraw", funds transfer in <60 seconds via UPI / IMPS API.
    * *Pros:* Maximum worker satisfaction.
    * *Cons:* Higher payout gateway API transaction fees (~₹2.50 to ₹5.00 per payout transfer) absorbed by platform.
  * **Option B (Daily Automated EOD Batch - Recommended):** All settled funds disbursed daily at 18:00 IST via batch NEFT/UPI. Free of charge to worker.
    * *Pros:* Highly cost-effective; predictable accounting reconciliation.
    * *Cons:* Workers must wait until evening for midday earnings.
  * **Option C (Threshold-Based Payout):** Payout triggers once accrued balance reaches ₹500 or every Friday.
    * *Cons:* Inappropriate for daily-wage workers who often need daily earnings for groceries.
* **Engineering Recommendation:** **Option B** with optional emergency instant withdrawal (with gateway fee passed through or subsidized). Minimum payout threshold set to ₹100.
* **Formal Decision Record:**
  * **Selected Option:** `[PENDING HUMAN APPROVAL]`
  * **Payout Schedule:** `[PENDING]`
  * **Minimum Threshold:** `[PENDING]`
  * **Authorizer Signature / Timestamp:** `[UNASSIGNED]`

---

### POL-006: Indian Payment Gateway & Escrow / Nodal Account Architecture
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** Reserve Bank of India (RBI) regulations govern marketplace aggregators handling merchant/vendor funds. PAs must maintain designated Escrow / Nodal accounts with scheduled commercial banks.
* **Provider Candidates for India Pilot:**
  1. **Razorpay (Razorpay Route / Marketplace):**
     * Direct split payouts, automated vendor KYC, strong UPI intent support, sandbox environment.
  2. **Cashfree Payments (Cashfree Marketplace & Payouts):**
     * Highly competitive payout rates, robust webhook callbacks, instant bank verification.
  3. **PayU India (PayU Marketplace):**
     * Comprehensive nodal settlement workflows, enterprise bank integrations.
* **Compliance Invariants:**
  * Platform must never hold customer funds in a proprietary current account for unregulated periods. Funds must flow through an RBI-regulated Nodal/Escrow mechanism.
* **Engineering Recommendation:** Design the `PaymentGatewayAdapter` interface generically in Step 6.3 so any certified provider (Razorpay / Cashfree) can be plugged in without refactoring core ledger logic. Mock gateway adapter for testing.
* **Formal Decision Record:**
  * **Selected Gateway Provider:** `[PENDING HUMAN APPROVAL]`
  * **Adapter Interface Strategy:** `[PENDING]`
  * **Authorizer Signature / Timestamp:** `[UNASSIGNED]`

---

### POL-007: Indian Taxation Compliance (GST & TDS)
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** Tax obligations under Indian tax laws for e-commerce operators connecting service providers.
* **1. GST (Goods & Services Tax):**
  * Platform commission is subject to 18% GST (SAC code 998599 - Other business support services).
  * If platform charges ₹50 commission, ₹9 GST is added, total ₹59 billed.
  * Blue-collar individual workers whose annual turnover is under ₹20 Lakhs are exempt from GST registration.
  * Section 52 CGST Act: Tax Collection at Source (TCS) @ 0.5% CGST + 0.5% SGST (Total 1%) on net taxable supplies if applicable to unregistered vs registered suppliers.
* **2. Income Tax TDS (Section 194-O):**
  * E-commerce operators are mandated to deduct 1% TDS on gross sale of goods or provision of services facilitated through digital marketplace if gross amount exceeds ₹5,00,000 in a financial year for an individual with PAN.
  * For workers without PAN or where aggregate does not exceed ₹5 Lakhs, thresholds must be evaluated by financial and legal counsel.
* **Engineering Recommendation:** The Step 6 financial ledger must support tax split line items (`tax_amount`, `tds_deduction_amount`) in the transaction schema, but tax rates and deduction flags must be configurable via environment policies, not hardcoded.
* **Formal Decision Record:**
  * **GST Applicability Model:** `[PENDING HUMAN APPROVAL]`
  * **TDS Deduction Thresholds:** `[PENDING HUMAN APPROVAL]`
  * **Legal / Tax Advisor Sign-Off:** `[UNASSIGNED]`

---

### POL-008: Review & Rating Authenticity & Anti-Retaliation Policy
*Status: [HUMAN DECISION REQUIRED]*

* **Context:** Protecting workers from retaliatory bad reviews when employers are in dispute or seeking unwarranted discounts.
* **Policy Invariants:**
  1. **Blind Review Window:** Both parties have 7 days to submit a rating/review. Neither party's review is made public until *both* have submitted, or the 7-day window expires.
  2. **Dispute Invalidation:** If a formal dispute is opened and ruled as "Employer Unjustified Breach", the employer's negative review is permanently suppressed.
  3. **No Review Without Completed & Paid Booking:** Verified booking link is strictly required; unverified or cancelled bookings cannot generate reviews.
* **Engineering Recommendation:** Enforce blind review window and verified booking requirement in Sub-Step 6.5.
* **Formal Decision Record:**
  * **Selected Policy:** `[PENDING HUMAN APPROVAL]`
  * **Blind Review Window Duration:** `[PENDING]`
  * **Authorizer Signature / Timestamp:** `[UNASSIGNED]`

---

## 3. Policy Sign-Off Matrix

| Policy ID | Policy Area | Proposed Default | Legal / Business Sign-Off | Approval Date |
|---|---|---|---|---|
| **POL-001** | Platform Commission | 5% Employer Fee / 0% Worker | PENDING HUMAN APPROVAL | — |
| **POL-002** | Cancellation Structure | Tiered (₹150 Min Mobilization) | PENDING HUMAN APPROVAL | — |
| **POL-003** | Completion Inspection Window | 24 Hours Auto-Release | PENDING HUMAN APPROVAL | — |
| **POL-004** | Overtime & Extra Hours | Mutual In-App Approval Required | PENDING HUMAN APPROVAL | — |
| **POL-005** | Payout Frequency & Minimum | Daily EOD Batch / ₹100 Min | PENDING HUMAN APPROVAL | — |
| **POL-006** | Gateway Provider / Escrow | Razorpay / Cashfree Adapter | PENDING HUMAN APPROVAL | — |
| **POL-007** | GST & TDS Tax Handling | Configurable Tax Line Items | PENDING HUMAN APPROVAL | — |
| **POL-008** | Review Anti-Retaliation | 7-Day Blind Review Period | PENDING HUMAN APPROVAL | — |

*Note: No implementation will hardcode these values. All values will be parameterized in service configuration and database schemas.*
