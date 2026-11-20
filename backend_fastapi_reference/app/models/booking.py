"""Work Orders, Worker Assignments, Wage Agreements, and Attendance Models"""

from sqlalchemy import (
    Column, String, Numeric, Text, Boolean, DateTime,
    Enum as SAEnum, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.common import (
    UUIDPrimaryKeyMixin, TimestampMixin,
    BookingStatus, AttendanceStatus
)


class Booking(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Direct dispatch or negotiated contract between employer and worker."""
    __tablename__ = "bookings"

    booking_code = Column(String(32), unique=True, nullable=False, index=True)
    idempotency_key = Column(String(64), unique=True, nullable=True, index=True)

    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employer_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    primary_worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="RESTRICT"), nullable=True, index=True)

    status = Column(SAEnum(BookingStatus, name="booking_status_enum"), default=BookingStatus.REQUESTED, nullable=False, index=True)

    service_address = Column(Text, nullable=False)
    area = Column(String(80), nullable=False, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)

    # Verifiable Real-World Checkpoints (Strict Rule 3 & 4)
    en_route_at = Column(DateTime(timezone=True), nullable=True)
    arrived_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    # Relationships
    job = relationship("Job", back_populates="bookings")
    employer = relationship("EmployerProfile", back_populates="bookings")
    primary_worker = relationship("WorkerProfile")
    assigned_workers = relationship("BookingWorker", back_populates="booking", cascade="all, delete-orphan")
    wage_agreement = relationship("WageAgreement", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("PaymentRecord", back_populates="booking")
    payout_records = relationship("WorkerPayoutLedger", back_populates="booking")
    review = relationship("Review", back_populates="booking", uselist=False)
    disputes = relationship("Dispute", back_populates="booking")


class BookingWorker(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Worker staffing assignments for a booking."""
    __tablename__ = "booking_workers"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    role = Column(String(50), default="primary", nullable=False)  # 'primary' or 'assistant'

    __table_args__ = (
        UniqueConstraint("booking_id", "worker_id", name="uq_booking_workers_booking_worker"),
    )

    booking = relationship("Booking", back_populates="assigned_workers")
    worker = relationship("WorkerProfile", back_populates="booking_assignments")


class WageAgreement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Contractual wage, escrow balances, and breakdown.
    
    STRICT FINANCIAL INTEGRITY:
    Maintains exact decimal balances: agreed wage, advance, amount due, amount paid,
    refund, disputed amount, outstanding balance, and 100% pass-through customer tips.
    """
    __tablename__ = "wage_agreements"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    agreed_wage = Column(Numeric(12, 2), nullable=False)
    advance_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    amount_due = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=0.00, nullable=False)
    refund_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    disputed_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    outstanding_balance = Column(Numeric(12, 2), nullable=False)
    
    platform_commission = Column(Numeric(12, 2), default=0.00, nullable=False)
    tip_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    is_settled = Column(Boolean, default=False, nullable=False)

    booking = relationship("Booking", back_populates="wage_agreement")


class Attendance(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Worker on-site verification log."""
    __tablename__ = "attendance"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    check_in_time = Column(DateTime(timezone=True), nullable=False)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(SAEnum(AttendanceStatus, name="attendance_status_enum"), default=AttendanceStatus.PRESENT, nullable=False)
    verification_method = Column(String(50), default="otp", nullable=False)  # 'otp', 'qr', 'employer_confirmation'

    booking = relationship("Booking", back_populates="attendance_records")
    worker = relationship("WorkerProfile")
