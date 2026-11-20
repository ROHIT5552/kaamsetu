"""Taxonomy Service: Multi-lingual Categories and Skills Directory

Pilot Location: Chhatrapati Sambhajinagar, Maharashtra
Default Languages: English ('en') and Marathi ('mr'), extensible to Hindi ('hi') and others.
"""

import uuid
from typing import List, Dict, Any, Optional
from app.modules.taxonomy.schemas import CategoryResponse, SkillResponse, LocalizedText

# Pre-seeded canonical taxonomy definitions
INITIAL_CATEGORIES_DATA = [
    {
        "id": uuid.UUID("10000000-0000-0000-0000-000000000001"),
        "slug": "construction",
        "icon": "hard-hat",
        "is_active": True,
        "is_operational": True,
        "translations": {
            "en": {"name": "Construction & Civil Works", "description": "Masons, carpenters, painters, and site laborers"},
            "mr": {"name": "बांधकाम आणि सिव्हिल कामे", "description": "गवंडी, सुतार, रंगारी आणि बांधकाम मदतनीस"},
            "hi": {"name": "निर्माण और सिविल कार्य", "description": "राजमिस्त्री, बढ़ई, पेंटर और मजदूर"}
        },
        "skills": [
            {
                "id": uuid.UUID("20000000-0000-0000-0000-000000000001"),
                "slug": "mason",
                "is_active": True,
                "translations": {
                    "en": {"name": "Mason / Bricklayer", "description": "Brickwork, plastering, tile fitting, concrete pouring"},
                    "mr": {"name": "गवंडी (मेसन)", "description": "वीटकाम, प्लास्टर, टाइल्स बसवणे, काँक्रीट काम"},
                    "hi": {"name": "राजमिस्त्री", "description": "ईंट जोड़ाई, प्लास्टर, टाइल्स कार्य"}
                }
            },
            {
                "id": uuid.UUID("20000000-0000-0000-0000-000000000002"),
                "slug": "carpenter",
                "is_active": True,
                "translations": {
                    "en": {"name": "Carpenter", "description": "Furniture repairs, door fitting, wood framing, modular setups"},
                    "mr": {"name": "सुतार (कारपेंटर)", "description": "फर्निचर दुरुस्ती, दरवाजा बसवणे, लाकूड काम"},
                    "hi": {"name": "बढ़ई", "description": "फर्नीचर मरम्मत, दरवाजा फिटिंग"}
                }
            },
            {
                "id": uuid.UUID("20000000-0000-0000-0000-000000000003"),
                "slug": "painter",
                "is_active": True,
                "translations": {
                    "en": {"name": "Painter", "description": "Interior, exterior wall painting, waterproof coating, putty finish"},
                    "mr": {"name": "रंगारी (पेंटर)", "description": "घराचे रंगकाम, वॉटरप्रूफ कोटिंग, पुट्टी काम"},
                    "hi": {"name": "पेंटर", "description": "दीवार रंगाई, वॉटरप्रूफिंग, पुट्टी कार्य"}
                }
            },
            {
                "id": uuid.UUID("20000000-0000-0000-0000-000000000004"),
                "slug": "general_helper",
                "is_active": True,
                "translations": {
                    "en": {"name": "General Helper", "description": "Site cleaning, material loading/unloading, basic physical assistance"},
                    "mr": {"name": "मदतनीस (हेल्पर)", "description": "साइट स्वच्छता, माल चढवणे-उतरवणे, शारीरिक मदत"},
                    "hi": {"name": "हेल्पर / सहायक", "description": "सफाई, सामान लोडिंग/अनलोडिंग"}
                }
            }
        ]
    },
    {
        "id": uuid.UUID("10000000-0000-0000-0000-000000000002"),
        "slug": "skilled_services",
        "icon": "wrench",
        "is_active": True,
        "is_operational": True,
        "translations": {
            "en": {"name": "Skilled Home Services", "description": "Plumbing, electrical, appliance servicing and technical repairs"},
            "mr": {"name": "कुशल घरगुती सेवा", "description": "प्लंबिंग, इलेक्ट्रिकल, उपकरणे दुरुस्ती आणि तांत्रिक कामे"},
            "hi": {"name": "कुशल घरेलू सेवाएं", "description": "प्लंबिंग, वायरिंग, बिजली कार्य"}
        },
        "skills": [
            {
                "id": uuid.UUID("20000000-0000-0000-0000-000000000005"),
                "slug": "plumber",
                "is_active": True,
                "translations": {
                    "en": {"name": "Plumber", "description": "Pipe leakage, sanitary fitting, pump installation, tank repairs"},
                    "mr": {"name": "प्लंबर (नळ कारागीर)", "description": "पाइप लिकेज, नळ बसवणे, मोटर पंप दुरुस्ती, टाकी स्वच्छता"},
                    "hi": {"name": "प्लंबर", "description": "नल फिटिंग, पाइप लीकेज मरम्मत"}
                }
            },
            {
                "id": uuid.UUID("20000000-0000-0000-0000-000000000006"),
                "slug": "electrician",
                "is_active": True,
                "translations": {
                    "en": {"name": "Electrician", "description": "Wiring, MCB switches, inverter installation, motor repair, light fitting"},
                    "mr": {"name": "इलेक्ट्रिशियन (विजतज्ज्ञ)", "description": "वायरिंग, स्विच दुरुस्ती, इन्व्हर्टर बसवणे, मोटर दुरुस्ती"},
                    "hi": {"name": "इलेक्ट्रीशियन", "description": "वायरिंग, स्विच बोर्ड, इन्वर्टर कनेक्शन"}
                }
            }
        ]
    },
    {
        "id": uuid.UUID("10000000-0000-0000-0000-000000000003"),
        "slug": "agriculture",
        "icon": "sprout",
        "is_active": True,
        "is_operational": False,  # Staged for Phase 2; not assumed operational at pilot launch
        "translations": {
            "en": {"name": "Agriculture & Farm Labor", "description": "Seasonal harvesting, tractor machinery operation, farm helpers"},
            "mr": {"name": "कृषी आणि शेती कामे", "description": "हंगामी कापणी, ट्रॅक्टर ऑपरेटर, शेती मदतनीस (टप्पा २)"},
            "hi": {"name": "कृषि एवं फार्म मजदूर", "description": "फसल कटाई, ट्रैक्टर चालक"}
        },
        "skills": [
            {
                "id": uuid.UUID("20000000-0000-0000-0000-000000000007"),
                "slug": "tractor_operator",
                "is_active": True,
                "translations": {
                    "en": {"name": "Tractor & Machinery Operator", "description": "Plowing, sowing, and heavy agricultural equipment operation"},
                    "mr": {"name": "ट्रॅक्टर चालक (ऑपरेटर)", "description": "नांगरणी, पेरणी, शेती यंत्रे चालवणे"},
                    "hi": {"name": "ट्रैक्टर चालक", "description": "जुताई, बुआई, कृषि मशीनरी"}
                }
            }
        ]
    }
]


class TaxonomyService:
    """Provides querying and localization for categories and skills."""

    def __init__(self):
        self._categories: Dict[uuid.UUID, Dict[str, Any]] = {}
        self._skills: Dict[uuid.UUID, Dict[str, Any]] = {}
        self._slug_to_cat: Dict[str, uuid.UUID] = {}
        self._slug_to_skill: Dict[str, uuid.UUID] = {}
        self._load_initial_data()

    def _load_initial_data(self):
        for cat_data in INITIAL_CATEGORIES_DATA:
            cat_id = cat_data["id"]
            skills_data = cat_data.get("skills", [])
            self._categories[cat_id] = {
                "id": cat_id,
                "slug": cat_data["slug"],
                "icon": cat_data["icon"],
                "is_active": cat_data["is_active"],
                "is_operational": cat_data["is_operational"],
                "translations": cat_data["translations"],
                "skill_ids": [s["id"] for s in skills_data]
            }
            self._slug_to_cat[cat_data["slug"]] = cat_id

            for s_data in skills_data:
                skill_id = s_data["id"]
                self._skills[skill_id] = {
                    "id": skill_id,
                    "category_id": cat_id,
                    "slug": s_data["slug"],
                    "is_active": s_data["is_active"],
                    "translations": s_data["translations"]
                }
                self._slug_to_skill[s_data["slug"]] = skill_id

    def list_categories(self, lang: str = "en", only_operational: bool = False) -> List[CategoryResponse]:
        """Lists categories localized to requested language."""
        results = []
        for cat in self._categories.values():
            if not cat["is_active"]:
                continue
            if only_operational and not cat["is_operational"]:
                continue

            trans = cat["translations"].get(lang) or cat["translations"].get("en") or {}
            all_translations = {
                k: LocalizedText(name=v["name"], description=v.get("description"))
                for k, v in cat["translations"].items()
            }

            results.append(CategoryResponse(
                id=cat["id"],
                slug=cat["slug"],
                icon=cat["icon"],
                name=trans.get("name", cat["slug"]),
                description=trans.get("description"),
                is_active=cat["is_active"],
                is_operational=cat["is_operational"],
                skills_count=len(cat["skill_ids"]),
                translations=all_translations
            ))
        return results

    def get_skills_for_category(self, cat_slug: str, lang: str = "en") -> List[SkillResponse]:
        """Lists active skills under a given category slug."""
        cat_id = self._slug_to_cat.get(cat_slug)
        if not cat_id:
            return []

        cat = self._categories.get(cat_id)
        results = []
        for s_id in cat["skill_ids"]:
            skill = self._skills.get(s_id)
            if not skill or not skill["is_active"]:
                continue

            trans = skill["translations"].get(lang) or skill["translations"].get("en") or {}
            all_translations = {
                k: LocalizedText(name=v["name"], description=v.get("description"))
                for k, v in skill["translations"].items()
            }

            results.append(SkillResponse(
                id=skill["id"],
                category_id=cat_id,
                slug=skill["slug"],
                name=trans.get("name", skill["slug"]),
                description=trans.get("description"),
                is_active=skill["is_active"],
                translations=all_translations
            ))
        return results

    def list_all_skills(self, lang: str = "en") -> List[SkillResponse]:
        """Lists all active skills across all categories."""
        results = []
        for skill in self._skills.values():
            if not skill["is_active"]:
                continue
            trans = skill["translations"].get(lang) or skill["translations"].get("en") or {}
            all_translations = {
                k: LocalizedText(name=v["name"], description=v.get("description"))
                for k, v in skill["translations"].items()
            }
            results.append(SkillResponse(
                id=skill["id"],
                category_id=skill["category_id"],
                slug=skill["slug"],
                name=trans.get("name", skill["slug"]),
                description=trans.get("description"),
                is_active=skill["is_active"],
                translations=all_translations
            ))
        return results

    def get_skill_by_id(self, skill_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        return self._skills.get(skill_id)


# Global singleton instance
taxonomy_service = TaxonomyService()
