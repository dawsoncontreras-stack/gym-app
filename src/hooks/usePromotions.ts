import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Promotion } from '../lib/types';

async function fetchActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .gte('ends_at', new Date().toISOString());

  if (error) throw error;
  return data as Promotion[];
}

export function usePromotions() {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: fetchActivePromotions,
    staleTime: 5 * 60 * 1000,
  });
}
