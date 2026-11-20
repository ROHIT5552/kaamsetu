"""SMS Provider Factory"""

import logging
from app.config import settings
from app.integrations.sms.base import BaseSMSProvider
from app.integrations.sms.mock_provider import MockConsoleOTPProvider
from app.integrations.sms.msg91_provider import MSG91SMSProvider

logger = logging.getLogger("kaamsetu.integrations.sms")

# Global singleton instance for testing & runtime
_provider_instance: BaseSMSProvider = None


def get_sms_provider() -> BaseSMSProvider:
    """Factory to retrieve active SMS provider based on environment configuration."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_name = settings.SMS_PROVIDER.lower()

    if provider_name in ("mock_console", "mock_sms", "mock"):
        if settings.APP_ENV == "production":
            raise RuntimeError("CRITICAL: Mock SMS provider is strictly disallowed in production.")
        _provider_instance = MockConsoleOTPProvider()
    elif provider_name == "msg91":
        _provider_instance = MSG91SMSProvider()
    else:
        logger.warning("Unknown SMS provider '%s'. Defaulting to MockConsoleOTPProvider in dev.", provider_name)
        _provider_instance = MockConsoleOTPProvider()

    return _provider_instance


def set_sms_provider(provider: BaseSMSProvider) -> None:
    """Allows test suites to override or inject mock providers."""
    global _provider_instance
    _provider_instance = provider
