/*
  # Update exercise template defaults

  1. Changes
    - Set default_reps to 10 for all strength and bodyweight exercises
    - Set default_distance to 1.0 for running exercise
*/

-- Update default reps to 10 for strength and bodyweight exercises
UPDATE exercise_templates
SET default_reps = 10
WHERE category_id IN (
  SELECT id FROM exercise_categories 
  WHERE name IN ('Strength', 'Bodyweight', 'Chest', 'Legs', 'Arms', 'Abs', 'Core')
)
AND default_reps IS NOT NULL;

-- Update running distance to 1 mile
UPDATE exercise_templates
SET default_distance = 1.0
WHERE name = 'Running';