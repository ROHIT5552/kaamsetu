"""FastAPI Dependency Guards for Authentication, RBAC, and IDOR Prevention

STRICT GOVERNANCE:
- Default-deny authorization policy.
- Role checks based strictly on cryptographically verified JWT claims, never frontend input.
- Cross-tenant IDOR access controls.
- Never logs Authorization headers or bearer tokens.
"""

import uuid
import logging
from typing import List, Callable, Optional, Dict, Any

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.common import UserRoleType
from app.modules.auth.tokens import (
    token_manager,
    TokenExpiredError,
    InvalidTokenError
)

logger = logging.getLogger("kaamsetu.auth.dependencies")

# Security bearer scheme without auto-error to permit custom error handling
security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUserContext:
    """Carries verified identity and roles for the active request."""
    def __init__(self, user_id: uuid.UUID, roles: List[str], claims: Dict[str, Any]):
        self.user_id = user_id
        self.roles = roles
        self.claims = claims

    def has_role(self, role: UserRoleType) -> bool:
        return role.value in self.roles or UserRoleType.ADMIN.value in self.roles


async def get_current_user_context(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> AuthenticatedUserContext:
    """Extracts and validates JWT Bearer token from request Authorization header."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:
        payload = token_manager.decode_token(token, expected_type="access")
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    roles = payload.get("roles", [])
    return AuthenticatedUserContext(user_id=user_id, roles=roles, claims=payload)


def require_roles(*allowed_roles: UserRoleType) -> Callable:
    """Enforces role-based authorization (RBAC) guard.
    
    Default-Deny: Access is forbidden unless the authenticated context possesses
    at least one of the specified allowed roles or is an ADMIN.
    """
    allowed_role_values = {r.value for r in allowed_roles}
    # Admins always have implicit system-wide administrative access
    allowed_role_values.add(UserRoleType.ADMIN.value)

    async def _role_guard(
        current_user: AuthenticatedUserContext = Depends(get_current_user_context)
    ) -> AuthenticatedUserContext:
        user_roles_set = set(current_user.roles)
        if not user_roles_set.intersection(allowed_role_values):
            logger.warning(
                "Access forbidden: User %s with roles %s denied entry to restricted endpoint requiring %s",
                current_user.user_id,
                current_user.roles,
                [r.value for r in allowed_roles]
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Insufficient privileges for this operation."
            )
        return current_user

    return _role_guard


# Pre-configured role guards
require_worker = require_roles(UserRoleType.WORKER)
require_employer = require_roles(UserRoleType.EMPLOYER)
require_admin = require_roles(UserRoleType.ADMIN)
require_support = require_roles(UserRoleType.SUPPORT, UserRoleType.ADMIN)


def verify_resource_ownership(
    target_owner_id: uuid.UUID,
    current_user: AuthenticatedUserContext,
    resource_name: str = "resource"
) -> None:
    """IDOR Prevention Guard:
    
    Ensures that an authenticated user can only access their own private resources
    unless they hold the ADMIN role.
    """
    if current_user.has_role(UserRoleType.ADMIN):
        return

    if current_user.user_id != target_owner_id:
        logger.warning(
            "IDOR breach attempt: User %s attempted unauthorized access to %s owned by %s",
            current_user.user_id,
            resource_name,
            target_owner_id
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: You do not have permission to access or modify this {resource_name}."
        )
