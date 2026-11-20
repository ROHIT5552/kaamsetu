"""JWT Token Issuance, Refresh Token Rotation, and Revocation Management

STRICT SECURITY GOVERNANCE:
- Never log JWT tokens, refresh tokens, or signing keys.
- Enforces refresh-token rotation: each refresh consumes the previous token.
- Automatic family breach detection: reuse of a revoked token invalidates the entire family.
- Configurable expiry times.
"""

import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import jwt

from app.config import settings

logger = logging.getLogger("kaamsetu.auth.tokens")


class TokenSecurityException(Exception):
    """Base exception for token failures."""
    pass


class TokenExpiredError(TokenSecurityException):
    """Raised when an expired JWT token is decoded."""
    pass


class InvalidTokenError(TokenSecurityException):
    """Raised when a token signature or format is invalid."""
    pass


class TokenRevokedError(TokenSecurityException):
    """Raised when a revoked refresh token is presented."""
    pass


class TokenManager:
    """Manages signed JWT access tokens and stateful refresh token families."""

    def __init__(self):
        # In-memory store for refresh tokens:
        # token_id (jti) -> {"user_id": str, "family_id": str, "is_revoked": bool, "expires_at": datetime}
        self._refresh_tokens: Dict[str, Dict[str, Any]] = {}
        # Revoked families: family_id -> set of revoked jti
        self._revoked_families: set = set()

    def create_access_token(
        self,
        user_id: uuid.UUID,
        roles: List[str],
        extra_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """Issues a signed JWT access token."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

        payload = {
            "sub": str(user_id),
            "roles": roles,
            "type": "access",
            "jti": str(uuid.uuid4()),
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp())
        }

        if extra_claims:
            payload.update(extra_claims)

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return token

    def create_refresh_token(
        self,
        user_id: uuid.UUID,
        family_id: Optional[str] = None
    ) -> str:
        """Issues a stateful refresh token with rotation family tracking."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=30)
        token_id = str(uuid.uuid4())
        active_family_id = family_id or str(uuid.uuid4())

        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "jti": token_id,
            "family_id": active_family_id,
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp())
        }

        # Store token record
        self._refresh_tokens[token_id] = {
            "user_id": str(user_id),
            "family_id": active_family_id,
            "is_revoked": False,
            "expires_at": expires_at
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return token

    def decode_token(self, token: str, expected_type: str = "access") -> Dict[str, Any]:
        """Decodes and cryptographically verifies a JWT token."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Token has expired.")
        except jwt.PyJWTError as e:
            raise InvalidTokenError(f"Token is invalid: {str(e)}")

        token_type = payload.get("type")
        if token_type != expected_type:
            raise InvalidTokenError(f"Invalid token type: expected {expected_type}, got {token_type}")

        return payload

    def rotate_refresh_token(
        self,
        refresh_token_str: str,
        roles: List[str],
        extra_claims: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Rotates a refresh token: invalidates old token, issues new pair, checks for reuse breaches."""
        payload = self.decode_token(refresh_token_str, expected_type="refresh")
        token_id = payload.get("jti")
        family_id = payload.get("family_id")
        user_id = uuid.UUID(payload.get("sub"))

        # Check if entire family has been revoked due to breach
        if family_id in self._revoked_families:
            logger.warning("Attempt to use token from compromised family %s", family_id)
            raise TokenRevokedError("Token family compromised. Please log in again.")

        stored = self._refresh_tokens.get(token_id)
        if not stored:
            raise InvalidTokenError("Refresh token not found or already purged.")

        # Breach detection: token reuse
        if stored["is_revoked"]:
            # A revoked token was presented again! Revoke the entire family immediately.
            self._revoked_families.add(family_id)
            logger.critical("SECURITY ALERT: Refresh token reuse detected! Revoking family %s", family_id)
            raise TokenRevokedError("Token reuse detected. All sessions in this chain have been revoked.")

        # Invalidate the current refresh token
        stored["is_revoked"] = True

        # Issue new pair within the same family preserving extra claims (e.g. verified phone)
        new_access_token = self.create_access_token(user_id=user_id, roles=roles, extra_claims=extra_claims)
        new_refresh_token = self.create_refresh_token(user_id=user_id, family_id=family_id)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    def revoke_refresh_token(self, refresh_token_str: str) -> bool:
        """Revokes an active refresh token on explicit user logout."""
        try:
            payload = self.decode_token(refresh_token_str, expected_type="refresh")
            token_id = payload.get("jti")
            if token_id in self._refresh_tokens:
                self._refresh_tokens[token_id]["is_revoked"] = True
                return True
        except Exception:
            pass
        return False

    def clear(self):
        """Clears state for testing."""
        self._refresh_tokens.clear()
        self._revoked_families.clear()


# Global singleton instance
token_manager = TokenManager()
