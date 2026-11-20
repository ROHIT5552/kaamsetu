"""Authentication and Role-Based Authorization Package"""

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
    AuthenticatedUserContext,
    require_roles,
    require_worker,
    require_employer,
    require_admin,
    require_support,
    verify_resource_ownership
)
from app.modules.auth.router import router as auth_router

__all__ = [
    "otp_service",
    "token_manager",
    "get_current_user_context",
    "AuthenticatedUserContext",
    "require_roles",
    "require_worker",
    "require_employer",
    "require_admin",
    "require_support",
    "verify_resource_ownership",
    "auth_router",
    "RateLimitExceededError",
    "InvalidOTPError",
    "OTPExpiredError",
    "MaxAttemptsExceededError",
    "OTPAlreadyUsedError",
    "TokenExpiredError",
    "InvalidTokenError",
    "TokenRevokedError"
]
