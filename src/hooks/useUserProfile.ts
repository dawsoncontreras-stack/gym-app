import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserProfile, FitnessGoal } from '../lib/types';

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserProfile | null;
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    staleTime: 0,
  });
}

type CreateProfileInput = {
  userId: string;
  fitnessGoal: FitnessGoal;
};

type UpdateProfileInput = {
  userId: string;
  updates: Partial<Pick<UserProfile, 'fitness_goal' | 'has_completed_onboarding' | 'preferred_units' | 'weight_tracking_hints_shown'>>;
};

export function useUserProfileMutations() {
  const queryClient = useQueryClient();

  const createProfile = useMutation({
    mutationFn: async ({ userId, fitnessGoal }: CreateProfileInput) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          fitness_goal: fitnessGoal,
          has_completed_onboarding: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-profile', data.id], data);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ userId, updates }: UpdateProfileInput) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-profile', data.id], data);
    },
  });

  return { createProfile, updateProfile };
}
