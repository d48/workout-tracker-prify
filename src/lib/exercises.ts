export interface ExerciseTemplate {
  name: string;
  category: 'strength' | 'cardio' | 'bodyweight';
  defaultSets?: number;
  defaultReps?: number;
}

export const predefinedExercises: ExerciseTemplate[] = [
  { name: 'Squats', category: 'strength', defaultSets: 3, defaultReps: 8 },
  { name: 'Bench Press', category: 'strength', defaultSets: 3, defaultReps: 8 },
  { name: 'Incline Dumbbell Press', category: 'strength', defaultSets: 3, defaultReps: 10 },
  { name: 'Pullups', category: 'bodyweight', defaultSets: 3, defaultReps: 8 },
  { name: 'Seated Calf Raises', category: 'strength', defaultSets: 3, defaultReps: 15 },
  { name: 'Incline Dumbbell Curls', category: 'strength', defaultSets: 3, defaultReps: 12 },
  { name: 'Incline Tricep Extension', category: 'strength', defaultSets: 3, defaultReps: 12 },
  { name: 'TRX Inverted Rows', category: 'bodyweight', defaultSets: 3, defaultReps: 12 },
  { name: 'Hanging Ab Raises', category: 'bodyweight', defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Crunches', category: 'strength', defaultSets: 3, defaultReps: 15 },
  { name: 'Decline Ab Raises', category: 'bodyweight', defaultSets: 3, defaultReps: 15 },
  { name: 'Pec Machine Seated Cable', category: 'strength', defaultSets: 3, defaultReps: 12 },
  { name: 'Pec Machine Seated Machine', category: 'strength', defaultSets: 3, defaultReps: 12 },
  { name: 'Pec Machine Standing', category: 'strength', defaultSets: 3, defaultReps: 12 }
];