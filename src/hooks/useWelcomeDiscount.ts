import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserWelcomeDiscount } from '../lib/types';

async function fetchWelcomeDiscount(userId: string): Promise<UserWelcomeDiscount | null> {
  const { data, error } = await supabase
    .from('user_welcome_discounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserWelcomeDiscount | null;
}

export function useWelcomeDiscount(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['welcome-discount', userId],
    queryFn: () => fetchWelcomeDiscount(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const dismiss = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('user_welcome_discounts')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['welcome-discount', userId] });
    }
  };

  return { data: query.data, isLoading: query.isLoading, dismiss };
}
