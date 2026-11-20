"""Pydantic Request and Response Schemas for Authentication & Token Operations"""

import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import re
from app.models.common import UserRoleType


class OTPRequestPayload(BaseModel):
    """Payload to request an OTP code."""
    phone: str = Field(
        ...,
        description="Mobile phone number in E.164 format (+91XXXXXXXXXX or 10-digit Indian number)",
        example="+919822012345"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = v.strip().replace(" ", "").replace("-", "")
        # Normalize 10-digit Indian numbers to +91
        if re.match(r"^[6-9]\d{9}$", clean):
            clean = "+91" + clean
        elif not re.match(r"^\+91[6-9]\d{9}$", clean):
            raise ValueError("Phone number must be a valid 10-digit Indian mobile number (+91XXXXXXXXXX).")
        return clean


class OTPVerifyPayload(BaseModel):
    """Payload to verify an OTP and authenticate."""
    phone: str = Field(..., description="Mobile phone number")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code", example="123456")
    role_intent: Optional[UserRoleType] = Field(
        default=UserRoleType.WORKER,
        description="Role requested during initial profile onboarding"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = v.strip().replace(" ", "").replace("-", "")
        if re.match(r"^[6-9]\d{9}$", clean):
            clean = "+91" + clean
        return clean

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^\d{6}$", clean):
            raise ValueError("OTP must be exactly 6 numerical digits.")
        return clean


class TokenResponse(BaseModel):
    """Standard Bearer token response payload."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user_id: uuid.UUID
    roles: List[str]


class RefreshTokenPayload(BaseModel):
    """Payload to rotate a refresh token."""
    refresh_token: str = Field(..., description="Active refresh token string")


class LogoutPayload(BaseModel):
    """Payload for explicit session revocation."""
    refresh_token: Optional[str] = Field(default=None, description="Active refresh token to revoke")


class AuthMessageResponse(BaseModel):
    """Standard generic informational response."""
    message: str
