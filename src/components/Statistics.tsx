import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
  parseISO,
  eachDayOfInterval,
  isSameDay
} from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Database } from '../types/supabase';
import prifyLogo from '../images/prify-logo.svg';
import { Link } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import ThemeToggle from './ThemeToggle';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type Workout = Database['public']['Tables']['workouts']['Row'] & {
  exercises: Array<{
    name: string;
    sets: Array<{
      reps: number | null;
      weight: number | null;
      distance: number | null;
      completed: boolean;
    }>;
  }>;
};

interface ExerciseData {
  name: string;
  data: Array<{
    date: Date;
    value: number;
  }>;
  hasData: boolean;
}

type MetricType = 'reps' | 'weight' | 'distance';
type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

export default function Statistics() {
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalExercises: 0,
    completionRate: 0
  });
  const [period, setPeriod] = useState<PeriodType>('week');
  const [exerciseData, setExerciseData] = useState<ExerciseData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('reps');

  useEffect(() => {
    fetchStatistics();
  }, [period, selectedMetric]);

  async function fetchStatistics() {
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
    }

    const { data: workouts, error } = await supabase
      .from('workouts')
      .select(`
        *,
        exercises (
          *,
          sets (*)
        )
      `)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching workouts:', error);
      return;
    }

    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const exerciseMap = new Map<string, ExerciseData>();

    (workouts as Workout[]).forEach(workout => {
      const workoutDate = parseISO(workout.date);

      workout.exercises.forEach(exercise => {
        if (!exerciseMap.has(exercise.name)) {
          exerciseMap.set(exercise.name, {
            name: exercise.name,
            data: dateRange.map(date => ({
              date,
              value: 0
            })),
            hasData: false
          });
        }

        const exerciseStats = exerciseMap.get(exercise.name)!;
        const dateIndex = exerciseStats.data.findIndex(d => isSameDay(d.date, workoutDate));
        
        if (dateIndex === -1) return;

        let value = 0;
        exercise.sets.forEach(set => {
          if (set.completed) {
            if (selectedMetric === 'reps' && set.reps) {
              value += set.reps;
            } else if (selectedMetric === 'weight' && set.weight) {
              value = Math.max(value, set.weight);
            } else if (selectedMetric === 'distance' && set.distance) {
              value += set.distance;
            }
          }
        });

        if (value > 0) {
          exerciseStats.data[dateIndex].value = value;
          exerciseStats.hasData = true;
        }
      });
    });

    const filteredExerciseData = Array.from(exerciseMap.values())
      .filter(exercise => exercise.hasData);

    setExerciseData(filteredExerciseData);

    let totalSets = 0;
    let completedSets = 0;

    (workouts as Workout[]).forEach(workout => {
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          totalSets++;
          if (set.completed) completedSets++;
        });
      });
    });

    setStats({
      totalWorkouts: workouts.length,
      totalExercises: filteredExerciseData.length,
      completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
    });
  }

  const chartData = {
    labels: exerciseData[0]?.data.map(d => format(d.date, 'MMM d')) || [],
    datasets: exerciseData.map((exercise, index) => ({
      label: exercise.name,
      data: exercise.data.map(d => d.value || null),
      borderColor: `hsl(${index * 137.5}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 137.5}, 70%, 50%, 0.5)`,
      tension: 0.1,
      pointRadius: 6,
      pointHoverRadius: 8,
      spanGaps: true
    }))
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          },
          color: theme === 'dark' ? '#fff' : '#000'
        }
      },
      title: {
        display: true,
        text: selectedMetric === 'reps' ? 'Total Reps per Exercise' :
              selectedMetric === 'weight' ? 'Max Weight per Exercise (lbs)' :
              'Total Distance per Exercise (mi)',
        font: {
          size: 14
        },
        color: theme === 'dark' ? '#fff' : '#000'
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: selectedMetric === 'reps' ? 'Reps' :
                selectedMetric === 'weight' ? 'Weight (lbs)' :
                'Distance (mi)',
          color: theme === 'dark' ? '#fff' : '#000'
        },
        ticks: {
          font: {
            size: 11
          },
          color: theme === 'dark' ? '#fff' : '#000'
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        type: 'category' as const,
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45,
          color: theme === 'dark' ? '#fff' : '#000'
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/">
              <img 
                src={prifyLogo}
                alt="PRIFY Workout Tracker" 
                className="h-16 cursor-pointer"
              />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="pt-24">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Statistics</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['today', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                period === p 
                  ? 'bg-[#dbf111] text-black' 
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalWorkouts}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Workouts</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalExercises}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Exercises</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.completionRate}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Completion</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exercise Performance</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMetric('reps')}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedMetric === 'reps' 
                    ? 'bg-[#dbf111] text-black' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Reps
              </button>
              <button
                onClick={() => setSelectedMetric('weight')}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedMetric === 'weight' 
                    ? 'bg-[#dbf111] text-black' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Weight
              </button>
              <button
                onClick={() => setSelectedMetric('distance')}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedMetric === 'distance' 
                    ? 'bg-[#dbf111] text-black' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Distance
              </button>
            </div>
          </div>
          <div className="h-[400px] sm:h-[500px]">
            {exerciseData.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data available for selected metric
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}