"""Pydantic Schemas for Employer Profiles and Address Locations"""

import uuid
import enum
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.modules.workers.schemas import SAMBHAJINAGAR_LOCALITIES


class EmployerType(str, enum.Enum):
    INDIVIDUAL = "individual"
    BUSINESS = "business"


class EmployerLocationCreatePayload(BaseModel):
    label: str = Field(default="Home", max_length=50, description="Address label (e.g. Home, Office, Site A)")
    area: str = Field(..., description="Locality in Chhatrapati Sambhajinagar")
    address_line: str = Field(..., min_length=5, max_length=500)
    landmark: Optional[str] = Field(default=None, max_length=100)
    pincode: Optional[str] = Field(default=None, max_length=10)
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None

    @field_validator("area")
    @classmethod
    def validate_area(cls, v: str) -> str:
        clean = v.strip()
        matched = [loc for loc in SAMBHAJINAGAR_LOCALITIES if loc.lower() == clean.lower()]
        if not matched:
            raise ValueError(f"Area must be one of the pilot localities: {', '.join(SAMBHAJINAGAR_LOCALITIES)}")
        return matched[0]


class EmployerLocationResponse(BaseModel):
    id: uuid.UUID
    employer_id: uuid.UUID
    label: str
    area: str
    address_line: str
    landmark: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class EmployerProfileCreatePayload(BaseModel):
    employer_type: EmployerType = Field(default=EmployerType.INDIVIDUAL)
    company_name: Optional[str] = Field(default=None, max_length=120)
    default_area: str = Field(..., description="Default locality in Chhatrapati Sambhajinagar")

    @field_validator("default_area")
    @classmethod
    def validate_area(cls, v: str) -> str:
        clean = v.strip()
        matched = [loc for loc in SAMBHAJINAGAR_LOCALITIES if loc.lower() == clean.lower()]
        if not matched:
            raise ValueError(f"Area must be one of the pilot localities: {', '.join(SAMBHAJINAGAR_LOCALITIES)}")
        return matched[0]


class EmployerProfileUpdatePayload(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=120)
    default_area: Optional[str] = None


class EmployerProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    employer_type: EmployerType
    company_name: Optional[str]
    city: str
    default_area: str
    is_verified: bool
    locations: List[EmployerLocationResponse] = Field(default_factory=list)
