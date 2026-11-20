"""FastAPI Router for Job Postings and Discovery"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.common import JobStatus
from app.modules.auth.dependencies import (
    require_employer,
    AuthenticatedUserContext
)
from app.modules.jobs.schemas import (
    JobCreatePayload,
    JobUpdatePayload,
    JobStatusUpdatePayload,
    JobResponse,
    EmploymentType
)
from app.modules.jobs.service import job_service, InvalidJobStatusTransitionError

router = APIRouter(prefix="/api/v1/jobs", tags=["Job Postings"])


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job posting"
)
async def create_job(
    payload: JobCreatePayload,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Creates a work requirement posting for skilled labor in Chhatrapati Sambhajinagar."""
    try:
        return job_service.create_job(current_user.user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "",
    response_model=List[JobResponse],
    summary="List active open jobs"
)
async def list_open_jobs(
    area: Optional[str] = Query(default=None, description="Locality filter (e.g. 'Cidco', 'Waluj')"),
    skill_id: Optional[uuid.UUID] = Query(default=None, description="Required skill UUID"),
    employment_type: Optional[EmploymentType] = Query(default=None, description="Hourly, daily, or long-term")
):
    """Returns active, open job postings for workers to discover and apply."""
    return job_service.list_public_jobs(area=area, skill_id=skill_id, employment_type=employment_type)


@router.get(
    "/my",
    response_model=List[JobResponse],
    summary="List employer's own jobs"
)
async def list_my_jobs(
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Returns all jobs posted by the authenticated employer."""
    return job_service.list_employer_jobs(current_user.user_id)


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get job posting details"
)
async def get_job_details(job_id: uuid.UUID):
    """Returns full details of a specific job posting."""
    job = job_service.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found."
        )
    return job


@router.put(
    "/{job_id}",
    response_model=JobResponse,
    summary="Update a job posting"
)
async def update_job(
    job_id: uuid.UUID,
    payload: JobUpdatePayload,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Updates job specifications with IDOR ownership validation."""
    try:
        return job_service.update_job(current_user.user_id, job_id, payload)
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot edit job owned by another employer."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch(
    "/{job_id}/status",
    response_model=JobResponse,
    summary="Change job status"
)
async def update_job_status(
    job_id: uuid.UUID,
    payload: JobStatusUpdatePayload,
    current_user: AuthenticatedUserContext = Depends(require_employer)
):
    """Transitions job lifecycle status (open -> in_progress -> completed -> cancelled)."""
    try:
        return job_service.set_job_status(current_user.user_id, job_id, payload.status)
    except InvalidJobStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot modify status of job owned by another employer."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
