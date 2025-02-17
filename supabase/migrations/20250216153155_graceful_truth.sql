/*
  # Add exercise templates and categories

  1. New Tables
    - `exercise_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    
    - `exercise_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `category_id` (uuid, references exercise_categories)
      - `default_sets` (integer)
      - `default_reps` (integer)
      - `is_custom` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their custom exercises
    - Add policy for all users to read predefined exercises

  3. Initial Data
    - Insert predefined categories
    - Insert predefined exercises
*/

-- Create exercise categories table
CREATE TABLE exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create exercise templates table
CREATE TABLE exercise_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  category_id uuid REFERENCES exercise_categories NOT NULL,
  default_sets integer NOT NULL DEFAULT 3,
  default_reps integer NOT NULL DEFAULT 10,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can read categories"
  ON exercise_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can read all exercise templates"
  ON exercise_templates
  FOR SELECT
  TO authenticated
  USING (
    is_custom = false OR 
    (is_custom = true AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own custom exercises"
  ON exercise_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_custom = true AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can update their own custom exercises"
  ON exercise_templates
  FOR UPDATE
  TO authenticated
  USING (
    is_custom = true AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own custom exercises"
  ON exercise_templates
  FOR DELETE
  TO authenticated
  USING (
    is_custom = true AND 
    user_id = auth.uid()
  );

-- Insert predefined categories
INSERT INTO exercise_categories (name) VALUES
  ('Strength'),
  ('Cardio'),
  ('Bodyweight'),
  ('Chest'),
  ('Legs'),
  ('Arms'),
  ('Abs'),
  ('Core');

-- Get category IDs
DO $$ 
DECLARE
  strength_id uuid;
  cardio_id uuid;
  bodyweight_id uuid;
  chest_id uuid;
  legs_id uuid;
  arms_id uuid;
  abs_id uuid;
BEGIN
  SELECT id INTO strength_id FROM exercise_categories WHERE name = 'Strength';
  SELECT id INTO cardio_id FROM exercise_categories WHERE name = 'Cardio';
  SELECT id INTO bodyweight_id FROM exercise_categories WHERE name = 'Bodyweight';
  SELECT id INTO chest_id FROM exercise_categories WHERE name = 'Chest';
  SELECT id INTO legs_id FROM exercise_categories WHERE name = 'Legs';
  SELECT id INTO arms_id FROM exercise_categories WHERE name = 'Arms';
  SELECT id INTO abs_id FROM exercise_categories WHERE name = 'Abs';

  -- Insert predefined exercises
  INSERT INTO exercise_templates (name, category_id, default_sets, default_reps, is_custom) VALUES
    ('Squats', legs_id, 3, 8, false),
    ('Bench Press', chest_id, 3, 8, false),
    ('Incline Dumbbell Press', chest_id, 3, 10, false),
    ('Pullups', bodyweight_id, 3, 8, false),
    ('Seated Calf Raises', legs_id, 3, 15, false),
    ('Incline Dumbbell Curls', arms_id, 3, 12, false),
    ('Incline Tricep Extension', arms_id, 3, 12, false),
    ('TRX Inverted Rows', bodyweight_id, 3, 12, false),
    ('Hanging Ab Raises', abs_id, 3, 12, false),
    ('Cable Crunches', abs_id, 3, 15, false),
    ('Decline Ab Raises', abs_id, 3, 15, false),
    ('Pec Machine Seated Cable', chest_id, 3, 12, false),
    ('Pec Machine Seated Machine', chest_id, 3, 12, false),
    ('Pec Machine Standing', chest_id, 3, 12, false);
END $$;