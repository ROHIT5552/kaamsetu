"""FastAPI Router for Job Applications and Candidate Review"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.auth.dependencies import (
    require_worker,
    require_employer,
    get_current_user_context,
    AuthenticatedUserContext
)
from app.modules.applications.schemas import (
    ApplicationCreatePayload,
    ApplicationStatusUpdatePayload,
    ApplicationResponse
)
from app.modules.applications.service import (
    application_service,
    DuplicateApplicationError,
    InvalidApplicationStatusTransitionError
)

router = APIRouter(prefix="/api/v1", tags=["Job Applications"])


@router.post(
    "/jobs/{job_id}/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit application for a job"
)
async def submit_job_application(
    job_id: uuid.UUID,
    payload: ApplicationCreatePayload,
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Submits an application with proposed wage. Prevents duplicate submissions."""
    try:
        return application_service.submit_application(
            worker_user_id=current_user.user_id,
            job_id=job_id,
            payload=payload
        )
    except DuplicateApplicationError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/jobs/{job_id}/applications",
    response_model=List[ApplicationResponse],
    summary="Review candidate applications for a job"
)
async def list_job_applications(
    job_id: uuid.UUID,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Employer reviews submitted worker applications for their posted job."""
    try:
        return application_service.list_job_applications_for_employer(
            employer_user_id=current_user.user_id,
            job_id=job_id
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot view applications for a job posted by another employer."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/applications/my",
    response_model=List[ApplicationResponse],
    summary="List worker's own submitted applications"
)
async def list_my_applications(
    current_user: AuthenticatedUserContext = Depends(require_worker)
):
    """Returns all applications submitted by the authenticated worker."""
    return application_service.list_worker_applications(current_user.user_id)


@router.patch(
    "/applications/{application_id}/status",
    response_model=ApplicationResponse,
    summary="Update application status"
)
async def update_application_status(
    application_id: uuid.UUID,
    payload: ApplicationStatusUpdatePayload,
    current_user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Updates candidate status (shortlisted, accepted, rejected by employer; or withdrawn by worker)."""
    try:
        return application_service.update_application_status(
            user_id=current_user.user_id,
            application_id=application_id,
            new_status=payload.status
        )
    except InvalidApplicationStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
