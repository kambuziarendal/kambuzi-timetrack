ALTER TABLE users
  ADD COLUMN demo_expires_at timestamptz;

CREATE INDEX users_demo_expiry_idx
  ON users(demo_expires_at)
  WHERE demo_expires_at IS NOT NULL;

CREATE TABLE demo_login_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX demo_login_tokens_user_idx
  ON demo_login_tokens(user_id, created_at DESC);

CREATE INDEX demo_login_tokens_expiry_idx
  ON demo_login_tokens(expires_at)
  WHERE used_at IS NULL;
