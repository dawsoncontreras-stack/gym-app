import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserSavedWorkout, Workout } from '../lib/types';

type SavedWorkoutWithWorkout = UserSavedWorkout & { workout: Workout };

async function fetchSavedWorkouts(userId: string): Promise<SavedWorkoutWithWorkout[]> {
  const { data, error } = await supabase
    .from('user_saved_workouts')
    .select('*, workout:workouts(*)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (error) throw error;
  return data as SavedWorkoutWithWorkout[];
}

async function saveWorkout(userId: string, workoutId: string): Promise<UserSavedWorkout> {
  const { data, error } = await supabase
    .from('user_saved_workouts')
    .insert({ user_id: userId, workout_id: workoutId })
    .select()
    .single();

  if (error) throw error;
  return data as UserSavedWorkout;
}

async function unsaveWorkout(userId: string, workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('user_saved_workouts')
    .delete()
    .eq('user_id', userId)
    .eq('workout_id', workoutId);

  if (error) throw error;
}

export function useSavedWorkouts(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['saved-workouts', userId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSavedWorkouts(userId!),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: (workoutId: string) => saveWorkout(userId!, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (workoutId: string) => unsaveWorkout(userId!, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...query,
    saveWorkout: saveMutation.mutate,
    unsaveWorkout: unsaveMutation.mutate,
    isSaving: saveMutation.isPending,
    isUnsaving: unsaveMutation.isPending,
  };
}
