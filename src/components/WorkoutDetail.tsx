import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, TrashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import ExerciseSelector from './ExerciseSelector';
import ExerciseStats from './ExerciseStats';
import { format } from 'date-fns';
import { findIconByName } from '../lib/exercise-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { WorkoutFormData, Exercise, ExerciseTemplate, Set } from '../types/workout';
import { Database } from '../types/supabase';

type WorkoutResponse = Database['public']['Tables']['workouts']['Row'] & {
  exercises: (Database['public']['Tables']['exercises']['Row'] & {
    sets: Database['public']['Tables']['sets']['Row'][];
  })[];
};

// Debounce helper function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<WorkoutFormData>({
    name: 'New Workout',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
    exercises: []
  });
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Create debounced save functions
  const debouncedSaveNotes = useCallback(
    debounce(async (exerciseId: string, notes: string) => {
      try {
        const { error } = await supabase
          .from('exercises')
          .update({ notes })
          .eq('id', exerciseId);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving exercise notes:', error);
        if (error instanceof Error) {
          setError(error.message);
        }
      }
    }, 500),
    []
  );

  const debouncedSaveSet = useCallback(
    debounce(async (setId: string, updates: Partial<Set>) => {
      try {
        const { error } = await supabase
          .from('sets')
          .update(updates)
          .eq('id', setId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating set:', error);
        if (error instanceof Error) {
          setError(error.message);
        }
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (id === 'new') {
      setWorkoutId(null);
    } else if (id) {
      setWorkoutId(id);
      fetchWorkout();
    }
  }, [id, retryCount]);

  async function fetchWorkout() {
    if (loading || !id) return;
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*, exercises(*, sets(*))')
        .eq('id', id)
        .single<WorkoutResponse>();

      if (error) throw error;

      if (data) {
        const formattedData: WorkoutFormData = {
          name: data.name,
          date: format(new Date(data.date), "yyyy-MM-dd'T'HH:mm"),
          notes: data.notes ?? '',
          exercises: data.exercises.map(exercise => ({
            ...exercise,
            sets: exercise.sets.map(set => ({
              ...set,
              reps: set.reps,
              weight: set.weight,
              distance: set.distance,
              completed: set.completed
            }))
          }))
        };

        setWorkout(formattedData);
        setError('');
      }
    } catch (error) {
      console.error('Error fetching workout:', error);
      setError('Failed to load workout. Please try again.');
      
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 1000 * (retryCount + 1));
      } else if (error instanceof Error && error.message === 'Failed to fetch') {
        setError('Unable to connect to the server. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function ensureWorkoutExists(): Promise<string> {
    if (workoutId) return workoutId;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user found');

      const isoDate = new Date(workout.date).toISOString();

      const { data, error } = await supabase
        .from('workouts')
        .insert({
          name: workout.name,
          date: isoDate,
          notes: workout.notes || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');

      setWorkoutId(data.id);
      window.history.replaceState(null, '', `/workout/${data.id}`);
      return data.id;
    } catch (error) {
      console.error('Error creating workout:', error);
      setError('Failed to create workout. Please try again.');
      throw error;
    }
  }

  async function saveWorkout() {
    if (loading) return;
    setLoading(true);

    try {
      const currentWorkoutId = await ensureWorkoutExists();
      const isoDate = new Date(workout.date).toISOString();

      const { error } = await supabase
        .from('workouts')
        .update({
          name: workout.name,
          date: isoDate,
          notes: workout.notes || null
        })
        .eq('id', currentWorkoutId);

      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error saving workout:', error);
      setError('Failed to save workout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExerciseSelect(template: ExerciseTemplate) {
    if (loading) return;
    setLoading(true);

    try {
      const currentWorkoutId = await ensureWorkoutExists();

      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          workout_id: currentWorkoutId,
          name: template.name,
          notes: '',
          icon_name: template.icon_name
        })
        .select()
        .single();

      if (exerciseError) throw exerciseError;
      if (!exercise) throw new Error('No exercise data returned');

      const defaultSets = template.default_sets ?? 1;
      const sets = Array(defaultSets).fill(null).map(() => ({
        exercise_id: exercise.id,
        reps: template.default_reps,
        weight: null,
        distance: template.default_distance,
        completed: false
      }));

      const { error: setsError } = await supabase
        .from('sets')
        .insert(sets);

      if (setsError) throw setsError;

      const { data: updatedExercise, error: fetchError } = await supabase
        .from('exercises')
        .select('*, sets(*)')
        .eq('id', exercise.id)
        .single();

      if (fetchError) throw fetchError;
      if (!updatedExercise) throw new Error('No updated exercise data returned');

      setWorkout(prev => ({
        ...prev,
        exercises: [...prev.exercises, updatedExercise as Exercise]
      }));
    } catch (error) {
      console.error('Error adding exercise:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    } finally {
      setLoading(false);
      setShowExerciseSelector(false);
    }
  }

  function handleExerciseNotesChange(exerciseId: string, notes: string) {
    // Update local state immediately
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, notes } : ex
      )
    }));

    // Debounce the save to database
    debouncedSaveNotes(exerciseId, notes);
  }

  async function addSet(exerciseId: string) {
    if (loading) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('sets')
        .insert({
          exercise_id: exerciseId,
          reps: null,
          weight: null,
          distance: null,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No set data returned');

      setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.map(exercise =>
          exercise.id === exerciseId
            ? { ...exercise, sets: [...exercise.sets, data as Set] }
            : exercise
        )
      }));
    } catch (error) {
      console.error('Error adding set:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSetChange(exerciseId: string, setId: string, updates: Partial<Set>) {
    // Update local state immediately
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map(set =>
                set.id === setId ? { ...set, ...updates } : set
              )
            }
          : exercise
      )
    }));

    // Debounce the save to database
    debouncedSaveSet(setId, updates);
  }

  async function deleteExercise(exerciseId: string) {
    if (!confirm('Are you sure you want to delete this exercise?')) {
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;

      setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.filter(ex => ex.id !== exerciseId)
      }));
    } catch (error) {
      console.error('Error deleting exercise:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value;
    setWorkout(prev => ({ ...prev, date: newDate }));
  }

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => {
              setRetryCount(0);
              setError('');
              fetchWorkout();
            }}
            className="ml-auto text-sm text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <input
          type="text"
          value={workout.name}
          onChange={(e) => setWorkout(prev => ({ ...prev, name: e.target.value }))}
          className="text-2xl font-bold w-full bg-transparent"
          placeholder="Workout Name"
        />
        <input
          type="datetime-local"
          value={workout.date}
          onChange={handleDateChange}
          className="block w-full"
        />
        <textarea
          value={workout.notes || ''}
          onChange={(e) => setWorkout(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add workout notes..."
          className="w-full p-3 border rounded-lg resize-none h-24"
        />
      </div>

      <div className="space-y-6">
        {workout.exercises?.map((exercise) => {
          const iconInfo = findIconByName(exercise.icon_name || 'dumbbell');

          return (
            <div key={exercise.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 flex-1">
                  <FontAwesomeIcon 
                    icon={iconInfo.iconDef} 
                    className="h-6 w-6 text-gray-600" 
                  />
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={async (e) => {
                      const newName = e.target.value;
                      const newIconName = findIconByName(exercise.icon_name || 'dumbbell').name;
                      
                      const { error } = await supabase
                        .from('exercises')
                        .update({ 
                          name: newName,
                          icon_name: newIconName
                        })
                        .eq('id', exercise.id);

                      if (!error) {
                        setWorkout(prev => ({
                          ...prev,
                          exercises: prev.exercises.map(ex =>
                            ex.id === exercise.id
                              ? { ...ex, name: newName, icon_name: newIconName }
                              : ex
                          )
                        }));
                      }
                    }}
                    className="text-lg font-semibold flex-1"
                  />
                </div>
                <button
                  onClick={() => deleteExercise(exercise.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete exercise"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              <textarea
                value={exercise.notes || ''}
                onChange={(e) => handleExerciseNotesChange(exercise.id, e.target.value)}
                placeholder="Add notes for this exercise..."
                className="w-full p-2 border rounded-lg text-sm mb-4 resize-none h-20"
              />

              <ExerciseStats exercise={exercise} />

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-4 px-2">
                  <div className="w-5"></div>
                  <div className="text-sm font-medium text-gray-600">Reps</div>
                  <div className="text-sm font-medium text-gray-600">Weight (lbs)</div>
                  <div className="text-sm font-medium text-gray-600">Distance (mi)</div>
                  <div className="w-5"></div>
                </div>

                {exercise.sets?.map((set) => (
                  <div key={set.id} className="grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-4 items-center">
                    <input
                      type="checkbox"
                      checked={set.completed}
                      onChange={(e) =>
                        handleSetChange(exercise.id, set.id, {
                          completed: e.target.checked
                        })
                      }
                      className="h-5 w-5"
                    />
                    <input
                      type="number"
                      step="any"
                      value={set.reps ?? ''}
                      onChange={(e) =>
                        handleSetChange(exercise.id, set.id, {
                          reps: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="0"
                    />
                    <input
                      type="number"
                      step="any"
                      value={set.weight ?? ''}
                      onChange={(e) =>
                        handleSetChange(exercise.id, set.id, {
                          weight: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="0"
                    />
                    <input
                      type="number"
                      step="any"
                      value={set.distance ?? ''}
                      onChange={(e) =>
                        handleSetChange(exercise.id, set.id, {
                          distance: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="0"
                    />
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('sets')
                          .delete()
                          .eq('id', set.id);

                        if (!error) {
                          setWorkout(prev => ({
                            ...prev,
                            exercises: prev.exercises.map(ex =>
                              ex.id === exercise.id
                                ? {
                                    ...ex,
                                    sets: ex.sets.filter(s => s.id !== set.id)
                                  }
                                : ex
                            )
                          }));
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(exercise.id)}
                className="mt-4 text-blue-600 text-sm hover:text-blue-800"
              >
                Add Set
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty state message when no exercises */}
      {workout.exercises.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">No exercises added yet</p>
          <p className="text-sm text-gray-500">Click the plus button to add your first exercise</p>
        </div>
      )}

      <div className="fixed bottom-20 right-4">
        <button
          onClick={() => setShowExerciseSelector(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 flex items-center gap-2"
          disabled={loading}
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="fixed bottom-20 left-4">
        <button
          onClick={saveWorkout}
          className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-700"
          disabled={loading}
        >
          Save
        </button>
      </div>

      {showExerciseSelector && (
        <ExerciseSelector
          onSelect={handleExerciseSelect}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}
    </div>
  );
}