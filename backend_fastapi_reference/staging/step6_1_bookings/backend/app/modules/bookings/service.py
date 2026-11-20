"""Bookings & Wage Agreements Business Domain Service (Stage 2 Step 6.1)

Handles:
- Core booking lifecycle across synchronized 10-state FSM
- 7-state Wage Agreement lifecycle with integer Paise standard (BIGINT)
- Versioned wage amendments with explicit counterparty acceptance
- Ownership validation and anti-IDOR guards
- Linked single-day dispatches for multi-day parent contracts
- Conditional ₹150 (15,000 Paise) mobilization compensation tracking
"""

import uuid
import asyncio
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timezone, timedelta

from app.models.common import BookingStatus, WageAgreementStatus, AgreementType, UserRoleType, ApplicationStatus
from app.modules.employers.service import employer_service
from app.modules.workers.service import worker_service
from app.modules.applications.service import application_service
from app.modules.jobs.service import job_service
from app.modules.bookings.schemas import (
    BookingCreateRequest,
    BookingCancelRequest,
    BookingStatusUpdateRequest,
    WageAgreementRevisionRequest,
    WageAgreementRevisionRespondRequest,
    BookingResponse,
    WageAgreementResponse,
    WageAgreementVersionResponse
)


class BookingDomainError(Exception):
    """Base exception for booking domain operations."""
    pass


class BookingNotFoundError(BookingDomainError):
    """Raised when a booking record is not found."""
    pass


class InvalidBookingStatusTransitionError(BookingDomainError):
    """Raised when an illegal booking status transition is requested."""
    pass


class WageAgreementStateError(BookingDomainError):
    """Raised when a wage agreement operation violates lifecycle rules."""
    pass


class BookingOwnershipError(BookingDomainError):
    """Raised when an unauthorized user attempts to access or mutate a booking."""
    pass


# Synchronized 10-State Booking Finite State Machine (FSM)
ALLOWED_BOOKING_STATUS_TRANSITIONS: Dict[BookingStatus, Set[BookingStatus]] = {
    BookingStatus.REQUESTED: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED},
    BookingStatus.CONFIRMED: {BookingStatus.EN_ROUTE, BookingStatus.CANCELLED, BookingStatus.NO_SHOW},
    BookingStatus.EN_ROUTE: {BookingStatus.ARRIVED, BookingStatus.CANCELLED},
    BookingStatus.ARRIVED: {BookingStatus.IN_PROGRESS, BookingStatus.EMPLOYER_NO_SHOW},
    BookingStatus.IN_PROGRESS: {BookingStatus.COMPLETED, BookingStatus.DISPUTED},
    BookingStatus.DISPUTED: {BookingStatus.COMPLETED, BookingStatus.CANCELLED},
    # Terminal states: zero outbound transitions permitted
    BookingStatus.COMPLETED: set(),
    BookingStatus.CANCELLED: set(),
    BookingStatus.NO_SHOW: set(),
    BookingStatus.EMPLOYER_NO_SHOW: set(),
}

TERMINAL_BOOKING_STATES: Set[BookingStatus] = {
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
    BookingStatus.EMPLOYER_NO_SHOW,
}


class BookingService:
    """Manages booking domain records and wage agreements in staging store."""

    def __init__(self):
        # In-memory asyncio concurrency lock for staging operations
        self._lock = asyncio.Lock()
        # idempotency_key -> booking_id
        self._idempotency_index: Dict[str, uuid.UUID] = {}
        # booking_id -> dict
        self._bookings: Dict[uuid.UUID, Dict[str, Any]] = {}
        # booking_code -> booking_id
        self._code_index: Dict[str, uuid.UUID] = {}
        # booking_id -> wage_agreement dict
        self._wage_agreements: Dict[uuid.UUID, Dict[str, Any]] = {}
        # booking_id -> list of version dicts
        self._wage_versions: Dict[uuid.UUID, List[Dict[str, Any]]] = {}

    def create_booking(
        self,
        employer_user_id: uuid.UUID,
        payload: BookingCreateRequest
    ) -> BookingResponse:
        """Creates a new booking work order with linked wage agreement in Paise."""
        # Idempotency check: duplicate prevention and retry safety (AUD-KS61-002)
        if payload.idempotency_key:
            existing_id = self._idempotency_index.get(payload.idempotency_key)
            if existing_id:
                existing_booking = self._bookings.get(existing_id)
                if existing_booking:
                    return self._format_booking(existing_booking)

        # Defense-in-depth: advance wage cannot exceed agreed wage (AUD-KS61-003)
        if payload.advance_amount_paise > payload.agreed_wage_paise:
            raise ValueError(
                f"Advance deposit ({payload.advance_amount_paise} Paise) cannot exceed total agreed wage ({payload.agreed_wage_paise} Paise)."
            )

        emp = employer_service.get_by_user_id(employer_user_id)
        if not emp:
            raise ValueError("Employer profile not found. Please create employer profile first.")

        job_id: Optional[uuid.UUID] = payload.job_id
        worker_id: Optional[uuid.UUID] = None

        if payload.application_id:
            # Booking created from an accepted job application (AUD-KS61-004)
            app_getter = getattr(application_service, "get_by_id", None)
            app_record = app_getter(payload.application_id) if callable(app_getter) else getattr(application_service, "_applications", {}).get(payload.application_id)
            if not app_record:
                raise ValueError(f"Application {payload.application_id} not found.")

            app_status = app_record.get("status")
            if app_status != ApplicationStatus.ACCEPTED:
                status_str = app_status.value if hasattr(app_status, "value") else str(app_status)
                raise ValueError(f"Cannot book candidate: Application status is '{status_str}', must be 'accepted'.")

            # Check if an active booking already exists for this application
            for b in self._bookings.values():
                if b.get("application_id") == payload.application_id and b["status"] not in TERMINAL_BOOKING_STATES:
                    raise ValueError(f"An active booking ({b['booking_code']}) already exists for this job application.")

            job = job_service.get_raw_by_id(app_record["job_id"])
            if not job or job["employer_id"] != emp.id:
                raise BookingOwnershipError("Unauthorized: Application belongs to a job owned by another employer.")

            worker_id = app_record["worker_id"]
            job_id = app_record["job_id"]
        elif payload.worker_id:
            # Direct locality booking from worker directory
            worker_rec = worker_service.get_by_id(payload.worker_id)
            if not worker_rec:
                raise ValueError(f"Worker profile {payload.worker_id} not found.")
            worker_id = payload.worker_id
        else:
            raise ValueError("Either application_id or worker_id must be provided to create a booking.")

        # Multi-day contract linkage validation
        if payload.parent_contract_id:
            parent = self._bookings.get(payload.parent_contract_id)
            if not parent:
                raise ValueError(f"Parent contract {payload.parent_contract_id} not found.")
            if parent["employer_id"] != emp.id or parent["primary_worker_id"] != worker_id:
                raise ValueError("Parent contract counterparty mismatch with child dispatch.")

        booking_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        code_date = now.strftime("%Y%m%d")
        code_suffix = uuid.uuid4().hex[:6].upper()
        booking_code = f"BK-{code_date}-{code_suffix}"

        # Initialize Booking record in REQUESTED status
        booking_record = {
            "id": booking_id,
            "booking_code": booking_code,
            "idempotency_key": payload.idempotency_key,
            "application_id": payload.application_id,
            "job_id": job_id,
            "employer_id": emp.id,
            "primary_worker_id": worker_id,
            "parent_contract_id": payload.parent_contract_id,
            "agreed_wage_paise": payload.agreed_wage_paise,
            "status": BookingStatus.REQUESTED,
            "service_address": payload.service_address,
            "area": payload.area,
            "scheduled_at": payload.scheduled_at,
            "en_route_at": None,
            "arrived_at": None,
            "started_at": None,
            "completed_at": None,
            "cancelled_at": None,
            "cancellation_reason": None,
            "mobilization_compensation_due_paise": 0,
            "created_at": now,
            "updated_at": now
        }

        # Initialize linked Wage Agreement in DRAFT status with integer Paise
        agreed_paise = payload.agreed_wage_paise
        advance_paise = payload.advance_amount_paise
        commission_paise = (agreed_paise * 5) // 100  # 5% employer convenience fee
        outstanding_paise = agreed_paise - advance_paise

        agreement_id = uuid.uuid4()
        wage_record = {
            "id": agreement_id,
            "booking_id": booking_id,
            "agreement_type": payload.agreement_type,
            "status": WageAgreementStatus.DRAFT,
            "current_version": 1,
            "agreed_wage_paise": agreed_paise,
            "advance_amount_paise": advance_paise,
            "amount_due_paise": agreed_paise,
            "amount_paid_paise": 0,
            "refund_amount_paise": 0,
            "disputed_amount_paise": 0,
            "outstanding_balance_paise": outstanding_paise,
            "platform_commission_paise": commission_paise,
            "tip_amount_paise": 0,
            "currency": "INR",
            "is_settled": False,
            "created_at": now,
            "updated_at": now
        }

        # Version 1 initial audit snapshot
        version_record = {
            "version_number": 1,
            "proposed_wage_paise": agreed_paise,
            "proposed_wage_inr": agreed_paise / 100.0,
            "scope_change_description": "Initial agreed wage",
            "status": "accepted",
            "proposed_by_id": employer_user_id,
            "decided_at": now,
            "created_at": now
        }

        self._bookings[booking_id] = booking_record
        self._code_index[booking_code] = booking_id
        if payload.idempotency_key:
            self._idempotency_index[payload.idempotency_key] = booking_id
        self._wage_agreements[booking_id] = wage_record
        self._wage_versions[booking_id] = [version_record]

        return self._format_booking(booking_record)

    def get_by_id(self, booking_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Internal helper to retrieve raw booking record."""
        return self._bookings.get(booking_id)

    def get_booking_details(
        self,
        user_id: uuid.UUID,
        booking_id: uuid.UUID,
        user_role: Optional[UserRoleType] = None
    ) -> BookingResponse:
        """Retrieves booking with strict anti-IDOR verification."""
        booking = self._bookings.get(booking_id)
        if not booking:
            raise BookingNotFoundError(f"Booking {booking_id} not found.")

        # IDOR Guard: User must be designated worker, employer, or admin/support
        if user_role not in (UserRoleType.ADMIN, UserRoleType.SUPPORT):
            emp = employer_service.get_by_user_id(user_id)
            wrk = worker_service.get_by_user_id(user_id)

            is_employer = emp and emp.id == booking["employer_id"]
            is_worker = wrk and wrk.id == booking["primary_worker_id"]

            if not (is_employer or is_worker):
                raise BookingOwnershipError("Access denied: You are not authorized to view this booking.")

        return self._format_booking(booking)

    def list_user_bookings(
        self,
        user_id: uuid.UUID,
        status_filter: Optional[BookingStatus] = None
    ) -> List[BookingResponse]:
        """Lists bookings strictly filtered by authenticated user's ownership."""
        emp = employer_service.get_by_user_id(user_id)
        wrk = worker_service.get_by_user_id(user_id)

        results = []
        for b in self._bookings.values():
            is_employer = emp and emp.id == b["employer_id"]
            is_worker = wrk and wrk.id == b["primary_worker_id"]

            if not (is_employer or is_worker):
                continue

            if status_filter and b["status"] != status_filter:
                continue

            results.append(self._format_booking(b))

        return results

    def accept_booking(
        self,
        worker_user_id: uuid.UUID,
        booking_id: uuid.UUID
    ) -> BookingResponse:
        """Worker accepts an offered booking work order."""
        wrk = worker_service.get_by_user_id(worker_user_id)
        if not wrk:
            raise ValueError("Worker profile not found.")

        booking = self._bookings.get(booking_id)
        if not booking:
            raise BookingNotFoundError(f"Booking {booking_id} not found.")

        # IDOR: Only designated primary worker can accept
        if booking["primary_worker_id"] != wrk.id:
            raise BookingOwnershipError("Unauthorized: You are not the assigned worker for this booking.")

        if booking["status"] != BookingStatus.REQUESTED:
            raise InvalidBookingStatusTransitionError(
                f"Cannot accept booking in '{booking['status'].value}' status."
            )

        now = datetime.now(timezone.utc)
        booking["status"] = BookingStatus.CONFIRMED
        booking["updated_at"] = now

        # Transition wage agreement from DRAFT to ACTIVE
        wage = self._wage_agreements[booking_id]
        wage["status"] = WageAgreementStatus.ACTIVE
        wage["updated_at"] = now

        return self._format_booking(booking)

    def transition_status(
        self,
        user_id: uuid.UUID,
        booking_id: uuid.UUID,
        payload: BookingStatusUpdateRequest,
        user_role: Optional[UserRoleType] = None
    ) -> BookingResponse:
        """Transitions booking through the synchronized 10-state FSM with actor validation."""
        booking = self._bookings.get(booking_id)
        if not booking:
            raise BookingNotFoundError(f"Booking {booking_id} not found.")

        current = booking["status"]
        target = payload.target_status

        # Terminal state check
        if current in TERMINAL_BOOKING_STATES:
            raise InvalidBookingStatusTransitionError(
                f"Terminal booking status '{current.value}' cannot be altered."
            )

        # Transition matrix check
        allowed_targets = ALLOWED_BOOKING_STATUS_TRANSITIONS.get(current, set())
        if target not in allowed_targets:
            raise InvalidBookingStatusTransitionError(
                f"Illegal state transition from '{current.value}' to '{target.value}'."
            )

        # Actor permission check
        emp = employer_service.get_by_user_id(user_id)
        wrk = worker_service.get_by_user_id(user_id)
        is_employer = emp and emp.id == booking["employer_id"]
        is_worker = wrk and wrk.id == booking["primary_worker_id"]
        is_admin = user_role in (UserRoleType.ADMIN, UserRoleType.SUPPORT)

        if not (is_employer or is_worker or is_admin):
            raise BookingOwnershipError("Unauthorized: You are not a participant in this booking.")

        # Role-specific transition rules
        if target == BookingStatus.EN_ROUTE and not (is_worker or is_admin):
            raise BookingOwnershipError("Only the assigned worker can signal travel status.")
        if target == BookingStatus.ARRIVED and not (is_worker or is_admin):
            raise BookingOwnershipError("Only the assigned worker can signal arrival.")
        if target == BookingStatus.NO_SHOW and not (is_employer or is_admin):
            raise BookingOwnershipError("Only the employer can report worker no-show.")
        if target == BookingStatus.EMPLOYER_NO_SHOW and not (is_worker or is_admin):
            raise BookingOwnershipError("Only the assigned worker can report employer absence.")
        if target == BookingStatus.COMPLETED and not (is_employer or is_admin):
            raise BookingOwnershipError("Only the employer or admin can confirm completion.")

        now = datetime.now(timezone.utc)
        booking["status"] = target
        booking["updated_at"] = now

        # Update checkpoint timestamps
        if target == BookingStatus.EN_ROUTE:
            booking["en_route_at"] = now
        elif target == BookingStatus.ARRIVED:
            booking["arrived_at"] = now
        elif target == BookingStatus.IN_PROGRESS:
            booking["started_at"] = now
        elif target == BookingStatus.COMPLETED:
            booking["completed_at"] = now
            # Lock wage agreement to SETTLED
            self._wage_agreements[booking_id]["status"] = WageAgreementStatus.SETTLED
            self._wage_agreements[booking_id]["updated_at"] = now
        elif target == BookingStatus.DISPUTED:
            # Freeze wage agreement
            self._wage_agreements[booking_id]["status"] = WageAgreementStatus.DISPUTED_HOLD
            self._wage_agreements[booking_id]["updated_at"] = now

        return self._format_booking(booking)

    def cancel_booking(
        self,
        user_id: uuid.UUID,
        booking_id: uuid.UUID,
        payload: BookingCancelRequest
    ) -> BookingResponse:
        """Cancels booking work order and calculates mobilization compensation if applicable."""
        booking = self._bookings.get(booking_id)
        if not booking:
            raise BookingNotFoundError(f"Booking {booking_id} not found.")

        current = booking["status"]
        if current in TERMINAL_BOOKING_STATES:
            raise InvalidBookingStatusTransitionError(
                f"Booking is in terminal state '{current.value}' and cannot be cancelled."
            )

        # FSM check: verify CANCELLED transition is permitted from current status (AUD-KS61-001)
        allowed_targets = ALLOWED_BOOKING_STATUS_TRANSITIONS.get(current, set())
        if BookingStatus.CANCELLED not in allowed_targets:
            raise InvalidBookingStatusTransitionError(
                f"Cannot directly cancel booking in '{current.value}' status. "
                "In-progress or arrived work must be resolved via dispute escalation or attendance no-show handling."
            )

        emp = employer_service.get_by_user_id(user_id)
        wrk = worker_service.get_by_user_id(user_id)
        is_employer = emp and emp.id == booking["employer_id"]
        is_worker = wrk and wrk.id == booking["primary_worker_id"]

        if not (is_employer or is_worker):
            raise BookingOwnershipError("Unauthorized: You cannot cancel a booking you do not participate in.")

        now = datetime.now(timezone.utc)
        booking["status"] = BookingStatus.CANCELLED
        booking["cancelled_at"] = now
        booking["cancellation_reason"] = payload.reason
        booking["updated_at"] = now

        # Mobilization Compensation Policy (POL-002, AUD-KS6-011, AUD-KS61-006)
        # If employer cancels after worker dispatched (EN_ROUTE) or within 2h of start:
        scheduled = booking["scheduled_at"]
        time_until_start = (scheduled - now).total_seconds()

        if is_employer and (current == BookingStatus.EN_ROUTE or time_until_start < 7200):
            # Flag mobilization compensation, capped at total agreed wage (AUD-KS61-006)
            agreed_paise = booking.get("agreed_wage_paise") or self._wage_agreements[booking_id]["agreed_wage_paise"]
            booking["mobilization_compensation_due_paise"] = min(15000, agreed_paise)

        # Terminate wage agreement: do not mark unperformed cancelled work as SETTLED (AUD-KS61-005)
        wage = self._wage_agreements[booking_id]
        wage["status"] = WageAgreementStatus.TERMINATED
        wage["updated_at"] = now

        return self._format_booking(booking)

    async def propose_wage_revision(
        self,
        user_id: uuid.UUID,
        booking_id: uuid.UUID,
        payload: WageAgreementRevisionRequest
    ) -> WageAgreementResponse:
        """Proposes a scope amendment or wage revision with version increment.
        
        Concurrency Note (AUD-KS61-009):
        In this staging in-memory architecture, asyncio.Lock protects against intra-process
        coroutine race conditions. In a multi-worker production PostgreSQL environment,
        this must be secured using row-level pessimistic locking:
            `SELECT current_version FROM wage_agreements WHERE booking_id = :id FOR UPDATE`
        or optimistic concurrency control checking `WHERE current_version = :expected_version`.
        """
        async with self._lock:
            booking = self._bookings.get(booking_id)
            if not booking:
                raise BookingNotFoundError(f"Booking {booking_id} not found.")

            emp = employer_service.get_by_user_id(user_id)
            wrk = worker_service.get_by_user_id(user_id)
            is_employer = emp and emp.id == booking["employer_id"]
            is_worker = wrk and wrk.id == booking["primary_worker_id"]

            if not (is_employer or is_worker):
                raise BookingOwnershipError("Unauthorized: You are not a participant in this booking.")

            wage = self._wage_agreements[booking_id]
            if wage["status"] != WageAgreementStatus.ACTIVE:
                raise WageAgreementStateError(
                    f"Wage revisions can only be proposed when agreement is 'active'. Current: '{wage['status'].value}'"
                )

            # Check no other pending revision exists
            versions = self._wage_versions[booking_id]
            if any(v["status"] == "pending" for v in versions):
                raise WageAgreementStateError("A proposed wage revision is already awaiting response.")

            next_version = len(versions) + 1
            now = datetime.now(timezone.utc)

            new_version = {
                "version_number": next_version,
                "proposed_wage_paise": payload.proposed_wage_paise,
                "proposed_wage_inr": payload.proposed_wage_paise / 100.0,
                "scope_change_description": payload.scope_change_description,
                "status": "pending",
                "proposed_by_id": user_id,
                "decided_at": None,
                "created_at": now
            }

            versions.append(new_version)
            wage["status"] = WageAgreementStatus.REVISION_PENDING
            wage["updated_at"] = now

            return self._format_wage(wage, versions)

    async def respond_wage_revision(
        self,
        user_id: uuid.UUID,
        booking_id: uuid.UUID,
        version_num: int,
        payload: WageAgreementRevisionRespondRequest
    ) -> WageAgreementResponse:
        """Counterparty responds to accept or decline a pending wage revision."""
        async with self._lock:
            booking = self._bookings.get(booking_id)
            if not booking:
                raise BookingNotFoundError(f"Booking {booking_id} not found.")

            emp = employer_service.get_by_user_id(user_id)
            wrk = worker_service.get_by_user_id(user_id)
            is_employer = emp and emp.id == booking["employer_id"]
            is_worker = wrk and wrk.id == booking["primary_worker_id"]

            if not (is_employer or is_worker):
                raise BookingOwnershipError("Unauthorized: You are not a participant in this booking.")

            wage = self._wage_agreements[booking_id]
            versions = self._wage_versions[booking_id]

            target_ver = None
            for v in versions:
                if v["version_number"] == version_num:
                    target_ver = v
                    break

            if not target_ver or target_ver["status"] != "pending":
                raise WageAgreementStateError(f"No pending wage revision version {version_num} found.")

            # Self-acceptance prohibition: counterparty must accept
            if target_ver["proposed_by_id"] == user_id:
                raise WageAgreementStateError("You cannot accept or decline your own proposed revision.")

            now = datetime.now(timezone.utc)
            target_ver["decided_at"] = now

            if payload.accept:
                target_ver["status"] = "accepted"
                new_wage = target_ver["proposed_wage_paise"]
                wage["agreed_wage_paise"] = new_wage
                wage["amount_due_paise"] = new_wage
                wage["outstanding_balance_paise"] = new_wage - wage["amount_paid_paise"]
                wage["current_version"] = version_num
                wage["status"] = WageAgreementStatus.ACTIVE
            else:
                target_ver["status"] = "rejected"
                # Retain prior terms; restore ACTIVE state
                wage["status"] = WageAgreementStatus.ACTIVE

            wage["updated_at"] = now
            return self._format_wage(wage, versions)

    def _format_wage(self, w: Dict[str, Any], versions: List[Dict[str, Any]]) -> WageAgreementResponse:
        return WageAgreementResponse(
            id=w["id"],
            booking_id=w["booking_id"],
            agreement_type=w["agreement_type"],
            status=w["status"],
            current_version=w["current_version"],
            agreed_wage_paise=w["agreed_wage_paise"],
            advance_amount_paise=w["advance_amount_paise"],
            amount_due_paise=w["amount_due_paise"],
            amount_paid_paise=w["amount_paid_paise"],
            refund_amount_paise=w["refund_amount_paise"],
            disputed_amount_paise=w["disputed_amount_paise"],
            outstanding_balance_paise=w["outstanding_balance_paise"],
            platform_commission_paise=w["platform_commission_paise"],
            tip_amount_paise=w["tip_amount_paise"],
            agreed_wage_inr=w["agreed_wage_paise"] / 100.0,
            advance_amount_inr=w["advance_amount_paise"] / 100.0,
            amount_due_inr=w["amount_due_paise"] / 100.0,
            amount_paid_inr=w["amount_paid_paise"] / 100.0,
            platform_commission_inr=w["platform_commission_paise"] / 100.0,
            currency=w["currency"],
            is_settled=w["is_settled"],
            versions=[WageAgreementVersionResponse(**v) for v in versions]
        )

    def _format_booking(self, b: Dict[str, Any]) -> BookingResponse:
        wage_dict = self._wage_agreements.get(b["id"])
        versions = self._wage_versions.get(b["id"], [])
        formatted_wage = self._format_wage(wage_dict, versions) if wage_dict else None

        mob_paise = b.get("mobilization_compensation_due_paise", 0)

        return BookingResponse(
            id=b["id"],
            booking_code=b["booking_code"],
            idempotency_key=b.get("idempotency_key"),
            job_id=b.get("job_id"),
            employer_id=b["employer_id"],
            primary_worker_id=b.get("primary_worker_id"),
            parent_contract_id=b.get("parent_contract_id"),
            status=b["status"],
            service_address=b["service_address"],
            area=b["area"],
            scheduled_at=b["scheduled_at"],
            en_route_at=b.get("en_route_at"),
            arrived_at=b.get("arrived_at"),
            started_at=b.get("started_at"),
            completed_at=b.get("completed_at"),
            cancelled_at=b.get("cancelled_at"),
            cancellation_reason=b.get("cancellation_reason"),
            mobilization_compensation_due_paise=mob_paise,
            mobilization_compensation_due_inr=mob_paise / 100.0,
            wage_agreement=formatted_wage,
            created_at=b["created_at"],
            updated_at=b["updated_at"]
        )

    def clear(self):
        """Reset internal store state for test fixtures."""
        self._bookings.clear()
        self._code_index.clear()
        self._idempotency_index.clear()
        self._wage_agreements.clear()
        self._wage_versions.clear()


# Global singleton instance
booking_service = BookingService()
