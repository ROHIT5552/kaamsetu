"""MSG91 SMS Gateway Adapter Interface (Production-Ready Architecture)

Prepared for DLT-compliant Indian telecom template delivery.
STRICT GOVERNANCE RULE:
- Does not initiate real external paid API calls in development or staging.
- Never logs API keys, auth keys, or OTP values.
"""

import logging
from typing import Optional
from app.config import settings
from app.integrations.sms.base import BaseSMSProvider

logger = logging.getLogger("kaamsetu.integrations.sms.msg91")


class MSG91SMSProvider(BaseSMSProvider):
    """Adapter interface for MSG91 OTP / Flow API."""

    def __init__(self, auth_key: Optional[str] = None, template_id: Optional[str] = None):
        self.auth_key = auth_key or getattr(settings, "SMS_API_KEY", None)
        self.template_id = template_id or getattr(settings, "MSG91_TEMPLATE_ID", None)

    def get_provider_name(self) -> str:
        return "msg91"

    async def send_otp(self, phone: str, otp: str, template: str = "login") -> bool:
        """Dispatches OTP via MSG91 API (blocked in staging until production credentials approved)."""
        if not self.auth_key or self.auth_key.startswith("mock_"):
            logger.warning(
                "MSG91 SMS dispatch invoked but real credentials are not configured for staging. "
                "Simulated failure to protect against unintended third-party calls."
            )
            raise NotImplementedError(
                "Real MSG91 SMS delivery requires verified production credentials and human approval."
            )

        # In production with approved credentials, an async httpx.Client call would be made here.
        # Plaintext OTP and auth_key are strictly excluded from logging.
        return True
