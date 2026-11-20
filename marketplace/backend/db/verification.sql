BEGIN;
CREATE TABLE IF NOT EXISTS verification_reviewers (
  account uuid PRIMARY KEY REFERENCES accounts ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS verification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account uuid NOT NULL REFERENCES accounts,
  kind text NOT NULL,
  method text NOT NULL,
  CHECK ((kind='identity' AND method IN ('aadhaar','alternative')) OR
         (kind='electrical-license' AND method='trade')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK(status IN ('submitted','ready','approved','rejected','withdrawn')),
  provider_result text CHECK(provider_result IN ('passed','failed')),
  evidence_ref uuid UNIQUE,
  valid_until timestamptz,
  reason text CHECK(reason IN ('provider_failed','details_mismatch','expired','out_of_scope')),
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS verification_active
  ON verification_cases(account,kind) WHERE status IN ('submitted','ready','approved');
CREATE INDEX IF NOT EXISTS verification_queue ON verification_cases(status,created_at,id);
CREATE TABLE IF NOT EXISTS verification_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  verification uuid NOT NULL REFERENCES verification_cases,
  actor uuid REFERENCES accounts,
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;