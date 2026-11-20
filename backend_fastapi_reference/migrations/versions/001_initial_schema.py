"""Initial PostgreSQL + PostGIS Schema Migration for KaamSetu Pilot

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-18 13:20:00.000000 UTC

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. PostGIS Extension (if on PostgreSQL)
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('phone', sa.String(15), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=True),
        sa.Column('full_name', sa.String(120), nullable=True),
        sa.Column('preferred_language', sa.String(5), server_default='mr', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_users_phone', 'users', ['phone'])
    op.create_index('ix_users_email', 'users', ['email'])

    # 2. User Roles
    op.create_table(
        'user_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.Enum('worker', 'employer', 'admin', 'support', name='user_role_type_enum'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'role', name='uq_user_roles_user_id_role')
    )
    op.create_index('ix_user_roles_user_id', 'user_roles', ['user_id'])

    # 3. Categories
    op.create_table(
        'categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('slug', sa.String(50), unique=True, nullable=False),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_categories_slug', 'categories', ['slug'])

    # 4. Category Translations
    op.create_table(
        'category_translations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('language', sa.String(5), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('category_id', 'language', name='uq_category_translations_cat_lang')
    )
    op.create_index('ix_category_translations_cat_id', 'category_translations', ['category_id'])

    # 5. Skills
    op.create_table(
        'skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('slug', sa.String(50), unique=True, nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_skills_slug', 'skills', ['slug'])
    op.create_index('ix_skills_category_id', 'skills', ['category_id'])

    # 6. Skill Translations
    op.create_table(
        'skill_translations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('skill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('language', sa.String(5), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('skill_id', 'language', name='uq_skill_translations_skill_lang')
    )
    op.create_index('ix_skill_translations_skill_id', 'skill_translations', ['skill_id'])

    # 7. Worker Profiles
    op.create_table(
        'worker_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('city', sa.String(80), server_default='Chhatrapati Sambhajinagar', nullable=False),
        sa.Column('primary_area', sa.String(80), nullable=False),
        sa.Column('experience_years', sa.Integer(), server_default='0', nullable=False),
        sa.Column('hourly_rate', sa.Numeric(10, 2), nullable=False),
        sa.Column('visiting_charge', sa.Numeric(10, 2), server_default='150.00', nullable=False),
        sa.Column('min_charge', sa.Numeric(10, 2), server_default='200.00', nullable=False),
        sa.Column('currency', sa.String(3), server_default='INR', nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('profile_photo_ref', sa.String(255), nullable=True),
        sa.Column('duty_status', sa.Enum('online', 'busy', 'offline', name='duty_status_enum'), server_default='offline', nullable=False),
        sa.Column('verification_status', sa.Enum('unverified', 'pending', 'verified', 'rejected', name='verification_status_enum'), server_default='unverified', nullable=False),
        sa.Column('rating_avg', sa.Numeric(3, 2), server_default='0.00', nullable=False),
        sa.Column('jobs_completed_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_worker_discovery', 'worker_profiles', ['city', 'primary_area', 'duty_status', 'verification_status'])

    # 8. Worker Skills
    op.create_table(
        'worker_skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_primary', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('experience_years', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('worker_id', 'skill_id', name='uq_worker_skills_worker_skill')
    )
    op.create_index('ix_worker_skills_worker_id', 'worker_skills', ['worker_id'])
    op.create_index('ix_worker_skills_skill_id', 'worker_skills', ['skill_id'])

    # 9. Worker Availability
    op.create_table(
        'worker_availabilities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_available', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_worker_availabilities_worker_id', 'worker_availabilities', ['worker_id'])

    # 10. Worker Documents (Opaque file references only - Strict Rule 8)
    op.create_table(
        'worker_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_type', sa.String(50), nullable=False),
        sa.Column('secure_file_ref', sa.String(255), nullable=False),
        sa.Column('verification_status', sa.Enum('unverified', 'pending', 'verified', 'rejected', name='verification_status_enum', create_type=False), server_default='pending', nullable=False),
        sa.Column('verified_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_worker_documents_worker_id', 'worker_documents', ['worker_id'])

    # 11. Worker Locations (Explicit Lat/Lng + PostGIS Geometry - Strict Rule 3 & 4)
    op.create_table(
        'worker_locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('latitude', sa.Numeric(9, 6), nullable=False),
        sa.Column('longitude', sa.Numeric(9, 6), nullable=False),
        sa.Column('geom', geoalchemy2.Geometry(geometry_type='POINT', srid=4326, spatial_index=True), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consent_given', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_worker_locations_worker_id', 'worker_locations', ['worker_id'])
    op.create_index('ix_worker_locations_recorded_at', 'worker_locations', ['recorded_at'])

    # 12. Employer Profiles
    op.create_table(
        'employer_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('city', sa.String(80), server_default='Chhatrapati Sambhajinagar', nullable=False),
        sa.Column('default_area', sa.String(80), nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 13. Employer Locations
    op.create_table(
        'employer_locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('employer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('label', sa.String(50), server_default='Home', nullable=False),
        sa.Column('area', sa.String(80), nullable=False),
        sa.Column('address_line', sa.Text(), nullable=False),
        sa.Column('landmark', sa.String(100), nullable=True),
        sa.Column('pincode', sa.String(10), nullable=True),
        sa.Column('latitude', sa.Numeric(9, 6), nullable=True),
        sa.Column('longitude', sa.Numeric(9, 6), nullable=True),
        sa.Column('geom', geoalchemy2.Geometry(geometry_type='POINT', srid=4326, spatial_index=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_employer_locations_employer_id', 'employer_locations', ['employer_id'])

    # 14. Jobs
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('employer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('city', sa.String(80), server_default='Chhatrapati Sambhajinagar', nullable=False),
        sa.Column('area', sa.String(80), nullable=False),
        sa.Column('address_line', sa.Text(), nullable=True),
        sa.Column('latitude', sa.Numeric(9, 6), nullable=True),
        sa.Column('longitude', sa.Numeric(9, 6), nullable=True),
        sa.Column('geom', geoalchemy2.Geometry(geometry_type='POINT', srid=4326, spatial_index=True), nullable=True),
        sa.Column('budget_min', sa.Numeric(12, 2), nullable=True),
        sa.Column('budget_max', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), server_default='INR', nullable=False),
        sa.Column('status', sa.Enum('draft', 'open', 'in_progress', 'completed', 'cancelled', name='job_status_enum'), server_default='open', nullable=False),
        sa.Column('urgency', sa.String(20), server_default='standard', nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_jobs_employer_id', 'jobs', ['employer_id'])
    op.create_index('ix_jobs_area_status', 'jobs', ['area', 'status'])

    # 15. Job Skills
    op.create_table(
        'job_skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('job_id', 'skill_id', name='uq_job_skills_job_skill')
    )

    # 16. Job Applications
    op.create_table(
        'job_applications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('proposed_wage', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), server_default='INR', nullable=False),
        sa.Column('cover_note', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn', name='application_status_enum'), server_default='submitted', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('job_id', 'worker_id', name='uq_job_applications_job_worker')
    )

    # 17. Bookings
    op.create_table(
        'bookings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('booking_code', sa.String(32), unique=True, nullable=False),
        sa.Column('idempotency_key', sa.String(64), unique=True, nullable=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('employer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employer_profiles.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('primary_worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('status', sa.Enum('requested', 'confirmed', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', name='booking_status_enum'), server_default='requested', nullable=False),
        sa.Column('service_address', sa.Text(), nullable=False),
        sa.Column('area', sa.String(80), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('en_route_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('arrived_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_bookings_code', 'bookings', ['booking_code'])
    op.create_index('ix_bookings_idempotency', 'bookings', ['idempotency_key'])
    op.create_index('ix_bookings_employer_id', 'bookings', ['employer_id'])
    op.create_index('ix_bookings_worker_id', 'bookings', ['primary_worker_id'])

    # 18. Booking Workers
    op.create_table(
        'booking_workers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('role', sa.String(50), server_default='primary', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('booking_id', 'worker_id', name='uq_booking_workers_booking_worker')
    )

    # 19. Wage Agreement (Strict Financial Balances)
    op.create_table(
        'wage_agreements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('agreed_wage', sa.Numeric(12, 2), nullable=False),
        sa.Column('advance_amount', sa.Numeric(12, 2), server_default='0.00', nullable=False),
        sa.Column('amount_due', sa.Numeric(12, 2), nullable=False),
        sa.Column('amount_paid', sa.Numeric(12, 2), server_default='0.00', nullable=False),
        sa.Column('refund_amount', sa.Numeric(12, 2), server_default='0.00', nullable=False),
        sa.Column('disputed_amount', sa.Numeric(12, 2), server_default='0.00', nullable=False),
        sa.Column('outstanding_balance', sa.Numeric(12, 2), nullable=False),
        sa.Column('platform_commission', sa.Numeric(12, 2), server_default='0.00', nullable=False),
        sa.Column('tip_amount', sa.Numeric(12, 2), server_default='0.00', nullable=False),
        sa.Column('currency', sa.String(3), server_default='INR', nullable=False),
        sa.Column('is_settled', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 20. Attendance
    op.create_table(
        'attendance',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('check_in_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('check_out_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('present', 'absent', 'half_day', name='attendance_status_enum'), server_default='present', nullable=False),
        sa.Column('verification_method', sa.String(50), server_default='otp', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 21. Payment Records (Immutable)
    op.create_table(
        'payment_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('idempotency_key', sa.String(64), unique=True, nullable=False),
        sa.Column('transaction_reference', sa.String(100), unique=True, nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), server_default='INR', nullable=False),
        sa.Column('payment_method', sa.Enum('upi', 'bank_transfer', 'cash', 'gateway', name='payment_method_enum'), server_default='upi', nullable=False),
        sa.Column('payment_status', sa.Enum('pending', 'processing', 'paid', 'failed', 'refunded', name='payment_status_enum'), server_default='pending', nullable=False),
        sa.Column('provider_response_code', sa.String(50), nullable=True),
        sa.Column('verified_by_webhook', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('raw_metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_payment_records_booking_id', 'payment_records', ['booking_id'])
    op.create_index('ix_payment_records_tx_ref', 'payment_records', ['transaction_reference'])

    # 22. Payment Adjustments (Immutable)
    op.create_table(
        'payment_adjustments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('payment_record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payment_records.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('adjustment_type', sa.String(50), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), server_default='INR', nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('authorized_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 23. Worker Payout Ledger
    op.create_table(
        'worker_payout_ledger',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('gross_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('platform_commission', sa.Numeric(12, 2), nullable=False),
        sa.Column('tip_amount', sa.Numeric(12, 2), server_default='0.00', nullable=False),
        sa.Column('net_payout', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), server_default='INR', nullable=False),
        sa.Column('payout_ref', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), server_default='pending', nullable=False),
        sa.Column('disbursed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_payout_ledger_worker_status', 'worker_payout_ledger', ['worker_id', 'status'])

    # 24. Reviews
    op.create_table(
        'reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worker_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('employer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('punctuality_rating', sa.Integer(), nullable=True),
        sa.Column('work_quality_rating', sa.Integer(), nullable=True),
        sa.Column('behavior_rating', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_reviews_rating_range')
    )
    op.create_index('ix_reviews_worker_id', 'reviews', ['worker_id'])

    # 25. Disputes
    op.create_table(
        'disputes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('initiator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('reason', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('open', 'under_review', 'resolved', 'closed', name='dispute_status_enum'), server_default='open', nullable=False),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 26. Notifications
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_notifications_user_unread', 'notifications', ['user_id', 'is_read'])

    # 27. Audit Logs (Immutable)
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('target_type', sa.String(50), nullable=False),
        sa.Column('target_id', sa.String(64), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(255), nullable=True),
        sa.Column('changes_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_target', 'audit_logs', ['target_type', 'target_id'])


def downgrade() -> None:
    # Drop tables in reverse foreign key dependency order
    op.drop_table('audit_logs')
    op.drop_table('notifications')
    op.drop_table('disputes')
    op.drop_table('reviews')
    op.drop_table('worker_payout_ledger')
    op.drop_table('payment_adjustments')
    op.drop_table('payment_records')
    op.drop_table('attendance')
    op.drop_table('wage_agreements')
    op.drop_table('booking_workers')
    op.drop_table('bookings')
    op.drop_table('job_applications')
    op.drop_table('job_skills')
    op.drop_table('jobs')
    op.drop_table('employer_locations')
    op.drop_table('employer_profiles')
    op.drop_table('worker_locations')
    op.drop_table('worker_documents')
    op.drop_table('worker_availabilities')
    op.drop_table('worker_skills')
    op.drop_table('worker_profiles')
    op.drop_table('skill_translations')
    op.drop_table('skills')
    op.drop_table('category_translations')
    op.drop_table('categories')
    op.drop_table('user_roles')
    op.drop_table('users')

    # Drop custom enums
    op.execute("DROP TYPE IF EXISTS dispute_status_enum;")
    op.execute("DROP TYPE IF EXISTS payment_method_enum;")
    op.execute("DROP TYPE IF EXISTS payment_status_enum;")
    op.execute("DROP TYPE IF EXISTS attendance_status_enum;")
    op.execute("DROP TYPE IF EXISTS booking_status_enum;")
    op.execute("DROP TYPE IF EXISTS application_status_enum;")
    op.execute("DROP TYPE IF EXISTS job_status_enum;")
    op.execute("DROP TYPE IF EXISTS verification_status_enum;")
    op.execute("DROP TYPE IF EXISTS duty_status_enum;")
    op.execute("DROP TYPE IF EXISTS user_role_type_enum;")
