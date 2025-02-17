import { Database } from './supabase';

export type Set = Database['public']['Tables']['sets']['Row'];

export type Exercise = Database['public']['Tables']['exercises']['Row'] & {
  sets: Set[];
};

export type Workout = Database['public']['Tables']['workouts']['Row'] & {
  exercises: Exercise[];
};

export type WorkoutFormData = Omit<Workout, 'id' | 'created_at' | 'user_id'> & {
  exercises: Exercise[];
};

export type ExerciseTemplate = Database['public']['Tables']['exercise_templates']['Row'];
export type Category = Database['public']['Tables']['exercise_categories']['Row'];