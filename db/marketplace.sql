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
ALTER TABLE worker_ratings ADD COLUMN IF NOT EXISTS note text CHECK(char_length(note)<=350);
CREATE INDEX IF NOT EXISTS worker_ratings_worker_idx ON worker_ratings(worker);
CREATE TABLE IF NOT EXISTS saved_jobs (
 account uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
 item uuid NOT NULL REFERENCES jobs ON DELETE CASCADE,
 PRIMARY KEY(account,item)
);
CREATE TABLE IF NOT EXISTS saved_workers (
 account uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
 item uuid NOT NULL REFERENCES profiles(account) ON DELETE CASCADE,
 PRIMARY KEY(account,item)
);
CREATE TABLE IF NOT EXISTS thread_reads (
 account uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
 application uuid NOT NULL REFERENCES applications ON DELETE CASCADE,
 seen_message bigint NOT NULL,
 PRIMARY KEY(account,application)
);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_details text CHECK(char_length(work_details)<=1200);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS photo_key text GENERATED ALWAYS AS (md5(photo)) STORED;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_details text CHECK(char_length(work_details)<=1200);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_key text GENERATED ALWAYS AS (md5(photo)) STORED;
COMMIT;