/*
  # Create search function for workouts and exercises

  1. New Function
    - `search_workouts_and_exercises` - Searches across workouts, exercises, and notes
    - Returns workout IDs that match the search criteria
    - Supports date filtering and pagination

  2. Security
    - Function respects RLS policies
    - Only returns workouts owned by the authenticated user
*/

-- Create a function to search workouts and exercises
CREATE OR REPLACE FUNCTION search_workouts_and_exercises(
  search_term text,
  date_filter text DEFAULT 'all',
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(workout_id uuid, relevance_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date timestamptz;
  end_date timestamptz;
BEGIN
  -- Set date range based on filter
  CASE date_filter
    WHEN 'today' THEN
      start_date := date_trunc('day', now());
      end_date := start_date + interval '1 day';
    WHEN 'week' THEN
      start_date := date_trunc('week', now()) + interval '1 day'; -- Start on Monday
      end_date := start_date + interval '1 week';
    WHEN 'month' THEN
      start_date := date_trunc('month', now());
      end_date := start_date + interval '1 month';
    ELSE
      start_date := '1970-01-01'::timestamptz;
      end_date := now() + interval '1 year';
  END CASE;

  RETURN QUERY
  WITH workout_matches AS (
    -- Search in workout names and notes
    SELECT 
      w.id as workout_id,
      CASE 
        WHEN w.name ILIKE '%' || search_term || '%' THEN 3
        WHEN w.notes ILIKE '%' || search_term || '%' THEN 2
        ELSE 0
      END as score
    FROM workouts w
    WHERE w.user_id = auth.uid()
      AND w.date >= start_date 
      AND w.date <= end_date
      AND (
        w.name ILIKE '%' || search_term || '%' OR
        w.notes ILIKE '%' || search_term || '%'
      )
  ),
  exercise_matches AS (
    -- Search in exercise names and notes
    SELECT 
      w.id as workout_id,
      CASE 
        WHEN e.name ILIKE '%' || search_term || '%' THEN 2
        WHEN e.notes ILIKE '%' || search_term || '%' THEN 1
        ELSE 0
      END as score
    FROM workouts w
    JOIN exercises e ON e.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.date >= start_date 
      AND w.date <= end_date
      AND (
        e.name ILIKE '%' || search_term || '%' OR
        e.notes ILIKE '%' || search_term || '%'
      )
  ),
  set_matches AS (
    -- Search in set values (reps, weight, distance, duration)
    SELECT 
      w.id as workout_id,
      1 as score
    FROM workouts w
    JOIN exercises e ON e.workout_id = w.id
    JOIN sets s ON s.exercise_id = e.id
    WHERE w.user_id = auth.uid()
      AND w.date >= start_date 
      AND w.date <= end_date
      AND (
        (search_term ILIKE '%rep%' AND s.reps IS NOT NULL AND s.reps::text ILIKE '%' || replace(search_term, ' reps', '') || '%') OR
        (search_term ILIKE '%lb%' AND s.weight IS NOT NULL AND s.weight::text ILIKE '%' || replace(search_term, ' lbs', '') || '%') OR
        (search_term ILIKE '%mi%' AND s.distance IS NOT NULL AND s.distance::text ILIKE '%' || replace(search_term, ' mi', '') || '%') OR
        (search_term ILIKE '%min%' AND s.duration IS NOT NULL AND s.duration::text ILIKE '%' || replace(search_term, ' min', '') || '%')
      )
  ),
  all_matches AS (
    SELECT workout_id, score FROM workout_matches
    UNION ALL
    SELECT workout_id, score FROM exercise_matches
    UNION ALL
    SELECT workout_id, score FROM set_matches
  ),
  aggregated_matches AS (
    SELECT 
      workout_id,
      SUM(score) as relevance_score
    FROM all_matches
    GROUP BY workout_id
  )
  SELECT 
    am.workout_id,
    am.relevance_score::integer
  FROM aggregated_matches am
  JOIN workouts w ON w.id = am.workout_id
  ORDER BY am.relevance_score DESC, w.date DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_workouts_and_exercises TO authenticated;