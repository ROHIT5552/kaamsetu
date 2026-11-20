"""Job Postings, Job Skill Requirements, and Worker Applications"""

from sqlalchemy import Column, String, Numeric, Text, DateTime, Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin, JobStatus, ApplicationStatus


class Job(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Broadcast work requirement posted by an employer."""
    __tablename__ = "jobs"

    employer_id = Column(UUID(as_uuid=True), ForeignKey("employer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    city = Column(String(80), default="Chhatrapati Sambhajinagar", nullable=False)
    area = Column(String(80), nullable=False, index=True)
    address_line = Column(Text, nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    geom = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)

    budget_min = Column(Numeric(12, 2), nullable=True)
    budget_max = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(3), default="INR", nullable=False)

    status = Column(SAEnum(JobStatus, name="job_status_enum"), default=JobStatus.OPEN, nullable=False, index=True)
    urgency = Column(String(20), default="standard", nullable=False)  # 'standard' or 'emergency_15m'
    start_date = Column(DateTime(timezone=True), nullable=True)

    employer = relationship("EmployerProfile", back_populates="jobs")
    required_skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="job")


class JobSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Specific skill required to perform a job."""
    __tablename__ = "job_skills"

    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("job_id", "skill_id", name="uq_job_skills_job_skill"),
    )

    job = relationship("Job", back_populates="required_skills")
    skill = relationship("Skill", back_populates="job_skills")


class JobApplication(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Application submitted by a registered worker for a posted job."""
    __tablename__ = "job_applications"

    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(UUID(as_uuid=True), ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    proposed_wage = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    cover_note = Column(Text, nullable=True)
    status = Column(SAEnum(ApplicationStatus, name="application_status_enum"), default=ApplicationStatus.SUBMITTED, nullable=False)

    __table_args__ = (
        UniqueConstraint("job_id", "worker_id", name="uq_job_applications_job_worker"),
    )

    job = relationship("Job", back_populates="applications")
    worker = relationship("WorkerProfile")
