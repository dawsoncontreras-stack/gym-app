import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DoseLog, DoseSource, StackStatusView } from '../lib/types';

/** Fetch today's dose logs for a user */
async function fetchTodaysDoseLogs(userId: string): Promise<DoseLog[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', today);

  if (error) throw error;
  return data as DoseLog[];
}

export function useTodaysDoseLogs(userId: string | undefined) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['dose-logs', userId, today],
    queryFn: () => fetchTodaysDoseLogs(userId!),
    enabled: !!userId,
    staleTime: 0,
  });
}

function invalidateDoseLogs(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  queryClient.invalidateQueries({ queryKey: ['dose-logs', userId, today] });
  queryClient.invalidateQueries({ queryKey: ['user-stack', userId] });
}

/** Optimistically flip taken_today for a stack item in the cache */
function optimisticToggle(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  stackItemId: string,
  newValue: boolean
) {
  const queryKey = ['user-stack', userId];
  const previousData = queryClient.getQueryData<StackStatusView[]>(queryKey);

  if (previousData) {
    queryClient.setQueryData<StackStatusView[]>(queryKey, (old) =>
      old?.map((item) =>
        item.stack_item_id === stackItemId
          ? { ...item, taken_today: newValue }
          : item
      )
    );
  }

  return previousData;
}

export function useDoseLogMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      stackItemId,
      source,
    }: {
      userId: string;
      stackItemId: string;
      source: DoseSource;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase.from('dose_logs').upsert(
        {
          user_id: userId,
          stack_item_id: stackItemId,
          logged_date: today,
          source,
        },
        { onConflict: 'stack_item_id,logged_date' }
      );

      if (error) throw error;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['user-stack', variables.userId] });
      const previousData = optimisticToggle(queryClient, variables.userId, variables.stackItemId, true);
      return { previousData };
    },
    onError: (_err, variables, context) => {
      // Roll back on error
      if (context?.previousData) {
        queryClient.setQueryData(['user-stack', variables.userId], context.previousData);
      }
    },
    onSettled: (_data, _err, variables) => {
      invalidateDoseLogs(queryClient, variables.userId);
    },
  });
}

export function useDoseLogDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      stackItemId,
    }: {
      userId: string;
      stackItemId: string;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('dose_logs')
        .delete()
        .eq('user_id', userId)
        .eq('stack_item_id', stackItemId)
        .eq('logged_date', today);

      if (error) throw error;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['user-stack', variables.userId] });
      const previousData = optimisticToggle(queryClient, variables.userId, variables.stackItemId, false);
      return { previousData };
    },
    onError: (_err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['user-stack', variables.userId], context.previousData);
      }
    },
    onSettled: (_data, _err, variables) => {
      invalidateDoseLogs(queryClient, variables.userId);
    },
  });
}
