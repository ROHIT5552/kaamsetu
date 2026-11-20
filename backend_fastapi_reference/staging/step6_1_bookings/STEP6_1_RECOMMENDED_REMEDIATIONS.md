# KaamSetu Stage 2 Step 6.1 — Recommended Remediations Plan

**Document Version:** 1.0.0  
**Date:** 2026-11-18  
**Scope:** Staging Remediations for Step 6.1 Findings (`AUD-KS61-001` through `AUD-KS61-010`)  
**Target Workspace:** `staging/step6_1_bookings/backend/`  
**Governance:** Planning and Remediation Roadmap Only — No source edits during audit turn.  

---

## 1. Remediation Package Architecture

The 10 findings from the adversarial audit are grouped into four clean remediation modules:
1. **FSM & Lifecycle Protection:** Resolving `AUD-KS61-001` (cancel transition matrix) and `AUD-KS61-005` (terminated wage agreement status).
2. **Idempotency & Concurrency:** Resolving `AUD-KS61-002` (idempotency key) and `AUD-KS61-009` (concurrency locking).
3. **Financial Invariants & Validation:** Resolving `AUD-KS61-003` (advance <= wage), `AUD-KS61-004` (application status & duplicate prevention), and `AUD-KS61-006` (mobilization fee ceiling).
4. **API Routing & Test Quality:** Resolving `AUD-KS61-007` (completing omitted test cases), `AUD-KS61-008` (trailing slash 307 redirect), and `AUD-KS61-010` (enum alignment).

---

## 2. Precise Code Remediation Recipes

### Remediation 1: Enforce FSM Transition Matrix on Cancellation (AUD-KS61-001 & AUD-KS61-005)

**Affected Files:**
- `app/models/common.py`
- `app/modules/bookings/service.py`

**Code Recipe:**
1. In `app/models/common.py`, add `TERMINATED = "terminated"` to `WageAgreementStatus`:
   ```python
   class WageAgreementStatus(str, enum.Enum):
       DRAFT = "draft"
       PENDING_COUNTERPARTY = "pending_counterparty"
       ACTIVE = "active"
       REJECTED = "rejected"
       REVISION_PENDING = "revision_pending"
       SETTLED = "settled"
       DISPUTED_HOLD = "disputed_hold"
       TERMINATED = "terminated"
   ```
2. In `BookingService.cancel_booking` (`app/modules/bookings/service.py`):
   ```python
   # Verify transition to CANCELLED is permitted from current state
   allowed_targets = ALLOWED_BOOKING_STATUS_TRANSITIONS.get(current, set())
   if BookingStatus.CANCELLED not in allowed_targets:
       raise InvalidBookingStatusTransitionError(
           f"Cannot directly cancel booking in '{current.value}' status. "
           "In-progress work must be resolved via dispute escalation."
       )
   ```
3. Update wage agreement status on cancellation:
   ```python
   wage = self._wage_agreements[booking_id]
   wage["status"] = WageAgreementStatus.TERMINATED
   wage["updated_at"] = now
   ```

---

### Remediation 2: Implement Booking Creation Idempotency (AUD-KS61-002)

**Affected Files:**
- `app/modules/bookings/schemas.py`
- `app/modules/bookings/service.py`

**Code Recipe:**
1. In `BookingCreateRequest` (`app/modules/bookings/schemas.py`):
   ```python
   idempotency_key: Optional[str] = Field(
       None,
       max_length=64,
       description="Client-generated unique UUID or request token to prevent duplicate work order creation"
   )
   ```
2. In `BookingService.__init__` (`app/modules/bookings/service.py`):
   ```python
   # idempotency_key -> booking_id
   self._idempotency_index: Dict[str, uuid.UUID] = {}
   ```
3. In `BookingService.create_booking`:
   ```python
   if payload.idempotency_key:
       existing_id = self._idempotency_index.get(payload.idempotency_key)
       if existing_id:
           return self._format_booking(self._bookings[existing_id])
   ```
   Upon creating record:
   ```python
   if payload.idempotency_key:
       self._idempotency_index[payload.idempotency_key] = booking_id
       booking_record["idempotency_key"] = payload.idempotency_key
   ```

---

### Remediation 3: Validate Advance Amount and Cap Mobilization Compensation (AUD-KS61-003 & AUD-KS61-006)

**Affected Files:**
- `app/modules/bookings/schemas.py`
- `app/modules/bookings/service.py`

**Code Recipe:**
1. In `BookingCreateRequest` (`app/modules/bookings/schemas.py`):
   ```python
   @field_validator("advance_amount_paise")
   @classmethod
   def validate_advance_not_exceeding_wage(cls, v: int, info) -> int:
       wage = info.data.get("agreed_wage_paise")
       if wage is not None and v > wage:
           raise ValueError(f"Advance deposit ({v} Paise) cannot exceed total agreed wage ({wage} Paise).")
       return v
   ```
2. In `BookingService.cancel_booking` (`app/modules/bookings/service.py`):
   ```python
   if is_employer and (current in (BookingStatus.EN_ROUTE, BookingStatus.ARRIVED) or time_until_start < 7200):
       # Cap mobilization compensation at total agreed wage
       fee = min(15000, booking_record["agreed_wage_paise"])
       booking["mobilization_compensation_due_paise"] = fee
   ```

---

### Remediation 4: Validate Application Acceptance Status & Uniqueness (AUD-KS61-004)

**Affected File:**
- `app/modules/bookings/service.py`

**Code Recipe:**
1. In `BookingService.create_booking`:
   ```python
   if payload.application_id:
       app_getter = getattr(application_service, "get_by_id", None)
       app_record = app_getter(payload.application_id) if callable(app_getter) else getattr(application_service, "_applications", {}).get(payload.application_id)
       if not app_record:
           raise ValueError(f"Application {payload.application_id} not found.")

       if app_record["status"] != ApplicationStatus.ACCEPTED:
           raise ValueError(f"Cannot book candidate: Application status is '{app_record['status'].value}', must be 'accepted'.")

       # Check if an active booking already exists for this application
       for b in self._bookings.values():
           if b.get("application_id") == payload.application_id and b["status"] not in TERMINAL_BOOKING_STATES:
               raise ValueError(f"An active booking ({b['booking_code']}) already exists for this job application.")
   ```

---

### Remediation 5: Harmonize Trailing Slashes on Booking Router (AUD-KS61-008)

**Affected File:**
- `app/modules/bookings/router.py`

**Code Recipe:**
Update route decorators on collection endpoints to support both blank and slash:
```python
@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new booking work order"
)
@router.post(
    "/",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
async def create_booking(...):
```

---

### Remediation 6: Complete Test Suite Docstring Specifications (AUD-KS61-007)

**Affected File:**
- `app/tests/test_bookings.py`

**Code Recipe:**
1. In `test_cancellation_mobilization_compensation_policy`: Add Case 2 testing worker pre-dispatch cancellation yielding `0` Paise fee:
   ```python
   # Case 2: Worker cancels before dispatch -> 0 mobilization fee
   b2_res = await ac.post("/api/v1/bookings", json={...}, headers=emp_hdr)
   b2_id = b2_res.json()["id"]
   await ac.post(f"/api/v1/bookings/{b2_id}/accept", headers=wrk_hdr)
   c2_res = await ac.post(f"/api/v1/bookings/{b2_id}/cancel", json={"reason": "Illness"}, headers=wrk_hdr)
   assert c2_res.status_code == 200
   assert c2_res.json()["mobilization_compensation_due_paise"] == 0
   ```
2. In `test_multi_day_parent_contract_child_linkage`: Add Case 4 testing mismatched counterparty rejection:
   ```python
   # Case 4: Mismatched counterparty in child creation returns HTTP 400
   bad_child = await ac.post("/api/v1/bookings", json={
       "worker_id": other_worker_id,
       "parent_contract_id": parent_id,
       ...
   }, headers=emp_hdr)
   assert bad_child.status_code == 400
   ```
