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

    // Only update if this is actually a new record (higher value)
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
): Promise<Record<string, { recordTypes: string[], values: Record<string, number> }>> {
  const { data: records, error } = await supabase
    .from('personal_records')
    .select('exercise_name, record_type, value')
    .eq('workout_id', workoutId);

  if (error || !records) return {};

  const recordMap: Record<string, { recordTypes: string[], values: Record<string, number> }> = {};
  records.forEach(record => {
    if (!recordMap[record.exercise_name]) {
      recordMap[record.exercise_name] = {
        recordTypes: [],
        values: {}
      };
    }
    recordMap[record.exercise_name].recordTypes.push(record.record_type);
    recordMap[record.exercise_name].values[record.record_type] = record.value;
  });

  return recordMap;
}

export async function checkIfExerciseHasRecords(
  exerciseName: string,
  stats: ExerciseStats
): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: records } = await supabase
    .from('personal_records')
    .select('record_type, value')
    .eq('user_id', user.id)
    .eq('exercise_name', exerciseName);

  if (!records) return [];

  const recordTypes: string[] = [];
  
  records.forEach(record => {
    let currentValue: number | null = null;
    
    switch (record.record_type) {
      case 'reps':
        currentValue = stats.totalReps;
        break;
      case 'weight':
        currentValue = stats.maxWeight;
        break;
      case 'distance':
        currentValue = stats.totalDistance;
        break;
      case 'duration':
        currentValue = stats.totalDuration;
        break;
    }
    
    // Only show trophy if the current exercise stats match the personal record value
    if (currentValue !== null && currentValue === record.value) {
      recordTypes.push(record.record_type);
    }
  });

  return recordTypes;
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