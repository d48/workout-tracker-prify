/*
  # Allow null values for set fields

  1. Changes
    - Make reps, weight, and distance columns nullable in sets table
    - This allows for exercises that might not use all metrics (e.g., cardio exercises might only use distance)

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE sets
  ALTER COLUMN reps DROP NOT NULL,
  ALTER COLUMN weight DROP NOT NULL,
  ALTER COLUMN distance DROP NOT NULL;