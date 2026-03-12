import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserCalendarView } from '../lib/types';

async function fetchScheduledWorkouts(
  userId: string,
  weekStart: string
): Promise<UserCalendarView[]> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('user_calendar_view')
    .select('*')
    .eq('user_id', userId)
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEndStr)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data as UserCalendarView[];
}

export function useScheduledWorkouts(
  userId: string | undefined,
  weekStart: string
) {
  return useQuery({
    queryKey: ['scheduled-workouts', userId, weekStart],
    queryFn: () => fetchScheduledWorkouts(userId!, weekStart),
    enabled: !!userId && !!weekStart,
  });
}
