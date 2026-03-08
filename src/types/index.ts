// ─── Database Types ───────────────────────────────────────────
// These types mirror the Supabase schema defined in supabase/migrations/.
// Keep them in sync when modifying the database.

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  instructions: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Re-exports ───────────────────────────────────────────────

export type { AuthStackParamList, MainTabParamList } from './navigation';
