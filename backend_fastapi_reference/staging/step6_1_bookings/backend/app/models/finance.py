"""Financial Ledger, Immutable Payment Records, Adjustments, and Disbursals"""

from sqlalchemy import (
    Column, String, Numeric, Boolean, Text, DateTime,
    Enum as SAEnum, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.common import (
    UUIDPrimaryKeyMixin, TimestampMixin,
    PaymentStatus, PaymentMethod
)


class PaymentRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable, auditable incoming customer payments.
    
    STRICT FINANCIAL GOVERNANCE:
    Payments are immutable event records. Never updated in-place; adjustments
    are recorded as explicit differential ledger items.
    """
    __tablename__ = "payment_records"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False, index=True)
    idempotency_key = Column(String(64), unique=True, nullable=False, index=True)
    transaction_reference = Column(String(100), unique=True, nullable=False, index=True)  # Bank UTR / Gateway Ref

    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    payment_method = Column(SAEnum(PaymentMethod, name="payment_method_enum"), default=PaymentMethod.UPI, nullable=False)
    payment_status = Column(SAEnum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.PENDING, nullable=False, index=True)

    provider_response_code = Column(String(50), nullable=True)
    verified_by_webhook = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    raw_metadata = Column(Text, nullable=True)

    booking = relationship("Booking", back_populates="payments")
    adjustments = relationship("PaymentAdjustment", back_populates="payment_record", cascade="all, delete-orphan")


class PaymentAdjustment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable differential financial adjustment (refunds, corrections, dispute reversals)."""
    __tablename__ = "payment_adjustments"

    payment_record_id = Column(UUID(as_uuid=True), ForeignKey("payment_records.id", ondelete="RESTRICT"), nullable=False, index=True)
    adjustment_type = Column(String(50), nullable=False)  # 'refund', 'chargeback', 'correction'
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    reason = Column(Text, nullable=False)
    authorized_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    payment_record = relationship("PaymentRecord", back_populates="adjustments")
    authorizer = relationship("User")


class WorkerPayoutLedger(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Worker earnings and platform settlement disbursement register."""
    __tablename__ = "worker_payout_ledger"

    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False, index=True)

    gross_amount = Column(Numeric(12, 2), nullable=False)
    platform_commission = Column(Numeric(12, 2), nullable=False)
    tip_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    net_payout = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR", nullable=False)

    payout_ref = Column(String(100), nullable=True, index=True)  # UPI-PAY-2026-XXXXX or NEFT UTR
    status = Column(String(20), default="pending", nullable=False, index=True)  # 'pending', 'disbursed'
    disbursed_at = Column(DateTime(timezone=True), nullable=True)

    worker = relationship("WorkerProfile", back_populates="payout_records")
    booking = relationship("Booking", back_populates="payout_records")
