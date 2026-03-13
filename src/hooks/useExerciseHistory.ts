import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type ExerciseHistoryEntry = {
  exercise_id: string;
  last_weight_lbs: number | null;
  last_reps: number | null;
  last_duration_sec: number | null;
  last_performed_at: string;
};

/**
 * Fetch the user's exercise history for a set of exercise IDs.
 * Returns a map of exerciseId → last recorded values.
 * Used by the workout player to pre-fill weight inputs.
 */
async function fetchExerciseHistory(
  userId: string,
  exerciseIds: string[]
): Promise<Map<string, ExerciseHistoryEntry>> {
  if (exerciseIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('user_exercise_history')
    .select('exercise_id, last_weight_lbs, last_reps, last_duration_sec, last_performed_at')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds);

  if (error) throw error;

  const map = new Map<string, ExerciseHistoryEntry>();
  for (const entry of data ?? []) {
    map.set(entry.exercise_id, entry as ExerciseHistoryEntry);
  }
  return map;
}

export function useExerciseHistory(
  userId: string | undefined,
  exerciseIds: string[] | undefined
) {
  // Create a stable key from the sorted exercise IDs
  const idsKey = exerciseIds?.slice().sort().join(',') ?? '';

  return useQuery({
    queryKey: ['exercise-history', userId, idsKey],
    queryFn: () => fetchExerciseHistory(userId!, exerciseIds!),
    enabled: !!userId && !!exerciseIds && exerciseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
