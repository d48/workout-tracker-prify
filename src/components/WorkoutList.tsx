import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, startOfToday, startOfWeek, startOfMonth, endOfToday, endOfWeek, endOfMonth } from 'date-fns';
import { PlusIcon, TrashIcon, ShareIcon, DocumentDuplicateIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconByName } from '../lib/exercise-icons';
import { Database } from '../types/supabase';
import prifyLogo from '../images/prify-logo.svg';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../lib/ThemeContext';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';

type Workout = Database['public']['Tables']['workouts']['Row'] & {
  exercises: Array<{
    id: string;
    name: string;
    notes: string | null;
    icon_name: string | null;
    sets: Array<{
      reps: number | null;
      weight: number | null;
      distance: number | null;
      duration?: number | null;
      completed: boolean;
    }>;
  }>;
};

const WORKOUTS_PER_PAGE = 10;

function calculateExerciseStats(exercise: Workout['exercises'][0]) {
  const completedSets = exercise.sets.filter(set => set.completed);
  const totalReps = completedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
  const maxWeight = Math.max(...completedSets.map(set => set.weight || 0));
  const totalDistance = completedSets.reduce((sum, set) => sum + (set.distance || 0), 0);
  const totalDuration = completedSets.reduce((sum, set) => sum + (set.duration || 0), 0);

  return {
    totalReps: totalReps > 0 ? totalReps : null,
    maxWeight: maxWeight > 0 ? maxWeight : null,
    totalDistance: totalDistance > 0 ? totalDistance : null,
    totalDuration: totalDuration > 0 ? totalDuration : null
  };
}

export default function WorkoutList() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const navigate = useNavigate();
  const workoutRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { logo } = useTheme();

  useEffect(() => {
    fetchWorkouts();
  }, [filter, page]);

  async function fetchWorkouts() {
    try {
      let query = supabase
        .from('workouts')
        .select(`
          *,
          exercises (
            id,
            name,
            notes,
            icon_name,
            sets (
              reps,
              weight,
              distance,
              duration,
              completed
            )
          )
        `, { count: 'exact' });

      // Apply date filters
      if (filter !== 'all') {
        let startDate: Date;
        let endDate: Date;

        switch (filter) {
          case 'today':
            startDate = startOfToday();
            endDate = endOfToday();
            break;
          case 'week':
            startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
            endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
            break;
          case 'month':
            startDate = startOfMonth(new Date());
            endDate = endOfMonth(new Date());
            break;
          default:
            startDate = new Date(0);
            endDate = new Date();
        }

        query = query
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());
      }

      // Add pagination
      const from = (page - 1) * WORKOUTS_PER_PAGE;
      const to = from + WORKOUTS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Sort exercises alphabetically within each workout
      const sortedWorkouts = data?.map(workout => ({
        ...workout,
        exercises: [...workout.exercises].sort((a, b) => a.name.localeCompare(b.name))
      })) || [];

      setWorkouts(sortedWorkouts);
      if (count !== null) {
        setTotalWorkouts(count);
      }
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function duplicateWorkout(workout: Workout, event: React.MouseEvent) {
    event.stopPropagation();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      // Create new workout with today's date
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: `${workout.name} (Copy)`,
          date: new Date().toISOString(),
          notes: workout.notes,
          user_id: user.id
        })
        .select()
        .single();

      if (workoutError) throw workoutError;
      if (!newWorkout) throw new Error('No workout data returned');

      // Duplicate exercises
      for (const exercise of workout.exercises) {
        const { data: newExercise, error: exerciseError } = await supabase
          .from('exercises')
          .insert({
            workout_id: newWorkout.id,
            name: exercise.name,
            notes: exercise.notes,
            icon_name: exercise.icon_name
          })
          .select()
          .single();

        if (exerciseError) throw exerciseError;
        if (!newExercise) throw new Error('No exercise data returned');

        // Duplicate sets
        const sets = exercise.sets.map(set => ({
          exercise_id: newExercise.id,
          reps: set.reps,
          weight: set.weight,
          distance: set.distance,
          duration: set.duration,  // new field
          completed: false // Reset completion status for the new workout
        }));

        const { error: setsError } = await supabase
          .from('sets')
          .insert(sets);

        if (setsError) throw setsError;
      }

      await fetchWorkouts();
      navigate(`/workout/${newWorkout.id}`);
    } catch (error) {
      console.error('Error duplicating workout:', error);
      alert('Failed to duplicate workout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteWorkout(id: string) {
    if (!confirm('Are you sure you want to delete this workout?')) {
      return;
    }

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workout:', error);
      return;
    }

    setWorkouts(workouts.filter(w => w.id !== id));
  }

  async function shareWorkout(workout: Workout, event: React.MouseEvent) {
    event.stopPropagation();

    const workoutCard = workoutRefs.current[workout.id];
    if (!workoutCard) return;

    try {
      // Create and load a temporary image element for the logo
      const tempImg = document.createElement('img');
      await new Promise<void>((resolve, reject) => {
        tempImg.onload = () => resolve();
        tempImg.onerror = reject;
        tempImg.src = prifyLogo;
      });

      // Create a canvas for the logo conversion
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = tempImg.width;
      tempCanvas.height = tempImg.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(tempImg, 0, 0);
      const pngUrl = tempCanvas.toDataURL('image/png');

      // Clone the workout card and prepare it for html2canvas
      const clone = workoutCard.cloneNode(true) as HTMLElement;
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.background = 'white';
      wrapper.style.padding = '20px';
      wrapper.style.borderRadius = '8px';
      wrapper.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      wrapper.style.width = `${workoutCard.offsetWidth}px`;
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';

      // Add logo using PNG data URL with increased size
      const logo = document.createElement('img');
      logo.src = pngUrl;
      logo.style.height = '60px';
      logo.style.marginBottom = '16px';
      wrapper.appendChild(logo);

      clone.style.width = '100%';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';

      const actionButtons = clone.querySelectorAll('.action-buttons');
      actionButtons.forEach(button => button.remove());
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Wait for layout to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Generate canvas image of the wrapper
      const canvas = await html2canvas(wrapper, {
        backgroundColor: 'white',
        scale: 2,
        logging: false,
        useCORS: true,
        windowHeight: wrapper.scrollHeight,
        height: wrapper.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.body.firstChild as HTMLElement;
          clonedElement.style.transform = 'none';
        },
      });

      document.body.removeChild(wrapper);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob(blob => resolve(blob!), 'image/png')
      );

      const filename = `${workout.name}-${format(new Date(workout.date), 'yyyy-MM-dd')}.png`;

      const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);

      // Desktop flow: try Clipboard API
      if (!isIOS && navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Workout summary copied to clipboard!');
          return;
        } catch (err) {
          console.error('Clipboard API failed:', err);
        }
      }
      // Mobile flow: try Web Share API
      else if (isIOS && navigator.share) {
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          await navigator.share({
            title: 'Workout Summary',
            text: `Check out my workout: ${workout.name}`,
            files: [file]
          });
          return;
        } catch (err) {
          console.error('Web Share API failed:', err);
        }
      }

      // Fallback: download the image automatically
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Image downloaded. (Your browser may not support copying images to the clipboard.)');
      
    } catch (error) {
      console.error('Error sharing workout:', error);
      alert('Failed to share workout. Please try again.');
    }
  }

  // Compute global records for each exercise name from the visible workouts
  const globalRecords: Record<
    string,
    {
      totalReps: { value: number; workoutId: string; date: string } | null;
      maxWeight: { value: number; workoutId: string; date: string } | null;
      totalDistance: { value: number; workoutId: string; date: string } | null;
      totalDuration: { value: number; workoutId: string; date: string } | null;
    }
  > = {};

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const stats = calculateExerciseStats(exercise);
      const key = exercise.name;
      if (!globalRecords[key]) {
        globalRecords[key] = {
          totalReps: stats.totalReps
            ? { value: stats.totalReps, workoutId: workout.id, date: workout.date }
            : null,
          maxWeight: stats.maxWeight
            ? { value: stats.maxWeight, workoutId: workout.id, date: workout.date }
            : null,
          totalDistance: stats.totalDistance
            ? { value: stats.totalDistance, workoutId: workout.id, date: workout.date }
            : null,
          totalDuration: stats.totalDuration
            ? { value: stats.totalDuration, workoutId: workout.id, date: workout.date }
            : null,
        };
      } else {
        if (stats.totalReps) {
          const currentTotal = globalRecords[key].totalReps;
          if (
            !currentTotal ||
            stats.totalReps > currentTotal.value ||
            (stats.totalReps === currentTotal.value &&
              new Date(workout.date) > new Date(currentTotal.date))
          ) {
            globalRecords[key].totalReps = {
              value: stats.totalReps,
              workoutId: workout.id,
              date: workout.date,
            };
          }
        }
        if (stats.maxWeight) {
          const currentMax = globalRecords[key].maxWeight;
          if (
            !currentMax ||
            stats.maxWeight > currentMax.value ||
            (stats.maxWeight === currentMax.value &&
              new Date(workout.date) > new Date(currentMax.date))
          ) {
            globalRecords[key].maxWeight = {
              value: stats.maxWeight,
              workoutId: workout.id,
              date: workout.date,
            };
          }
        }
        if (stats.totalDistance) {
          const currentDistance = globalRecords[key].totalDistance;
          if (
            !currentDistance ||
            stats.totalDistance > currentDistance.value ||
            (stats.totalDistance === currentDistance.value &&
              new Date(workout.date) > new Date(currentDistance.date))
          ) {
            globalRecords[key].totalDistance = {
              value: stats.totalDistance,
              workoutId: workout.id,
              date: workout.date,
            };
          }
        }
        if (stats.totalDuration) {
          const currentDuration = globalRecords[key].totalDuration;
          if (
            !currentDuration ||
            stats.totalDuration > currentDuration.value ||
            (stats.totalDuration === currentDuration.value &&
              new Date(workout.date) > new Date(currentDuration.date))
          ) {
            globalRecords[key].totalDuration = {
              value: stats.totalDuration,
              workoutId: workout.id,
              date: workout.date,
            };
          }
        }
      }
    });
  });

  const WelcomeMessage = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome to PRIFY!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Start tracking your workouts and breaking personal records (PRs). Whether you're lifting heavier, running faster, or pushing harder, PRIFY helps you achieve and celebrate every milestone in your fitness journey.
        </p>
      </div>
      <button
        onClick={() => navigate('/workout/new')}
        className="bg-[#dbf111] text-black px-6 py-3 rounded-lg hover:bg-[#c5d60f] inline-flex items-center gap-2"
      >
        <PlusIcon className="h-5 w-5" />
        Add Workout
      </button>
    </div>
  );

  const totalPages = Math.ceil(totalWorkouts / WORKOUTS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center gap-4 mt-6 pb-20">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`w-8 h-8 rounded-full ${
                pageNum === page
                  ? 'bg-[#dbf111] text-black'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link to="/">
                <img 
                  src={logo}
                  alt="PRIFY Workout Tracker" 
                  className="h-16 cursor-pointer"
                />
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/workout/new')}
                  className="bg-[#dbf111] text-black p-2 rounded-full hover:bg-[#c5d60f] flex items-center gap-1"
                  title="Add new workout"
                >
                  <PlusIcon className="h-6 w-6" />
                  <span className="hidden sm:inline">Add Workout</span>
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
        <div className="pt-24 text-center text-gray-500 dark:text-gray-400">Loading workouts...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/">
              <img 
                src={logo}
                alt="PRIFY Workout Tracker" 
                className="h-16 cursor-pointer"
              />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/workout/new')}
                className="bg-[#dbf111] text-black p-2 rounded-full hover:bg-[#c5d60f] flex items-center gap-1"
                title="Add new workout"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="hidden sm:inline">Add Workout</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-24">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'today', 'week', 'month'].map((period) => (
            <button
              key={period}
              onClick={() => {
                setFilter(period);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                filter === period
                  ? 'bg-[#dbf111] text-black'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>

        {workouts.length === 0 ? (
          <WelcomeMessage />
        ) : (
          <>
            <div className="space-y-6">
              {workouts.map((workout) => {
                return (
                  <div
                    key={workout.id}
                    ref={el => workoutRefs.current[workout.id] = el}
                    onClick={() => navigate(`/workout/${workout.id}`)}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors space-y-12"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#dbf111] dark:hover:text-[#dbf111] transition-colors">
                          {workout.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(workout.date), 'MMM d, yyyy')}
                        </p>
                        {workout.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                            {workout.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-5 action-buttons ml-4 pt-2 pr-2">
                        <button
                          onClick={(e) => duplicateWorkout(workout, e)}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                          title="Duplicate workout"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => shareWorkout(workout, e)}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                          title="Share workout"
                        >
                          <ShareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkout(workout.id);
                          }}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                          title="Delete workout"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {workout.exercises?.length > 0 && (
                      <div className="space-y-2">
                        {workout.exercises.map((exercise) => {
                          const stats = calculateExerciseStats(exercise);
                          const record = globalRecords[exercise.name];

                          // Count occurrences for each metric for this exercise
                          const repsOccurrences = workouts.filter((w) =>
                            w.exercises.some(
                              (ex) =>
                                ex.name === exercise.name &&
                                calculateExerciseStats(ex).totalReps === record?.totalReps?.value
                            )
                          ).length;
                          const weightOccurrences = workouts.filter((w) =>
                            w.exercises.some(
                              (ex) =>
                                ex.name === exercise.name &&
                                calculateExerciseStats(ex).maxWeight === record?.maxWeight?.value
                            )
                          ).length;
                          const distanceOccurrences = workouts.filter((w) =>
                            w.exercises.some(
                              (ex) =>
                                ex.name === exercise.name &&
                                calculateExerciseStats(ex).totalDistance === record?.totalDistance?.value
                            )
                          ).length;
                          const durationOccurrences = workouts.filter((w) =>
                            w.exercises.some(
                              (ex) =>
                                ex.name === exercise.name &&
                                calculateExerciseStats(ex).totalDuration === record?.totalDuration?.value
                            )
                          ).length;

                          // Check if this workout is a new record for any metric
                          const isNewRecord =
                            (stats.totalReps &&
                              record?.totalReps &&
                              stats.totalReps === record.totalReps.value &&
                              workout.id === record.totalReps.workoutId &&
                              repsOccurrences === 1) ||
                            (stats.maxWeight &&
                              record?.maxWeight &&
                              stats.maxWeight === record.maxWeight.value &&
                              workout.id === record.maxWeight.workoutId &&
                              weightOccurrences === 1) ||
                            (stats.totalDistance &&
                              record?.totalDistance &&
                              stats.totalDistance === record.totalDistance.value &&
                              workout.id === record.totalDistance.workoutId &&
                              distanceOccurrences === 1) ||
                            (stats.totalDuration &&
                              record?.totalDuration &&
                              stats.totalDuration === record.totalDuration.value &&
                              workout.id === record.totalDuration.workoutId &&
                              durationOccurrences === 1);

                          return (
                            <div
                              key={exercise.id}
                              className="relative flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-2 rounded mt-6"
                            >
                              <FontAwesomeIcon 
                                icon={findIconByName(exercise.icon_name || 'dumbbell').iconDef} 
                                className="h-4 w-4 text-gray-600 dark:text-gray-300" 
                              />
                              <div className="inline-flex items-center gap-3">
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {exercise.name}
                                </span>
                                {isNewRecord && (
                                  <FontAwesomeIcon 
                                    icon={faTrophy} 
                                    className="h-4 w-4 text-gray-600 dark:text-[#dbf111]" 
                                    title="New record!"
                                  />
                                )}
                              </div>
                              <div className="flex gap-3 ml-auto text-xs text-gray-600 dark:text-gray-300">
                                {stats.totalReps && <span>{stats.totalReps} reps</span>}
                                {stats.maxWeight && <span>{stats.maxWeight} lbs</span>}
                                {stats.totalDistance && <span>{stats.totalDistance.toFixed(1)} mi</span>}
                                {stats.totalDuration !== null && <span>{stats.totalDuration} min</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <Pagination />
          </>
        )}
      </div>
    </div>
  );
}