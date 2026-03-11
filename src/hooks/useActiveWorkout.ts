import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { WorkoutDay } from '../types';

interface SiblingWorkout {
  id: string;
  status: string;
  program_workouts: {
    id: string;
    name: string;
    day_number: number;
    sort_order: number;
  };
  exercise_count: number;
}

export interface ActiveWorkoutData {
  workout: WorkoutDay;
  weights: Map<string, number>;
  siblingWorkouts: SiblingWorkout[];
}

async function fetchActiveWorkout(userId: string, overrideWorkoutId?: string): Promise<ActiveWorkoutData | null> {
  // 1. Find the active program
  const { data: activeProgram } = await supabase
    .from('user_programs')
    .select('id, program_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!activeProgram) return null;

  // 2. Fetch the target workout (override or first pending)
  let workoutQuery = supabase
    .from('user_workouts')
    .select(`
      *,
      program_workouts(id, name, day_number, sort_order, program_id),
      user_workout_exercises(
        *,
        exercises!exercise_id(id, name, slug, movement_pattern, exercise_type, difficulty_tier, default_sets, default_rep_range_low, default_rep_range_high, default_rest_seconds)
      )
    `)
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (overrideWorkoutId) {
    workoutQuery = workoutQuery.eq('id', overrideWorkoutId);
  } else {
    workoutQuery = workoutQuery.eq('status', 'pending');
  }

  const { data: workouts, error } = await workoutQuery
    .order('sort_order', { referencedTable: 'program_workouts', ascending: true })
    .limit(1);

  if (error) throw error;
  if (!workouts || workouts.length === 0) return null;

  const workout = workouts[0] as unknown as WorkoutDay;

  // Filter out skipped exercises and sort
  workout.user_workout_exercises = (workout.user_workout_exercises ?? [])
    .filter(e => !e.is_skipped)
    .sort((a, b) => a.sort_order - b.sort_order);

  // 3. Fetch weights for all exercises in this workout
  const exerciseIds = workout.user_workout_exercises.map(e => e.exercise_id);
  const weights = new Map<string, number>();

  if (exerciseIds.length > 0) {
    const { data: weightRows } = await supabase
      .from('user_exercise_weights')
      .select('exercise_id, weight_lbs')
      .eq('user_id', userId)
      .in('exercise_id', exerciseIds);

    for (const w of (weightRows ?? [])) {
      weights.set(w.exercise_id, w.weight_lbs);
    }
  }

  // 4. Fetch sibling workouts (other pending workouts in same program, excluding current)
  const { data: siblings } = await supabase
    .from('user_workouts')
    .select(`
      id, status,
      program_workouts(id, name, day_number, sort_order),
      user_workout_exercises(id)
    `)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .eq('status', 'pending')
    .neq('id', workout.id)
    .order('sort_order', { referencedTable: 'program_workouts', ascending: true });

  const siblingWorkouts: SiblingWorkout[] = (siblings ?? []).map((s: any) => ({
    id: s.id,
    status: s.status,
    program_workouts: s.program_workouts,
    exercise_count: (s.user_workout_exercises ?? []).length,
  }));

  return { workout, weights, siblingWorkouts };
}

async function generateProgramIfNeeded(userId: string): Promise<boolean> {
  const { data: activeProgram } = await supabase
    .from('user_programs')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (activeProgram && activeProgram.length > 0) return false;

  const { error } = await supabase.functions.invoke('generate-program', {
    body: { user_id: userId },
  });

  if (error) throw error;
  return true;
}

export function useActiveWorkout(userId: string | undefined, overrideWorkoutId?: string) {
  return useQuery({
    queryKey: ['activeWorkout', userId, overrideWorkoutId],
    queryFn: async () => {
      await generateProgramIfNeeded(userId!);
      return fetchActiveWorkout(userId!, overrideWorkoutId);
    },
    enabled: !!userId,
  });
}
