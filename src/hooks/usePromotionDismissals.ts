import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Fetch IDs of promotions this user has dismissed.
 */
async function fetchDismissedPromotionIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_promotion_dismissals')
    .select('promotion_id')
    .eq('user_id', userId);

  if (error) throw error;
  return new Set((data ?? []).map((d) => d.promotion_id));
}

export function useDismissedPromotionIds(userId: string | undefined) {
  return useQuery({
    queryKey: ['promotion-dismissals', userId],
    queryFn: () => fetchDismissedPromotionIds(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDismissPromotion() {
  const queryClient = useQueryClient();

  const dismiss = async (userId: string, promotionId: string) => {
    const { error } = await supabase
      .from('user_promotion_dismissals')
      .upsert(
        {
          user_id: userId,
          promotion_id: promotionId,
          dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,promotion_id' }
      );

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['promotion-dismissals', userId] });
    }
  };

  return { dismiss };
}
