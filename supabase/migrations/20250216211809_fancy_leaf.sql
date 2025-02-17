/*
  # Fix exercises RLS policy

  1. Changes
    - Update RLS policy for exercises table to properly check workout ownership
    - Ensure authenticated users can create exercises for their own workouts
    - Maintain security while allowing proper access

  2. Security
    - Strengthen RLS policy to properly verify workout ownership
    - Ensure users can only manage exercises in their own workouts
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage exercises in their workouts" ON exercises;

-- Create updated policy with proper workout ownership check
CREATE POLICY "Users can manage exercises in their workouts"
  ON exercises
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );