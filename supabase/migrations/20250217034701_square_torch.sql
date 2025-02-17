/*
  # Update exercise categories RLS policies

  1. Changes
    - Add RLS policy to allow authenticated users to insert new categories
    - Keep existing policy for reading categories

  2. Security
    - Maintain public read access
    - Add insert access for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can read categories" ON exercise_categories;

-- Create updated policies
CREATE POLICY "Everyone can read categories"
  ON exercise_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON exercise_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);