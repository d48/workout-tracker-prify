/*
  # Add default_distance to exercise templates

  1. Changes
    - Add default_distance column to exercise_templates table
    - This allows for exercises that track distance (e.g., running, cycling)

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE exercise_templates
  ADD COLUMN default_distance numeric DEFAULT 0;

-- Update cardio exercises with default distances
DO $$ 
DECLARE
  cardio_id uuid;
BEGIN
  SELECT id INTO cardio_id FROM exercise_categories WHERE name = 'Cardio';

  -- Insert some cardio exercises with default distances
  INSERT INTO exercise_templates (name, category_id, default_sets, default_reps, default_distance, is_custom) VALUES
    ('Running', cardio_id, 1, null, 3.0, false),
    ('Cycling', cardio_id, 1, null, 10.0, false),
    ('Swimming', cardio_id, 1, null, 1.0, false),
    ('Walking', cardio_id, 1, null, 2.0, false);
END $$;