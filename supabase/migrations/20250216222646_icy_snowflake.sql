/*
  # Update cycling exercise icons

  1. Changes
    - Update icon for cycling exercises to use 'Rocket' icon
    - This represents the dynamic, speed-focused nature of cycling better than the generic heart icon
*/

UPDATE exercise_templates
SET icon_name = 'Rocket'
WHERE name ILIKE '%cycl%' OR name ILIKE '%bike%';