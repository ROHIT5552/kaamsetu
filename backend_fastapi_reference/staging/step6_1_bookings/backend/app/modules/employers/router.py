"""FastAPI Router for Employer Profiles and Address Locations"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.auth.dependencies import (
    require_employer,
    AuthenticatedUserContext
)
from app.modules.employers.schemas import (
    EmployerProfileCreatePayload,
    EmployerProfileUpdatePayload,
    EmployerLocationCreatePayload,
    EmployerProfileResponse,
    EmployerLocationResponse
)
from app.modules.employers.service import employer_service

router = APIRouter(prefix="/api/v1/employers", tags=["Employer Profiles"])


@router.post(
    "/profile",
    response_model=EmployerProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create employer profile"
)
async def create_employer_profile(
    payload: EmployerProfileCreatePayload,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Initializes a new household or commercial employer profile."""
    try:
        return employer_service.create_profile(current_user.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get(
    "/profile/me",
    response_model=EmployerProfileResponse,
    summary="Get own employer profile"
)
async def get_my_employer_profile(
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Retrieves authenticated employer's profile and saved locations."""
    profile = employer_service.get_by_user_id(current_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer profile not found. Please create your profile first."
        )
    return profile


@router.put(
    "/profile/me",
    response_model=EmployerProfileResponse,
    summary="Update own employer profile"
)
async def update_my_employer_profile(
    payload: EmployerProfileUpdatePayload,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Updates employer company name or default locality."""
    try:
        return employer_service.update_profile(current_user.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/profile/me/locations",
    response_model=EmployerLocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add service address location"
)
async def add_employer_location(
    payload: EmployerLocationCreatePayload,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Adds a named address location (e.g. Home, Office, Work Site)."""
    try:
        return employer_service.add_location(current_user.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/profile/me/locations",
    response_model=List[EmployerLocationResponse],
    summary="List saved service locations"
)
async def list_my_employer_locations(
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Lists all saved addresses belonging to the authenticated employer."""
    return employer_service.list_locations(current_user.user_id)


@router.delete(
    "/profile/me/locations/{location_id}",
    summary="Delete a service location"
)
async def delete_employer_location(
    location_id: uuid.UUID,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Deletes an address location with IDOR ownership protection."""
    try:
        employer_service.delete_location(current_user.user_id, location_id)
        return {"message": "Location deleted successfully."}
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot delete location belonging to another employer."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
