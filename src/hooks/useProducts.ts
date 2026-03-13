import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data as Product[];
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
  });
}
