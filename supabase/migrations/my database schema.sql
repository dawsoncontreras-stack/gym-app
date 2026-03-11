-- ============================================================
-- WORKOUT APP - SUPABASE/POSTGRES SCHEMA (v3)
-- ============================================================


-- ============================================================
-- 1. REFERENCE TABLES (no foreign key dependencies)
-- ============================================================

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- 'barbell', 'dumbbells', 'cable_machine', 'pull_up_bar', 'bench', 'bands', etc.
  tier_available text[] not null
  -- which equipment tiers have this by default: {'large_gym','apartment_gym'}
);

create table public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- 'chest', 'front_delts', 'triceps', 'quads', 'hamstrings', etc.
  region text not null check (region in ('upper', 'lower', 'core'))
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null, -- url/reference friendly name
  description text,
  instructions text,
  image_url text,
  video_url text,
  movement_pattern text not null check (movement_pattern in (
    'horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull',
    'squat', 'hinge', 'lunge', 'carry', 'isolation',
    'core', 'cardio', 'plyometric'
  )),
  exercise_type text not null check (exercise_type in ('compound', 'isolation', 'cardio')),
  difficulty_tier text not null check (difficulty_tier in ('beginner', 'intermediate', 'advanced')),
  fatigue_cost int not null default 3 check (fatigue_cost between 1 and 5),
  -- 1 = light isolation, 5 = heavy compound (deadlift, squat)
  default_rep_range_low int not null default 8,
  default_rep_range_high int not null default 12,
  default_sets int not null default 3,
  default_rest_seconds int not null default 60,
  weight_increment_lbs numeric not null default 5,
  -- smallest meaningful jump for this exercise
  body_area_risk text[], -- ['shoulders', 'lower_back'] → cross-ref with user_limitations
  is_active boolean default true,
  created_at timestamptz default now()
);

-- achievement definitions (seeded, not user-created)
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,  -- 'first_workout', 'bench_100lbs', '30_day_streak'
  name text not null,
  description text,
  icon_url text,
  category text not null check (category in (
    'milestone',    -- first workout, 10th workout, 100th workout
    'strength',     -- hit a weight target on a lift
    'consistency',  -- streak-based (7 days, 30 days, etc.)
    'volume',       -- total weight lifted milestones
    'exploration'   -- tried N different exercises, completed a program
  )),
  criteria jsonb not null,
  -- flexible criteria for unlock logic, e.g.:
  -- { "type": "workout_count", "threshold": 100 }
  -- { "type": "exercise_1rm", "exercise_slug": "barbell_bench_press", "threshold_lbs": 100 }
  -- { "type": "streak_days", "threshold": 30 }
  -- { "type": "total_volume_lbs", "threshold": 100000 }
  is_active boolean default true,
  created_at timestamptz default now()
);


-- ============================================================
-- 2. EXERCISE RELATIONSHIPS (depend on reference tables only)
-- ============================================================

-- which muscles an exercise works
create table public.exercise_muscle_groups (
  exercise_id uuid references public.exercises(id) on delete cascade,
  muscle_group_id uuid references public.muscle_groups(id) on delete cascade,
  role text not null check (role in ('primary', 'secondary')),
  primary key (exercise_id, muscle_group_id)
);

-- which equipment an exercise can use (many-to-many)
create table public.exercise_equipment (
  exercise_id uuid references public.exercises(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete cascade,
  is_required boolean default true,
  -- true = must have, false = optional/enhances
  primary key (exercise_id, equipment_id)
);

-- exercise alternatives for swapping (bidirectional)
-- always store with exercise_id < alternative_id to avoid duplicates
-- query both directions: WHERE exercise_id = X OR alternative_id = X
create table public.exercise_alternatives (
  exercise_id uuid references public.exercises(id) on delete cascade,
  alternative_id uuid references public.exercises(id) on delete cascade,
  similarity_score numeric default 0.5 check (similarity_score between 0 and 1),
  -- 1.0 = near identical swap, 0.5 = same pattern different feel
  primary key (exercise_id, alternative_id),
  constraint ordered_pair check (exercise_id < alternative_id)
);

-- helper view for easy bidirectional alternative lookups
create view public.exercise_alternatives_bidirectional as
  select exercise_id as source_id, alternative_id as target_id, similarity_score
    from public.exercise_alternatives
  union all
  select alternative_id as source_id, exercise_id as target_id, similarity_score
    from public.exercise_alternatives;

-- strength relationships between exercises
create table public.strength_ratios (
  id uuid primary key default gen_random_uuid(),
  base_exercise_id uuid references public.exercises(id) on delete cascade,
  related_exercise_id uuid references public.exercises(id) on delete cascade,
  ratio numeric not null,
  -- related weight ≈ base weight × ratio
  -- e.g. bench → OHP ratio ~0.65, bench → incline DB ~0.35
  gender text check (gender in ('male', 'female')),
  -- ratios can differ by gender, null = universal fallback
  unique (base_exercise_id, related_exercise_id, gender)
);


-- ============================================================
-- 3. USER & PROFILE (depend on auth.users)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  age int,
  gender text check (gender in ('male', 'female')),
  height_inches numeric,
  weight_lbs numeric,
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  -- beginner = <6mo, intermediate = 6mo-2yr, advanced = 2yr+
  training_goal text check (training_goal in ('muscle_size', 'strength', 'lose_weight', 'stay_fit')),
  equipment_tier text check (equipment_tier in ('large_gym', 'apartment_gym', 'home_gym', 'bodyweight')),
  sessions_per_week int,
  session_duration_minutes int, -- 15, 30, 45, 60
  split_preference text check (split_preference in ('balanced', 'upper_focused', 'lower_focused')),
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- limitations/injuries selected during onboarding
create table public.user_limitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  body_area text not null, -- 'shoulders', 'lower_back', 'knees', 'wrists', 'neck', etc.
  severity text default 'avoid' check (severity in ('avoid', 'caution')),
  notes text,
  created_at timestamptz default now()
);

-- custom equipment for apartment_gym / home_gym / bodyweight users
create table public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete cascade,
  unique (user_id, equipment_id)
);

-- per-user notification and app preferences
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  units text not null default 'imperial' check (units in ('metric', 'imperial')),
  rest_timer_enabled boolean default true,
  rest_timer_sound boolean default true,
  rest_timer_vibrate boolean default true,
  notify_workout_reminder boolean default true,
  notify_streak_at_risk boolean default true,
  notify_milestone_reached boolean default true,
  notify_weight_increase boolean default true,
  notify_deload_suggestion boolean default true,
  notify_program_complete boolean default true,
  reminder_time time default '08:00',
  reminder_days_before int default 0, -- 0 = day of workout
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- anchor lifts asked during onboarding
create table public.user_anchor_lifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  weight_lbs numeric not null,
  rep_count int not null default 10, -- "what do you use for 8-10 reps"
  created_at timestamptz default now(),
  unique (user_id, exercise_id)
);

-- tracks estimated and actual working weights per user per exercise
create table public.user_exercise_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  weight_lbs numeric not null,
  source text not null check (source in ('estimated', 'user_adjusted', 'logged')),
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  -- estimated = 0.3, user_adjusted = 0.6, logged = 0.9
  last_updated_at timestamptz default now(),
  unique (user_id, exercise_id)
);

-- historical log of weight changes per exercise (never deleted, append-only)
create table public.user_exercise_weight_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  weight_lbs numeric not null,
  source text not null check (source in ('estimated', 'user_adjusted', 'logged')),
  recorded_at timestamptz default now()
);

-- user exercise preferences
create table public.user_exercise_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  preference text not null check (preference in (
    'recommend_more',    -- user likes this, weight it higher
    'recommend_less',    -- user doesn't love it, deprioritize
    'never_recommend'    -- never include in generated workouts
  )),
  created_at timestamptz default now(),
  unique (user_id, exercise_id)
);

-- Auto-create a profile row when a new user signs up.
-- This ensures OAuth users (Google, Apple) have a profile row
-- immediately, which is needed for RLS policies and the
-- onboarding flow check in the app.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 4. PROGRAMS (depend on profiles, exercises)
-- ============================================================

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  training_goal text not null,
  experience_level text not null,
  equipment_tier text not null,
  sessions_per_week int not null,
  duration_weeks int,
  is_curated boolean default false, -- true = hand-built preset
  is_public boolean default false, -- true = shareable
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- each workout day within a program
create table public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  day_number int not null, -- day 1, 2, 3... within the week cycle
  name text, -- 'Push Day', 'Leg Day', etc.
  sort_order int not null,
  phase text check (phase in ('ramp_up', 'building', 'peak', 'deload', 'testing'))
  -- used for periodization
);

-- concrete exercises assigned to each program workout
create table public.program_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  program_workout_id uuid references public.program_workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  sort_order int not null,
  sets int not null default 3,
  rep_range_low int not null default 8,
  rep_range_high int not null default 12,
  rest_seconds int not null default 60,
  slot_role text, -- inherited from template slot
  notes text,
  -- superset / drop set / circuit grouping
  group_id uuid,
  -- exercises sharing the same group_id are performed together
  group_type text check (group_type in ('superset', 'drop_set', 'circuit', 'giant_set'))
  -- null = straight sets (default)
);

-- shared workout links
create table public.shared_programs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  shared_by uuid references public.profiles(id) on delete cascade,
  share_code text unique not null, -- short unique code for link
  is_active boolean default true,
  created_at timestamptz default now()
);


-- ============================================================
-- 5. USER WORKOUTS & LOGGING (depend on profiles, programs, exercises)
-- ============================================================

-- the user's current active program
create table public.user_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  started_at timestamptz default now(),
  is_active boolean default true,
  current_week int default 1
);

-- a specific workout instance assigned or generated for a user
create table public.user_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  program_workout_id uuid references public.program_workouts(id),
  -- null if ad-hoc / standalone workout
  scheduled_date date,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  is_deleted boolean default false,
  deleted_at timestamptz,
  notes text, -- free-form session notes
  created_at timestamptz default now()
);

-- exercises within a user's specific workout (allows reordering, swaps, additions)
create table public.user_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_workout_id uuid references public.user_workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  sort_order int not null,
  sets_prescribed int not null default 3,
  rep_range_low int not null default 8,
  rep_range_high int not null default 12,
  rest_seconds int not null default 60,
  is_swapped boolean default false,
  -- true if user swapped from original
  original_exercise_id uuid references public.exercises(id),
  -- what it was before swap, null if not swapped
  is_added boolean default false,
  -- true if user manually added this
  is_skipped boolean default false,
  notes text,
  -- superset / drop set / circuit grouping
  group_id uuid,
  group_type text check (group_type in ('superset', 'drop_set', 'circuit', 'giant_set'))
);

-- one row per set actually performed
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  -- denormalized for faster queries and simpler RLS
  user_workout_exercise_id uuid references public.user_workout_exercises(id) on delete cascade,
  set_number int not null,
  weight_lbs numeric,
  reps_completed int,
  rest_seconds int,
  is_warmup boolean default false,
  is_skipped boolean default false,
  notes text,
  logged_at timestamptz default now()
);


-- ============================================================
-- 6. PROGRESS TRACKING (depend on profiles, exercises)
-- ============================================================

-- per-exercise summary stats, updated after each completed workout
create table public.user_exercise_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  workout_date date not null,
  best_set_weight_lbs numeric,         -- heaviest weight used in any working set
  best_set_reps int,                  -- reps on the heaviest set
  estimated_1rm numeric,              -- e.g. Epley: weight × (1 + reps/30)
  total_volume_lbs numeric,            -- sum of (weight × reps) across all sets
  total_sets int,                     -- number of working sets performed
  total_reps int,                     -- total reps across all sets
  created_at timestamptz default now()
);

-- body weight and measurement tracking over time
create table public.user_body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  weight_lbs numeric,
  body_fat_pct numeric,
  -- optional circumference measurements in inches
  waist_in numeric,
  chest_in numeric,
  hips_in numeric,
  left_arm_in numeric,
  right_arm_in numeric,
  left_thigh_in numeric,
  right_thigh_in numeric,
  notes text,
  created_at timestamptz default now()
);


-- ============================================================
-- 7. ACHIEVEMENTS, STREAKS & NOTIFICATIONS (depend on profiles)
-- ============================================================

-- achievements unlocked by each user
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id uuid references public.achievements(id) on delete cascade,
  unlocked_at timestamptz default now(),
  unique (user_id, achievement_id)
);

-- cached streak data (updated after each workout completion)
create table public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  current_streak int not null default 0,
  -- consecutive weeks with at least 1 completed workout
  longest_streak int not null default 0,
  last_workout_date date,
  streak_start_date date,
  updated_at timestamptz default now(),
  unique (user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'workout_reminder',    -- scheduled workout coming up
    'streak_at_risk',      -- haven't worked out in a while
    'milestone_reached',   -- achievement unlocked
    'weight_increase',     -- time to bump weight
    'deload_suggestion',   -- performance dropping, suggest deload
    'program_complete',    -- finished a program cycle
    'system'               -- general announcements
  )),
  title text not null,
  body text,
  data jsonb, -- flexible payload (workout_id, achievement_id, etc.)
  is_read boolean default false,
  created_at timestamptz default now()
);


-- ============================================================
-- 8. INDEXES
-- ============================================================

create index idx_exercises_movement on public.exercises(movement_pattern);
create index idx_exercises_difficulty on public.exercises(difficulty_tier);
create index idx_exercises_type on public.exercises(exercise_type);
create index idx_exercise_muscles_role on public.exercise_muscle_groups(role);
create index idx_user_workouts_user on public.user_workouts(user_id, status);
create index idx_user_workouts_date on public.user_workouts(user_id, scheduled_date);
create index idx_workout_logs_exercise on public.workout_logs(user_workout_exercise_id);
create index idx_workout_logs_user on public.workout_logs(user_id);
create index idx_user_weights_user on public.user_exercise_weights(user_id);
create index idx_user_prefs_user on public.user_exercise_preferences(user_id, preference);
create index idx_strength_ratios_base on public.strength_ratios(base_exercise_id);

create index idx_exercise_history_user on public.user_exercise_history(user_id, exercise_id);
create index idx_exercise_history_date on public.user_exercise_history(user_id, workout_date);
create index idx_body_logs_user on public.user_body_logs(user_id, logged_at);
create index idx_weight_history_user on public.user_exercise_weight_history(user_id, exercise_id);
create index idx_weight_history_date on public.user_exercise_weight_history(user_id, recorded_at);
create index idx_notifications_user on public.notifications(user_id, is_read);
create index idx_notifications_created on public.notifications(user_id, created_at);
create index idx_user_achievements_user on public.user_achievements(user_id);
create index idx_user_streaks_user on public.user_streaks(user_id);
create index idx_user_settings_user on public.user_settings(user_id);

-- partial index: exclude soft-deleted workouts from common queries
create index idx_user_workouts_active on public.user_workouts(user_id, status)
  where is_deleted = false;

-- indexes for exercise grouping lookups
create index idx_program_exercises_group on public.program_workout_exercises(group_id) where group_id is not null;
create index idx_user_exercises_group on public.user_workout_exercises(group_id) where group_id is not null;

-- bidirectional alternative lookups
create index idx_alternatives_reverse on public.exercise_alternatives(alternative_id);


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

-- enable RLS on all user-data tables
alter table public.profiles enable row level security;
alter table public.user_limitations enable row level security;
alter table public.user_equipment enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_anchor_lifts enable row level security;
alter table public.user_exercise_weights enable row level security;
alter table public.user_exercise_weight_history enable row level security;
alter table public.user_programs enable row level security;
alter table public.user_workouts enable row level security;
alter table public.user_workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.user_exercise_preferences enable row level security;
alter table public.user_exercise_history enable row level security;
alter table public.user_body_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_streaks enable row level security;
alter table public.shared_programs enable row level security;
alter table public.programs enable row level security;

-- Reference data: anyone can read
CREATE POLICY "Public read access" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.muscle_groups FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.exercise_alternatives FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.exercise_equipment FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.exercise_muscle_groups FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.strength_ratios FOR SELECT USING (true);

-- Program structure: anyone can read (access to the program itself is already gated)
CREATE POLICY "Public read access" ON public.program_workouts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.program_workout_exercises FOR SELECT USING (true);

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- USER LIMITATIONS
create policy "Users can manage own limitations"
  on public.user_limitations for all
  using (auth.uid() = user_id);

-- USER EQUIPMENT
create policy "Users can manage own equipment"
  on public.user_equipment for all
  using (auth.uid() = user_id);

-- USER SETTINGS
create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id);

-- USER ANCHOR LIFTS
create policy "Users can manage own anchor lifts"
  on public.user_anchor_lifts for all
  using (auth.uid() = user_id);

-- USER EXERCISE WEIGHTS
create policy "Users can manage own exercise weights"
  on public.user_exercise_weights for all
  using (auth.uid() = user_id);

-- USER EXERCISE WEIGHT HISTORY
create policy "Users can view own weight history"
  on public.user_exercise_weight_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own weight history"
  on public.user_exercise_weight_history for insert
  with check (auth.uid() = user_id);

-- USER PROGRAMS
create policy "Users can manage own program enrollment"
  on public.user_programs for all
  using (auth.uid() = user_id);

-- USER WORKOUTS
create policy "Users can manage own workouts"
  on public.user_workouts for all
  using (auth.uid() = user_id);

-- USER WORKOUT EXERCISES
create policy "Users can manage own workout exercises"
  on public.user_workout_exercises for all
  using (
    auth.uid() = (
      select user_id from public.user_workouts
      where id = user_workout_id
    )
  );

-- WORKOUT LOGS (simplified RLS via denormalized user_id)
create policy "Users can manage own workout logs"
  on public.workout_logs for all
  using (auth.uid() = user_id);

-- USER EXERCISE PREFERENCES
create policy "Users can manage own exercise preferences"
  on public.user_exercise_preferences for all
  using (auth.uid() = user_id);

-- USER EXERCISE HISTORY
create policy "Users can view own exercise history"
  on public.user_exercise_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own exercise history"
  on public.user_exercise_history for insert
  with check (auth.uid() = user_id);

-- USER BODY LOGS
create policy "Users can manage own body logs"
  on public.user_body_logs for all
  using (auth.uid() = user_id);

-- NOTIFICATIONS
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- USER ACHIEVEMENTS
create policy "Users can view own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

-- USER STREAKS
create policy "Users can view own streaks"
  on public.user_streaks for select
  using (auth.uid() = user_id);

-- PROGRAMS (public + owned)
create policy "Anyone can read public programs"
  on public.programs for select
  using (is_public = true);

create policy "Authors can manage own programs"
  on public.programs for all
  using (auth.uid() = author_id);

-- SHARED PROGRAMS
create policy "Anyone can read active shared programs"
  on public.shared_programs for select
  using (is_active = true);

create policy "Users can manage own shared programs"
  on public.shared_programs for all
  using (auth.uid() = shared_by);