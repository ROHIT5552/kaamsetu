"""Bookings & Wage Agreements REST API Router (Stage 2 Step 6.1)

Exposes endpoints for:
- Work order creation from application or worker card
- Strict 10-state FSM transitions
- Versioned wage agreement amendments with mutual acceptance
- Anti-IDOR ownership verification
"""

import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.models.common import BookingStatus, UserRoleType
from app.modules.auth.dependencies import (
    AuthenticatedUserContext,
    get_current_user_context,
    require_employer,
    require_worker
)
from app.modules.bookings.schemas import (
    BookingCreateRequest,
    BookingCancelRequest,
    BookingStatusUpdateRequest,
    WageAgreementRevisionRequest,
    WageAgreementRevisionRespondRequest,
    BookingResponse,
    BookingListResponse,
    WageAgreementResponse
)
from app.modules.bookings.service import (
    booking_service,
    BookingNotFoundError,
    InvalidBookingStatusTransitionError,
    WageAgreementStateError,
    BookingOwnershipError
)

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings & Contracts"])


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
async def create_booking(
    payload: BookingCreateRequest,
    user: AuthenticatedUserContext = Depends(require_employer)
):
    """Employer initiates a new booking with agreed wage terms in integer Paise."""
    try:
        return booking_service.create_booking(user.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except BookingOwnershipError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get(
    "/my-bookings",
    response_model=BookingListResponse,
    status_code=status.HTTP_200_OK,
    summary="List bookings for current authenticated user"
)
async def list_my_bookings(
    status_filter: Optional[BookingStatus] = Query(None, description="Optional booking status filter"),
    user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Returns bookings where current user is either employer or assigned worker."""
    items = booking_service.list_user_bookings(user.user_id, status_filter=status_filter)
    return BookingListResponse(total=len(items), items=items)


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Get booking details by ID"
)
async def get_booking_details(
    booking_id: uuid.UUID,
    user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Retrieves full booking details. Enforces anti-IDOR participant authorization."""
    try:
        user_role = user.roles[0] if user.roles else None
        return booking_service.get_booking_details(user.user_id, booking_id, user_role=user_role)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookingOwnershipError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{booking_id}/accept",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Worker accepts offered booking"
)
async def accept_booking(
    booking_id: uuid.UUID,
    user: AuthenticatedUserContext = Depends(require_worker)
):
    """Assigned worker accepts the booking, transitioning status to CONFIRMED."""
    try:
        return booking_service.accept_booking(user.user_id, booking_id)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookingOwnershipError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{booking_id}/status",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Transition booking operational status"
)
async def transition_booking_status(
    booking_id: uuid.UUID,
    payload: BookingStatusUpdateRequest,
    user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Transitions booking across the 10-state FSM. Validates permitted actors."""
    try:
        user_role = user.roles[0] if user.roles else None
        return booking_service.transition_status(user.user_id, booking_id, payload, user_role=user_role)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookingOwnershipError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel active booking with mandatory reason"
)
async def cancel_booking(
    booking_id: uuid.UUID,
    payload: BookingCancelRequest,
    user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Cancels booking and computes mobilization compensation if post-dispatch."""
    try:
        return booking_service.cancel_booking(user.user_id, booking_id, payload)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookingOwnershipError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except InvalidBookingStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{booking_id}/wage-agreement/revision",
    response_model=WageAgreementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Propose wage agreement scope amendment"
)
async def propose_wage_revision(
    booking_id: uuid.UUID,
    payload: WageAgreementRevisionRequest,
    user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Creates a pending wage revision version awaiting counterparty response."""
    try:
        return await booking_service.propose_wage_revision(user.user_id, booking_id, payload)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookingOwnershipError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except WageAgreementStateError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{booking_id}/wage-agreement/revision/{version_num}/respond",
    response_model=WageAgreementResponse,
    status_code=status.HTTP_200_OK,
    summary="Respond to proposed wage amendment"
)
async def respond_wage_revision(
    booking_id: uuid.UUID,
    version_num: int,
    payload: WageAgreementRevisionRespondRequest,
    user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Counterparty accepts or declines a pending wage revision."""
    try:
        return await booking_service.respond_wage_revision(user.user_id, booking_id, version_num, payload)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BookingOwnershipError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except WageAgreementStateError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
