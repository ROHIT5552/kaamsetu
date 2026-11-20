"""Dispute Resolution and Arbitration Model"""

from sqlalchemy import Column, String, Text, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin, DisputeStatus


class Dispute(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Customer or worker formal grievance regarding work quality or financial terms."""
    __tablename__ = "disputes"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    initiator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)

    reason = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SAEnum(DisputeStatus, name="dispute_status_enum"), default=DisputeStatus.OPEN, nullable=False, index=True)

    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    booking = relationship("Booking", back_populates="disputes")
    initiator = relationship("User", foreign_keys=[initiator_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
