/*
  # Add distance tracking for cardio exercises

  1. Schema Changes
    - Add `default_distance` column to exercise_templates table
    - Make `default_reps` column nullable
    - Add cardio exercise templates with default distances

  2. Data Updates
    - Update existing cardio exercises with default distances
    - Ensure default_reps is properly handled for cardio exercises
*/

-- First make default_reps nullable since cardio exercises don't use reps
ALTER TABLE exercise_templates 
  ALTER COLUMN default_reps DROP NOT NULL;

-- Add default_distance column
ALTER TABLE exercise_templates
  ADD COLUMN default_distance numeric DEFAULT 0;

-- Update cardio exercises with default distances
DO $$ 
DECLARE
  cardio_id uuid;
BEGIN
  SELECT id INTO cardio_id FROM exercise_categories WHERE name = 'Cardio';

  -- Insert cardio exercises with default distances and null reps
  INSERT INTO exercise_templates (name, category_id, default_sets, default_reps, default_distance, is_custom) VALUES
    ('Running', cardio_id, 1, NULL, 3.0, false),
    ('Cycling', cardio_id, 1, NULL, 10.0, false),
    ('Swimming', cardio_id, 1, NULL, 1.0, false),
    ('Walking', cardio_id, 1, NULL, 2.0, false);
END $$;