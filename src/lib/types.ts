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

// ============================================================================
// Supplement Enums
// ============================================================================

export type StackItemStatus = 'arriving' | 'active' | 'running_low' | 'reorder' | 'archived';
export type FitnessGoal = 'build_muscle' | 'lose_fat' | 'stay_active' | 'general_health';
export type DoseSource = 'home' | 'post_workout' | 'notification' | 'stack_screen' | 'calendar';

// ============================================================================
// Supplement Types
// ============================================================================

export type Product = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  default_days_supply: number;
  shopify_url: string | null;
  price_cents: number | null;
  education_markdown: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  fitness_goal: FitnessGoal | null;
  has_completed_onboarding: boolean;
  preferred_units: 'lbs' | 'kg';
  weight_tracking_hints_shown: number;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
};

export type UserStackItem = {
  id: string;
  user_id: string;
  product_id: string;
  status: StackItemStatus;
  activated_at: string | null;
  days_supply: number;
  estimated_depletion_date: string | null;
  reorder_cycle_count: number;
  reorder_entered_at: string | null;
  last_reorder_notified_at: string | null;
  reorder_notification_count: number;
  created_at: string;
  updated_at: string;
};

export type DoseLog = {
  id: string;
  user_id: string;
  stack_item_id: string;
  logged_date: string;
  logged_at: string;
  source: DoseSource;
};

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_code: string;
  discount_label: string | null;
  product_ids: string[] | null;
  starts_at: string;
  ends_at: string;
  shopify_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type WorkoutSupplementSuggestion = {
  id: string;
  category_id: string | null;
  product_id: string;
  message_if_tracking: string | null;
  message_if_not_tracking: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
};

export type UserSuggestionDismissal = {
  id: string;
  user_id: string;
  product_id: string;
  dismissal_count: number;
  last_dismissed_at: string;
};

export type UserWelcomeDiscount = {
  user_id: string;
  discount_code: string;
  shown_at: string;
  dismissed_at: string | null;
  created_at: string;
};

export type UserPromotionDismissal = {
  user_id: string;
  promotion_id: string;
  dismissed_at: string;
};

export type ReorderDiscountCode = {
  id: string;
  cycle_number: number;
  discount_code: string;
  discount_label: string;
  is_active: boolean;
  created_at: string;
};

// ============================================================================
// Supplement View Types
// ============================================================================

export type StackStatusView = {
  stack_item_id: string;
  user_id: string;
  status: 'arriving' | 'active' | 'running_low' | 'reorder';
  activated_at: string | null;
  days_supply: number;
  estimated_depletion_date: string | null;
  reorder_cycle_count: number;
  days_remaining: number | null;
  days_elapsed: number | null;
  taken_today: boolean;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  product_thumbnail_url: string | null;
  product_shopify_url: string | null;
};

export type UserAdherenceView = {
  stack_item_id: string;
  user_id: string;
  product_name: string;
  trackable_days: number;
  logged_days: number;
  adherence_pct: number;
};

export type ArchivedStackView = {
  stack_item_id: string;
  user_id: string;
  reorder_entered_at: string | null;
  reorder_cycle_count: number;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  product_thumbnail_url: string | null;
};

// ============================================================================
// Monthly Recap (client-side computed)
// ============================================================================

export type MonthlyRecap = {
  workoutCount: number;
  totalVolume: number;
  volumeChangePercent: number | null;
  supplementAdherence: { productName: string; daysLogged: number; totalDays: number }[];
  longestStack: { productName: string; weeks: number } | null;
  month: string;
};
