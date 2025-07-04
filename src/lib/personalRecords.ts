import { supabase } from './supabase';
import { Database } from '../types/supabase';

type PersonalRecord = Database['public']['Tables']['personal_records']['Row'];
type PersonalRecordInsert = Database['public']['Tables']['personal_records']['Insert'];

export interface ExerciseStats {
  totalReps: number | null;
  maxWeight: number | null;
  totalDistance: number | null;
  totalDuration: number | null;
}

export interface RecordResult {
  isRecord: boolean;
  recordType: string[];
  previousValue?: number;
}

export async function checkAndUpdatePersonalRecords(
  exerciseName: string,
  stats: ExerciseStats,
  workoutId: string,
  workoutDate: string
): Promise<RecordResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user found');

  const recordTypes: string[] = [];
  let isRecord = false;

  // Check each metric for records
  const metricsToCheck = [
    { type: 'reps', value: stats.totalReps },
    { type: 'weight', value: stats.maxWeight },
    { type: 'distance', value: stats.totalDistance },
    { type: 'duration', value: stats.totalDuration }
  ];

  for (const metric of metricsToCheck) {
    if (metric.value === null || metric.value <= 0) continue;

    // Get current record for this exercise and metric
    const { data: currentRecords } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_name', exerciseName)
      .eq('record_type', metric.type);

    const currentRecord = currentRecords && currentRecords.length > 0 ? currentRecords[0] : null;

    // If no record exists or new value is better, update record
    if (!currentRecord || metric.value > currentRecord.value) {
      const recordData: PersonalRecordInsert = {
        user_id: user.id,
        exercise_name: exerciseName,
        record_type: metric.type,
        value: metric.value,
        workout_id: workoutId,
        achieved_at: workoutDate
      };

      await supabase
        .from('personal_records')
        .upsert(recordData, {
          onConflict: 'user_id,exercise_name,record_type'
        });

      recordTypes.push(metric.type);
      isRecord = true;
    }
  }

  return {
    isRecord,
    recordType: recordTypes
  };
}

export async function getPersonalRecordsForWorkout(
  workoutId: string
): Promise<Record<string, string[]>> {
  const { data: records } = await supabase
    .from('personal_records')
    .select('exercise_name, record_type')
    .eq('workout_id', workoutId);

  if (!records) return {};

  const recordMap: Record<string, string[]> = {};
  records.forEach(record => {
    if (!recordMap[record.exercise_name]) {
      recordMap[record.exercise_name] = [];
    }
    recordMap[record.exercise_name].push(record.record_type);
  });

  return recordMap;
}

export async function getUserPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const { data: records, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false });

  if (error) throw error;
  return records || [];
}