/*
  # Add distance column to sets table

  1. Changes
    - Add `distance` column to `sets` table for tracking distance in cardio exercises
    - Set default value to 0 to maintain consistency with other numeric columns
    - Make it not null to prevent data inconsistency

  2. Notes
    - Distance is stored in kilometers (km)
    - Uses numeric type to allow decimal values for precise distance tracking
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sets' AND column_name = 'distance'
  ) THEN
    ALTER TABLE sets ADD COLUMN distance numeric NOT NULL DEFAULT 0;
  END IF;
END $$;