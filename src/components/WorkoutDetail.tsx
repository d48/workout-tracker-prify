import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  ExclamationCircleIcon,
  DocumentCheckIcon,
  PencilIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import ExerciseSelector from './ExerciseSelector';
import ExerciseStats from './ExerciseStats';
import { checkAndUpdatePersonalRecords } from '../lib/personalRecords';
import { format } from 'date-fns';
import { findIconByName } from '../lib/exercise-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  WorkoutFormData,
  Exercise,
  ExerciseTemplate,
  Set
} from '../types/workout';
import { Database } from '../types/supabase';
import DatePicker from './DatePicker';
import Header from './Header';

type WorkoutResponse = Database['public']['Tables']['workouts']['Row'] & {
  exercises: (Database['public']['Tables']['exercises']['Row'] & {
    sets: Database['public']['Tables']['sets']['Row'][];
  })[];
};

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const SORT_OPTIONS = {
  DEFAULT: 'default',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc'
};

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
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const MAX_RETRIES = 3;
  const [editingUrlExerciseId, setEditingUrlExerciseId] = useState<
    string | null
  >(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [updateDefault, setUpdateDefault] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortOption, setSortOption] = useState(
    localStorage.getItem('sortOption') || SORT_OPTIONS.DEFAULT
  );
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for saving status

  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.style.height = 'auto';
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
  }, [workout.name]);

  useEffect(() => {
    if (id === 'new') {
      setWorkoutId(null);
      setLoading(false);
    } else if (id) {
      setWorkoutId(id);
      fetchWorkout();
    }
  }, [id]);

  async function fetchWorkout() {
    if (!id) return;
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
          exercises: data.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({
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
          setRetryCount((prev) => prev + 1);
        }, 1000 * (retryCount + 1));
      } else if (
        error instanceof Error &&
        error.message === 'Failed to fetch'
      ) {
        setError(
          'Unable to connect to the server. Please check your internet connection.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function ensureWorkoutExists(): Promise<string> {
    if (workoutId) return workoutId;

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

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
    if (loading || isSaving) return; // Prevent saving if already saving or loading
    setIsSaving(true); // Set saving state to true
    setLoading(true);

    try {
      const currentWorkoutId = await ensureWorkoutExists();
      const isoDate = new Date(workout.date).toISOString();

      // Update workout details
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({
          name: workout.name,
          date: isoDate,
          notes: workout.notes || null
        })
        .eq('id', currentWorkoutId);

      if (workoutError) throw workoutError;

      // Update exercises and their sets
      for (const exercise of workout.exercises) {
        // Update or insert exercise
        if (exercise.id) {
          const { error: exerciseError } = await supabase
            .from('exercises')
            .update({
              name: exercise.name,
              notes: exercise.notes || null,
              icon_name: exercise.icon_name,
              sample_url: exercise.sample_url || null
            })
            .eq('id', exercise.id);

          if (exerciseError) throw exerciseError;
        } else {
          const { data: newExercise, error: insertError } = await supabase
            .from('exercises')
            .insert({
              workout_id: currentWorkoutId,
              name: exercise.name,
              notes: exercise.notes || null,
              icon_name: exercise.icon_name,
              sample_url: exercise.sample_url || null
            })
            .select()
            .single();

          if (insertError) throw insertError;
          exercise.id = newExercise.id;
        }

        // Update or insert sets
        for (const set of exercise.sets) {
          if (set.id) {
            const { error: setError } = await supabase
              .from('sets')
              .update({
                reps: set.reps,
                weight: set.weight,
                distance: set.distance,
                duration: set.duration,
                completed: set.completed
              })
              .eq('id', set.id);

            if (setError) throw setError;
          } else {
            const { data: newSet, error: insertSetError } = await supabase
              .from('sets')
              .insert({
                exercise_id: exercise.id,
                reps: set.reps,
                weight: set.weight,
                distance: set.distance,
                duration: set.duration,
                completed: set.completed
              })
              .select()
              .single();

            if (insertSetError) throw insertSetError;
            set.id = newSet.id;
          }
        }

        // Check for personal records after saving exercise
      }

      // Remove deleted exercises and sets
      const existingExerciseIds = workout.exercises.map((ex) => ex.id).filter((id): id is string => !!id);
      const formattedExerciseIds = `(${existingExerciseIds.join(',')})`; // Remove single quotes

      const { error: deleteExercisesError } = await supabase
        .from('exercises')
        .delete()
        .eq('workout_id', currentWorkoutId)
        .not('id', 'in', formattedExerciseIds); // Use formatted string

      if (deleteExercisesError) throw deleteExercisesError;

      for (const exercise of workout.exercises) {
        const existingSetIds = exercise.sets.map((set) => set.id).filter((id): id is string => !!id);
        const formattedSetIds = `(${existingSetIds.join(',')})`; // Remove single quotes

        const { error: deleteSetsError } = await supabase
          .from('sets')
          .delete()
          .eq('exercise_id', exercise.id)
          .not('id', 'in', formattedSetIds); // Use formatted string

        if (deleteSetsError) throw deleteSetsError;
      }

      // Check for personal records after all exercises are saved
      for (const exercise of workout.exercises) {
        const completedSets = exercise.sets.filter(set => set.completed);
        if (completedSets.length > 0) {
          const totalReps = completedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
          const maxWeight = Math.max(...completedSets.map(set => set.weight || 0));
          const totalDistance = completedSets.reduce((sum, set) => sum + (set.distance || 0), 0);
          const totalDuration = completedSets.reduce((sum, set) => sum + (set.duration || 0), 0);

          const stats = {
            totalReps: totalReps > 0 ? totalReps : null,
            maxWeight: maxWeight > 0 ? maxWeight : null,
            totalDistance: totalDistance > 0 ? totalDistance : null,
            totalDuration: totalDuration > 0 ? totalDuration : null
          };

          // Check and update personal records
          await checkAndUpdatePersonalRecords(
            exercise.name,
            stats,
            currentWorkoutId,
            isoDate
          );
        }
      }

      // Reset unsaved changes flag
      setUnsavedChanges(false);

      // Navigate home
      navigate('/');
    } catch (error) {
      console.error('Error saving workout:', error);
      setError('Failed to save workout. Please try again.');
    } finally {
      setIsSaving(false); // Reset saving state
      setLoading(false);
    }
  }

  async function handleExerciseSelect(template: ExerciseTemplate) {
    setLoading(true);

    try {
      const currentWorkoutId = await ensureWorkoutExists();

      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          workout_id: currentWorkoutId,
          name: template.name,
          notes: '',
          icon_name: template.icon_name,
          sample_url: template.sample_url || null // <== copy sample_url from template
        })
        .select()
        .single();

      if (exerciseError) throw exerciseError;
      if (!exercise) throw new Error('No exercise data returned');

      const defaultSets = template.default_sets ?? 1;
      const sets = Array(defaultSets)
        .fill(null)
        .map(() => ({
          exercise_id: exercise.id,
          reps: template.default_reps,
          weight: null,
          distance: template.default_distance,
          duration: template.default_duration,
          completed: false
        }));

      const { error: setsError } = await supabase.from('sets').insert(sets);

      if (setsError) throw setsError;

      const { data: updatedExercise, error: fetchError } = await supabase
        .from('exercises')
        .select('*, sets(*)')
        .eq('id', exercise.id)
        .single();

      if (fetchError) throw fetchError;
      if (!updatedExercise)
        throw new Error('No updated exercise data returned');

      setWorkout((prev) => ({
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

  async function saveSampleUrl(exerciseId: string) {
    try {
      // If there is a URL provided, validate it.
      if (editingUrl && !isValidUrl(editingUrl)) {
        setError('Please enter a valid URL.');
        return;
      }

      // Update the exercise record with the new sample_url in the exercises table.
      const { error } = await supabase
        .from('exercises')
        .update({ sample_url: editingUrl || null })
        .eq('id', exerciseId);
      if (error) throw error;

      // Update local state for sample_url.
      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, sample_url: editingUrl || null } : ex
        )
      }));

      // If "Update default exercise URL" is checked, and this exercise is still default,
      // convert it in place to a custom exercise.
      if (updateDefault) {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (user) {
          const exerciseItem = workout.exercises.find(
            (ex) => ex.id === exerciseId
          );
          if (exerciseItem && !(exerciseItem as any).is_custom) {
            const newExerciseName = exerciseItem.name; // Keep the same name.
            // Update the exercise record in place to mark it as custom.
            const { error: customUpdateError } = await supabase
              .from('exercises')
              .update({
                is_custom: true,
                sample_url: editingUrl || null,
                name: newExerciseName
              })
              .eq('id', exerciseId);
            if (customUpdateError) throw customUpdateError;

            // Update local state to reflect the change.
            setWorkout((prev) => ({
              ...prev,
              exercises: prev.exercises.map((ex) =>
                ex.id === exerciseId
                  ? {
                      ...ex,
                      is_custom: true,
                      sample_url: editingUrl || null,
                      name: newExerciseName
                    }
                  : ex
              )
            }));

            // Check for an existing personal override in exercise_templates.
            // If one exists, update its sample_url.
            const { data: existingOverride, error: fetchError } = await supabase
              .from('exercise_templates')
              .select('*')
              .eq('name', exerciseItem.name)
              .eq('user_id', user.id)
              .maybeSingle();
            if (fetchError) throw fetchError;

            if (existingOverride) {
              const { error: updateTemplateError } = await supabase
                .from('exercise_templates')
                .update({ sample_url: editingUrl || '' })
                .eq('id', existingOverride.id);
              if (updateTemplateError) throw updateTemplateError;
            }
          }
        }
      }

      cancelSampleUrlEdit();
    } catch (err) {
      console.error('Error updating sample URL', err);
      setError('Failed to update sample URL');
    }
  }

  function startSampleUrlEdit(exerciseId: string, currentUrl: string) {
    setEditingUrlExerciseId(exerciseId);
    setEditingUrl(currentUrl || '');
  }

  function cancelSampleUrlEdit() {
    setEditingUrlExerciseId(null);
    setEditingUrl('');
    setUpdateDefault(false);
  }

  async function addSet(exerciseId: string) {
    try {
      const targetExercise = workout.exercises.find(
        (ex) => ex.id === exerciseId
      );
      const defaultDuration =
        targetExercise && (targetExercise as any).default_duration != null
          ? (targetExercise as any).default_duration
          : null; // Use null if no default is specified

      const { data, error } = await supabase
        .from('sets')
        .insert({
          exercise_id: exerciseId,
          reps: null,
          weight: null,
          distance: null,
          duration: defaultDuration, // Now will be null if blank
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, sets: [...ex.sets, data as Set] } : ex
        )
      }));
    } catch (error) {
      console.error('Error adding set:', error);
    } finally {
      // Ensure that loading is turned off if this action had set it.
      setLoading(false);
    }
  }

  function handleExerciseNotesChange(exerciseId: string, notes: string) {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, notes } : ex
      )
    }));
  }

  function handleSetChange(
    exerciseId: string,
    setId: string,
    updates: Partial<Set>
  ) {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...updates } : set
              )
            }
          : exercise
      )
    }));

    // Mark that there are unsaved changes
    setUnsavedChanges(true);
  }

  async function deleteExercise(exerciseId: string) {
    if (!confirm('Are you sure you want to delete this exercise?')) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;

      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.filter((ex) => ex.id !== exerciseId)
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

  function handleNameChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newName = e.target.value;
    setWorkout((prev) => ({ ...prev, name: newName }));
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newNotes = e.target.value;
    setWorkout((prev) => ({ ...prev, notes: newNotes }));
  }

  function toggleDatePicker() {
    setShowDatePicker(!showDatePicker);
  }

  function clearWorkoutNotes() {
    setWorkout((prev) => ({ ...prev, notes: '' }));
  }

  function clearExerciseNotes(exerciseId: string) {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, notes: '' } : ex
      )
    }));
  }

  function handleSortChange(option: string) {
    setSortOption(option);
    localStorage.setItem('sortOption', option);
  }

  function sortExercises(exercises: Exercise[]) {
    switch (sortOption) {
      case SORT_OPTIONS.NAME_ASC:
        return [...exercises].sort((a, b) => a.name.localeCompare(b.name));
      case SORT_OPTIONS.NAME_DESC:
        return [...exercises].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return exercises;
    }
  }

  // Add a component to show unsaved changes status (optional)
  const UnsavedChangesIndicator = () => {
    if (!unsavedChanges) return null;
    
    return (
      <div className="fixed top-16 left-0 right-0 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-center py-1 text-sm z-10">
        You have unsaved changes
      </div>
    );
  };

  // Add unsaved changes warning if user tries to leave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedChanges]);

  if (loading && !isSaving) {
    return (
      <>
        <Header headerType="detail" />
        <div className="pt-24 text-center text-gray-500 dark:text-gray-400">
          Loading workout...
        </div>
      </>
    );
  }

  if (isSaving) {
    return (
      <>
        <Header headerType="detail" />
        <div className="pt-24 text-center text-gray-500 dark:text-gray-400">
          Saving workout...
        </div>
      </>
    );
  }

  return (
    <>
      <Header headerType="detail" />
      {unsavedChanges && <UnsavedChangesIndicator />}
      <div className="p-4 pb-32">
        <div className="max-w-lg mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 flex items-center gap-2">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={() => {
                  setRetryCount(0);
                  setError('');
                  fetchWorkout();
                }}
                className="ml-auto text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mb-6 space-y-8">
            <div className="relative group">
              <textarea
                ref={titleInputRef}
                value={workout.name}
                onChange={handleNameChange}
                className="text-2xl font-bold w-full bg-transparent dark:text-white pr-8 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#dbf111] rounded-lg transition-colors p-2 resize-none"
                placeholder="Workout Name"
                rows={1}
              />
              <button
                onClick={() => titleInputRef.current?.focus()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={format(
                  new Date(workout.date),
                  "MMM d, yyyy 'at' h:mm a"
                )}
                readOnly
                onClick={toggleDatePicker}
                className="block w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111] rounded-lg pr-10 p-3 border dark:border-gray-600 cursor-pointer"
              />
              <div
                onClick={toggleDatePicker}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
              >
                <CalendarIcon
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Add a DatePicker component that renders when showDatePicker is true */}
            {showDatePicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-full max-w-md">
                  <DatePicker
                    selectedDate={new Date(workout.date)}
                    onDateChange={(date) => {
                      const formattedDate = format(date, "yyyy-MM-dd'T'HH:mm");
                      setWorkout((prev) => ({ ...prev, date: formattedDate }));
                      setShowDatePicker(false);
                    }}
                    onClose={() => setShowDatePicker(false)}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-1 mt-8 mb-8">
              <textarea
                value={workout.notes || ''}
                onChange={handleNotesChange}
                placeholder="Add workout notes..."
                className="w-full p-3 border dark:border-gray-600 rounded-lg resize-none h-24 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
              />
              <div className="ml-2">
                <button
                  onClick={clearWorkoutNotes}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm underline"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Exercises
            </h2>
            <div className="flex items-center space-x-2">
              <label
                htmlFor="sort"
                className="text-sm text-gray-600 dark:text-gray-300"
              >
                Sort by:
              </label>
              <select
                id="sort"
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value)}
                className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
              >
                <option value={SORT_OPTIONS.DEFAULT}>Default</option>
                <option value={SORT_OPTIONS.NAME_ASC}>Name A - Z</option>
                <option value={SORT_OPTIONS.NAME_DESC}>Name Z - A</option>
              </select>
            </div>
          </div>

          <div className="space-y-12">
            {sortExercises(workout.exercises).map((exercise) => {
              const iconInfo = findIconByName(exercise.icon_name || 'dumbbell');
              return (
                <div
                  key={exercise.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 flex-1">
                      <FontAwesomeIcon
                        icon={iconInfo.iconDef}
                        className="h-6 w-6 text-gray-600 dark:text-gray-300"
                      />
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={async (e) => {
                          const newName = e.target.value;
                          const newIconName = findIconByName(
                            exercise.icon_name || 'dumbbell'
                          ).name;
                          const { error } = await supabase
                            .from('exercises')
                            .update({
                              name: newName,
                              icon_name: newIconName
                            })
                            .eq('id', exercise.id);
                          if (!error) {
                            setWorkout((prev) => ({
                              ...prev,
                              exercises: prev.exercises.map((ex) =>
                                ex.id === exercise.id
                                  ? {
                                      ...ex,
                                      name: newName,
                                      icon_name: newIconName
                                    }
                                  : ex
                              )
                            }));
                          }
                        }}
                        className="text-lg font-semibold flex-1 bg-transparent dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111] rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() => deleteExercise(exercise.id)}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-1"
                      title="Delete exercise"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Sample URL Section Positioned Just Below the Title */}
                  <div className="mb-4">
                    {editingUrlExerciseId === exercise.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="url"
                          value={editingUrl}
                          onChange={(e) => {
                            setEditingUrl(e.target.value);
                            // Clear the error when user starts typing:
                            if (error === 'Please enter a valid URL.')
                              setError('');
                          }}
                          placeholder="https://example.com/sample"
                          className="p-2 border dark:border-gray-600 rounded"
                        />
                        {/* Show error message if the sample URL is invalid */}
                        {error && error.includes('valid URL') && (
                          <span className="text-xs text-red-500">
                            Please enter a valid URL. Example:
                            https://example.com/sample
                          </span>
                        )}
                        <label className="text-sm text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={updateDefault}
                            onChange={(e) => setUpdateDefault(e.target.checked)}
                            className="accent-[#dbf111] mr-1"
                          />
                          Update default exercise URL
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveSampleUrl(exercise.id)}
                            className="px-3 py-1 bg-[#dbf111] text-black rounded shadow hover:bg-[#c5d60f] text-xs"
                          >
                            Save URL
                          </button>
                          <button
                            onClick={cancelSampleUrlEdit}
                            className="px-3 py-1 border border-gray-300 text-gray-600 dark:border-gray-500 dark:text-gray-300 rounded hover:bg-gray-200 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 mb-8 mt-6">
                        {exercise.sample_url ? (
                          <>
                            <a
                              href={exercise.sample_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm underline"
                            >
                              <EyeIcon className="h-5 w-5" />
                              <span className="ml-2">
                                How to do this exercise
                              </span>
                            </a>
                            <button
                              onClick={() =>
                                startSampleUrlEdit(
                                  exercise.id,
                                  exercise.sample_url ?? ''
                                )
                              }
                              className="text-sm text-gray-500 hover:underline ml-4"
                            >
                              <PencilIcon
                                className="h-5 w-5"
                                title="Edit URL"
                              />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startSampleUrlEdit(exercise.id, '')}
                            className="flex mt-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm underline"
                          >
                            <span className="ml-2">
                              Set URL for "How to do this exercise"?
                            </span>
                            <PencilIcon
                              className="ml-4 h-5 w-5"
                              title="Set sample URL"
                            />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1 mt-8 mb-8">
                    <textarea
                      value={exercise.notes || ''}
                      onChange={(e) =>
                        handleExerciseNotesChange(exercise.id, e.target.value)
                      }
                      placeholder="Add notes for this exercise..."
                      className="w-full p-2 border dark:border-gray-600 rounded-lg text-sm resize-none h-20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                    />
                    <div className="ml-2">
                      <button
                        onClick={() => clearExerciseNotes(exercise.id)}
                        className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <ExerciseStats exercise={exercise} />

                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,auto] gap-4 px-2">
                      <div className="w-5"></div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Reps
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Weight (lbs)
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Distance (mi)
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Duration (min)
                      </div>
                      <div className="w-5"></div>
                    </div>

                    {exercise.sets?.map((set) => (
                      <div
                        key={set.id}
                        className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,auto] gap-4 items-center"
                      >
                        <input
                          type="checkbox"
                          checked={set.completed}
                          onChange={(e) =>
                            handleSetChange(exercise.id, set.id, {
                              completed: e.target.checked
                            })
                          }
                          className="checkbox-custom"
                        />
                        <input
                          type="number"
                          step="any"
                          value={set.reps ?? ''}
                          onChange={(e) =>
                            handleSetChange(exercise.id, set.id, {
                              reps:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value)
                            })
                          }
                          className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                          placeholder="0"
                        />
                        <input
                          type="number"
                          step="any"
                          value={set.weight ?? ''}
                          onChange={(e) =>
                            handleSetChange(exercise.id, set.id, {
                              weight:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value)
                            })
                          }
                          className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                          placeholder="0"
                        />
                        <input
                          type="number"
                          step="any"
                          value={set.distance ?? ''}
                          onChange={(e) =>
                            handleSetChange(exercise.id, set.id, {
                              distance:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value)
                            })
                          }
                          className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                          placeholder="0"
                        />
                        <input
                          type="number"
                          step="any"
                          value={set.duration ?? ''}
                          onChange={(e) =>
                            handleSetChange(exercise.id, set.id, {
                              duration:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value)
                            })
                          }
                          className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                          placeholder="0"
                        />
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from('sets')
                              .delete()
                              .eq('id', set.id);

                            if (!error) {
                              setWorkout((prev) => ({
                                ...prev,
                                exercises: prev.exercises.map((ex) =>
                                  ex.id === exercise.id
                                    ? {
                                        ...ex,
                                        sets: ex.sets.filter(
                                          (s) => s.id !== set.id
                                        )
                                      }
                                    : ex
                                )
                              }));
                            }
                          }}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addSet(exercise.id)}
                    className="mt-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm underline"
                  >
                    Add Set
                  </button>
                </div>
              );
            })}
          </div>

          {!loading && workout.exercises.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                No exercises added yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click the plus button to add your first exercise
              </p>
            </div>
          )}

          <div className="fixed bottom-20 left-0 right-0 flex justify-between items-center px-4 pb-4 max-w-lg mx-auto">
            <button
              onClick={saveWorkout}
              disabled={loading}
              className={`bg-[#dbf111] text-black px-6 py-3 rounded-lg shadow-lg hover:bg-[#c5d60f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                unsavedChanges ? 'animate-pulse' : ''
              }`}
            >
              <DocumentCheckIcon className="h-5 w-5" />
              Save
            </button>
            <button
              onClick={() => setShowExerciseSelector(true)}
              disabled={loading}
              className="bg-[#dbf111] text-black px-6 py-3 rounded-lg shadow-lg hover:bg-[#c5d60f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Add exercise"
            >
              <PlusIcon className="h-6 w-6" />
              Add Exercise
            </button>
          </div>

          {showExerciseSelector && (
            <ExerciseSelector
              onSelect={handleExerciseSelect}
              onClose={() => setShowExerciseSelector(false)}
            />
          )}
        </div>
      </div>
    </>
  );
}
