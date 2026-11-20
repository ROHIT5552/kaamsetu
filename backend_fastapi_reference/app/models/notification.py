"""In-App and Push Notification Models"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User notifications regarding bookings, settlements, and verification status."""
    __tablename__ = "notifications"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    body = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, index=True)  # 'booking_update', 'payout', 'verification'
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="notifications")
