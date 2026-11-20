"""Worker Business Domain Service

Handles lifecycle of worker profiles, skill endorsements, availability schedules,
and privacy-sanitized public directory searches for Chhatrapati Sambhajinagar.
"""

import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.models.common import DutyStatus, VerificationStatus
from app.modules.taxonomy.service import taxonomy_service
from app.modules.workers.schemas import (
    WorkerProfileCreatePayload,
    WorkerProfileUpdatePayload,
    WorkerSkillAddPayload,
    AvailabilitySlot,
    WorkerPublicResponse,
    WorkerPrivateProfileResponse,
    WorkerSkillItem
)


class WorkerService:
    """Manages worker domain operations in staging store."""

    def __init__(self):
        # worker_id -> dict
        self._workers: Dict[uuid.UUID, Dict[str, Any]] = {}
        # user_id -> worker_id
        self._user_to_worker: Dict[uuid.UUID, uuid.UUID] = {}

    def create_profile(
        self,
        user_id: uuid.UUID,
        phone: str,
        payload: WorkerProfileCreatePayload
    ) -> WorkerPrivateProfileResponse:
        """Creates a new worker profile for authenticated user."""
        if user_id in self._user_to_worker:
            raise ValueError("Worker profile already exists for this account.")

        worker_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        record = {
            "id": worker_id,
            "user_id": user_id,
            "phone": phone,
            "city": "Chhatrapati Sambhajinagar",
            "primary_area": payload.primary_area,
            "experience_years": payload.experience_years,
            "hourly_rate": payload.hourly_rate,
            "visiting_charge": payload.visiting_charge,
            "min_charge": payload.min_charge,
            "currency": "INR",
            "bio": payload.bio,
            "duty_status": DutyStatus.ONLINE,
            "verification_status": VerificationStatus.UNVERIFIED,
            "rating_avg": Decimal("0.00"),
            "jobs_completed_count": 0,
            "skills": {},  # skill_id -> {"experience_years": int, "is_primary": bool}
            "availabilities": [
                {"day_of_week": i, "start_time": "08:00", "end_time": "19:00", "is_available": True}
                for i in range(7)
            ],
            "created_at": now,
            "updated_at": now
        }

        self._workers[worker_id] = record
        self._user_to_worker[user_id] = worker_id
        return self._format_private(record)

    def get_by_user_id(self, user_id: uuid.UUID) -> Optional[WorkerPrivateProfileResponse]:
        """Retrieves private worker profile for the owner."""
        worker_id = self._user_to_worker.get(user_id)
        if not worker_id:
            return None
        record = self._workers.get(worker_id)
        if not record:
            return None
        return self._format_private(record)

    def get_by_id(self, worker_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        return self._workers.get(worker_id)

    def update_profile(
        self,
        user_id: uuid.UUID,
        payload: WorkerProfileUpdatePayload
    ) -> WorkerPrivateProfileResponse:
        """Updates profile details for owner."""
        worker_id = self._user_to_worker.get(user_id)
        if not worker_id:
            raise ValueError("Worker profile not found.")

        record = self._workers[worker_id]
        if payload.primary_area is not None:
            record["primary_area"] = payload.primary_area
        if payload.experience_years is not None:
            record["experience_years"] = payload.experience_years
        if payload.hourly_rate is not None:
            record["hourly_rate"] = payload.hourly_rate
        if payload.visiting_charge is not None:
            record["visiting_charge"] = payload.visiting_charge
        if payload.min_charge is not None:
            record["min_charge"] = payload.min_charge
        if payload.bio is not None:
            record["bio"] = payload.bio

        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_private(record)

    def add_skill(
        self,
        user_id: uuid.UUID,
        payload: WorkerSkillAddPayload
    ) -> WorkerPrivateProfileResponse:
        """Adds or updates an endorsed skill."""
        worker_id = self._user_to_worker.get(user_id)
        if not worker_id:
            raise ValueError("Worker profile not found.")

        skill_info = taxonomy_service.get_skill_by_id(payload.skill_id)
        if not skill_info:
            raise ValueError("Invalid skill ID.")

        record = self._workers[worker_id]
        record["skills"][payload.skill_id] = {
            "experience_years": payload.experience_years,
            "is_primary": payload.is_primary
        }
        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_private(record)

    def remove_skill(
        self,
        user_id: uuid.UUID,
        skill_id: uuid.UUID
    ) -> WorkerPrivateProfileResponse:
        """Removes a skill from worker profile."""
        worker_id = self._user_to_worker.get(user_id)
        if not worker_id:
            raise ValueError("Worker profile not found.")

        record = self._workers[worker_id]
        if skill_id in record["skills"]:
            del record["skills"][skill_id]
        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_private(record)

    def update_availability(
        self,
        user_id: uuid.UUID,
        slots: List[AvailabilitySlot]
    ) -> WorkerPrivateProfileResponse:
        """Replaces weekly availability schedule."""
        worker_id = self._user_to_worker.get(user_id)
        if not worker_id:
            raise ValueError("Worker profile not found.")

        record = self._workers[worker_id]
        record["availabilities"] = [s.model_dump() for s in slots]
        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_private(record)

    def set_duty_status(
        self,
        user_id: uuid.UUID,
        status: DutyStatus
    ) -> WorkerPrivateProfileResponse:
        """Toggles worker duty status (online, busy, offline)."""
        worker_id = self._user_to_worker.get(user_id)
        if not worker_id:
            raise ValueError("Worker profile not found.")

        record = self._workers[worker_id]
        record["duty_status"] = status
        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_private(record)

    def search_public_workers(
        self,
        area: Optional[str] = None,
        skill_slug: Optional[str] = None,
        duty_status: Optional[DutyStatus] = None,
        max_hourly_rate: Optional[Decimal] = None
    ) -> List[WorkerPublicResponse]:
        """Public discovery search with privacy filtering.
        
        Strict Privacy: Excludes raw phone numbers and exact GPS coordinates.
        """
        results = []
        for record in self._workers.values():
            # Filters
            if area and record["primary_area"].lower() != area.lower():
                continue
            if duty_status and record["duty_status"] != duty_status:
                continue
            if max_hourly_rate and record["hourly_rate"] > max_hourly_rate:
                continue
            if skill_slug:
                # Check if worker has skill with matching slug
                has_skill = False
                for s_id in record["skills"]:
                    s_info = taxonomy_service.get_skill_by_id(s_id)
                    if s_info and s_info["slug"].lower() == skill_slug.lower():
                        has_skill = True
                        break
                if not has_skill:
                    continue

            results.append(self._format_public(record))

        return results

    def get_public_profile(self, worker_id: uuid.UUID) -> Optional[WorkerPublicResponse]:
        """Retrieves privacy-sanitized public worker profile by ID."""
        record = self._workers.get(worker_id)
        if not record:
            return None
        return self._format_public(record)

    def _format_skills(self, skills_dict: Dict[uuid.UUID, Dict[str, Any]]) -> List[WorkerSkillItem]:
        items = []
        for s_id, s_meta in skills_dict.items():
            s_info = taxonomy_service.get_skill_by_id(s_id)
            if s_info:
                name = s_info["translations"].get("en", {}).get("name", s_info["slug"])
                items.append(WorkerSkillItem(
                    skill_id=s_id,
                    skill_slug=s_info["slug"],
                    skill_name=name,
                    experience_years=s_meta.get("experience_years", 0),
                    is_primary=s_meta.get("is_primary", False)
                ))
        return items

    def _format_public(self, r: Dict[str, Any]) -> WorkerPublicResponse:
        # Privacy Relay Token replaces direct phone numbers for public directory calls
        relay_token = f"relay-ks-{r['id'].hex[:8]}"
        return WorkerPublicResponse(
            id=r["id"],
            city=r["city"],
            primary_area=r["primary_area"],
            experience_years=r["experience_years"],
            hourly_rate=r["hourly_rate"],
            visiting_charge=r["visiting_charge"],
            min_charge=r["min_charge"],
            currency=r["currency"],
            bio=r["bio"],
            duty_status=r["duty_status"],
            verification_status=r["verification_status"],
            rating_avg=r["rating_avg"],
            jobs_completed_count=r["jobs_completed_count"],
            skills=self._format_skills(r["skills"]),
            contact_relay_token=relay_token
        )

    def _format_private(self, r: Dict[str, Any]) -> WorkerPrivateProfileResponse:
        pub = self._format_public(r)
        phone = r.get("phone", "")
        masked_phone = phone[:3] + "******" + phone[-4:] if len(phone) >= 10 else "***"
        slots = [AvailabilitySlot(**s) for s in r.get("availabilities", [])]

        return WorkerPrivateProfileResponse(
            **pub.model_dump(),
            user_id=r["user_id"],
            phone_masked=masked_phone,
            availabilities=slots
        )

    def clear(self):
        """Reset state for tests."""
        self._workers.clear()
        self._user_to_worker.clear()


# Global singleton instance
worker_service = WorkerService()
