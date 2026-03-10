import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

/**
 * Example React Query hook demonstrating the pattern for fetching
 * Supabase data. All server state should follow this pattern:
 *
 * 1. Define a fetch function that calls Supabase
 * 2. Wrap it in useQuery with a descriptive queryKey
 * 3. Export the hook for use in components
 *
 * To invalidate/refetch after mutations, use:
 *   queryClient.invalidateQueries({ queryKey: ['profile', userId] })
 */

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // PGRST116 = no rows returned — profile not created yet (e.g. new OAuth user)
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}
