-- ============================================================
-- Migration 003 — suggestions box
-- Run once against your existing database:
--   wrangler d1 execute share-your-music-db --remote --file=./migration_003_suggestions.sql
-- ============================================================

CREATE TABLE suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | reviewed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_suggestions_status ON suggestions(status);
