-- Add a deleted_category_name column to exercise_templates
ALTER TABLE exercise_templates
ADD COLUMN deleted_category_name TEXT;