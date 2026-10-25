CREATE TABLE IF NOT EXISTS sketchfab_oauth_states (state_hash TEXT PRIMARY KEY, nonce_hash TEXT NOT NULL, session_hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sketchfab_connection (id INTEGER PRIMARY KEY CHECK(id=1), encrypted_token TEXT NOT NULL, expires_at INTEGER NOT NULL, connected_at INTEGER NOT NULL);
