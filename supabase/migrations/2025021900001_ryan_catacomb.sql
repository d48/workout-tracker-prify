-- Drop the existing foreign key constraint
ALTER TABLE exercise_templates
DROP CONSTRAINT IF EXISTS exercise_templates_category_id_fkey;

-- Add the new foreign key constraint with ON DELETE SET NULL
ALTER TABLE exercise_templates
ADD CONSTRAINT exercise_templates_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES exercise_categories(id)
ON DELETE SET NULL;