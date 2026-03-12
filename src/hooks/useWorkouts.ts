import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DifficultyLevel, Workout } from '../lib/types';

export type WorkoutFilters = {
  difficulty?: DifficultyLevel;
  difficulties?: DifficultyLevel[];
  equipment?: string[];
  categoryIds?: string[];
  search?: string;
};

async function fetchWorkouts(filters: WorkoutFilters): Promise<Workout[]> {
  let workoutIds: string[] | undefined;

  // If filtering by category, first get the matching workout IDs
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const { data: categoryData, error: categoryError } = await supabase
      .from('workout_categories')
      .select('workout_id')
      .in('category_id', filters.categoryIds);

    if (categoryError) throw categoryError;
    workoutIds = categoryData?.map((row) => row.workout_id) ?? [];
    if (workoutIds.length === 0) return [];
  }

  let query = supabase.from('workouts').select('*');

  if (workoutIds) {
    query = query.in('id', workoutIds);
  }

  if (filters.difficulties && filters.difficulties.length > 0) {
    query = query.in('difficulty', filters.difficulties);
  } else if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters.equipment && filters.equipment.length > 0) {
    query = query.overlaps('equipment_needed', filters.equipment);
  }

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data as Workout[];
}

export function useWorkouts(filters: WorkoutFilters = {}) {
  return useQuery({
    queryKey: ['workouts', filters],
    queryFn: () => fetchWorkouts(filters),
  });
}
