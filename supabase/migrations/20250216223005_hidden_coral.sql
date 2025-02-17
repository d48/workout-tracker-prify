/*
  # Add icon support to exercises table

  1. Changes
    - Add icon_name column to exercises table
    - Update existing exercises with appropriate icons based on their names
*/

-- Add icon_name column to exercises table
ALTER TABLE exercises
ADD COLUMN icon_name text;

-- Update existing exercises with appropriate icons
UPDATE exercises
SET icon_name = 
  CASE 
    -- Running and Treadmill exercises
    WHEN name ILIKE '%run%' OR name ILIKE '%treadmill%' THEN 'Heart'
    
    -- Cycling exercises
    WHEN name ILIKE '%cycl%' OR name ILIKE '%bike%' THEN 'Rocket'
    
    -- Arm exercises
    WHEN name ILIKE '%bicep%' OR name ILIKE '%tricep%' OR name ILIKE '%curl%' THEN 'Hand'
    
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