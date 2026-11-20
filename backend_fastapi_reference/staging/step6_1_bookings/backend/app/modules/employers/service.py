"""Employer Business Domain Service

Manages household and commercial employer profiles, service locations, and verification status.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.modules.employers.schemas import (
    EmployerProfileCreatePayload,
    EmployerProfileUpdatePayload,
    EmployerLocationCreatePayload,
    EmployerProfileResponse,
    EmployerLocationResponse,
    EmployerType
)


class EmployerService:
    """Manages employer domain records in staging store."""

    def __init__(self):
        # employer_id -> dict
        self._employers: Dict[uuid.UUID, Dict[str, Any]] = {}
        # user_id -> employer_id
        self._user_to_employer: Dict[uuid.UUID, uuid.UUID] = {}
        # location_id -> dict
        self._locations: Dict[uuid.UUID, Dict[str, Any]] = {}

    def create_profile(
        self,
        user_id: uuid.UUID,
        payload: EmployerProfileCreatePayload
    ) -> EmployerProfileResponse:
        """Initializes a new employer profile."""
        if user_id in self._user_to_employer:
            raise ValueError("Employer profile already exists for this account.")

        employer_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        record = {
            "id": employer_id,
            "user_id": user_id,
            "employer_type": payload.employer_type,
            "company_name": payload.company_name,
            "city": "Chhatrapati Sambhajinagar",
            "default_area": payload.default_area,
            "is_verified": False,
            "location_ids": [],
            "created_at": now,
            "updated_at": now
        }

        self._employers[employer_id] = record
        self._user_to_employer[user_id] = employer_id
        return self._format_response(record)

    def get_by_user_id(self, user_id: uuid.UUID) -> Optional[EmployerProfileResponse]:
        employer_id = self._user_to_employer.get(user_id)
        if not employer_id:
            return None
        record = self._employers.get(employer_id)
        if not record:
            return None
        return self._format_response(record)

    def get_by_id(self, employer_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        return self._employers.get(employer_id)

    def update_profile(
        self,
        user_id: uuid.UUID,
        payload: EmployerProfileUpdatePayload
    ) -> EmployerProfileResponse:
        employer_id = self._user_to_employer.get(user_id)
        if not employer_id:
            raise ValueError("Employer profile not found.")

        record = self._employers[employer_id]
        if payload.company_name is not None:
            record["company_name"] = payload.company_name
        if payload.default_area is not None:
            record["default_area"] = payload.default_area

        record["updated_at"] = datetime.now(timezone.utc)
        return self._format_response(record)

    def add_location(
        self,
        user_id: uuid.UUID,
        payload: EmployerLocationCreatePayload
    ) -> EmployerLocationResponse:
        employer_id = self._user_to_employer.get(user_id)
        if not employer_id:
            raise ValueError("Employer profile not found. Please create profile first.")

        loc_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        loc_record = {
            "id": loc_id,
            "employer_id": employer_id,
            "label": payload.label,
            "area": payload.area,
            "address_line": payload.address_line,
            "landmark": payload.landmark,
            "pincode": payload.pincode,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "created_at": now
        }

        self._locations[loc_id] = loc_record
        self._employers[employer_id]["location_ids"].append(loc_id)

        return EmployerLocationResponse(**loc_record)

    def list_locations(self, user_id: uuid.UUID) -> List[EmployerLocationResponse]:
        employer_id = self._user_to_employer.get(user_id)
        if not employer_id:
            return []
        record = self._employers.get(employer_id)
        if not record:
            return []

        return [
            EmployerLocationResponse(**self._locations[loc_id])
            for loc_id in record["location_ids"]
            if loc_id in self._locations
        ]

    def delete_location(self, user_id: uuid.UUID, location_id: uuid.UUID) -> bool:
        employer_id = self._user_to_employer.get(user_id)
        if not employer_id:
            raise ValueError("Employer profile not found.")

        loc = self._locations.get(location_id)
        if not loc:
            raise ValueError("Location not found.")

        if loc["employer_id"] != employer_id:
            raise PermissionError("Cannot delete location owned by another employer.")

        del self._locations[location_id]
        if location_id in self._employers[employer_id]["location_ids"]:
            self._employers[employer_id]["location_ids"].remove(location_id)
        return True

    def _format_response(self, r: Dict[str, Any]) -> EmployerProfileResponse:
        locs = [
            EmployerLocationResponse(**self._locations[loc_id])
            for loc_id in r["location_ids"]
            if loc_id in self._locations
        ]
        return EmployerProfileResponse(
            id=r["id"],
            user_id=r["user_id"],
            employer_type=r["employer_type"],
            company_name=r["company_name"],
            city=r["city"],
            default_area=r["default_area"],
            is_verified=r["is_verified"],
            locations=locs
        )

    def clear(self):
        self._employers.clear()
        self._user_to_employer.clear()
        self._locations.clear()


# Global singleton instance
employer_service = EmployerService()
