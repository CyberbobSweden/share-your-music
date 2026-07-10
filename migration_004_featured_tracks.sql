-- ============================================================
-- Migration 004 — featured tracks (admin queue boost)
-- Run once:
--   wrangler d1 execute share-your-music-db --remote --file=./migration_004_featured_tracks.sql
-- ============================================================

ALTER TABLE tracks ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;
