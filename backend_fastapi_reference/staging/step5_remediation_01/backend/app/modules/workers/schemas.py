"""Pydantic Schemas for Worker Profiles, Skills, Availability & Public Privacy Views"""

import uuid
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.models.common import DutyStatus, VerificationStatus

# Pilot Localities in Chhatrapati Sambhajinagar
SAMBHAJINAGAR_LOCALITIES = [
    "Cidco", "Waluj", "Garkheda", "Shahnoorwadi", "TV Centre",
    "Railway Station", "Hudco", "Beed Bypass", "Osmanpura", "Samarth Nagar"
]


class WorkerSkillItem(BaseModel):
    skill_id: uuid.UUID
    skill_slug: str
    skill_name: str
    experience_years: int = 0
    is_primary: bool = False


class WorkerSkillAddPayload(BaseModel):
    skill_id: uuid.UUID
    experience_years: int = Field(default=0, ge=0, le=50)
    is_primary: bool = False


class AvailabilitySlot(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: str = Field(default="09:00", description="HH:MM 24-hour format")
    end_time: str = Field(default="18:00", description="HH:MM 24-hour format")
    is_available: bool = True


class WorkerProfileCreatePayload(BaseModel):
    primary_area: str = Field(..., description="Service locality in Chhatrapati Sambhajinagar")
    experience_years: int = Field(default=0, ge=0, le=50)
    hourly_rate: Decimal = Field(..., ge=50, le=10000, description="Rate per hour in INR")
    visiting_charge: Decimal = Field(default=Decimal("150.00"), ge=0, le=2000)
    min_charge: Decimal = Field(default=Decimal("200.00"), ge=0, le=5000)
    bio: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("primary_area")
    @classmethod
    def validate_area(cls, v: str) -> str:
        clean = v.strip()
        matched = [loc for loc in SAMBHAJINAGAR_LOCALITIES if loc.lower() == clean.lower()]
        if not matched:
            raise ValueError(f"Area must be one of the pilot localities: {', '.join(SAMBHAJINAGAR_LOCALITIES)}")
        return matched[0]


class WorkerProfileUpdatePayload(BaseModel):
    primary_area: Optional[str] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=50)
    hourly_rate: Optional[Decimal] = Field(default=None, ge=50, le=10000)
    visiting_charge: Optional[Decimal] = Field(default=None, ge=0, le=2000)
    min_charge: Optional[Decimal] = Field(default=None, ge=0, le=5000)
    bio: Optional[str] = Field(default=None, max_length=1000)


class WorkerDutyUpdatePayload(BaseModel):
    duty_status: DutyStatus


class WorkerPublicResponse(BaseModel):
    """Privacy-safe public worker profile for directory discovery.
    
    STRICT PRIVACY GOVERNANCE:
    - Never exposes private phone number (provides anonymous contact relay handle).
    - Never exposes precise GPS lat/lng coordinates (only public general locality).
    """
    id: uuid.UUID
    city: str
    primary_area: str
    experience_years: int
    hourly_rate: Decimal
    visiting_charge: Decimal
    min_charge: Decimal
    currency: str
    bio: Optional[str]
    duty_status: DutyStatus
    verification_status: VerificationStatus
    rating_avg: Decimal
    jobs_completed_count: int
    skills: List[WorkerSkillItem] = Field(default_factory=list)
    contact_relay_token: str = Field(
        ...,
        description="Privacy-protecting contact relay identifier (replaces raw phone number in public API)"
    )


class WorkerPrivateProfileResponse(WorkerPublicResponse):
    """Authenticated owner view including private settings."""
    user_id: uuid.UUID
    phone_masked: str
    availabilities: List[AvailabilitySlot] = Field(default_factory=list)
