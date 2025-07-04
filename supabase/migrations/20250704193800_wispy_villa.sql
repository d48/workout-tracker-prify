/*
  # Create search function for workouts and exercises

  1. New Functions
    - `search_workouts_and_exercises` - searches across workouts and exercises with pagination
    
  2. Security
    - Function uses SECURITY DEFINER to access user data
    - Filters results by authenticated user ID
    
  3. Features
    - Full-text search across workout names, notes, exercise names, and notes
    - Date filtering (today, week, month, all)
    - Pagination support with limit and offset
    - Case-insensitive search
*/

-- Drop the function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS search_workouts_and_exercises(TEXT, TEXT, INTEGER, INTEGER);

-- Create the search function
CREATE OR REPLACE FUNCTION search_workouts_and_exercises(
  search_term TEXT,
  date_filter TEXT DEFAULT 'all',
  limit_count INTEGER DEFAULT 10,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(workout_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMPTZ;
  end_date TIMESTAMPTZ;
BEGIN
  -- Set date range based on filter
  CASE date_filter
    WHEN 'today' THEN
      start_date := date_trunc('day', NOW());
      end_date := start_date + INTERVAL '1 day';
    WHEN 'week' THEN
      start_date := date_trunc('week', NOW()) + INTERVAL '1 day'; -- Start on Monday
      end_date := start_date + INTERVAL '7 days';
    WHEN 'month' THEN
      start_date := date_trunc('month', NOW());
      end_date := start_date + INTERVAL '1 month';
    ELSE
      start_date := '1970-01-01'::TIMESTAMPTZ;
      end_date := NOW() + INTERVAL '1 year';
  END CASE;

  RETURN QUERY
  SELECT DISTINCT w.id as workout_id
  FROM workouts w
  LEFT JOIN exercises e ON e.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND w.date >= start_date
    AND w.date < end_date
    AND (
      -- Search in workout name and notes
      LOWER(w.name) LIKE '%' || LOWER(search_term) || '%'
      OR (w.notes IS NOT NULL AND LOWER(w.notes) LIKE '%' || LOWER(search_term) || '%')
      -- Search in exercise name and notes
      OR LOWER(e.name) LIKE '%' || LOWER(search_term) || '%'
      OR (e.notes IS NOT NULL AND LOWER(e.notes) LIKE '%' || LOWER(search_term) || '%')
    )
  ORDER BY w.date DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;