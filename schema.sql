-- ============================================================
-- SESSION — D1-schema (SQLite)
-- Kör med: wrangler d1 execute session-db --remote --file=./schema.sql
-- ============================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 5,
  ratings_pos INTEGER NOT NULL DEFAULT 0,
  ratings_neg INTEGER NOT NULL DEFAULT 0,
  preferred_genres TEXT NOT NULL DEFAULT '[]',
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  country TEXT,
  show_on_map INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  embed_type TEXT NOT NULL CHECK (embed_type IN ('spotify','youtube')),
  embed_id TEXT NOT NULL,
  genre TEXT NOT NULL,
  slots_target INTEGER NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  listener_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  rated INTEGER,               -- NULL = obedömd, 0 = inte hjälpsam, 1 = hjälpsam
  rating_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (track_id, listener_id)
);

CREATE INDEX idx_tracks_genre  ON tracks(genre);
CREATE INDEX idx_tracks_owner  ON tracks(owner_id);
CREATE INDEX idx_feedback_track    ON feedback(track_id);
CREATE INDEX idx_feedback_listener ON feedback(listener_id);

-- ============================================================
-- Sista steget görs manuellt efter första inloggningen:
--   UPDATE users SET is_admin = 1 WHERE email = 'din@mejl.se';
-- ============================================================
