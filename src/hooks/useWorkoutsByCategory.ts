import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Workout } from '../lib/types';

async function fetchWorkoutsByCategory(categoryId: string): Promise<Workout[]> {
  const { data: links, error: linkError } = await supabase
    .from('workout_categories')
    .select('workout_id')
    .eq('category_id', categoryId);

  if (linkError) throw linkError;

  const workoutIds = (links ?? []).map((row) => row.workout_id);
  if (workoutIds.length === 0) return [];

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .in('id', workoutIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Workout[];
}

export function useWorkoutsByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['workouts', 'category', categoryId],
    queryFn: () => fetchWorkoutsByCategory(categoryId!),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}
