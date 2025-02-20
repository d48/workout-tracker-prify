import { Exercise } from '../types/workout';

interface ExerciseStatsProps {
  exercise: Exercise;
}

export default function ExerciseStats({ exercise }: ExerciseStatsProps) {
  const completedSets = exercise.sets.filter(set => set.completed);

  const totalReps = completedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
  const maxWeight = Math.max(...completedSets.map(set => set.weight || 0));
  const totalDistance = completedSets.reduce((sum, set) => sum + (set.distance || 0), 0);
  const totalDuration = completedSets.reduce((sum, set) => sum + (set.duration || 0), 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm">
      <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Exercise Stats</h4>
      <div className="grid grid-cols-2 gap-4">
        {totalReps > 0 && (
          <div>
            <div className="text-gray-600 dark:text-gray-300">Total Reps</div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">{totalReps}</div>
          </div>
        )}
        {maxWeight > 0 && (
          <div>
            <div className="text-gray-600 dark:text-gray-300">Max Weight</div>
            <div className="font-semibold text-green-600 dark:text-green-400">{maxWeight} lbs</div>
          </div>
        )}
        {totalDistance > 0 && (
          <div>
            <div className="text-gray-600 dark:text-gray-300">Total Distance</div>
            <div className="font-semibold text-purple-600 dark:text-purple-400">{totalDistance.toFixed(2)} mi</div>
          </div>
        )}
        {totalDuration > 0 && (
          <div>
            <div className="text-gray-600 dark:text-gray-300">Total Duration</div>
            <div className="font-semibold text-indigo-600 dark:text-indigo-400">{totalDuration} min</div>
          </div>
        )}

      </div>
    </div>
  );
}