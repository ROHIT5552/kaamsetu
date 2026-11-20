# KaamSetu — Stage 2, Step 6.1: Pre-Implementation Preflight & Staging Setup Report

**Sub-Step:** Stage 2, Step 6.1 — Core Bookings & Wage Agreements Foundation  
**Workspace:** `C:\Users\ajay\.gemini\antigravity\scratch\kaamsetu\staging\step6_1_bookings\`  
**Pilot District:** Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India  
**Date of Execution:** November 18, 2026  
**Status:** **PREFLIGHT COMPLETE — STAGING SEEDED — AWAITING HUMAN AUTHORIZATION**

---

## 1. Executive Summary & Governance Mandate

In strict accordance with the authorization for **Stage 2 Step 6.1 (Pre-Implementation Preflight & Staging Setup Only)**, the staging environment for Sub-Step 6.1 has been initialized and sealed. 

**Zero Python code modifications, zero database migrations, zero dependency changes, and zero database writes** have been executed. No files in `backend/app/` or `frontend/` have been created or modified.

### Key Preflight Objectives Completed:
1. **Isolated Workspace Initialized:** Created dedicated staging directory `scratch/kaamsetu/staging/step6_1_bookings/`.
2. **Step 5 Promoted Baseline Sealed:** Validated all 70 backend baseline files against `STEP5_PROMOTED_BASELINE_SHA256.txt` (0 mismatches) and recorded a verified local copy in the staging directory.
3. **Planning Manifests Verified:** Validated all 11 Step 6.0.1 corrected architecture documents and 3 Step 6.0.2 verification documents (0 mismatches).
4. **Architecture Traceability Mapped:** Authored [STEP6_1_PROPOSED_ARCHITECTURE_MAPPING.md](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_1_bookings/STEP6_1_PROPOSED_ARCHITECTURE_MAPPING.md) mapping all approved requirements to proposed source files, schemas, endpoints, and test suites.
5. **Dependencies & Risks Analyzed:** Identified implementation risks and formulated concrete engineering mitigations.
6. **Detailed Implementation & Rollback Plans Established:** Outlined the 10-phase execution sequence and atomic backup rollback strategy.

---

## 2. Cryptographic Baseline Verification Evidence

A full pre-implementation integrity audit was executed prior to staging setup:

| Artifact / Baseline | Verified Source | Check Count | Result | Status |
|---|---|---|---|---|
| **Promoted Step 5 Baseline** | `backend/` (70 files) | 70 of 70 | 0 mismatches | **INTACT & SEALED** |
| **Step 6.0.1 Corrections** | `STEP6_0_1_CORRECTION_PACKAGE_SHA256.txt` | 11 of 11 | 0 mismatches | **VERIFIED INTACT** |
| **Step 6.0.2 Quality Gate** | `STEP6_0_2_VERIFICATION_MANIFEST_SHA256.txt` | 3 of 3 | 0 mismatches | **VERIFIED INTACT** |
| **Prototype Baseline** | `prototype_original_2.html` (`489F4C38...`) | 1 of 1 | Exact match | **INTACT & SEALED** |
| **Frontend Baseline** | `index.html` (`CD325D07...`) | 1 of 1 | Exact match | **INTACT & SEALED** |
| **Current Test Suite** | `pytest app/tests/ -v` | 26 of 26 | 0 failures (15.39s) | **100% PASS RATE** |

The baseline manifest for Sub-Step 6.1 is recorded at:  
[`staging/step6_1_bookings/STEP5_PROMOTED_BASELINE_SHA256.txt`](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_1_bookings/STEP5_PROMOTED_BASELINE_SHA256.txt)

---

## 3. Architecture Requirement Mapping Summary

Detailed in [STEP6_1_PROPOSED_ARCHITECTURE_MAPPING.md](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_1_bookings/STEP6_1_PROPOSED_ARCHITECTURE_MAPPING.md):

```
       [ Approved Step 6.0.1 Planning Requirements ]
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 1. Model Refinements (app/models/common.py & booking.py)│
  │    - 10-State BookingStatus Enum (AUD-KS6-004)         │
  │    - 7-State WageAgreementStatus Enum (AUD-KS6-005)    │
  │    - Integer Paise Standard BigInteger (AUD-KS6-007)   │
  │    - parent_contract_id for Multi-Day (AUD-KS6-013)    │
  │    - WageAgreementVersion Model for Scope Amendments   │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. Schema Specifications (app/modules/bookings/schemas)│
  │    - BookingCreate, BookingResponse, BookingCancel     │
  │    - WageAgreementResponse, WageAgreementRevision      │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. Domain Logic Service (app/modules/bookings/service) │
  │    - Booking creation from accepted application        │
  │    - Strict 10-state FSM transition validator          │
  │    - Anti-IDOR ownership and counterparty checks       │
  │    - 15,000 Paise mobilization cancellation fee flag   │
  │    - Versioned wage amendment negotiation engine       │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. REST Router (app/modules/bookings/router.py)        │
  │    - POST /api/v1/bookings/                            │
  │    - GET  /api/v1/bookings/{id} (IDOR guarded)         │
  │    - GET  /api/v1/bookings/my-bookings                 │
  │    - POST /api/v1/bookings/{id}/accept                 │
  │    - POST /api/v1/bookings/{id}/cancel                 │
  │    - POST /api/v1/bookings/{id}/wage-agreement/revision│
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 5. Test Suite (app/tests/test_bookings.py)             │
  │    - 9 Comprehensive integration & security test cases │
  └────────────────────────────────────────────────────────┘
```

---

## 4. Dependencies & Implementation Risk Analysis

| Risk ID | Risk Description | Probability | Severity | Planned Engineering Mitigation |
|---|---|---|---|---|
| **RSK-6.1-001** | Circular import between `app.models.booking` and `app.modules.bookings`. | Med | Med | Strict separation: schemas and services import ORM models from `app.models.booking`; models never import from modules. |
| **RSK-6.1-002** | SQLite foreign key constraint issue on self-referential `parent_contract_id`. | Low | Med | Use `remote_side="Booking.id"` and declare foreign key with `use_alter=True` to prevent dependency warnings during table creation. |
| **RSK-6.1-003** | Windows container sandbox socket hang during test runs. | High | High | Continue running pytest executions with `BypassSandbox: true` and `--timeout=30` as empirically validated in prior steps. |
| **RSK-6.1-004** | Accidental regression on existing 26 Step 5 domain tests. | Low | Critical | Automated execution of full test suite (26 existing + new 6.1 tests) required before any promotion. Zero regression exit gate. |
| **RSK-6.1-005** | Premature database migrations or production writes. | Low | Critical | Tests run strictly on isolated SQLite in-memory test fixtures; zero external DB connections. |

---

## 5. Detailed Step-by-Step Implementation Plan (Upon Authorization)

When authorized, Sub-Step 6.1 will execute inside an isolated staging sub-workspace:  
`staging/step6_1_bookings/backend/`

* **Phase 1: Isolated Workspace Staging:** Copy baseline files into `staging/step6_1_bookings/backend/`. Keep `backend/` strictly read-only.
* **Phase 2: Common Enums (`app/models/common.py`):** Add `NO_SHOW`, `EMPLOYER_NO_SHOW`, and `DISPUTED` to `BookingStatus`; add `WageAgreementStatus` (7 states); add `AgreementType`.
* **Phase 3: Relational Models (`app/models/booking.py`):**
  * Update `Booking` with `parent_contract_id`.
  * Update `WageAgreement` to integer Paise `BigInteger` and add `status` enum.
  * Add `WageAgreementVersion` model.
* **Phase 4: Pydantic Schemas (`app/modules/bookings/schemas.py`):** Implement Pydantic V2 request and response schemas with Paise validation.
* **Phase 5: Domain Service (`app/modules/bookings/service.py`):** Implement creation, 10-state FSM validation, IDOR checks, cancellation mobilization flag, and revision handling.
* **Phase 6: REST API Router (`app/modules/bookings/router.py`):** Mount endpoints with role guards and IDOR dependencies.
* **Phase 7: Main App Integration (`app/main.py`):** Register `bookings_router` under `/api/v1/bookings`.
* **Phase 8: Comprehensive Test Suite (`app/tests/test_bookings.py`):** Write and execute 9 comprehensive test cases covering creation, IDOR, FSM, terminal immutability, integer Paise, and revisions.
* **Phase 9: Full Regression Run:** Execute full test suite (`pytest app/tests/ -v`). Assert 35+ tests pass (26 existing + 9 new) with 0 failures.
* **Phase 10: Independent Pre-Promotion Audit & Report:** Stop and present audit report before baseline promotion.

---

## 6. Atomic Rollback Strategy

To guarantee baseline safety:
1. **Pre-Promotion Backup:** Before any staging code is copied to `backend/`, an atomic timestamped backup directory is created:  
   `scratch/kaamsetu/backups/step6_1_pre_promotion_YYYYMMDD_HHMMSS/`
2. **Cryptographic Manifest:** Every backup file is hashed and verified into `SHA256SUMS.txt`.
3. **One-Command Rollback:** If any integration or verification issue occurs during promotion:
   ```powershell
   Copy-Item -Path "backups/step6_1_pre_promotion_YYYYMMDD_HHMMSS/*" -Destination "backend/" -Recurse -Force
   ```
   This instantaneously restores the verified Step 5 baseline.

---

## 7. Preflight Verification Manifest

The artifacts created during this preflight phase are sealed in:
* [`staging/step6_1_bookings/STEP6_1_PREFLIGHT_REPORT.md`](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_1_bookings/STEP6_1_PREFLIGHT_REPORT.md)
* [`staging/step6_1_bookings/STEP6_1_PROPOSED_ARCHITECTURE_MAPPING.md`](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_1_bookings/STEP6_1_PROPOSED_ARCHITECTURE_MAPPING.md)
* [`staging/step6_1_bookings/STEP5_PROMOTED_BASELINE_SHA256.txt`](file:///C:/Users/ajay/.gemini/antigravity/scratch/kaamsetu/staging/step6_1_bookings/STEP5_PROMOTED_BASELINE_SHA256.txt)

---

## 8. Preflight Clearance & Next Step

The preflight setup for Stage 2 Step 6.1 is **complete, verified, and sealed**. 

Antigravity has **halted** in strict compliance with governance instructions. No code implementation has started.

**Awaiting Your Explicit Authorization:**  
Please review this preflight report. When ready, provide authorization to begin **code implementation of Sub-Step 6.1** in the isolated staging directory:  
`staging/step6_1_bookings/backend/`
