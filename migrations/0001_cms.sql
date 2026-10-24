CREATE TABLE IF NOT EXISTS store_config (id INTEGER PRIMARY KEY CHECK (id = 1), catalog TEXT NOT NULL, settings TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS admin_session_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_limits (key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_start INTEGER NOT NULL);
