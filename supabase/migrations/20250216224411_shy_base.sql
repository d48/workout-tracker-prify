/*
  # Fix exercise icons

  1. Changes
    - Updates all exercises and templates to use valid FontAwesome icons
    - Ensures consistent icon mapping across the application
*/

-- Add icon_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercises' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE exercises ADD COLUMN icon_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercise_templates' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE exercise_templates ADD COLUMN icon_name text;
  END IF;
END $$;

-- Update exercises with proper FontAwesome icon names
UPDATE exercises
SET icon_name = 
  CASE 
    -- Core/Abs exercises
    WHEN name ILIKE '%core%' OR name ILIKE '%ab%' OR name ILIKE '%plank%' THEN 'fire-flame-simple'
    
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
    
    -- Default to dumbbell for strength exercises
    ELSE 'dumbbell'
  END;

-- Update exercise templates with the same mapping
UPDATE exercise_templates
SET icon_name = 
  CASE 
    -- Core/Abs exercises
    WHEN name ILIKE '%core%' OR name ILIKE '%ab%' OR name ILIKE '%plank%' THEN 'fire-flame-simple'
    
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
    
    -- Default to dumbbell for strength exercises
    ELSE 'dumbbell'
  END;