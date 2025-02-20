-- filepath: supabase/migrations/20250220000002_alter_duration_nullable.sql
ALTER TABLE sets
  ALTER COLUMN duration DROP NOT NULL;