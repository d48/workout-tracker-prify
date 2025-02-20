-- Insert default "Uncategorized" category if one does not exist
INSERT INTO exercise_categories (name, is_default)
SELECT 'Uncategorized', true
WHERE NOT EXISTS (
  SELECT 1 FROM exercise_categories WHERE name = 'Uncategorized'
);