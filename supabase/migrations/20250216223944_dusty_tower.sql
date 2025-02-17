/*
  # Update exercise icons to Font Awesome

  1. Changes
    - Update icon names to match Font Awesome icons
    - Update existing exercises with new icon mappings
*/

UPDATE exercises
SET icon_name = 
  CASE 
    -- Core exercises
    WHEN name ILIKE '%core%' OR name ILIKE '%ab%' OR name ILIKE '%plank%' THEN 'fire-flame-simple'
    
    -- Strength exercises
    WHEN name ILIKE '%press%' OR name ILIKE '%bench%' OR name ILIKE '%curl%' OR 
         name ILIKE '%extension%' OR name ILIKE '%row%' OR name ILIKE '%deadlift%' OR 
         name ILIKE '%squat%' OR name ILIKE '%pull%' OR name ILIKE '%push%' THEN 'dumbbell'
    
    -- Running exercises
    WHEN name ILIKE '%run%' OR name ILIKE '%sprint%' THEN 'person-running'
    
    -- Cycling exercises
    WHEN name ILIKE '%cycl%' OR name ILIKE '%bike%' THEN 'person-biking'
    
    -- Walking exercises
    WHEN name ILIKE '%walk%' OR name ILIKE '%hike%' THEN 'person-walking'
    
    -- Swimming exercises
    WHEN name ILIKE '%swim%' THEN 'person-swimming'
    
    -- Cardio exercises
    WHEN name ILIKE '%cardio%' OR name ILIKE '%hiit%' THEN 'heart-pulse'
    
    -- Default to dumbbell for other exercises
    ELSE 'dumbbell'
  END;

-- Update exercise templates with the same mapping
UPDATE exercise_templates
SET icon_name = 
  CASE 
    -- Core exercises
    WHEN name ILIKE '%core%' OR name ILIKE '%ab%' OR name ILIKE '%plank%' THEN 'fire-flame-simple'
    
    -- Strength exercises
    WHEN name ILIKE '%press%' OR name ILIKE '%bench%' OR name ILIKE '%curl%' OR 
         name ILIKE '%extension%' OR name ILIKE '%row%' OR name ILIKE '%deadlift%' OR 
         name ILIKE '%squat%' OR name ILIKE '%pull%' OR name ILIKE '%push%' THEN 'dumbbell'
    
    -- Running exercises
    WHEN name ILIKE '%run%' OR name ILIKE '%sprint%' THEN 'person-running'
    
    -- Cycling exercises
    WHEN name ILIKE '%cycl%' OR name ILIKE '%bike%' THEN 'person-biking'
    
    -- Walking exercises
    WHEN name ILIKE '%walk%' OR name ILIKE '%hike%' THEN 'person-walking'
    
    -- Swimming exercises
    WHEN name ILIKE '%swim%' THEN 'person-swimming'
    
    -- Cardio exercises
    WHEN name ILIKE '%cardio%' OR name ILIKE '%hiit%' THEN 'heart-pulse'
    
    -- Default to dumbbell for other exercises
    ELSE 'dumbbell'
  END;