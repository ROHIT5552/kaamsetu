"""FastAPI Router for Worker Profiles, Endorsements, and Public Discovery"""

import uuid
import logging
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.common import DutyStatus
from app.modules.auth.dependencies import (
    require_worker,
    AuthenticatedUserContext
)
from app.modules.auth.router import get_user_by_id
from app.modules.workers.schemas import (
    WorkerProfileCreatePayload,
    WorkerProfileUpdatePayload,
    WorkerSkillAddPayload,
    AvailabilitySlot,
    WorkerDutyUpdatePayload,
    WorkerPublicResponse,
    WorkerPrivateProfileResponse
)
from app.modules.workers.service import worker_service

logger = logging.getLogger("kaamsetu.workers.router")

router = APIRouter(prefix="/api/v1/workers", tags=["Worker Profiles"])


@router.post(
    "/profile",
    response_model=WorkerPrivateProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create worker profile"
)
async def create_worker_profile(
    payload: WorkerProfileCreatePayload,
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Initializes a new skilled worker profile for authenticated worker account."""
    # Resolve verified phone from authenticated context or stable user identity store
    phone = current_user.claims.get("phone")
    if not phone:
        user_record = get_user_by_id(current_user.user_id)
        if user_record and user_record.get("phone"):
            phone = user_record["phone"]

    if not phone:
        logger.error(
            "Worker profile creation rejected: unresolvable verified phone for user_id=%s",
            current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to resolve verified phone number for this account. Please re-authenticate."
        )

    try:
        return worker_service.create_profile(
            user_id=current_user.user_id,
            phone=phone,
            payload=payload
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get(
    "/profile/me",
    response_model=WorkerPrivateProfileResponse,
    summary="Get own worker profile"
)
async def get_my_worker_profile(
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Retrieves full profile with private settings for the authenticated worker."""
    profile = worker_service.get_by_user_id(current_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found. Please create your profile first."
        )
    return profile


@router.put(
    "/profile/me",
    response_model=WorkerPrivateProfileResponse,
    summary="Update own worker profile"
)
async def update_my_worker_profile(
    payload: WorkerProfileUpdatePayload,
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Updates profile details, wage rates, bio, or primary area."""
    try:
        return worker_service.update_profile(current_user.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/profile/me/skills",
    response_model=WorkerPrivateProfileResponse,
    summary="Add skill endorsement"
)
async def add_worker_skill(
    payload: WorkerSkillAddPayload,
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Adds a verified trade/skill with experience years."""
    try:
        return worker_service.add_skill(current_user.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/profile/me/skills/{skill_id}",
    response_model=WorkerPrivateProfileResponse,
    summary="Remove skill endorsement"
)
async def remove_worker_skill(
    skill_id: uuid.UUID,
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Removes a skill from worker profile."""
    try:
        return worker_service.remove_skill(current_user.user_id, skill_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/profile/me/availability",
    response_model=WorkerPrivateProfileResponse,
    summary="Update availability schedule"
)
async def update_worker_availability(
    slots: List[AvailabilitySlot],
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Sets weekly availability schedule for work dispatch."""
    try:
        return worker_service.update_availability(current_user.user_id, slots)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch(
    "/profile/me/duty",
    response_model=WorkerPrivateProfileResponse,
    summary="Toggle duty status"
)
async def update_worker_duty_status(
    payload: WorkerDutyUpdatePayload,
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Toggles duty status: online (available), busy (on job), offline."""
    try:
        return worker_service.set_duty_status(current_user.user_id, payload.duty_status)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "",
    response_model=List[WorkerPublicResponse],
    summary="Public worker discovery directory"
)
async def search_workers(
    area: Optional[str] = Query(default=None, description="Sambhajinagar locality filter (e.g. 'Cidco', 'Waluj')"),
    skill: Optional[str] = Query(default=None, description="Trade skill slug (e.g. 'plumber', 'electrician')"),
    duty: Optional[DutyStatus] = Query(default=None, description="Duty availability status"),
    max_rate: Optional[Decimal] = Query(default=None, description="Maximum hourly rate in INR")
):
    """Public marketplace directory search with privacy-sanitized contacts."""
    return worker_service.search_public_workers(
        area=area,
        skill_slug=skill,
        duty_status=duty,
        max_hourly_rate=max_rate
    )


@router.get(
    "/{worker_id}",
    response_model=WorkerPublicResponse,
    summary="Get public worker profile"
)
async def get_worker_public_profile(worker_id: uuid.UUID):
    """Returns privacy-sanitized public worker card with ratings, trades, and relay contact."""
    profile = worker_service.get_public_profile(worker_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found."
        )
    return profile
