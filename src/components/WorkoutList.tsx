import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfToday,
  startOfWeek,
  startOfMonth,
  endOfToday,
  endOfWeek,
  endOfMonth
} from 'date-fns';
import {
  PlusIcon,
  TrashIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { testSupabaseConnection } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconByName } from '../lib/exercise-icons';
import { checkIfExerciseHasRecords } from '../lib/personalRecords';
import { Database } from '../types/supabase';
import prifyLogo from '../images/prify-logo.svg';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import Header from './Header';

// Component to handle trophy display with async record checking
function TrophyDisplay({ exerciseName, stats }: { exerciseName: string, stats: any }) {
  const [recordTypes, setRecordTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRecords() {
      try {
        // Only check if we have valid stats
        const hasValidStats = stats.totalReps > 0 || stats.maxWeight > 0 || 
                             stats.totalDistance > 0 || stats.totalDuration > 0;
        
        if (!hasValidStats) {
          setRecordTypes([]);
          setLoading(false);
          return;
        }
        
        const records = await checkIfExerciseHasRecords(exerciseName, stats);
        setRecordTypes(records);
      } catch (error) {
        console.error('Error checking exercise records for', exerciseName, ':', error);
        
        // Provide user-friendly error handling
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          console.warn('Unable to check personal records due to connection issues. Records will not be displayed.');
        }
        
        setRecordTypes([]);
      } finally {
        setLoading(false);
      }
    }

    checkRecords();
  }, [exerciseName, stats.totalReps, stats.maxWeight, stats.totalDistance, stats.totalDuration]);

  if (loading || recordTypes.length === 0) {
    return null;
  }

  return (
    <FontAwesomeIcon
      icon={faTrophy}
      className="h-4 w-4 text-gray-600 dark:text-[#dbf111]"
      title={`Personal record! (${recordTypes.join(', ')})`}
    />
  );
}

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
  const completedSets = exercise.sets.filter((set) => set.completed);
  const totalReps = completedSets.reduce(
    (sum, set) => sum + (set.reps || 0),
    0
  );
  const maxWeight = Math.max(...completedSets.map((set) => set.weight || 0));
  const totalDistance = completedSets.reduce(
    (sum, set) => sum + (set.distance || 0),
    0
  );
  const totalDuration = completedSets.reduce(
    (sum, set) => sum + (set.duration || 0),
    0
  );

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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const navigate = useNavigate();
  const workoutRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search term with minimum 3 characters
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Only set debounced search term if it's empty or has at least 3 characters
      if (searchTerm.length === 0 || searchTerm.length >= 3) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchWorkouts();
  }, [filter, page, debouncedSearchTerm]);

  useEffect(() => {
    const handleResetToPageOne = () => {
      setPage(1);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
    };

    window.addEventListener('resetToPageOne', handleResetToPageOne);
    return () => {
      window.removeEventListener('resetToPageOne', handleResetToPageOne);
    };
  }, []);

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      setPage(1);
    }
  }, [debouncedSearchTerm]);

  async function fetchWorkouts() {
    try {
      setSearchLoading(true);
      
      // Test Supabase connection first
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        console.error('Supabase connection failed:', connectionTest.error);
        throw new Error(`Database connection failed: ${connectionTest.error}`);
      }
      
      // Add pagination for displayed workouts
      const from = (page - 1) * WORKOUTS_PER_PAGE;
      const to = from + WORKOUTS_PER_PAGE - 1;

      let paginatedQuery = supabase.from('workouts').select(
        `
          *,
          exercises (
            id,
            name,
            notes,
            icon_name,
            sets (
              id,
              reps,
              weight,
              distance,
              duration,
              completed,
              created_at
            )
          )
        `,
        { count: 'exact' }
      );

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

        paginatedQuery = paginatedQuery
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());
      }

      // Apply search filters if search term exists and has at least 3 characters
      if (debouncedSearchTerm.trim() && debouncedSearchTerm.length >= 3) {
        try {
          // Use the RPC function for comprehensive search
          const { data: searchResults, count: searchCount } = await supabase.rpc(
            'search_workouts_and_exercises',
            {
              search_term: debouncedSearchTerm.toLowerCase(),
              date_filter: filter,
              limit_count: WORKOUTS_PER_PAGE,
              offset_count: from
            }
          );

          if (searchResults && searchResults.length > 0) {
            // Now fetch the full workout data for the matching workout IDs
            const workoutIds = searchResults.map((result: any) => result.workout_id);
            
            const { data: fullWorkouts } = await supabase
              .from('workouts')
              .select(`
                *,
                exercises (
                  id,
                  name,
                  notes,
                  icon_name,
                  sets (
                    id,
                    reps,
                    weight,
                    distance,
                    duration,
                    completed,
                    created_at
                  )
                )
              `)
              .in('id', workoutIds)
              .order('date', { ascending: false });

            setWorkouts(processSortedWorkouts(fullWorkouts || []));
            setTotalWorkouts(searchCount || 0);
          } else {
            setWorkouts([]);
            setTotalWorkouts(0);
          }
        } catch (rpcError) {
          console.error('RPC search failed, falling back to client-side search:', rpcError);
          // Fallback to client-side search if RPC function doesn't exist
          await performClientSideSearch(paginatedQuery, from, to);
        }
      } else {
        // No search term or less than 3 characters, use regular pagination
        const paginatedResponse = await paginatedQuery
          .order('date', { ascending: false })
          .range(from, to);

        if (paginatedResponse.error) throw paginatedResponse.error;

        const { data, count } = paginatedResponse;
        const sortedWorkouts = processSortedWorkouts(data);
        
        setWorkouts(sortedWorkouts);
        if (count !== null) {
          setTotalWorkouts(count);
        }
      }
    } catch (error) {
      console.error('Error fetching workouts:', error);
      
      // Provide user-friendly error handling
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('Database connection failed')) {
          console.error('Network connectivity issue detected. Please check:');
          console.error('1. Your internet connection');
          console.error('2. Supabase project URL and API key in .env file');
          console.error('3. Supabase project status');
          console.error('4. Restart your development server after updating .env');
          
          // Set empty state instead of trying fallback
          setWorkouts([]);
          setTotalWorkouts(0);
        } else {
          // For other errors, try basic search fallback
          await performBasicSearch();
        }
      } else {
        // For unknown errors, try basic search fallback
        await performBasicSearch();
      }
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }

  async function performClientSideSearch(baseQuery: any, from: number, to: number) {
    // Fallback search method - get more data and filter client-side
    const { data, count } = await baseQuery
      .order('date', { ascending: false })
      .range(0, Math.max(100, to + WORKOUTS_PER_PAGE)); // Get more data for search

    if (data) {
      const filteredWorkouts = data.filter((workout: Workout) => {
        const term = debouncedSearchTerm.toLowerCase();
        const workoutMatches =
          workout.name.toLowerCase().includes(term) ||
          (workout.notes && workout.notes.toLowerCase().includes(term));

        const exerciseMatches = workout.exercises.some((exercise) => {
          const stats = calculateExerciseStats(exercise);
          return (
            exercise.name.toLowerCase().includes(term) ||
            (exercise.notes && exercise.notes.toLowerCase().includes(term)) ||
            exercise.sets.some(
              (set) =>
                (set.reps !== null &&
                  `${set.reps} reps`.toLowerCase().includes(term)) ||
                (set.weight !== null &&
                  `${set.weight} lbs`.toLowerCase().includes(term)) ||
                (set.distance !== null &&
                  `${set.distance} mi`.toLowerCase().includes(term)) ||
                (set.duration !== undefined &&
                  set.duration !== null &&
                  `${set.duration} min`.toLowerCase().includes(term))
            ) ||
            (stats.totalReps !== null &&
              `${stats.totalReps} reps`.toLowerCase().includes(term)) ||
            (stats.maxWeight !== null &&
              `${stats.maxWeight} lbs`.toLowerCase().includes(term)) ||
            (stats.totalDistance !== null &&
              `${stats.totalDistance} mi`.toLowerCase().includes(term)) ||
            (stats.totalDuration !== null &&
              `${stats.totalDuration} min`.toLowerCase().includes(term))
          );
        });

        return workoutMatches || exerciseMatches;
      });

      // Apply pagination to filtered results
      const paginatedResults = filteredWorkouts.slice(from, from + WORKOUTS_PER_PAGE);
      const sortedWorkouts = processSortedWorkouts(paginatedResults);
      
      setWorkouts(sortedWorkouts);
      setTotalWorkouts(filteredWorkouts.length);
    }
  }

  async function performBasicSearch() {
    try {
      // Most basic fallback - just search workout names and notes
      const from = (page - 1) * WORKOUTS_PER_PAGE;
      const to = from + WORKOUTS_PER_PAGE - 1;
      
      let query = supabase.from('workouts').select(
        `
          *,
          exercises (
            id,
            name,
            notes,
            icon_name,
            sets (
              id,
              reps,
              weight,
              distance,
              duration,
              completed,
              created_at
            )
          )
        `,
        { count: 'exact' }
      );

      if (debouncedSearchTerm.trim() && debouncedSearchTerm.length >= 3) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,notes.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, count, error } = await query
        .order('date', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      if (data) {
        const sortedWorkouts = processSortedWorkouts(data);
        setWorkouts(sortedWorkouts);
        setTotalWorkouts(count || 0);
      }
    } catch (error) {
      console.error('Basic search also failed:', error);
      setWorkouts([]);
      setTotalWorkouts(0);
    }
  }

  function processSortedWorkouts(data: any[]) {
    return data?.map((workout) => ({
      ...workout,
      exercises: [...workout.exercises]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((exercise) => ({
          ...exercise,
          sets: [...exercise.sets].sort((a, b) => {
            if (a.created_at && b.created_at) {
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return a.id.localeCompare(b.id);
          })
        }))
    })) || [];
  }

  async function duplicateWorkout(workout: Workout, event: React.MouseEvent) {
    event.stopPropagation();
    setLoading(true);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
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
        const sets = exercise.sets.map((set) => ({
          exercise_id: newExercise.id,
          reps: set.reps,
          weight: set.weight,
          distance: set.distance,
          duration: set.duration, // new field
          completed: false // Reset completion status for the new workout
        }));

        const { error: setsError } = await supabase.from('sets').insert(sets);

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

    const { error } = await supabase.from('workouts').delete().eq('id', id);

    if (error) {
      console.error('Error deleting workout:', error);
      return;
    }

    setWorkouts(workouts.filter((w) => w.id !== id));
  }

  async function shareWorkout(workout: Workout, event: React.MouseEvent) {
    event.stopPropagation();

    // Close the menu first to ensure it doesn't appear in the image
    setOpenMenuId(null);

    // Wait a moment for the menu to disappear from DOM before taking the snapshot
    await new Promise((resolve) => setTimeout(resolve, 50));

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

      // Remove action buttons and any menus from the clone
      const actionButtons = clone.querySelectorAll('.workout-menu');
      actionButtons.forEach((button) => button.remove());

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Wait for layout to stabilize
      await new Promise((resolve) => setTimeout(resolve, 200));

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
        }
      });

      document.body.removeChild(wrapper);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => resolve(blob!), 'image/png')
      );

      const filename = `${workout.name}-${format(
        new Date(workout.date),
        'yyyy-MM-dd'
      )}.png`;

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
      alert(
        'Image downloaded. (Your browser may not support copying images to the clipboard.)'
      );
    } catch (error) {
      console.error('Error sharing workout:', error);
      alert('Failed to share workout. Please try again.');
    }
  }

  function highlightText(text: string, term: string) {
    if (!term || term.length < 3) return text;
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-[#dbf111]">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  const WelcomeMessage = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Welcome to PRIFY!
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Start tracking your workouts and breaking personal records (PRs).
          Whether you're lifting heavier, running faster, or pushing harder,
          PRify helps you achieve and celebrate every milestone in your fitness
          journey.
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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
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
            )
          )}
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

  // Add a click outside handler to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId && !(event.target as Element).closest('.workout-menu')) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const toggleMenu = (workoutId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === workoutId ? null : workoutId);
  };

  if (loading && !searchLoading) {
    return (
      <>
        <Header headerType="list" />
        <div className="pt-24 px-4">
          <div className="max-w-lg mx-auto text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              Loading workouts...
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-500">
              If this takes too long, please check your internet connection and Supabase configuration.
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header headerType="list" />
      <div className="p-4">
        <div className="max-w-lg mx-auto">
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
                {period === 'all'
                  ? 'All Time'
                  : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search workouts, exercises, notes... (min 3 characters)"
                className="w-full p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#dbf111]"></div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-2">
              <div className="ml-2">
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm underline"
                >
                  Clear
                </button>
              </div>
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Type {3 - searchTerm.length} more character{3 - searchTerm.length !== 1 ? 's' : ''} to search
                </div>
              )}
              {debouncedSearchTerm && debouncedSearchTerm.length >= 3 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {totalWorkouts} result{totalWorkouts !== 1 ? 's' : ''} found
                </div>
              )}
            </div>
          </div>

          {workouts.length === 0 && !debouncedSearchTerm ? (
            <WelcomeMessage />
          ) : workouts.length === 0 && debouncedSearchTerm ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  No results found
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  No workouts match your search for "{debouncedSearchTerm}". Try a different search term or check your spelling.
                </p>
              </div>
            </div>
          ) : workouts.length === 0 && !loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Unable to load workouts
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  There seems to be a connection issue. Please check:
                </p>
                <ul className="text-left text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-1">
                  <li>• Your internet connection</li>
                  <li>• Supabase configuration in .env file</li>
                  <li>• Restart the development server</li>
                </ul>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-[#dbf111] text-black px-4 py-2 rounded-lg hover:bg-[#c5d60f]"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-12">
                {workouts.map((workout) => {
                  return (
                    <div
                      key={workout.id}
                      ref={(el) => (workoutRefs.current[workout.id] = el)}
                      onClick={() => navigate(`/workout/${workout.id}`)}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#dbf111] dark:hover:text-[#dbf111] transition-colors">
                            {highlightText(workout.name, debouncedSearchTerm)}
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(workout.date), 'MMM d, yyyy')}
                          </p>
                          {workout.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                              {highlightText(workout.notes, debouncedSearchTerm)}
                            </p>
                          )}
                        </div>
                        <div className="workout-menu relative ml-4">
                          <button
                            onClick={(e) => toggleMenu(workout.id, e)}
                            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Workout options"
                            aria-label="Workout options"
                          >
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </button>

                          {openMenuId === workout.id && (
                            <div className="absolute top-10 right-0 z-50 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 dark:shadow-[0_0_10px_rgba(219,241,17,0.15)]">
                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateWorkout(workout, e);
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                >
                                  <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                                  Duplicate
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    shareWorkout(workout, e);
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                >
                                  <ShareIcon className="h-4 w-4 mr-2" />
                                  Share
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    deleteWorkout(workout.id);
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                >
                                  <TrashIcon className="h-4 w-4 mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {workout.exercises?.length > 0 && (
                        <div className="space-y-2">
                          {workout.exercises.map((exercise) => {
                            const stats = calculateExerciseStats(exercise);

                            return (
                              <div
                                key={exercise.id}
                                className="relative flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-2 rounded mt-6"
                              >
                                <FontAwesomeIcon
                                  icon={
                                    findIconByName(
                                      exercise.icon_name || 'dumbbell'
                                    ).iconDef
                                  }
                                  className="h-4 w-4 text-gray-600 dark:text-gray-300"
                                />
                                <div className="inline-flex items-center gap-3">
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {highlightText(exercise.name, debouncedSearchTerm)}
                                  </span>
                                  <TrophyDisplay exerciseName={exercise.name} stats={stats} />
                                </div>
                                <div className="flex gap-3 ml-auto text-xs text-gray-600 dark:text-gray-300">
                                  {stats.totalReps !== null && (
                                    <span>
                                      {highlightText(
                                        `${stats.totalReps} reps`,
                                        debouncedSearchTerm
                                      )}
                                    </span>
                                  )}
                                  {stats.maxWeight !== null && (
                                    <span>
                                      {highlightText(
                                        `${stats.maxWeight} lbs`,
                                        debouncedSearchTerm
                                      )}
                                    </span>
                                  )}
                                  {stats.totalDistance !== null && (
                                    <span>
                                      {highlightText(
                                        `${stats.totalDistance} mi`,
                                        debouncedSearchTerm
                                      )}
                                    </span>
                                  )}
                                  {stats.totalDuration !== null && (
                                    <span>
                                      {highlightText(
                                        `${stats.totalDuration} min`,
                                        debouncedSearchTerm
                                      )}
                                    </span>
                                  )}
                                </div>
                                {exercise.notes && (
                                  <div className="absolute -bottom-6 left-8 text-xs text-gray-500 dark:text-gray-400">
                                    {highlightText(exercise.notes, debouncedSearchTerm)}
                                  </div>
                                )}
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
    </>
  );
}