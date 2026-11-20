"""Mock Console SMS & OTP Provider for Isolated Development & Testing

STRICT GOVERNANCE RULE:
- Strictly prohibited in production environments.
- Never logs plaintext OTP values to system log streams.
- Provides test-isolated mailbox introspection for automated pytest verification.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.config import settings
from app.integrations.sms.base import BaseSMSProvider

logger = logging.getLogger("kaamsetu.integrations.sms.mock")


class MockConsoleOTPProvider(BaseSMSProvider):
    """Development and testing SMS provider."""

    def __init__(self):
        if settings.APP_ENV == "production":
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: "
                "MockConsoleOTPProvider cannot be initialized in a production environment."
            )
        # In-memory test mailbox for unit testing
        self.sent_messages: List[Dict[str, Any]] = []

    def get_provider_name(self) -> str:
        return "mock_console"

    async def send_otp(self, phone: str, otp: str, template: str = "login") -> bool:
        """Simulates dispatching an OTP.
        
        Records dispatch event to in-memory test mailbox.
        Logs sanitized dispatch notice without exposing plaintext OTP in logs.
        """
        masked_phone = phone[:3] + "******" + phone[-4:] if len(phone) >= 10 else "***"
        
        # Log masked confirmation without leaking OTP value (Rule 8)
        logger.info(
            "[DEV_MOCK_SMS] Simulated OTP generated for %s (template: %s)",
            masked_phone,
            template
        )

        # Store in test mailbox for automated pytest inspection
        self.sent_messages.append({
            "phone": phone,
            "otp": otp,
            "template": template,
            "sent_at": datetime.now(timezone.utc)
        })
        return True

    def get_latest_otp_for_phone(self, phone: str) -> Optional[str]:
        """Test helper to retrieve latest generated OTP for a given phone."""
        for msg in reversed(self.sent_messages):
            if msg["phone"] == phone:
                return msg["otp"]
        return None

    def clear(self):
        """Clears the test mailbox between test runs."""
        self.sent_messages.clear()
