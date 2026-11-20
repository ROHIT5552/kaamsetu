"""Work Orders, Worker Assignments, Wage Agreements, and Attendance Models"""

from sqlalchemy import (
    Column, String, Numeric, Text, Boolean, DateTime,
    Enum as SAEnum, ForeignKey, UniqueConstraint, BigInteger, Integer
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.common import (
    UUIDPrimaryKeyMixin, TimestampMixin,
    BookingStatus, AttendanceStatus,
    WageAgreementStatus, AgreementType
)


class Booking(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Direct dispatch or negotiated contract between employer and worker."""
    __tablename__ = "bookings"

    booking_code = Column(String(32), unique=True, nullable=False, index=True)
    idempotency_key = Column(String(64), unique=True, nullable=True, index=True)

    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employer_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    primary_worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="RESTRICT"), nullable=True, index=True)
    parent_contract_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL", use_alter=True, name="fk_bookings_parent_contract_id"), nullable=True, index=True)

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
    parent_contract = relationship(
        "Booking",
        remote_side="Booking.id",
        backref="child_dispatches",
        foreign_keys=[parent_contract_id]
    )


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
    Supports integer Paise (BIGINT) across all operations.
    """
    __tablename__ = "wage_agreements"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Financial fields in Decimal INR (Maintained for legacy test compatibility)
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

    # Step 6.1 Hardened State Machine & Integer Paise Fields
    status = Column(SAEnum(WageAgreementStatus, name="wage_agreement_status_enum"), default=WageAgreementStatus.DRAFT, nullable=False, index=True)
    agreement_type = Column(SAEnum(AgreementType, name="agreement_type_enum"), default=AgreementType.DAILY, nullable=False)
    current_version = Column(Integer, default=1, nullable=False)

    agreed_wage_paise = Column(BigInteger, default=0, nullable=False)
    advance_amount_paise = Column(BigInteger, default=0, nullable=False)
    amount_due_paise = Column(BigInteger, default=0, nullable=False)
    amount_paid_paise = Column(BigInteger, default=0, nullable=False)
    refund_amount_paise = Column(BigInteger, default=0, nullable=False)
    disputed_amount_paise = Column(BigInteger, default=0, nullable=False)
    outstanding_balance_paise = Column(BigInteger, default=0, nullable=False)
    platform_commission_paise = Column(BigInteger, default=0, nullable=False)
    tip_amount_paise = Column(BigInteger, default=0, nullable=False)

    booking = relationship("Booking", back_populates="wage_agreement")
    versions = relationship("WageAgreementVersion", back_populates="wage_agreement", cascade="all, delete-orphan", order_by="WageAgreementVersion.version_number")


class WageAgreementVersion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable audit version history of wage amendments."""
    __tablename__ = "wage_agreement_versions"

    wage_agreement_id = Column(UUID(as_uuid=True), ForeignKey("wage_agreements.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    proposed_wage = Column(Numeric(12, 2), nullable=False)
    proposed_wage_paise = Column(BigInteger, default=0, nullable=False)
    scope_change_description = Column(Text, nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # 'pending', 'accepted', 'rejected'
    proposed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("wage_agreement_id", "version_number", name="uq_wage_agreement_versions_version"),
    )

    wage_agreement = relationship("WageAgreement", back_populates="versions")
    proposed_by = relationship("User")


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
