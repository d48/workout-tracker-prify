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
  try {
    // Check if Supabase client is properly configured
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return [];
    }

    // Test connection before making requests
    try {
      const { error: connectionError } = await supabase.auth.getSession();
      if (connectionError && connectionError.message.includes('Failed to fetch')) {
        console.warn('Supabase connection issue detected, skipping record check');
        return [];
      }
    } catch (connectionError) {
      console.warn('Unable to test Supabase connection, skipping record check');
      return [];
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      
      // If it's a network error, provide more specific guidance
      if (authError.message?.includes('Failed to fetch') || authError.message?.includes('fetch')) {
        console.warn('Network connectivity issue detected while checking records');
      }
      
      return [];
    }
    
    if (!user) {
      console.warn('No authenticated user found - user may need to sign in');
      return [];
    }

    const { data: records, error } = await supabase
      .from('personal_records')
      .select('record_type, value')
      .eq('user_id', user.id)
      .eq('exercise_name', exerciseName);

    if (error) {
      console.error('Error fetching personal records:', error);
      
      // Handle network errors gracefully
      if (error.message?.includes('Failed to fetch')) {
        console.warn('Network error while fetching personal records, skipping trophy display');
      }
      
      return [];
    }
  
    if (!records || records.length === 0) return [];

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
    
      // Only show trophy if the current exercise stats exactly match the personal record value
      // Use Number() to ensure proper comparison of numeric values
      if (currentValue !== null && Number(currentValue) === Number(record.value)) {
        recordTypes.push(record.record_type);
      }
    });

    return recordTypes;
  } catch (error) {
    console.error('Unexpected error in checkIfExerciseHasRecords:', error);
    
    // Check if it's a network error
    if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('fetch'))) {
      console.warn('Network error while checking personal records, skipping trophy display');
    }
    
    return [];
  }
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