"""Cryptographically Secure OTP Service

STRICT SECURITY GOVERNANCE:
- Never stores plaintext OTPs (uses HMAC-SHA256 with per-request cryptographic salt).
- Never logs OTP values to loggers.
- Enforces request rate-limiting and maximum verification attempts.
- One-time-use consumption guarantees.
- Generic messages to prevent phone-number enumeration.
"""

import hmac
import hashlib
import secrets
import time
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.integrations.sms.factory import get_sms_provider

logger = logging.getLogger("kaamsetu.auth.otp")


class AuthSecurityException(Exception):
    """Base exception for authentication errors."""
    pass


class RateLimitExceededError(AuthSecurityException):
    """Raised when OTP generation requests exceed the rate limit window."""
    pass


class InvalidOTPError(AuthSecurityException):
    """Raised when an invalid OTP code is submitted."""
    pass


class OTPExpiredError(AuthSecurityException):
    """Raised when the submitted OTP has exceeded its validity window."""
    pass


class MaxAttemptsExceededError(AuthSecurityException):
    """Raised when verification attempts exceed the allowed threshold."""
    pass


class OTPAlreadyUsedError(AuthSecurityException):
    """Raised when an attempt is made to verify an already-consumed OTP."""
    pass


class OTPRecord:
    """Secure in-memory representation of an active OTP session."""
    def __init__(self, phone: str, hashed_otp: str, salt: str, expires_at: datetime):
        self.phone = phone
        self.hashed_otp = hashed_otp
        self.salt = salt
        self.expires_at = expires_at
        self.attempts = 0
        self.is_consumed = False
        self.created_at = datetime.now(timezone.utc)


class OTPService:
    """Manages the lifecycle of one-time passwords."""

    def __init__(self):
        # Active sessions: phone -> OTPRecord
        self._active_otps: Dict[str, OTPRecord] = {}
        # Request timestamps for rate limiting: phone -> list of timestamps
        self._request_history: Dict[str, list] = {}

    def _hash_otp(self, otp: str, salt: str) -> str:
        """Computes HMAC-SHA256 digest using salt."""
        return hmac.new(salt.encode("utf-8"), otp.encode("utf-8"), hashlib.sha256).hexdigest()

    def _check_rate_limit(self, phone: str, max_requests: int = 3, window_seconds: int = 600) -> None:
        """Enforces maximum OTP generation requests per window."""
        now = time.time()
        history = self._request_history.get(phone, [])
        # Prune expired timestamps
        history = [ts for ts in history if now - ts < window_seconds]
        self._request_history[phone] = history

        if len(history) >= max_requests:
            logger.warning("Rate limit exceeded for phone request: %s******", phone[:3])
            raise RateLimitExceededError("Too many OTP requests. Please wait a few minutes before trying again.")

        self._request_history[phone].append(now)

    async def generate_and_send_otp(self, phone: str) -> bool:
        """Generates a cryptographically secure 6-digit OTP, stores its hash, and dispatches via provider."""
        self._check_rate_limit(phone)

        # 1. Generate 6-digit code using CSPRNG
        raw_otp = "".join(secrets.choice("0123456789") for _ in range(6))
        salt = secrets.token_hex(16)
        hashed_otp = self._hash_otp(raw_otp, salt)

        # 2. Expiry calculation
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)

        # 3. Store hashed record (never plaintext)
        record = OTPRecord(
            phone=phone,
            hashed_otp=hashed_otp,
            salt=salt,
            expires_at=expires_at
        )
        self._active_otps[phone] = record

        # 4. Dispatch via SMS provider interface
        provider = get_sms_provider()
        success = await provider.send_otp(phone=phone, otp=raw_otp, template="login")

        # Plaintext raw_otp is not logged and will be garbage collected
        return success

    def verify_otp(self, phone: str, submitted_otp: str) -> bool:
        """Validates the submitted OTP against stored hash with attempt limits and one-time consumption."""
        record = self._active_otps.get(phone)

        if not record:
            raise InvalidOTPError("Invalid or expired OTP.")

        if record.is_consumed:
            raise OTPAlreadyUsedError("This OTP has already been verified and consumed.")

        now = datetime.now(timezone.utc)
        if now > record.expires_at:
            # Clean up expired record
            del self._active_otps[phone]
            raise OTPExpiredError("The OTP has expired. Please request a new one.")

        # Increment attempts counter
        record.attempts += 1
        if record.attempts > settings.OTP_MAX_ATTEMPTS:
            del self._active_otps[phone]
            logger.warning("Max verification attempts exceeded for phone %s******", phone[:3])
            raise MaxAttemptsExceededError("Too many failed attempts. This OTP is now locked.")

        # Constant-time comparison of hashed OTP
        computed_hash = self._hash_otp(submitted_otp, record.salt)
        if not hmac.compare_digest(computed_hash, record.hashed_otp):
            remaining = settings.OTP_MAX_ATTEMPTS - record.attempts
            logger.info("Invalid OTP attempt for %s****** (%d attempts remaining)", phone[:3], remaining)
            raise InvalidOTPError(f"Incorrect OTP code. {remaining} attempt(s) remaining.")

        # Mark consumed to prevent reuse
        record.is_consumed = True
        del self._active_otps[phone]
        return True

    def clear(self):
        """Clears state for testing."""
        self._active_otps.clear()
        self._request_history.clear()


# Global singleton instance
otp_service = OTPService()
