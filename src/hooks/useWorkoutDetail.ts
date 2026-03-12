import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { WorkoutDetail } from '../lib/types';

async function fetchWorkoutDetail(workoutId: string): Promise<WorkoutDetail> {
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (workoutError) throw workoutError;

  const { data: categories, error: catError } = await supabase
    .from('workout_categories')
    .select('category:categories(*)')
    .eq('workout_id', workoutId);

  if (catError) throw catError;

  const { data: sections, error: secError } = await supabase
    .from('workout_sections')
    .select(
      `
      *,
      exercises:workout_section_exercises(
        *,
        exercise:exercises(*)
      )
    `
    )
    .eq('workout_id', workoutId)
    .order('sort_order', { ascending: true });

  if (secError) throw secError;

  const sortedSections = (sections ?? []).map((section) => ({
    ...section,
    exercises: [...(section.exercises ?? [])].sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    ),
  }));

  return {
    ...workout,
    categories: (categories ?? []).map((row: { category: unknown }) => row.category),
    sections: sortedSections,
  } as WorkoutDetail;
}

export function useWorkoutDetail(workoutId: string | undefined) {
  return useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => fetchWorkoutDetail(workoutId!),
    enabled: !!workoutId,
  });
}
