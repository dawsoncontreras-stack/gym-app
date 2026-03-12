import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserSessionHistoryView } from '../lib/types';

async function fetchSessionHistory(userId: string): Promise<UserSessionHistoryView[]> {
  const { data, error } = await supabase
    .from('user_session_history_view')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data as UserSessionHistoryView[];
}

export function useSessionHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', userId],
    queryFn: () => fetchSessionHistory(userId!),
    enabled: !!userId,
  });
}
