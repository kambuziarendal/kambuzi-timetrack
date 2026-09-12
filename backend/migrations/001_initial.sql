CREATE TABLE app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1), company_name text NOT NULL,
  org_number text, timezone text NOT NULL DEFAULT 'Europe/Oslo',
  payroll_start_day smallint NOT NULL DEFAULT 1 CHECK (payroll_start_day BETWEEN 1 AND 28),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE positions (
  id uuid PRIMARY KEY, name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#2563eb' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK (email = lower(email)), password_hash text NOT NULL,
  first_name text NOT NULL, last_name text NOT NULL, role text NOT NULL CHECK (role IN ('ADMIN','EMPLOYEE')),
  position_id uuid REFERENCES positions(id) ON DELETE SET NULL, is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, csrf_hash text NOT NULL, expires_at timestamptz NOT NULL,
  revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id, expires_at);
CREATE TABLE time_entries (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  work_date date NOT NULL, start_minutes smallint NOT NULL CHECK (start_minutes BETWEEN 0 AND 1439),
  end_minutes smallint NOT NULL CHECK (end_minutes BETWEEN 0 AND 1439), crosses_midnight boolean NOT NULL DEFAULT false,
  break_minutes smallint NOT NULL DEFAULT 0 CHECK (break_minutes BETWEEN 0 AND 720),
  total_minutes smallint NOT NULL CHECK (total_minutes BETWEEN 1 AND 1440), note varchar(200),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','LOCKED','REJECTED')),
  rejection_note varchar(500), processed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1
);
CREATE INDEX time_entries_date_idx ON time_entries(work_date, user_id);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY, actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL, subject_type text NOT NULL, subject_id text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_created_idx ON audit_events(created_at DESC);
