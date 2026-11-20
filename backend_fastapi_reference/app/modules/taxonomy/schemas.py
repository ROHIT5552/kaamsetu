"""Pydantic Schemas for Multi-lingual Categories and Skills Taxonomy"""

import uuid
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class LocalizedText(BaseModel):
    name: str
    description: Optional[str] = None


class SkillResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    slug: str
    name: str
    description: Optional[str] = None
    is_active: bool
    translations: Dict[str, LocalizedText] = Field(default_factory=dict)


class CategoryResponse(BaseModel):
    id: uuid.UUID
    slug: str
    icon: Optional[str] = None
    name: str
    description: Optional[str] = None
    is_active: bool
    is_operational: bool = Field(
        default=True,
        description="Whether this category is actively serviced in current pilot launch phase"
    )
    skills_count: int = 0
    translations: Dict[str, LocalizedText] = Field(default_factory=dict)
