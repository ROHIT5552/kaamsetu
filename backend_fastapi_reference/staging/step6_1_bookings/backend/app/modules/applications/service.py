"""Job Applications Business Domain Service

Handles worker application submission, duplicate prevention, employer review,
and application status transitions with cross-role access validation.
"""

import uuid
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timezone

from app.models.common import ApplicationStatus, JobStatus
from app.modules.workers.service import worker_service
from app.modules.employers.service import employer_service
from app.modules.jobs.service import job_service
from app.modules.applications.schemas import (
    ApplicationCreatePayload,
    ApplicationResponse
)


class DuplicateApplicationError(ValueError):
    """Raised when a worker attempts to apply to the same job multiple times."""
    pass


class InvalidApplicationStatusTransitionError(ValueError):
    """Raised when an illegal application status transition is requested."""
    pass


# Approved Application Lifecycle Finite State Machine (FSM)
ALLOWED_EMPLOYER_APPLICATION_TRANSITIONS: Dict[ApplicationStatus, Set[ApplicationStatus]] = {
    ApplicationStatus.SUBMITTED: {ApplicationStatus.SHORTLISTED, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED},
    ApplicationStatus.SHORTLISTED: {ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED},
    ApplicationStatus.ACCEPTED: set(),   # Terminal state in application stage (transitions to Booking in Step 6)
    ApplicationStatus.REJECTED: set(),   # Terminal state: cannot accept or shortlist a rejected application
    ApplicationStatus.WITHDRAWN: set(),  # Terminal state: worker withdrew, employer CANNOT accept
}

ALLOWED_WORKER_APPLICATION_TRANSITIONS: Dict[ApplicationStatus, Set[ApplicationStatus]] = {
    ApplicationStatus.SUBMITTED: {ApplicationStatus.WITHDRAWN},
    ApplicationStatus.SHORTLISTED: {ApplicationStatus.WITHDRAWN},
    ApplicationStatus.ACCEPTED: set(),   # Worker cannot withdraw unilaterally once accepted
    ApplicationStatus.REJECTED: set(),   # Terminal
    ApplicationStatus.WITHDRAWN: set(),  # Terminal
}


class ApplicationService:
    """Manages job application lifecycle in staging store."""

    def __init__(self):
        # app_id -> dict
        self._applications: Dict[uuid.UUID, Dict[str, Any]] = {}
        # (job_id, worker_id) -> app_id (for fast duplicate detection)
        self._job_worker_index: Dict[tuple, uuid.UUID] = {}

    def submit_application(
        self,
        worker_user_id: uuid.UUID,
        job_id: uuid.UUID,
        payload: ApplicationCreatePayload
    ) -> ApplicationResponse:
        """Submits worker application for an active open job."""
        worker = worker_service.get_by_user_id(worker_user_id)
        if not worker:
            raise ValueError("Worker profile not found. Please create profile first.")

        job = job_service.get_by_id(job_id)
        if not job:
            raise ValueError("Job not found.")

        if job.status != JobStatus.OPEN:
            raise ValueError(f"Cannot apply: Job is currently {job.status.value}.")

        # Duplicate check: strictly one application per worker per job
        index_key = (job_id, worker.id)
        if index_key in self._job_worker_index:
            raise DuplicateApplicationError("You have already submitted an application for this job.")

        app_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        record = {
            "id": app_id,
            "job_id": job_id,
            "job_title": job.title,
            "worker_id": worker.id,
            "proposed_wage": payload.proposed_wage,
            "currency": "INR",
            "cover_note": payload.cover_note,
            "status": ApplicationStatus.SUBMITTED,
            "created_at": now,
            "updated_at": now
        }

        self._applications[app_id] = record
        self._job_worker_index[index_key] = app_id
        job_service.add_application_to_job(job_id, app_id)

        return self._format_response(record)

    def list_job_applications_for_employer(
        self,
        employer_user_id: uuid.UUID,
        job_id: uuid.UUID
    ) -> List[ApplicationResponse]:
        """Lists applications for a job, verifying employer ownership."""
        emp = employer_service.get_by_user_id(employer_user_id)
        if not emp:
            raise ValueError("Employer profile not found.")

        raw_job = job_service.get_raw_by_id(job_id)
        if not raw_job:
            raise ValueError("Job not found.")

        if raw_job["employer_id"] != emp.id:
            raise PermissionError("Forbidden: Cannot review applications for a job owned by another employer.")

        return [
            self._format_response(r)
            for r in self._applications.values()
            if r["job_id"] == job_id
        ]

    def list_worker_applications(
        self,
        worker_user_id: uuid.UUID
    ) -> List[ApplicationResponse]:
        """Lists all applications submitted by the authenticated worker."""
        worker = worker_service.get_by_user_id(worker_user_id)
        if not worker:
            return []

        return [
            self._format_response(r)
            for r in self._applications.values()
            if r["worker_id"] == worker.id
        ]

    def update_application_status(
        self,
        user_id: uuid.UUID,
        application_id: uuid.UUID,
        new_status: ApplicationStatus
    ) -> ApplicationResponse:
        """Updates application status with strict role and ownership checks.
        
        - Workers may only transition status to 'withdrawn'.
        - Employers (owners of the job) may transition to 'shortlisted', 'accepted', or 'rejected'.
        """
        record = self._applications.get(application_id)
        if not record:
            raise ValueError("Application not found.")

        raw_job = job_service.get_raw_by_id(record["job_id"])
        worker = worker_service.get_by_user_id(user_id)
        emp = employer_service.get_by_user_id(user_id)

        is_worker_owner = worker and worker.id == record["worker_id"]
        is_employer_owner = emp and raw_job and raw_job["employer_id"] == emp.id

        if not is_worker_owner and not is_employer_owner:
            raise PermissionError("Forbidden: Unauthorized to alter status of this application.")

        current_status = record["status"]
        if current_status == new_status:
            return self._format_response(record)

        if is_worker_owner:
            if new_status != ApplicationStatus.WITHDRAWN:
                raise PermissionError("Forbidden: Workers can only withdraw their application.")
            allowed_worker = ALLOWED_WORKER_APPLICATION_TRANSITIONS.get(current_status, set())
            if new_status not in allowed_worker:
                if current_status == ApplicationStatus.ACCEPTED:
                    raise InvalidApplicationStatusTransitionError(
                        "Cannot withdraw application that has already been accepted by employer."
                    )
                raise InvalidApplicationStatusTransitionError(
                    f"Cannot withdraw application in status '{current_status.value}'."
                )

        elif is_employer_owner:
            if new_status == ApplicationStatus.WITHDRAWN:
                raise PermissionError("Forbidden: Employers cannot withdraw worker applications; use rejected or accepted.")
            allowed_employer = ALLOWED_EMPLOYER_APPLICATION_TRANSITIONS.get(current_status, set())
            if new_status not in allowed_employer:
                if current_status in (ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED):
                    raise InvalidApplicationStatusTransitionError(
                        f"Cannot modify application in terminal status '{current_status.value}'."
                    )
                allowed_names = sorted([s.value for s in allowed_employer])
                raise InvalidApplicationStatusTransitionError(
                    f"Invalid application status transition from '{current_status.value}' to '{new_status.value}'. "
                    f"Permitted next statuses: {allowed_names}."
                )

        record["status"] = new_status
        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_response(record)

    def _format_response(self, r: Dict[str, Any]) -> ApplicationResponse:
        return ApplicationResponse(
            id=r["id"],
            job_id=r["job_id"],
            job_title=r["job_title"],
            worker_id=r["worker_id"],
            proposed_wage=r["proposed_wage"],
            currency=r["currency"],
            cover_note=r["cover_note"],
            status=r["status"],
            created_at=r["created_at"]
        )

    def clear(self):
        self._applications.clear()
        self._job_worker_index.clear()


# Global singleton instance
application_service = ApplicationService()
