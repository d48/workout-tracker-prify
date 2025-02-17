/*
  # Fix exercise templates default values

  1. Changes
    - Make default_sets nullable
    - Make default_reps nullable (already done)
    - Make default_distance nullable
    - Update existing records to use explicit defaults

  2. Security
    - No changes to RLS policies
*/

-- Make default_sets nullable
ALTER TABLE exercise_templates 
  ALTER COLUMN default_sets DROP NOT NULL,
  ALTER COLUMN default_distance DROP NOT NULL;

-- Update existing records to use explicit defaults
UPDATE exercise_templates
SET 
  default_sets = CASE 
    WHEN category_id = (SELECT id FROM exercise_categories WHERE name = 'Cardio') THEN 1
    ELSE 3
  END,
  default_reps = CASE 
    WHEN category_id = (SELECT id FROM exercise_categories WHERE name = 'Cardio') THEN NULL
    WHEN category_id = (SELECT id FROM exercise_categories WHERE name = 'Strength') THEN 8
    ELSE 12
  END,
  default_distance = CASE 
    WHEN name = 'Running' THEN 3.0
    WHEN name = 'Cycling' THEN 10.0
    WHEN name = 'Swimming' THEN 1.0
    WHEN name = 'Walking' THEN 2.0
    ELSE NULL
  END
WHERE is_custom = false;