import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Workout } from '../lib/types';

async function fetchFeaturedWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('is_featured', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Workout[];
}

export function useFeaturedWorkouts() {
  return useQuery({
    queryKey: ['workouts', 'featured'],
    queryFn: fetchFeaturedWorkouts,
    staleTime: 5 * 60 * 1000,
  });
}
