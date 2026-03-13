import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type SuggestionResult = {
  id: string;
  category_id: string | null;
  product_id: string;
  message_if_tracking: string | null;
  message_if_not_tracking: string | null;
  priority: number;
  product_name: string;
  product_thumbnail_url: string | null;
};

/**
 * Fetch the best supplement suggestion for a completed workout.
 * Looks up the workout's categories, finds matching suggestion rules,
 * and excludes products the user has dismissed 3+ times.
 */
async function fetchSuggestion(
  userId: string,
  workoutId: string
): Promise<SuggestionResult | null> {
  // 1. Get the workout's category IDs
  const { data: catRows, error: catError } = await supabase
    .from('workout_categories')
    .select('category_id')
    .eq('workout_id', workoutId);

  if (catError) throw catError;
  const categoryIds = catRows?.map((r) => r.category_id) ?? [];
  if (categoryIds.length === 0) return null;

  // 2. Find the best matching suggestion that hasn't been dismissed 3+ times
  const { data, error } = await supabase
    .from('workout_supplement_suggestions')
    .select(
      `
      id,
      category_id,
      product_id,
      message_if_tracking,
      message_if_not_tracking,
      priority,
      products!inner ( name, thumbnail_url )
    `
    )
    .in('category_id', categoryIds)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(10); // get a few so we can filter by dismissals

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // 3. Check dismissals for the user
  const productIds = data.map((d) => d.product_id);
  const { data: dismissals } = await supabase
    .from('user_suggestion_dismissals')
    .select('product_id, dismissal_count')
    .eq('user_id', userId)
    .in('product_id', productIds);

  const dismissalMap = new Map(
    (dismissals ?? []).map((d) => [d.product_id, d.dismissal_count])
  );

  // 4. Pick the first suggestion not dismissed 3+ times
  for (const suggestion of data) {
    const dismissCount = dismissalMap.get(suggestion.product_id) ?? 0;
    if (dismissCount < 3) {
      const product = suggestion.products as unknown as {
        name: string;
        thumbnail_url: string | null;
      };
      return {
        id: suggestion.id,
        category_id: suggestion.category_id,
        product_id: suggestion.product_id,
        message_if_tracking: suggestion.message_if_tracking,
        message_if_not_tracking: suggestion.message_if_not_tracking,
        priority: suggestion.priority,
        product_name: product.name,
        product_thumbnail_url: product.thumbnail_url,
      };
    }
  }

  return null;
}

export function useSupplementSuggestion(
  userId: string | undefined,
  workoutId: string | undefined
) {
  return useQuery({
    queryKey: ['supplement-suggestion', workoutId],
    queryFn: () => fetchSuggestion(userId!, workoutId!),
    enabled: !!userId && !!workoutId,
    staleTime: Infinity, // don't refetch during the session summary
  });
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      productId,
    }: {
      userId: string;
      productId: string;
    }) => {
      // Upsert: increment dismissal_count
      const { data: existing } = await supabase
        .from('user_suggestion_dismissals')
        .select('dismissal_count')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      const newCount = (existing?.dismissal_count ?? 0) + 1;

      const { error } = await supabase.from('user_suggestion_dismissals').upsert(
        {
          user_id: userId,
          product_id: productId,
          dismissal_count: newCount,
          last_dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate suggestion queries so dismissed ones disappear
      queryClient.invalidateQueries({ queryKey: ['supplement-suggestion'] });
    },
  });
}
