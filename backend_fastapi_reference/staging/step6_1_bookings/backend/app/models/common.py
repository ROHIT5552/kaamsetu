"""Common Mixins, Base Declarations, and Enum Definitions for KaamSetu Models"""

import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, DateTime, func, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_mixin, declared_attr
from app.database import Base


@declarative_mixin
class UUIDPrimaryKeyMixin:
    """Provides standard UUID v4 primary key across all database entities."""
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
        index=True
    )


@declarative_mixin
class TimestampMixin:
    """Provides standard UTC timezone-aware audit timestamps."""
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class UserRoleType(str, enum.Enum):
    WORKER = "worker"
    EMPLOYER = "employer"
    ADMIN = "admin"
    SUPPORT = "support"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class DutyStatus(str, enum.Enum):
    ONLINE = "online"
    BUSY = "busy"
    OFFLINE = "offline"


class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ApplicationStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    SHORTLISTED = "shortlisted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class BookingStatus(str, enum.Enum):
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    EN_ROUTE = "en_route"
    ARRIVED = "arrived"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    EMPLOYER_NO_SHOW = "employer_no_show"
    DISPUTED = "disputed"


class WageAgreementStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_COUNTERPARTY = "pending_counterparty"
    ACTIVE = "active"
    REJECTED = "rejected"
    REVISION_PENDING = "revision_pending"
    SETTLED = "settled"
    DISPUTED_HOLD = "disputed_hold"
    TERMINATED = "terminated"


class AgreementType(str, enum.Enum):
    DAILY = "daily"
    HOURLY = "hourly"
    FIXED_PRICE = "fixed_price"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    GATEWAY = "gateway"


class DisputeStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    CLOSED = "closed"
