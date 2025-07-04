/*
  # Create Personal Records Table

  1. New Tables
    - `personal_records`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `exercise_name` (text)
      - `record_type` (text) - 'reps', 'weight', 'distance', 'duration'
      - `record_value` (numeric)
      - `workout_id` (uuid, references workouts)
      - `achieved_date` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on personal_records table
    - Add policies for authenticated users to manage their own records

  3. Indexes
    - Add indexes for efficient lookups
*/

CREATE TABLE personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  exercise_name text NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('reps', 'weight', 'distance', 'duration')),
  record_value numeric NOT NULL,
  workout_id uuid REFERENCES workouts NOT NULL,
  achieved_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_name, record_type)
);

-- Enable Row Level Security
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own personal records"
  ON personal_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX personal_records_user_id_idx ON personal_records(user_id);
CREATE INDEX personal_records_exercise_name_idx ON personal_records(exercise_name);
CREATE INDEX personal_records_user_exercise_idx ON personal_records(user_id, exercise_name);
CREATE INDEX personal_records_workout_id_idx ON personal_records(workout_id);