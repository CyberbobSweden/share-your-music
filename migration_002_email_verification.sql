-- ============================================================
-- Migration 002 — email verification
-- Run this ONCE against your existing database:
--   wrangler d1 execute share-your-music-db --remote --file=./migration_002_email_verification.sql
-- ============================================================

ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN verification_token TEXT;
