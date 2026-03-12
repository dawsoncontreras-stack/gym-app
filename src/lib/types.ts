// ============================================================================
// Database Enums
// ============================================================================

export type ExerciseTrackingType = 'timed' | 'reps' | 'weighted';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type SectionType = 'circuit' | 'straight_set';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

// ============================================================================
// Content Types (from the workout library)
// ============================================================================

export type Exercise = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  muscle_groups: string[];
  equipment: string[];
  default_tracking_type: ExerciseTrackingType;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  display_order: number;
  icon_url: string | null;
  created_at: string;
};

export type Workout = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  difficulty: DifficultyLevel;
  estimated_minutes: number;
  equipment_needed: string[];
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutSection = {
  id: string;
  workout_id: string;
  title: string | null;
  section_type: SectionType;
  rounds: number;
  rest_between_rounds_sec: number | null;
  sort_order: number;
};

export type WorkoutSectionExercise = {
  id: string;
  section_id: string;
  exercise_id: string;
  sort_order: number;
  tracking_type: ExerciseTrackingType | null;
  duration_sec: number | null;
  sets: number | null;
  reps: number | null;
  weight_lbs: number | null;
  rest_after_sec: number | null;
  notes: string | null;
};

// ============================================================================
// Joined Types (for detail/player screens)
// ============================================================================

export type WorkoutDetail = Workout & {
  categories: Category[];
  sections: (WorkoutSection & {
    exercises: (WorkoutSectionExercise & { exercise: Exercise })[];
  })[];
};

// ============================================================================
// User Types
// ============================================================================

export type UserSavedWorkout = {
  user_id: string;
  workout_id: string;
  saved_at: string;
};

export type UserScheduledWorkout = {
  id: string;
  user_id: string;
  workout_id: string;
  scheduled_date: string;
  time_of_day: string | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  workout_id: string;
  scheduled_workout_id: string | null;
  started_at: string;
  completed_at: string | null;
  status: SessionStatus;
  duration_sec: number | null;
  total_volume_lbs: number | null;
  total_sets: number | null;
  total_reps: number | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutSessionExercise = {
  id: string;
  session_id: string;
  exercise_id: string;
  section_id: string | null;
  sort_order: number;
  set_number: number;
  prescribed_reps: number | null;
  prescribed_weight_lbs: number | null;
  prescribed_duration_sec: number | null;
  actual_reps: number | null;
  actual_weight_lbs: number | null;
  actual_duration_sec: number | null;
  is_warmup: boolean;
  skipped: boolean;
  created_at: string;
};

// ============================================================================
// View Types
// ============================================================================

export type UserCalendarView = {
  scheduled_id: string;
  user_id: string;
  scheduled_date: string;
  time_of_day: string | null;
  schedule_notes: string | null;
  workout_id: string;
  workout_title: string;
  difficulty: DifficultyLevel;
  estimated_minutes: number;
  thumbnail_url: string | null;
  session_id: string | null;
  session_status: SessionStatus | null;
  completed_at: string | null;
  rating: number | null;
  is_completed: boolean;
};

export type UserSessionHistoryView = {
  session_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: SessionStatus;
  duration_sec: number | null;
  total_volume_lbs: number | null;
  total_sets: number | null;
  total_reps: number | null;
  rating: number | null;
  session_notes: string | null;
  workout_id: string;
  workout_title: string;
  difficulty: DifficultyLevel;
  thumbnail_url: string | null;
};

// ============================================================================
// Player Types (client-side only)
// ============================================================================

export type PlayerStep = {
  type: 'exercise' | 'rest' | 'round_rest';
  exercise?: WorkoutSectionExercise & { exercise: Exercise };
  section?: WorkoutSection;
  durationSec?: number;
  setNumber?: number;
  totalSets?: number;
  roundNumber?: number;
  totalRounds?: number;
};

export type SessionExerciseLog = {
  exercise_id: string;
  section_id: string;
  sort_order: number;
  set_number: number;
  prescribed_reps?: number;
  prescribed_weight_lbs?: number;
  prescribed_duration_sec?: number;
  actual_reps?: number;
  actual_weight_lbs?: number;
  actual_duration_sec?: number;
  is_warmup: boolean;
  skipped: boolean;
};
