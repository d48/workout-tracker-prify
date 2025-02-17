/*
  # Update exercise icons

  Updates the icons for existing exercise templates to better match their types and movements.
*/

UPDATE exercise_templates
SET icon_name = 
  CASE 
    -- Squats (compound movement)
    WHEN name = 'Squats' THEN 'Layers'
    
    -- Bench Press variations (compound pushing movements)
    WHEN name LIKE '%Bench Press%' OR name LIKE '%Pec Machine%' THEN 'Hand'
    
    -- Dumbbell exercises
    WHEN name LIKE '%Dumbbell%' THEN 'Power'
    
    -- TRX/Bodyweight exercises
    WHEN name LIKE '%TRX%' OR name = 'Pullups' THEN 'Sparkles'
    
    -- Ab/Core exercises
    WHEN name LIKE '%Ab%' OR name LIKE '%Core%' THEN 'Balance'
    
    -- Cardio exercises
    WHEN name IN ('Running', 'Cycling', 'Swimming', 'Walking') THEN 'Heart'
    
    -- Explosive/High-intensity exercises
    WHEN name LIKE '%Jump%' OR name LIKE '%Plyo%' THEN 'Rocket'
    
    -- Default to Power for other strength exercises
    ELSE 'Power'
  END
WHERE name IN (
  'Squats',
  'Bench Press',
  'Incline Dumbbell Press',
  'Pullups',
  'Seated Calf Raises',
  'Incline Dumbbell Curls',
  'Incline Tricep Extension',
  'TRX Inverted Rows',
  'Hanging Ab Raises',
  'Cable Crunches',
  'Decline Ab Raises',
  'Pec Machine Seated Cable',
  'Pec Machine Seated Machine',
  'Pec Machine Standing',
  'Running',
  'Cycling',
  'Swimming',
  'Walking'
);