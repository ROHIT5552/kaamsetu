"""Immutable Administrative & Security Audit Logging Model"""

from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable audit trail for compliance, administrative overrides, and financial changes.
    
    STRICT GOVERNANCE:
    Never stores OTPs, auth tokens, passwords, or raw identity numbers.
    """
    __tablename__ = "audit_logs"

    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # 'admin.verify_worker', 'admin.disburse_payout'
    target_type = Column(String(50), nullable=False, index=True)  # 'worker_document', 'wage_agreement'
    target_id = Column(String(64), nullable=False, index=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    changes_json = Column(Text, nullable=True)

    actor = relationship("User", back_populates="audit_logs", foreign_keys=[actor_id])
