"""Pydantic Schemas for Job Applications and Status Reviews"""

import uuid
from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.common import ApplicationStatus


class ApplicationCreatePayload(BaseModel):
    proposed_wage: Decimal = Field(..., ge=50, le=500000, description="Proposed wage in INR")
    cover_note: Optional[str] = Field(default=None, max_length=1000, description="Optional brief cover note")


class ApplicationStatusUpdatePayload(BaseModel):
    status: ApplicationStatus = Field(
        ...,
        description="Target status: 'shortlisted', 'accepted', 'rejected', or 'withdrawn'"
    )


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    worker_id: uuid.UUID
    proposed_wage: Decimal
    currency: str = "INR"
    cover_note: Optional[str] = None
    status: ApplicationStatus
    created_at: datetime
