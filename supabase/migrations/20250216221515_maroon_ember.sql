-- Add icon_name column to exercise_templates if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercise_templates' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE exercise_templates ADD COLUMN icon_name text;
  END IF;
END $$;

-- Update existing exercises with appropriate icons
UPDATE exercise_templates
SET icon_name = 
  CASE 
    -- Cardio exercises
    WHEN name ILIKE '%run%' OR name ILIKE '%cardio%' OR name ILIKE '%cycling%' OR name ILIKE '%swimming%' THEN 'Heart'
    
    -- Explosive movements
    WHEN name ILIKE '%jump%' OR name ILIKE '%plyo%' OR name ILIKE '%explosive%' THEN 'Rocket'
    
    -- Grip exercises
    WHEN name ILIKE '%grip%' OR name ILIKE '%hold%' OR name ILIKE '%pull%' OR name ILIKE '%push%' THEN 'Hand'
    
    -- Core/Balance exercises
    WHEN name ILIKE '%core%' OR name ILIKE '%balance%' OR name ILIKE '%stability%' THEN 'Balance'
    
    -- Compound movements
    WHEN name ILIKE '%squat%' OR name ILIKE '%deadlift%' OR name ILIKE '%press%' THEN 'Layers'
    
    -- Time-based exercises
    WHEN name ILIKE '%interval%' OR name ILIKE '%timer%' OR name ILIKE '%duration%' THEN 'Time'
    
    -- Default to Power for strength exercises
    ELSE 'Power'
  END
WHERE icon_name IS NULL;