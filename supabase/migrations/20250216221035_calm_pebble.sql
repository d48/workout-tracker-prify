-- Add icon_name column to exercise_templates
ALTER TABLE exercise_templates
ADD COLUMN icon_name text;

-- Update existing exercises with default icons
UPDATE exercise_templates
SET icon_name = CASE
  WHEN name ILIKE '%run%' OR name ILIKE '%cardio%' THEN 'Heart'
  WHEN name ILIKE '%weight%' OR name ILIKE '%strength%' THEN 'Power'
  WHEN name ILIKE '%gym%' THEN 'Gym'
  ELSE 'Gym'
END;