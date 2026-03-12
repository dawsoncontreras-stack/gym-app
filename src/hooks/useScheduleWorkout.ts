import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type ScheduleInput = {
  userId: string;
  workoutId: string;
  scheduledDate: string;
  timeOfDay?: string;
  notes?: string;
};

async function scheduleWorkout(input: ScheduleInput) {
  const { data, error } = await supabase
    .from('user_scheduled_workouts')
    .insert({
      user_id: input.userId,
      workout_id: input.workoutId,
      scheduled_date: input.scheduledDate,
      time_of_day: input.timeOfDay ?? null,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useScheduleWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleWorkout,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scheduled-workouts', variables.userId],
      });
    },
  });
}
