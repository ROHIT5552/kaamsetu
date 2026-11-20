"""Worker Profile, Skills, Availability, Document Verification, and Location Models"""

from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Text, Time, Date, DateTime,
    Enum as SAEnum, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base
from app.models.common import (
    UUIDPrimaryKeyMixin, TimestampMixin,
    DutyStatus, VerificationStatus
)


class WorkerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Core professional profile for a skilled artisan or helper."""
    __tablename__ = "worker_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    city = Column(String(80), default="Chhatrapati Sambhajinagar", nullable=False)
    primary_area = Column(String(80), nullable=False, index=True)  # Cidco, Waluj, Garkheda, etc.
    experience_years = Column(Integer, default=0, nullable=False)
    
    # Financial Rates
    hourly_rate = Column(Numeric(10, 2), nullable=False)
    visiting_charge = Column(Numeric(10, 2), default=150.00, nullable=False)
    min_charge = Column(Numeric(10, 2), default=200.00, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)

    bio = Column(Text, nullable=True)
    profile_photo_ref = Column(String(255), nullable=True)

    duty_status = Column(SAEnum(DutyStatus, name="duty_status_enum"), default=DutyStatus.OFFLINE, nullable=False, index=True)
    verification_status = Column(SAEnum(VerificationStatus, name="verification_status_enum"), default=VerificationStatus.UNVERIFIED, nullable=False, index=True)
    rating_avg = Column(Numeric(3, 2), default=0.00, nullable=False)
    jobs_completed_count = Column(Integer, default=0, nullable=False)

    # Relationships
    user = relationship("User", back_populates="worker_profile")
    skills = relationship("WorkerSkill", back_populates="worker", cascade="all, delete-orphan")
    availabilities = relationship("WorkerAvailability", back_populates="worker", cascade="all, delete-orphan")
    documents = relationship("WorkerDocument", back_populates="worker", cascade="all, delete-orphan", foreign_keys="WorkerDocument.worker_id")
    locations = relationship("WorkerLocation", back_populates="worker", cascade="all, delete-orphan")
    booking_assignments = relationship("BookingWorker", back_populates="worker")
    payout_records = relationship("WorkerPayoutLedger", back_populates="worker")
    reviews = relationship("Review", back_populates="worker")

    __table_args__ = (
        Index("idx_worker_discovery", "city", "primary_area", "duty_status", "verification_status"),
    )


class WorkerSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Specific skill endorsed and practiced by a worker."""
    __tablename__ = "worker_skills"

    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    experience_years = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("worker_id", "skill_id", name="uq_worker_skills_worker_skill"),
    )

    worker = relationship("WorkerProfile", back_populates="skills")
    skill = relationship("Skill", back_populates="worker_skills")


class WorkerAvailability(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Weekly working schedule intervals for workers."""
    __tablename__ = "worker_availabilities"

    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)

    worker = relationship("WorkerProfile", back_populates="availabilities")


class WorkerDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Identity and trade verification documents.
    
    STRICT GOVERNANCE RULE:
    No raw Aadhaar numbers, voter card numbers, or police verification numbers are stored.
    Only document type and secure opaque storage references are maintained.
    """
    __tablename__ = "worker_documents"

    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False)  # 'aadhaar_card', 'pan_card', 'police_clearance', 'trade_cert'
    secure_file_ref = Column(String(255), nullable=False)  # Opaque encrypted object storage key
    verification_status = Column(
        SAEnum(VerificationStatus, name="verification_status_enum", create_type=False),
        default=VerificationStatus.PENDING,
        nullable=False
    )
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    expiry_date = Column(Date, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    worker = relationship("WorkerProfile", back_populates="documents", foreign_keys=[worker_id])
    verifier = relationship("User", foreign_keys=[verified_by])


class WorkerLocation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit-logged location checkpoints for workers with explicit user consent.
    
    Uses PostGIS Point geometry with SRID 4326 alongside explicit latitude/longitude fields.
    """
    __tablename__ = "worker_locations"

    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    geom = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False, index=True)
    consent_given = Column(Boolean, default=True, nullable=False)

    worker = relationship("WorkerProfile", back_populates="locations")
