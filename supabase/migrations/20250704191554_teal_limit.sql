-- Check if personal_records table exists and create it if it doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'personal_records') THEN
    CREATE TABLE personal_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users NOT NULL,
      exercise_name text NOT NULL,
      workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
      record_type text NOT NULL CHECK (record_type IN ('reps', 'weight', 'distance', 'duration')),
      value numeric NOT NULL,
      achieved_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, exercise_name, record_type)
    );

    -- Enable Row Level Security
    ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

    -- Create indexes for better performance
    CREATE INDEX personal_records_user_id_idx ON personal_records(user_id);
    CREATE INDEX personal_records_exercise_name_idx ON personal_records(exercise_name);
    CREATE INDEX personal_records_user_exercise_idx ON personal_records(user_id, exercise_name);
    CREATE INDEX personal_records_workout_id_idx ON personal_records(workout_id);
    CREATE INDEX personal_records_achieved_at_idx ON personal_records(achieved_at);
    CREATE INDEX personal_records_unique_record ON personal_records(user_id, exercise_name, record_type);
  END IF;
END $$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can manage their own personal records" ON personal_records;
DROP POLICY IF EXISTS "Users can read their own records" ON personal_records;
DROP POLICY IF EXISTS "Users can insert their own records" ON personal_records;
DROP POLICY IF EXISTS "Users can update their own records" ON personal_records;
DROP POLICY IF EXISTS "Service role can manage records" ON personal_records;

-- Create comprehensive policies
CREATE POLICY "Users can read their own records"
  ON personal_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records"
  ON personal_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON personal_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own personal records"
  ON personal_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage records"
  ON personal_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);