"""Abstract Base Class for SMS and OTP Delivery Providers"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseSMSProvider(ABC):
    """Abstract interface for all SMS delivery gateways."""

    @abstractmethod
    async def send_otp(self, phone: str, otp: str, template: str = "login") -> bool:
        """Dispatches an OTP to a verified mobile phone number.
        
        Args:
            phone: E.164 formatted phone number (+91XXXXXXXXXX)
            otp: Plaintext OTP code (ephemeral, not to be stored or logged)
            template: Notification message template name
            
        Returns:
            bool: True if dispatch succeeded, False otherwise
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the unique identifier of the provider."""
        pass
