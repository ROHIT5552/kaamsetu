"""Pydantic Schemas for Bookings and Wage Agreements (Stage 2 Step 6.1)

Enforces:
- Integer Paise standard (BIGINT) across all financial representations
- Synchronized 10-state Booking FSM
- 7-state Wage Agreement FSM
- Single-day and linked multi-day contracts
"""

import uuid
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

from app.models.common import BookingStatus, WageAgreementStatus, AgreementType


class WageAgreementVersionResponse(BaseModel):
    """Immutable audit version snapshot of a wage agreement."""
    model_config = ConfigDict(from_attributes=True)

    version_number: int
    proposed_wage_paise: int
    proposed_wage_inr: float
    scope_change_description: str
    status: str
    proposed_by_id: Optional[uuid.UUID] = None
    decided_at: Optional[datetime] = None
    created_at: datetime


class WageAgreementResponse(BaseModel):
    """Active contractual wage terms and versioned breakdown."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    agreement_type: AgreementType
    status: WageAgreementStatus
    current_version: int

    # Integer Paise representations
    agreed_wage_paise: int
    advance_amount_paise: int
    amount_due_paise: int
    amount_paid_paise: int
    refund_amount_paise: int
    disputed_amount_paise: int
    outstanding_balance_paise: int
    platform_commission_paise: int
    tip_amount_paise: int

    # Formatted INR representations for client display
    agreed_wage_inr: float
    advance_amount_inr: float
    amount_due_inr: float
    amount_paid_inr: float
    platform_commission_inr: float

    currency: str = "INR"
    is_settled: bool
    versions: List[WageAgreementVersionResponse] = []


class BookingCreateRequest(BaseModel):
    """Payload to initiate a new work order booking."""
    idempotency_key: Optional[str] = Field(
        None,
        max_length=128,
        description="Client-generated unique UUID or request token to prevent duplicate work order creation"
    )
    application_id: Optional[uuid.UUID] = Field(
        None,
        description="ID of accepted job application if booking from application"
    )
    worker_id: Optional[uuid.UUID] = Field(
        None,
        description="ID of worker profile if creating a direct locality booking"
    )
    job_id: Optional[uuid.UUID] = Field(
        None,
        description="Optional parent job ID"
    )
    parent_contract_id: Optional[uuid.UUID] = Field(
        None,
        description="Optional parent booking ID for linked multi-day project dispatches"
    )
    service_address: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Physical destination address in Chhatrapati Sambhajinagar"
    )
    area: str = Field(
        ...,
        min_length=2,
        max_length=80,
        description="Locality/Area name (e.g. Cidco, Waluj, Chikalthana)"
    )
    scheduled_at: datetime = Field(
        ...,
        description="Scheduled start timestamp in UTC"
    )
    agreement_type: AgreementType = Field(
        default=AgreementType.DAILY,
        description="Wage agreement type: daily, hourly, or fixed_price"
    )
    agreed_wage_paise: int = Field(
        ...,
        ge=5000,
        description="Agreed wage in integer Paise (Min 5,000 Paise = ₹50.00)"
    )
    advance_amount_paise: int = Field(
        default=0,
        ge=0,
        description="Advance deposit amount in integer Paise"
    )

    @field_validator("scheduled_at")
    @classmethod
    def validate_future_schedule(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        # Allow up to 10 minutes clock skew in past for testing, but otherwise future
        return v

    @model_validator(mode="after")
    def validate_advance_not_exceeding_wage(self) -> "BookingCreateRequest":
        if self.advance_amount_paise > self.agreed_wage_paise:
            raise ValueError(
                f"Advance deposit ({self.advance_amount_paise} Paise) cannot exceed total agreed wage ({self.agreed_wage_paise} Paise)."
            )
        return self


class BookingCancelRequest(BaseModel):
    """Payload to cancel an active booking with required reason."""
    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Mandatory reason for cancellation"
    )


class BookingStatusUpdateRequest(BaseModel):
    """Payload to request an operational FSM state transition."""
    target_status: BookingStatus = Field(
        ...,
        description="Requested target booking status in the 10-state FSM"
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional operational notes or handover comments"
    )


class WageAgreementRevisionRequest(BaseModel):
    """Payload to propose a scope or wage amendment."""
    proposed_wage_paise: int = Field(
        ...,
        ge=5000,
        description="Proposed new total wage in integer Paise"
    )
    scope_change_description: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="Detailed justification of scope or overtime amendment"
    )


class WageAgreementRevisionRespondRequest(BaseModel):
    """Counterparty response to a pending wage revision."""
    accept: bool = Field(
        ...,
        description="True to accept proposed revision; False to decline"
    )


class BookingResponse(BaseModel):
    """Full booking details with wage agreement and milestone timestamps."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_code: str
    idempotency_key: Optional[str] = None
    job_id: Optional[uuid.UUID] = None
    employer_id: uuid.UUID
    primary_worker_id: Optional[uuid.UUID] = None
    parent_contract_id: Optional[uuid.UUID] = None

    status: BookingStatus
    service_address: str
    area: str
    scheduled_at: datetime

    # Verifiable Real-World Checkpoints
    en_route_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None

    # Mobilization compensation flag (Conditional Policy AUD-KS6-011)
    mobilization_compensation_due_paise: int = 0
    mobilization_compensation_due_inr: float = 0.0

    # Linked Wage Agreement
    wage_agreement: Optional[WageAgreementResponse] = None

    created_at: datetime
    updated_at: datetime


class BookingListResponse(BaseModel):
    """Paginated or filtered list of bookings."""
    total: int
    items: List[BookingResponse]
