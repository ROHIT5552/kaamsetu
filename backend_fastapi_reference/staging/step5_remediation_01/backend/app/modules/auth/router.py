"""FastAPI Router for Authentication, OTP Verification, and Token Rotation"""

import uuid
import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException, status, Depends

from app.config import settings
from app.models.common import UserRoleType
from app.modules.auth.schemas import (
    OTPRequestPayload,
    OTPVerifyPayload,
    TokenResponse,
    RefreshTokenPayload,
    LogoutPayload,
    AuthMessageResponse
)
from app.modules.auth.otp_service import (
    otp_service,
    RateLimitExceededError,
    InvalidOTPError,
    OTPExpiredError,
    MaxAttemptsExceededError,
    OTPAlreadyUsedError
)
from app.modules.auth.tokens import (
    token_manager,
    TokenExpiredError,
    InvalidTokenError,
    TokenRevokedError
)
from app.modules.auth.dependencies import (
    get_current_user_context,
    AuthenticatedUserContext
)

logger = logging.getLogger("kaamsetu.auth.router")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# In-memory user identity directory for staging verification without requiring persistent DB connection
_staging_users_db: Dict[str, Dict[str, Any]] = {}


def get_user_by_id(user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """Resolves verified user record from identity store by stable user ID."""
    for user in _staging_users_db.values():
        if user["id"] == user_id:
            return user
    return None


@router.post(
    "/otp/request",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Request a one-time password"
)
async def request_otp(payload: OTPRequestPayload):
    """Generates and dispatches a cryptographically secure 6-digit OTP.
    
    Returns a generic message to prevent phone-number harvesting / enumeration.
    """
    try:
        await otp_service.generate_and_send_otp(payload.phone)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Unexpected error in OTP generation: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dispatch verification code. Please try again later."
        )

    return AuthMessageResponse(
        message="If the mobile number is valid, a one-time verification code has been dispatched."
    )


@router.post(
    "/otp/verify",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP and obtain JWT tokens"
)
async def verify_otp(payload: OTPVerifyPayload):
    """Verifies submitted OTP, registers or retrieves user, and returns signed JWT credentials."""
    try:
        otp_service.verify_otp(payload.phone, payload.otp)
    except InvalidOTPError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except OTPExpiredError as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(e))
    except MaxAttemptsExceededError as e:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(e))
    except OTPAlreadyUsedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    # Retrieve or initialize user record in staging store
    user = _staging_users_db.get(payload.phone)
    if not user:
        user_id = uuid.uuid4()
        assigned_role = payload.role_intent.value if payload.role_intent else UserRoleType.WORKER.value
        user = {
            "id": user_id,
            "phone": payload.phone,
            "roles": [assigned_role]
        }
        _staging_users_db[payload.phone] = user
    else:
        user_id = user["id"]

    roles = user["roles"]

    # Issue access and refresh tokens
    access_token = token_manager.create_access_token(
        user_id=user_id,
        roles=roles,
        extra_claims={"phone": payload.phone}
    )
    refresh_token = token_manager.create_refresh_token(user_id=user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in_seconds=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user_id,
        roles=roles
    )


@router.post(
    "/token/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token"
)
async def refresh_access_token(payload: RefreshTokenPayload):
    """Exchanges an active refresh token for a newly rotated token pair."""
    try:
        # Decode token to identify user
        token_data = token_manager.decode_token(payload.refresh_token, expected_type="refresh")
        user_id = uuid.UUID(token_data.get("sub"))
        
        # Look up user record from identity store to preserve verified roles and phone
        user = get_user_by_id(user_id)
        roles = user["roles"] if user else [UserRoleType.WORKER.value]
        extra_claims = {"phone": user["phone"]} if (user and user.get("phone")) else None

        tokens = token_manager.rotate_refresh_token(
            payload.refresh_token,
            roles=roles,
            extra_claims=extra_claims
        )

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in_seconds=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user_id,
            roles=roles
        )
    except TokenRevokedError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except (InvalidTokenError, TokenExpiredError) as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post(
    "/logout",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke active session"
)
async def logout(
    payload: LogoutPayload,
    current_user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    """Revokes active refresh token and terminates session."""
    if payload.refresh_token:
        token_manager.revoke_refresh_token(payload.refresh_token)
    return AuthMessageResponse(message="Successfully signed out.")


@router.get(
    "/me",
    summary="Get current user profile and verified roles"
)
async def get_me(current_user: AuthenticatedUserContext = Depends(get_current_user_context)):
    """Returns identity and role claims of the currently authenticated session."""
    return {
        "user_id": str(current_user.user_id),
        "roles": current_user.roles
    }
