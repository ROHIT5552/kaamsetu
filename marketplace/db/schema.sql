BEGIN;
CREATE TABLE IF NOT EXISTS accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, name text NOT NULL,
 password text NOT NULL, role text NOT NULL CHECK(role IN ('worker','employer')),
 demo boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS sessions (
 token text PRIMARY KEY, account uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
 expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS limits (
 scope text NOT NULL, bucket bigint NOT NULL, hits int NOT NULL DEFAULT 1, PRIMARY KEY(scope,bucket)
);
CREATE TABLE IF NOT EXISTS profiles (
 account uuid PRIMARY KEY REFERENCES accounts, category text NOT NULL, area text NOT NULL,
 rate bigint NOT NULL CHECK(rate >= 5000), bio text NOT NULL, available boolean NOT NULL,
 lat float8, lng float8
);
CREATE TABLE IF NOT EXISTS credentials (
 account uuid NOT NULL REFERENCES accounts, kind text NOT NULL,
 method text NOT NULL, reference text NOT NULL, verified_at timestamptz,
 PRIMARY KEY(account,kind)
);
CREATE TABLE IF NOT EXISTS jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employer uuid NOT NULL REFERENCES accounts,
 title text NOT NULL, category text NOT NULL, area text NOT NULL, description text NOT NULL,
 amount bigint NOT NULL CHECK(amount >= 5000), starts timestamptz NOT NULL, hours int NOT NULL CHECK(hours > 0),
 lat float8, lng float8, created timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job uuid NOT NULL REFERENCES jobs, worker uuid NOT NULL REFERENCES accounts,
 amount bigint NOT NULL CHECK(amount >= 5000), author uuid NOT NULL REFERENCES accounts,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','declined')),
 note text NOT NULL, version int NOT NULL DEFAULT 1, UNIQUE(job,worker)
);
CREATE TABLE IF NOT EXISTS offer_history (
 application uuid REFERENCES applications, version int NOT NULL, author uuid NOT NULL REFERENCES accounts,
 amount bigint NOT NULL, note text NOT NULL, created timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(application,version)
);
CREATE TABLE IF NOT EXISTS messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, application uuid NOT NULL REFERENCES applications,
 author uuid NOT NULL REFERENCES accounts, body text NOT NULL, created timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bookings (
 application uuid PRIMARY KEY REFERENCES applications, job uuid NOT NULL UNIQUE REFERENCES jobs,
 amount bigint NOT NULL, state text NOT NULL DEFAULT 'confirmed'
 CHECK(state IN ('confirmed','en_route','arrived','in_progress','completed','cancelled','disputed')),
 lat float8, lng float8, located_at timestamptz
);
CREATE TABLE IF NOT EXISTS booking_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, application uuid NOT NULL REFERENCES bookings,
 author uuid NOT NULL REFERENCES accounts, state text NOT NULL, created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_created_idx ON jobs(created DESC);
CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages(application,id DESC);
COMMIT;