import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfToday, startOfWeek, startOfMonth, endOfToday, endOfWeek, endOfMonth } from 'date-fns';
import { PlusIcon, TrashIcon, ShareIcon, DocumentDuplicateIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconByName } from '../lib/exercise-icons';
import { Database } from '../types/supabase';
import prifyLogo from '../images/prify-logo.svg';

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
      completed: boolean;
    }>;
  }>;
};

const WORKOUTS_PER_PAGE = 10;

export default function WorkoutList() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const navigate = useNavigate();
  const workoutRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  function calculateExerciseStats(exercise: Workout['exercises'][0]) {
    const completedSets = exercise.sets.filter(set => set.completed);
    const totalReps = completedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
    const maxWeight = Math.max(...completedSets.map(set => set.weight || 0));
    const totalDistance = completedSets.reduce((sum, set) => sum + (set.distance || 0), 0);

    return {
      totalReps: totalReps > 0 ? totalReps : null,
      maxWeight: maxWeight > 0 ? maxWeight : null,
      totalDistance: totalDistance > 0 ? totalDistance : null
    };
  }

  async function shareWorkout(workout: Workout, event: React.MouseEvent) {
    event.stopPropagation();
    
    const workoutCard = workoutRefs.current[workout.id];
    if (!workoutCard) return;

    try {
      const clone = workoutCard.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.background = 'white';
      clone.style.padding = '20px';
      clone.style.borderRadius = '8px';
      clone.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      clone.style.width = `${workoutCard.offsetWidth}px`;
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      
      const actionButtons = clone.querySelectorAll('.action-buttons');
      actionButtons.forEach(button => button.remove());
      
      document.body.appendChild(clone);

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        backgroundColor: 'white',
        scale: 2,
        logging: false,
        useCORS: true,
        windowHeight: clone.scrollHeight,
        height: clone.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.body.firstChild as HTMLElement;
          clonedElement.style.transform = 'none';
        }
      });

      document.body.removeChild(clone);

      const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
      
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        alert('Workout summary copied to clipboard!');
      } catch (err) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workout.name}-${format(new Date(workout.date), 'yyyy-MM-dd')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Workout summary downloaded! (Your browser doesn\'t support direct clipboard access)');
      }
    } catch (error) {
      console.error('Error sharing workout:', error);
      alert('Failed to share workout. Please try again.');
    }
  }

  const WelcomeMessage = () => (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to PRIFY!</h2>
        <p className="text-gray-600 mb-4">
          Start tracking your workouts and breaking personal records (PRs). Whether you're lifting heavier, running faster, or pushing harder, PRIFY helps you achieve and celebrate every milestone in your fitness journey.
        </p>
      </div>
      <button
        onClick={() => navigate('/workout/new')}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
      >
        <PlusIcon className="h-5 w-5" />
        Create a Workout
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
          className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`w-8 h-8 rounded-full ${
                pageNum === page
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <img 
                src={prifyLogo}
                alt="PRIFY Workout Tracker" 
                className="h-16"
              />
              <button
                onClick={() => navigate('/workout/new')}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
        <div className="pt-24 text-center text-gray-500">Loading workouts...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <img 
              src={prifyLogo}
              alt="PRIFY Workout Tracker" 
              className="h-16"
            />
            <button
              onClick={() => navigate('/workout/new')}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
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
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  ref={el => workoutRefs.current[workout.id] = el}
                  onClick={() => navigate(`/workout/${workout.id}`)}
                  className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold hover:text-blue-600 transition-colors">
                        {workout.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {format(new Date(workout.date), 'MMM d, yyyy')}
                      </p>
                      {workout.notes && (
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                          {workout.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 action-buttons ml-4">
                      <button
                        onClick={(e) => duplicateWorkout(workout, e)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Duplicate workout"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => shareWorkout(workout, e)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Share workout"
                      >
                        <ShareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWorkout(workout.id);
                        }}
                        className="text-red-600 hover:text-red-800"
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
                        const iconInfo = findIconByName(exercise.icon_name || 'dumbbell');
                        
                        return (
                          <div
                            key={exercise.id}
                            className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                          >
                            <FontAwesomeIcon 
                              icon={iconInfo.iconDef} 
                              className="h-4 w-4 text-gray-600" 
                            />
                            <span className="font-medium">{exercise.name}</span>
                            <div className="flex gap-3 ml-auto text-xs text-gray-600">
                              {stats.totalReps && (
                                <span>{stats.totalReps} reps</span>
                              )}
                              {stats.maxWeight && (
                                <span>{stats.maxWeight} lbs</span>
                              )}
                              {stats.totalDistance && (
                                <span>{stats.totalDistance.toFixed(1)} mi</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Pagination />
          </>
        )}
      </div>
    </div>
  );
}