/**
 * AI Workout Generation Service
 *
 * This service handles communication with Supabase Edge Functions
 * for AI-powered workout generation.
 *
 * Future implementation:
 * - Call a Supabase Edge Function that uses an LLM to generate workouts
 * - Pass user profile, fitness goals, and workout history as context
 * - Return structured workout data matching the Workout/Exercise types
 *
 * To create the Edge Function:
 *   supabase functions new generate-workout
 *   supabase functions deploy generate-workout
 */

import { supabase } from '../lib/supabase';
import type { Workout } from '../types';

interface GenerateWorkoutParams {
  userId: string;
  muscleGroups?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes?: number;
}

/**
 * Generate an AI-powered workout via Supabase Edge Function.
 *
 * TODO: Implement the corresponding Edge Function at
 * supabase/functions/generate-workout/index.ts
 */
export async function generateWorkout(params: GenerateWorkoutParams): Promise<Workout> {
  const { data, error } = await supabase.functions.invoke('generate-workout', {
    body: params,
  });

  if (error) throw error;
  return data as Workout;
}
