---- sql
-- filepath: supabase/migrations/2025_02_22_add_sample_url.sql
ALTER TABLE exercise_templates ADD COLUMN sample_url TEXT;
ALTER TABLE exercises ADD COLUMN sample_url TEXT;