-- ============================================================================
-- USER WORKOUT SCHEMA — V1
-- Supplement Companion App
--
-- This file covers everything on the USER side of workouts:
-- saving/favoriting, scheduling, and logging completed sessions.
--
-- Depends on: workout-schema-v1.sql (content tables)
-- Depends on: Supabase auth (references auth.users)
--
-- All tables here should have RLS enabled with policies scoped
-- to auth.uid() so users can only access their own data.
-- ============================================================================


-- ============================================================================
-- SAVED WORKOUTS
-- When a user taps the bookmark/heart on a workout, it lands here.
-- Simple join table — no extra data needed beyond the relationship.
-- ============================================================================

create table user_saved_workouts (
  user_id       uuid not null references auth.users(id) on delete cascade,
  workout_id    uuid not null references workouts(id) on delete cascade,
  saved_at      timestamptz not null default now(),
  primary key (user_id, workout_id)
);

create index idx_saved_workouts_user on user_saved_workouts (user_id, saved_at desc);


-- ============================================================================
-- SCHEDULED WORKOUTS
-- User places a workout on a specific date in their weekly calendar.
--
-- A user can schedule multiple workouts on the same day (e.g., morning
-- lifting + evening cardio). Completed sessions link back here optionally
-- so you can show "scheduled vs. completed" on the calendar.
--
-- If a user skips a scheduled workout, nothing happens — the row just
-- sits there with no linked session. The app can use that to show
-- missed days or nudge the user.
-- ============================================================================

create table user_scheduled_workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workout_id      uuid not null references workouts(id) on delete cascade,

  scheduled_date  date not null,                        -- the calendar date
  time_of_day     time,                                 -- optional preferred time (null = no specific time)
  notes           text,                                 -- user's personal note, e.g., "go heavy today"

  created_at      timestamptz not null default now()
);

-- Primary query: "show me my workouts for this week"
create index idx_scheduled_user_date on user_scheduled_workouts (user_id, scheduled_date);


-- ============================================================================
-- WORKOUT SESSIONS
-- A completed (or in-progress) workout. Created when the user hits "Start"
-- in the player, updated as they progress, finalized when they finish.
--
-- This is the parent record for a logged workout. The per-exercise
-- performance data lives in workout_session_exercises below.
--
-- Links optionally to a scheduled workout so the calendar can show
-- which scheduled workouts were actually completed.
-- ============================================================================

create type session_status as enum ('in_progress', 'completed', 'abandoned');

create table workout_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  workout_id          uuid not null references workouts(id) on delete cascade,

  -- Optional link back to the schedule
  -- Null if the user started a workout ad-hoc (not from the calendar)
  scheduled_workout_id uuid references user_scheduled_workouts(id) on delete set null,

  -- Session timing
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,                      -- null while in_progress
  status              session_status not null default 'in_progress',

  -- Summary stats (computed when session completes)
  -- Stored here for fast reads on history/stats screens so you don't
  -- have to aggregate from child rows every time
  duration_sec        int,                              -- total wall-clock time
  total_volume_lbs    decimal(10,1),                    -- sum of (weight × reps) across all exercises
  total_sets          int,                              -- total sets completed
  total_reps          int,                              -- total reps completed

  -- How the user felt (optional post-workout check-in)
  rating              int check (rating between 1 and 5), -- 1-5 star rating
  notes               text,                             -- free-text post-workout note

  created_at          timestamptz not null default now()
);

-- "Show me my recent workouts"
create index idx_sessions_user_date on workout_sessions (user_id, started_at desc);

-- "How many times have I done this workout?"
create index idx_sessions_user_workout on workout_sessions (user_id, workout_id);

-- "Did I complete this scheduled workout?"
create index idx_sessions_scheduled on workout_sessions (scheduled_workout_id)
  where scheduled_workout_id is not null;


-- ============================================================================
-- WORKOUT SESSION EXERCISES
-- Per-exercise performance data within a completed session.
--
-- This is where the actual "what did the user do" lives. Each row
-- represents one SET of one exercise. So if the workout prescribed
-- 4x10 bench press and the user did all 4, that's 4 rows here.
--
-- Why one row per set (not per exercise)?
-- → Users often vary weight/reps across sets (135×10, 155×8, 155×6)
-- → Lets you show per-set detail in the session review screen
-- → Makes progress tracking queries straightforward (max weight,
--   total volume over time, rep PRs, etc.)
--
-- For timed exercises, there's one row per timed effort with
-- actual_duration_sec filled in instead of reps/weight.
-- ============================================================================

create table workout_session_exercises (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references workout_sessions(id) on delete cascade,

  -- What exercise was performed
  exercise_id         uuid not null references exercises(id) on delete cascade,

  -- Which section/position it came from in the workout template
  -- (useful for reconstructing the session in order)
  section_id          uuid references workout_sections(id) on delete set null,
  sort_order          int not null,                     -- preserves exercise order within session

  -- Set number within this exercise (1-indexed)
  -- e.g., set 1 of 4, set 2 of 4, etc.
  set_number          int not null,

  -- What the workout prescribed (snapshot from the template)
  -- Stored here so the session log is self-contained even if
  -- the workout template is later edited
  prescribed_reps     int,
  prescribed_weight_lbs decimal(6,1),
  prescribed_duration_sec int,

  -- What the user actually did
  actual_reps         int,                              -- null for timed exercises
  actual_weight_lbs   decimal(6,1),                     -- null for bodyweight/timed
  actual_duration_sec int,                              -- null for rep-based exercises

  -- Per-set flags
  is_warmup           boolean not null default false,   -- user can mark a set as warmup (excluded from stats)
  skipped             boolean not null default false,   -- user skipped this set

  created_at          timestamptz not null default now()
);

-- Reconstruct the session in order
create index idx_session_exercises_session on workout_session_exercises (session_id, sort_order, set_number);

-- Progress tracking: "show me all my bench press sets over time"
create index idx_session_exercises_exercise on workout_session_exercises (exercise_id, created_at desc);

-- PR queries: "what's my heaviest squat?"
create index idx_session_exercises_weight on workout_session_exercises (exercise_id, actual_weight_lbs desc nulls last)
  where skipped = false and is_warmup = false;


-- ============================================================================
-- RLS POLICIES
-- Enable row-level security on all user tables.
-- Each user can only read/write their own rows.
-- ============================================================================

alter table user_saved_workouts enable row level security;
alter table user_scheduled_workouts enable row level security;
alter table workout_sessions enable row level security;
alter table workout_session_exercises enable row level security;

-- Saved workouts
create policy "Users can manage their own saved workouts"
  on user_saved_workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Scheduled workouts
create policy "Users can manage their own scheduled workouts"
  on user_scheduled_workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Workout sessions
create policy "Users can manage their own sessions"
  on workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Session exercises
-- Slightly more complex: user doesn't own session_exercises directly,
-- they own the parent session. So we check via a join.
create policy "Users can manage exercises in their own sessions"
  on workout_session_exercises for all
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_session_exercises.session_id
        and workout_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_session_exercises.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );


-- ============================================================================
-- HELPFUL VIEWS
-- Pre-built queries for common app screens. These save you from writing
-- the same joins repeatedly in your frontend code.
-- ============================================================================

-- Calendar view: scheduled workouts with completion status
create or replace view user_calendar_view as
select
  sw.id as scheduled_id,
  sw.user_id,
  sw.scheduled_date,
  sw.time_of_day,
  sw.notes as schedule_notes,
  w.id as workout_id,
  w.title as workout_title,
  w.difficulty,
  w.estimated_minutes,
  w.thumbnail_url,
  -- Was this actually completed?
  ws.id as session_id,
  ws.status as session_status,
  ws.completed_at,
  ws.rating,
  case
    when ws.status = 'completed' then true
    when ws.status = 'in_progress' then false
    else false
  end as is_completed
from user_scheduled_workouts sw
join workouts w on w.id = sw.workout_id
left join workout_sessions ws on ws.scheduled_workout_id = sw.id;

-- Workout history: recent completed sessions with summary stats
create or replace view user_session_history_view as
select
  ws.id as session_id,
  ws.user_id,
  ws.started_at,
  ws.completed_at,
  ws.status,
  ws.duration_sec,
  ws.total_volume_lbs,
  ws.total_sets,
  ws.total_reps,
  ws.rating,
  ws.notes as session_notes,
  w.id as workout_id,
  w.title as workout_title,
  w.difficulty,
  w.thumbnail_url
from workout_sessions ws
join workouts w on w.id = ws.workout_id
where ws.status = 'completed'
order by ws.completed_at desc;