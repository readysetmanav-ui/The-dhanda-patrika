CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER,
  trial_start INTEGER,
  trial_end INTEGER,
  free_access TEXT NOT NULL DEFAULT 'none',
  paid_until INTEGER
);
CREATE TABLE IF NOT EXISTS trial_claims (
  device_id TEXT PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  claimed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
