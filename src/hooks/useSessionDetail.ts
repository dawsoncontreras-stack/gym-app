import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserSessionHistoryView, WorkoutSessionExercise } from '../lib/types';

type SessionDetail = {
  session: UserSessionHistoryView;
  workoutDescription: string | null;
  exercises: (WorkoutSessionExercise & {
    exercise_name: string;
    exercise_thumbnail_url: string | null;
  })[];
};

async function fetchSessionDetail(sessionId: string): Promise<SessionDetail> {
  const [sessionRes, exercisesRes] = await Promise.all([
    supabase
      .from('user_session_history_view')
      .select('*')
      .eq('session_id', sessionId)
      .single(),
    supabase
      .from('workout_session_exercises')
      .select('*, exercises:exercise_id(name, thumbnail_url)')
      .eq('session_id', sessionId)
      .order('sort_order', { ascending: true })
      .order('set_number', { ascending: true }),
  ]);

  if (sessionRes.error) throw sessionRes.error;
  if (exercisesRes.error) throw exercisesRes.error;

  const session = sessionRes.data as UserSessionHistoryView;

  // Fetch workout description
  const { data: workoutData } = await supabase
    .from('workouts')
    .select('description')
    .eq('id', session.workout_id)
    .single();

  const exercises = (exercisesRes.data as any[]).map((row) => ({
    ...row,
    exercise_name: row.exercises?.name ?? 'Unknown',
    exercise_thumbnail_url: row.exercises?.thumbnail_url ?? null,
    exercises: undefined,
  }));

  return {
    session,
    workoutDescription: workoutData?.description ?? null,
    exercises,
  };
}

export function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: () => fetchSessionDetail(sessionId!),
    enabled: !!sessionId,
  });
}
