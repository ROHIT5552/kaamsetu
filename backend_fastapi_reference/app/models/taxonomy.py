"""Taxonomy Models: Categories, Skills and Multi-lingual Localized Translations"""

from sqlalchemy import Column, String, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin


class Category(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """High-level service category grouping trades."""
    __tablename__ = "categories"

    slug = Column(String(50), unique=True, nullable=False, index=True)
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    translations = relationship("CategoryTranslation", back_populates="category", cascade="all, delete-orphan")
    skills = relationship("Skill", back_populates="category", cascade="all, delete-orphan")


class CategoryTranslation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Bilingual translations (English & Marathi) for service categories."""
    __tablename__ = "category_translations"

    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(5), nullable=False)  # 'en' or 'mr'
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("category_id", "language", name="uq_category_translations_cat_lang"),
    )

    category = relationship("Category", back_populates="translations")


class Skill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Individual trade/craft (plumber, electrician, carpenter, etc.)."""
    __tablename__ = "skills"

    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    category = relationship("Category", back_populates="skills")
    translations = relationship("SkillTranslation", back_populates="skill", cascade="all, delete-orphan")
    worker_skills = relationship("WorkerSkill", back_populates="skill")
    job_skills = relationship("JobSkill", back_populates="skill")


class SkillTranslation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Bilingual translations (English & Marathi) for individual skills."""
    __tablename__ = "skill_translations"

    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(5), nullable=False)  # 'en' or 'mr'
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("skill_id", "language", name="uq_skill_translations_skill_lang"),
    )

    skill = relationship("Skill", back_populates="translations")
