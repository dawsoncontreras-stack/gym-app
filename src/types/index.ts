// ─── Database Types ───────────────────────────────────────────
// These types mirror the Supabase schema defined in supabase/migrations/.
// Keep them in sync when modifying the database.

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  height_inches: number | null;
  weight_lbs: number | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  training_goal: 'muscle_size' | 'strength' | 'lose_weight' | 'stay_fit' | null;
  equipment_tier: 'large_gym' | 'apartment_gym' | 'home_gym' | 'bodyweight' | null;
  sessions_per_week: number | null;
  session_duration_minutes: number | null;
  split_preference: 'balanced' | 'upper_focused' | 'lower_focused' | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  tier_available: string[];
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  image_url: string | null;
  video_url: string | null;
  movement_pattern: string;
  exercise_type: 'compound' | 'isolation' | 'cardio';
  difficulty_tier: 'beginner' | 'intermediate' | 'advanced';
  fatigue_cost: number;
  default_rep_range_low: number;
  default_rep_range_high: number;
  default_sets: number;
  default_rest_seconds: number;
  weight_increment_lbs: number;
  body_area_risk: string[] | null;
  is_active: boolean;
  created_at: string;
}

// ─── Re-exports ───────────────────────────────────────────────

export type { AuthStackParamList, MainTabParamList, OnboardingStackParamList } from './navigation';
