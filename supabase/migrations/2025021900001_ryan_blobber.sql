-- Add user_id column to exercise_categories
ALTER TABLE exercise_categories
ADD COLUMN user_id UUID REFERENCES auth.users(id),
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Update existing categories to be default ones
UPDATE exercise_categories
SET is_default = true
WHERE user_id IS NULL;

-- Enable RLS
ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can read categories" ON exercise_categories;
DROP POLICY IF EXISTS "Authenticated users can create categories" ON exercise_categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON exercise_categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON exercise_categories;

-- Create new policies
CREATE POLICY "Users can see default and their own categories"
ON exercise_categories FOR SELECT
TO authenticated
USING (
  is_default = true OR 
  user_id = auth.uid()
);

CREATE POLICY "Users can create their own categories"
ON exercise_categories FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND is_default = false
);

CREATE POLICY "Users can update their own categories"
ON exercise_categories FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND is_default = false
)
WITH CHECK (
  auth.uid() = user_id
  AND is_default = false
);

CREATE POLICY "Users can delete their own categories"
ON exercise_categories FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND is_default = false
);