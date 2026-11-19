BEGIN;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;
CREATE INDEX IF NOT EXISTS jobs_owner_created_idx ON jobs(employer,created DESC);
CREATE INDEX IF NOT EXISTS applications_job_state_idx ON applications(job,state);
CREATE TABLE IF NOT EXISTS worker_ratings (
 application uuid PRIMARY KEY REFERENCES bookings(application),
 worker uuid NOT NULL REFERENCES accounts,
 score smallint NOT NULL CHECK(score BETWEEN 1 AND 5),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS worker_ratings_worker_idx ON worker_ratings(worker);
COMMIT;