import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ReorderDiscountCode } from '../lib/types';

/**
 * Fetch all active reorder discount codes.
 * These are looked up by cycle_number to determine what discount to show.
 */
async function fetchReorderDiscounts(): Promise<ReorderDiscountCode[]> {
  const { data, error } = await supabase
    .from('reorder_discount_codes')
    .select('*')
    .eq('is_active', true)
    .order('cycle_number');

  if (error) throw error;
  return data as ReorderDiscountCode[];
}

export function useReorderDiscounts() {
  return useQuery({
    queryKey: ['reorder-discounts'],
    queryFn: fetchReorderDiscounts,
    staleTime: 30 * 60 * 1000, // rarely changes
  });
}

/**
 * Get the discount for a specific reorder cycle.
 * Returns null if no discount applies (cycle 2+).
 */
export function getDiscountForCycle(
  discounts: ReorderDiscountCode[] | undefined,
  cycleCount: number
): ReorderDiscountCode | null {
  if (!discounts) return null;
  return discounts.find((d) => d.cycle_number === cycleCount) ?? null;
}
