import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PlusIcon, TrashIcon, ShareIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { Database } from '../types/supabase';

type Workout = Database['public']['Tables']['workouts']['Row'] & {
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{
      reps: number | null;
      weight: number | null;
      distance: number | null;
      completed: boolean;
    }>;
  }>;
};

export default function WorkoutList() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const workoutRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchWorkouts();
  }, [filter]);

  async function fetchWorkouts() {
    try {
      let query = supabase
        .from('workouts')
        .select(`
          *,
          exercises (
            id,
            name,
            sets (
              reps,
              weight,
              distance,
              completed
            )
          )
        `);

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
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

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <ClipboardDocumentIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">My Workouts</h1>
        </div>
        <button
          onClick={() => navigate('/workout/new')}
          className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'today', 'week', 'month'].map((period) => (
          <button
            key={period}
            onClick={() => setFilter(period)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              filter === period
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600'
            }`}
          >
            {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            ref={el => workoutRefs.current[workout.id] = el}
            onClick={() => navigate(`/workout/${workout.id}`)}
            className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
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
              <div className="flex gap-2 action-buttons ml-4">
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
                  
                  return (
                    <div
                      key={exercise.id}
                      className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                    >
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
    </div>
  );
}