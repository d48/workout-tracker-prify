UPDATE exercise_templates
SET icon_name = 
  CASE 
    -- Running and Treadmill exercises
    WHEN name ILIKE '%run%' OR name ILIKE '%treadmill%' THEN 'Heart'
    
    -- Cycling exercises
    WHEN name ILIKE '%cycl%' OR name ILIKE '%bike%' THEN 'Heart'
    
    -- Arm exercises
    WHEN name ILIKE '%bicep%' OR name ILIKE '%tricep%' OR name ILIKE '%curl%' THEN 'Hand'
    
    -- Keep existing icons for other exercises
    ELSE icon_name
  END
WHERE name ILIKE ANY (ARRAY[
  '%run%',
  '%treadmill%',
  '%cycl%',
  '%bike%',
  '%bicep%',
  '%tricep%',
  '%curl%'
]);