import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { WorkoutSession, SessionExerciseLog } from '../lib/types';

type CreateSessionInput = {
  userId: string;
  workoutId: string;
  scheduledWorkoutId?: string;
};

type CompleteSessionInput = {
  sessionId: string;
  durationSec: number;
  totalVolumeLbs: number;
  totalSets: number;
  totalReps: number;
  rating?: number;
  notes?: string;
  exerciseLogs: SessionExerciseLog[];
};

async function createSession(input: CreateSessionInput): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: input.userId,
      workout_id: input.workoutId,
      scheduled_workout_id: input.scheduledWorkoutId ?? null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as WorkoutSession;
}

async function completeSession(input: CompleteSessionInput): Promise<WorkoutSession> {
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_sec: input.durationSec,
      total_volume_lbs: input.totalVolumeLbs,
      total_sets: input.totalSets,
      total_reps: input.totalReps,
      rating: input.rating ?? null,
      notes: input.notes ?? null,
    })
    .eq('id', input.sessionId)
    .select()
    .single();

  if (sessionError) throw sessionError;

  if (input.exerciseLogs.length > 0) {
    const rows = input.exerciseLogs.map((log) => ({
      session_id: input.sessionId,
      exercise_id: log.exercise_id,
      section_id: log.section_id,
      sort_order: log.sort_order,
      set_number: log.set_number,
      prescribed_reps: log.prescribed_reps ?? null,
      prescribed_weight_lbs: log.prescribed_weight_lbs ?? null,
      prescribed_duration_sec: log.prescribed_duration_sec ?? null,
      actual_reps: log.actual_reps ?? null,
      actual_weight_lbs: log.actual_weight_lbs ?? null,
      actual_duration_sec: log.actual_duration_sec ?? null,
      is_warmup: log.is_warmup,
      skipped: log.skipped,
    }));

    const { error: logError } = await supabase
      .from('workout_session_exercises')
      .insert(rows);

    if (logError) throw logError;
  }

  return session as WorkoutSession;
}

export function useWorkoutSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', userId] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', userId] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts', userId] });
    },
  });

  return {
    createSession: createMutation.mutate,
    createSessionAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    completeSession: completeMutation.mutate,
    completeSessionAsync: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
  };
}
