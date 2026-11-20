"""Customer Reviews and Ratings Model"""

from sqlalchemy import Column, Integer, Text, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin


class Review(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Verified customer rating and feedback tied strictly to completed bookings."""
    __tablename__ = "reviews"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)

    rating = Column(Integer, nullable=False)
    feedback = Column(Text, nullable=True)

    punctuality_rating = Column(Integer, nullable=True)
    work_quality_rating = Column(Integer, nullable=True)
    behavior_rating = Column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
    )

    booking = relationship("Booking", back_populates="review")
    worker = relationship("WorkerProfile", back_populates="reviews")
    employer = relationship("EmployerProfile", back_populates="reviews_given")
