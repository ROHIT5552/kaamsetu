"""Model Metadata, Relationship, and Schema Validation Tests"""

import pytest
from sqlalchemy import Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.models import Base
from app.models.common import UserRoleType, BookingStatus, PaymentStatus, DutyStatus, VerificationStatus


def test_model_table_inventory():
    """Verify all 22 core tables are registered in Base.metadata."""
    expected_tables = {
        "users",
        "user_roles",
        "categories",
        "category_translations",
        "skills",
        "skill_translations",
        "worker_profiles",
        "worker_skills",
        "worker_availabilities",
        "worker_documents",
        "worker_locations",
        "employer_profiles",
        "employer_locations",
        "jobs",
        "job_skills",
        "job_applications",
        "bookings",
        "booking_workers",
        "wage_agreements",
        "attendance",
        "payment_records",
        "payment_adjustments",
        "worker_payout_ledger",
        "reviews",
        "disputes",
        "notifications",
        "audit_logs"
    }

    registered_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(registered_tables), (
        f"Missing tables: {expected_tables - registered_tables}"
    )


def test_uuid_primary_keys():
    """Verify all tables have UUID primary keys (Governance Rule 9)."""
    for table_name, table in Base.metadata.tables.items():
        pk_cols = [c for c in table.columns if c.primary_key]
        assert len(pk_cols) == 1, f"Table {table_name} does not have exactly 1 PK"
        pk_col = pk_cols[0]
        assert isinstance(pk_col.type, UUID), (
            f"Table {table_name} PK column '{pk_col.name}' is not UUID, found {type(pk_col.type)}"
        )


def test_sensitive_identity_data_protection():
    """Verify worker_documents strictly avoids storing raw Aadhaar/voter/police numbers (Rule 8)."""
    doc_table = Base.metadata.tables["worker_documents"]
    column_names = {c.name.lower() for c in doc_table.columns}

    # Prohibited columns
    prohibited = {"aadhaar", "aadhaar_number", "id_number", "document_number", "pan_number"}
    for p in prohibited:
        assert p not in column_names, f"Security violation: Prohibited column '{p}' found in worker_documents"

    # Required columns
    assert "document_type" in column_names
    assert "secure_file_ref" in column_names
    assert "verification_status" in column_names
    assert "verified_by" in column_names
    assert "verified_at" in column_names


def test_financial_field_precision():
    """Verify financial money fields use NUMERIC type with 2 decimal places (Rule 9)."""
    wage_table = Base.metadata.tables["wage_agreements"]
    financial_fields = [
        "agreed_wage", "advance_amount", "amount_due", "amount_paid",
        "refund_amount", "disputed_amount", "outstanding_balance",
        "platform_commission", "tip_amount"
    ]
    for field in financial_fields:
        col = wage_table.columns[field]
        assert isinstance(col.type, Numeric), f"Field '{field}' in wage_agreements is not Numeric"
        assert col.type.scale == 2, f"Field '{field}' scale is not 2"

    payout_table = Base.metadata.tables["worker_payout_ledger"]
    for field in ["gross_amount", "platform_commission", "tip_amount", "net_payout"]:
        col = payout_table.columns[field]
        assert isinstance(col.type, Numeric), f"Field '{field}' in worker_payout_ledger is not Numeric"
        assert col.type.scale == 2


def test_utc_timezone_timestamps():
    """Verify audit timestamp columns use DateTime with timezone=True."""
    for table_name, table in Base.metadata.tables.items():
        if "created_at" in table.columns:
            col = table.columns["created_at"]
            assert isinstance(col.type, DateTime), f"Table {table_name}.created_at not DateTime"
            assert col.type.timezone is True, f"Table {table_name}.created_at timezone is not True"
        if "updated_at" in table.columns:
            col = table.columns["updated_at"]
            assert isinstance(col.type, DateTime), f"Table {table_name}.updated_at not DateTime"
            assert col.type.timezone is True, f"Table {table_name}.updated_at timezone is not True"
