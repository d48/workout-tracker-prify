/*
  # Initial Schema for Workout Tracker

  1. New Tables
    - workouts
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - name (text)
      - date (timestamp with time zone)
      - notes (text)
      - created_at (timestamp with time zone)
    
    - exercises
      - id (uuid, primary key)
      - workout_id (uuid, references workouts)
      - name (text)
      - notes (text)
      - created_at (timestamp with time zone)
    
    - sets
      - id (uuid, primary key)
      - exercise_id (uuid, references exercises)
      - reps (integer)
      - weight (numeric)
      - completed (boolean)
      - created_at (timestamp with time zone)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create tables
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid REFERENCES exercises ON DELETE CASCADE NOT NULL,
  reps integer NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own workouts"
  ON workouts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

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
  );

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
  );

-- Create indexes for better performance
CREATE INDEX workouts_user_id_idx ON workouts(user_id);
CREATE INDEX workouts_date_idx ON workouts(date);
CREATE INDEX exercises_workout_id_idx ON exercises(workout_id);
CREATE INDEX sets_exercise_id_idx ON sets(exercise_id);