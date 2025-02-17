-- Update existing exercises with new default icons
UPDATE exercise_templates
SET icon_name = CASE
  WHEN name ILIKE '%run%' OR name ILIKE '%cardio%' THEN 'Heart'
  WHEN name ILIKE '%weight%' OR name ILIKE '%strength%' THEN 'Power'
  WHEN name ILIKE '%explosive%' THEN 'Rocket'
  WHEN name ILIKE '%grip%' OR name ILIKE '%hold%' THEN 'Hand'
  WHEN name ILIKE '%achievement%' OR name ILIKE '%goal%' THEN 'Trophy'
  ELSE 'Power'
END;