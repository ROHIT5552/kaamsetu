"""Job Postings Business Domain Service

Handles job creation, editing, status lifecycle, and employer ownership verification.
"""

import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timezone

from app.models.common import JobStatus
from app.modules.employers.service import employer_service
from app.modules.taxonomy.service import taxonomy_service
from app.modules.jobs.schemas import (
    JobCreatePayload,
    JobUpdatePayload,
    JobResponse,
    EmploymentType
)


class InvalidJobStatusTransitionError(ValueError):
    """Raised when an illegal job status transition is requested."""
    pass


# Approved Job Lifecycle Finite State Machine (FSM)
ALLOWED_JOB_STATUS_TRANSITIONS: Dict[JobStatus, Set[JobStatus]] = {
    JobStatus.DRAFT: {JobStatus.OPEN, JobStatus.CANCELLED},
    JobStatus.OPEN: {JobStatus.IN_PROGRESS, JobStatus.CANCELLED},
    JobStatus.IN_PROGRESS: {JobStatus.COMPLETED, JobStatus.CANCELLED},
    JobStatus.COMPLETED: set(),  # Terminal state: immutable
    JobStatus.CANCELLED: set(),  # Terminal state: immutable
}


class JobService:
    """Manages job domain records in staging store."""

    def __init__(self):
        # job_id -> dict
        self._jobs: Dict[uuid.UUID, Dict[str, Any]] = {}

    def create_job(
        self,
        employer_user_id: uuid.UUID,
        payload: JobCreatePayload
    ) -> JobResponse:
        """Creates a new job posting for authenticated employer."""
        emp = employer_service.get_by_user_id(employer_user_id)
        if not emp:
            raise ValueError("Employer profile not found. Please create profile first.")

        # Validate required skills
        valid_skill_ids = []
        for s_id in payload.required_skill_ids:
            if taxonomy_service.get_skill_by_id(s_id):
                valid_skill_ids.append(s_id)

        job_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        record = {
            "id": job_id,
            "employer_id": emp.id,
            "title": payload.title,
            "description": payload.description,
            "employment_type": payload.employment_type,
            "city": "Chhatrapati Sambhajinagar",
            "area": payload.area,
            "address_line": payload.address_line,
            "budget_min": payload.budget_min,
            "budget_max": payload.budget_max,
            "currency": "INR",
            "status": JobStatus.OPEN,
            "urgency": payload.urgency,
            "start_date": payload.start_date or now,
            "required_skill_ids": valid_skill_ids,
            "application_ids": [],
            "created_at": now,
            "updated_at": now
        }

        self._jobs[job_id] = record
        return self._format_response(record)

    def get_by_id(self, job_id: uuid.UUID) -> Optional[JobResponse]:
        record = self._jobs.get(job_id)
        if not record:
            return None
        return self._format_response(record)

    def get_raw_by_id(self, job_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        return self._jobs.get(job_id)

    def list_public_jobs(
        self,
        area: Optional[str] = None,
        skill_id: Optional[uuid.UUID] = None,
        employment_type: Optional[EmploymentType] = None
    ) -> List[JobResponse]:
        """Lists active, open jobs for workers to discover."""
        results = []
        for r in self._jobs.values():
            if r["status"] != JobStatus.OPEN:
                continue
            if area and r["area"].lower() != area.lower():
                continue
            if employment_type and r["employment_type"] != employment_type:
                continue
            if skill_id and skill_id not in r["required_skill_ids"]:
                continue

            results.append(self._format_response(r))
        return results

    def list_employer_jobs(self, employer_user_id: uuid.UUID) -> List[JobResponse]:
        """Lists all jobs posted by the authenticated employer."""
        emp = employer_service.get_by_user_id(employer_user_id)
        if not emp:
            return []

        results = [
            self._format_response(r)
            for r in self._jobs.values()
            if r["employer_id"] == emp.id
        ]
        return results

    def update_job(
        self,
        employer_user_id: uuid.UUID,
        job_id: uuid.UUID,
        payload: JobUpdatePayload
    ) -> JobResponse:
        """Updates job details with IDOR ownership verification."""
        emp = employer_service.get_by_user_id(employer_user_id)
        if not emp:
            raise ValueError("Employer profile not found.")

        record = self._jobs.get(job_id)
        if not record:
            raise ValueError("Job not found.")

        if record["employer_id"] != emp.id:
            raise PermissionError("Forbidden: Cannot edit job owned by another employer.")

        if payload.title is not None:
            record["title"] = payload.title
        if payload.description is not None:
            record["description"] = payload.description
        if payload.employment_type is not None:
            record["employment_type"] = payload.employment_type
        if payload.area is not None:
            record["area"] = payload.area
        if payload.address_line is not None:
            record["address_line"] = payload.address_line
        if payload.budget_min is not None:
            record["budget_min"] = payload.budget_min
        if payload.budget_max is not None:
            record["budget_max"] = payload.budget_max
        if payload.urgency is not None:
            record["urgency"] = payload.urgency
        if payload.required_skill_ids is not None:
            record["required_skill_ids"] = payload.required_skill_ids

        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_response(record)

    def set_job_status(
        self,
        employer_user_id: uuid.UUID,
        job_id: uuid.UUID,
        new_status: JobStatus
    ) -> JobResponse:
        """Changes job status (open, in_progress, completed, cancelled) with IDOR protection."""
        emp = employer_service.get_by_user_id(employer_user_id)
        if not emp:
            raise ValueError("Employer profile not found.")

        record = self._jobs.get(job_id)
        if not record:
            raise ValueError("Job not found.")

        if record["employer_id"] != emp.id:
            raise PermissionError("Forbidden: Cannot alter status of job owned by another employer.")

        current_status = record["status"]
        if current_status == new_status:
            return self._format_response(record)

        allowed_next = ALLOWED_JOB_STATUS_TRANSITIONS.get(current_status, set())
        if new_status not in allowed_next:
            if not allowed_next:
                raise InvalidJobStatusTransitionError(
                    f"Job is in terminal status '{current_status.value}' and cannot be modified."
                )
            allowed_names = sorted([s.value for s in allowed_next])
            raise InvalidJobStatusTransitionError(
                f"Invalid job status transition from '{current_status.value}' to '{new_status.value}'. "
                f"Permitted next statuses: {allowed_names}."
            )

        record["status"] = new_status
        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_response(record)

    def add_application_to_job(self, job_id: uuid.UUID, application_id: uuid.UUID):
        if job_id in self._jobs:
            self._jobs[job_id]["application_ids"].append(application_id)

    def _format_response(self, r: Dict[str, Any]) -> JobResponse:
        return JobResponse(
            id=r["id"],
            employer_id=r["employer_id"],
            title=r["title"],
            description=r["description"],
            employment_type=r["employment_type"],
            city=r["city"],
            area=r["area"],
            address_line=r["address_line"],
            budget_min=r["budget_min"],
            budget_max=r["budget_max"],
            currency=r["currency"],
            status=r["status"],
            urgency=r["urgency"],
            start_date=r["start_date"],
            required_skill_ids=r["required_skill_ids"],
            applications_count=len(r["application_ids"]),
            created_at=r["created_at"]
        )

    def clear(self):
        self._jobs.clear()


# Global singleton instance
job_service = JobService()
