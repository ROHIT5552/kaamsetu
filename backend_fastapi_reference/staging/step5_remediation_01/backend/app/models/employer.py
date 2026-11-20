"""Employer Profile and Address/Location Models"""

from sqlalchemy import Column, String, Boolean, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin


class EmployerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Customer or business requesting skilled labor services."""
    __tablename__ = "employer_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    city = Column(String(80), default="Chhatrapati Sambhajinagar", nullable=False)
    default_area = Column(String(80), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="employer_profile")
    locations = relationship("EmployerLocation", back_populates="employer", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="employer", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="employer")
    reviews_given = relationship("Review", back_populates="employer")


class EmployerLocation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Saved service addresses for households and businesses."""
    __tablename__ = "employer_locations"

    employer_id = Column(UUID(as_uuid=True), ForeignKey("employer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(50), default="Home", nullable=False)  # 'Home', 'Office', 'Site A'
    area = Column(String(80), nullable=False)
    address_line = Column(Text, nullable=False)
    landmark = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    geom = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)

    employer = relationship("EmployerProfile", back_populates="locations")
