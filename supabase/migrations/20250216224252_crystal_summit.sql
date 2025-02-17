/*
  # Fix missing exercise icons

  1. Changes
    - Updates any exercises with missing icons to use 'dumbbell' as default
    - Ensures all exercises have a valid FontAwesome icon name
*/

-- Update any exercises with missing or invalid icons to use dumbbell as default
UPDATE exercises
SET icon_name = 'dumbbell'
WHERE icon_name IS NULL 
   OR icon_name NOT IN (
    'dumbbell',
    'fire-flame-simple',
    'person-running',
    'person-biking',
    'person-walking',
    'person-swimming',
    'heart-pulse',
    'heart',
    'weight-hanging',
    'spa',
    'fire-flame-curved'
   );

-- Update any exercise templates with missing or invalid icons
UPDATE exercise_templates
SET icon_name = 'dumbbell'
WHERE icon_name IS NULL 
   OR icon_name NOT IN (
    'dumbbell',
    'fire-flame-simple',
    'person-running',
    'person-biking',
    'person-walking',
    'person-swimming',
    'heart-pulse',
    'heart',
    'weight-hanging',
    'spa',
    'fire-flame-curved'
   );