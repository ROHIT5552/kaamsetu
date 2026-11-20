"""FastAPI Router for Taxonomy (Categories and Skills)"""

from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.modules.taxonomy.schemas import CategoryResponse, SkillResponse
from app.modules.taxonomy.service import taxonomy_service

router = APIRouter(prefix="/api/v1", tags=["Taxonomy & Skills"])


@router.get(
    "/categories",
    response_model=List[CategoryResponse],
    summary="List localized categories"
)
async def list_categories(
    lang: str = Query(default="mr", description="Localization code ('mr', 'en', 'hi')"),
    only_operational: bool = Query(default=False, description="Filter only categories operational in current pilot")
):
    """Returns the service categories directory localized into requested language."""
    return taxonomy_service.list_categories(lang=lang, only_operational=only_operational)


@router.get(
    "/categories/{category_slug}/skills",
    response_model=List[SkillResponse],
    summary="List skills for category"
)
async def list_category_skills(
    category_slug: str,
    lang: str = Query(default="mr", description="Localization code ('mr', 'en', 'hi')")
):
    """Returns the skills list grouped under a specific category."""
    skills = taxonomy_service.get_skills_for_category(category_slug, lang=lang)
    if not skills:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category '{category_slug}' not found or contains no active skills."
        )
    return skills


@router.get(
    "/skills",
    response_model=List[SkillResponse],
    summary="List all skills across categories"
)
async def list_all_skills(
    lang: str = Query(default="mr", description="Localization code ('mr', 'en', 'hi')")
):
    """Returns all available trades/skills across all service domains."""
    return taxonomy_service.list_all_skills(lang=lang)
