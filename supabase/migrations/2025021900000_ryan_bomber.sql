/*
  # Add category edit and delete policies

  1. Changes
    - Add RLS policy to allow authenticated users to update categories
    - Add RLS policy to allow authenticated users to delete categories

  2. Security
    - Maintain existing read/insert policies
    - Add update/delete access for authenticated users
*/

-- Create new policies for update and delete
CREATE POLICY "Authenticated users can update categories"
  ON exercise_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON exercise_categories
  FOR DELETE
  TO authenticated
  USING (true);