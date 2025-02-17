/*
  # Comprehensive RLS policy fix

  1. Changes
    - Drop and recreate all RLS policies with proper checks
    - Ensure proper cascading permissions from workouts to exercises to sets
    - Add explicit policies for insert operations

  2. Security
    - Strengthen RLS policies with explicit USING and WITH CHECK clauses
    - Ensure proper ownership verification at all levels
    - Prevent any unauthorized access to data
*/

-- Reset all policies
DROP POLICY IF EXISTS "Users can manage their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can manage exercises in their workouts" ON exercises;
DROP POLICY IF EXISTS "Users can manage sets in their exercises" ON sets;

-- Workouts policies
CREATE POLICY "Users can manage their own workouts"
  ON workouts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exercises policies
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

-- Sets policies
CREATE POLICY "Users can manage sets in their exercises"
  ON sets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN workouts ON workouts.id = exercises.workout_id
      WHERE exercises.id = sets.exercise_id
      AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN workouts ON workouts.id = exercises.workout_id
      WHERE exercises.id = sets.exercise_id
      AND workouts.user_id = auth.uid()
    )
  );