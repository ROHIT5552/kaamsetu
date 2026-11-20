"""Pydantic Schemas for Job Postings, Status Transitions, and Discovery"""

import uuid
import enum
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.models.common import JobStatus
from app.modules.workers.schemas import SAMBHAJINAGAR_LOCALITIES


class EmploymentType(str, enum.Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    LONG_TERM = "long_term"


class JobCreatePayload(BaseModel):
    title: str = Field(..., min_length=5, max_length=150, description="Job title")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed scope of work")
    employment_type: EmploymentType = Field(default=EmploymentType.DAILY)
    area: str = Field(..., description="Work site locality in Chhatrapati Sambhajinagar")
    address_line: Optional[str] = Field(default=None, max_length=300)
    budget_min: Optional[Decimal] = Field(default=None, ge=100, le=500000)
    budget_max: Optional[Decimal] = Field(default=None, ge=100, le=500000)
    required_skill_ids: List[uuid.UUID] = Field(default_factory=list)
    urgency: str = Field(default="standard", description="'standard' or 'emergency_15m'")
    start_date: Optional[datetime] = None

    @field_validator("area")
    @classmethod
    def validate_area(cls, v: str) -> str:
        clean = v.strip()
        matched = [loc for loc in SAMBHAJINAGAR_LOCALITIES if loc.lower() == clean.lower()]
        if not matched:
            raise ValueError(f"Area must be one of the pilot localities: {', '.join(SAMBHAJINAGAR_LOCALITIES)}")
        return matched[0]


class JobUpdatePayload(BaseModel):
    title: Optional[str] = Field(default=None, min_length=5, max_length=150)
    description: Optional[str] = Field(default=None, min_length=10, max_length=2000)
    employment_type: Optional[EmploymentType] = None
    area: Optional[str] = None
    address_line: Optional[str] = None
    budget_min: Optional[Decimal] = Field(default=None, ge=100, le=500000)
    budget_max: Optional[Decimal] = Field(default=None, ge=100, le=500000)
    required_skill_ids: Optional[List[uuid.UUID]] = None
    urgency: Optional[str] = None


class JobStatusUpdatePayload(BaseModel):
    status: JobStatus


class JobResponse(BaseModel):
    id: uuid.UUID
    employer_id: uuid.UUID
    title: str
    description: str
    employment_type: EmploymentType
    city: str
    area: str
    address_line: Optional[str] = None
    budget_min: Optional[Decimal] = None
    budget_max: Optional[Decimal] = None
    currency: str = "INR"
    status: JobStatus
    urgency: str
    start_date: Optional[datetime] = None
    required_skill_ids: List[uuid.UUID] = Field(default_factory=list)
    applications_count: int = 0
    created_at: datetime
