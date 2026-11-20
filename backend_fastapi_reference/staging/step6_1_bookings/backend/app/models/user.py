"""User and Role Models for Identity, Authentication & Role-Based Authorization"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin, UserRoleType


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Core user account representing any participant (worker, employer, administrator)."""
    __tablename__ = "users"

    phone = Column(String(15), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    full_name = Column(String(120), nullable=True)
    preferred_language = Column(String(5), default="mr", nullable=False)  # 'mr' or 'en'
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    employer_profile = relationship("EmployerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor", foreign_keys="AuditLog.actor_id")


class UserRole(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Assigned roles for role-based access control (RBAC)."""
    __tablename__ = "user_roles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SAEnum(UserRoleType, name="user_role_type_enum"), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "role", name="uq_user_roles_user_id_role"),
    )

    user = relationship("User", back_populates="roles")
