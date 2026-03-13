import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StackStatusView } from '../lib/types';

async function fetchUserStack(userId: string): Promise<StackStatusView[]> {
  const { data, error } = await supabase
    .from('user_stack_status_view')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data as StackStatusView[];
}

export function useUserStack(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-stack', userId],
    queryFn: () => fetchUserStack(userId!),
    enabled: !!userId,
    staleTime: 0,
  });
}
