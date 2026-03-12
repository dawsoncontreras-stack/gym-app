-- ============================================================================
-- WORKOUT SCHEMA — V1
-- Supplement Companion App
--
-- Reference: Nike Training Club-style browse & play experience
-- Supports: circuits/blocks, straight-through lists, timed exercises,
--           rep-based exercises, and weight-tracked exercises
--
-- Tables marked [POST-MVP] are included for schema completeness
-- but are not required for the initial launch.
-- ============================================================================


-- ============================================================================
-- ENUMS
-- ============================================================================

-- How an individual exercise is performed during the player
-- 'timed'   → user performs for a duration (e.g., 30s plank)
-- 'reps'    → user performs a rep count (e.g., 12 squats)
-- 'weighted'→ user performs reps at a tracked weight (e.g., 4x10 bench @ 135lb)
create type exercise_tracking_type as enum ('timed', 'reps', 'weighted');

-- Difficulty levels for filtering in browse view
create type difficulty_level as enum ('beginner', 'intermediate', 'advanced');

-- How a section of a workout is performed
-- 'circuit'       → group of exercises repeated for N rounds
-- 'straight_set'  → exercises performed once in sequence (no looping)
create type section_type as enum ('circuit', 'straight_set');


-- ============================================================================
-- EXERCISES
-- The master library of individual movements.
-- These are reusable across any workout. Think of this as the "dictionary"
-- of every exercise available in the app.
-- ============================================================================

create table exercises (
  id            uuid primary key default gen_random_uuid(),

  -- Display info
  name          text not null,                          -- e.g., "Barbell Back Squat"
  description   text,                                   -- brief form cue / what the exercise is
  thumbnail_url text,                                   -- image for browse/search results
  video_url     text,                                   -- demo video shown in player

  -- Categorization (used for filtering + contextual suggestions)
  muscle_groups text[] not null default '{}',            -- e.g., {'quads', 'glutes', 'hamstrings'}
  equipment     text[] not null default '{}',            -- e.g., {'barbell', 'rack'} or {} for bodyweight

  -- Default tracking type — can be overridden per workout_section_exercise
  -- This is the "most common" way this exercise is performed
  default_tracking_type exercise_tracking_type not null default 'reps',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- For search-as-you-type when browsing exercises
create index idx_exercises_name on exercises using gin (to_tsvector('english', name));


-- ============================================================================
-- CATEGORIES
-- Top-level groupings users see in the browse view.
-- e.g., "Push", "Pull", "Legs", "Full Body", "Cardio", "Mobility"
-- A workout can belong to multiple categories.
-- ============================================================================

create table categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,                   -- e.g., "Push"
  display_order int not null default 0,                 -- controls sort in browse UI
  icon_url      text,                                   -- optional icon for the category tile
  created_at    timestamptz not null default now()
);


-- ============================================================================
-- WORKOUTS
-- A single workout session that appears in the browse view.
-- Contains metadata for filtering + display, and links to sections
-- which hold the actual exercise sequence.
-- ============================================================================

create table workouts (
  id                uuid primary key default gen_random_uuid(),

  -- Display info (what the user sees in browse)
  title             text not null,                      -- e.g., "Upper Body Burner"
  description       text,                               -- short blurb shown on workout card
  thumbnail_url     text,                               -- card image in browse grid
  preview_url       text,                               -- optional hero image/video on detail page

  -- Filtering & discovery
  difficulty        difficulty_level not null default 'intermediate',
  estimated_minutes int not null,                       -- total estimated duration for filter/display
  equipment_needed  text[] not null default '{}',       -- aggregated from exercises, used for filtering
  is_featured       boolean not null default false,     -- pin to top of browse / featured carousel

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- For browse filtering
create index idx_workouts_difficulty on workouts (difficulty);
create index idx_workouts_equipment on workouts using gin (equipment_needed);


-- ============================================================================
-- WORKOUT <-> CATEGORY (many-to-many)
-- A workout can appear in multiple categories.
-- e.g., "Push Pull Combo" could be in both "Push" and "Pull"
-- ============================================================================

create table workout_categories (
  workout_id    uuid not null references workouts(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  primary key (workout_id, category_id)
);


-- ============================================================================
-- WORKOUT SECTIONS
-- A workout is divided into ordered sections. Each section is either:
--   - a 'circuit' (group of exercises repeated for rounds), or
--   - a 'straight_set' (exercises done once in order, no looping)
--
-- This is the key structure that lets you support both Nike-style
-- circuits AND simple straight-through workouts.
--
-- Example workout structure:
--   Section 1: "Warm-Up"        → straight_set (5 exercises, done once)
--   Section 2: "Main Circuit"   → circuit, 3 rounds (4 exercises per round)
--   Section 3: "Finisher"       → straight_set (3 exercises, done once)
--   Section 4: "Cool Down"      → straight_set (4 stretches, done once)
-- ============================================================================

create table workout_sections (
  id              uuid primary key default gen_random_uuid(),
  workout_id      uuid not null references workouts(id) on delete cascade,

  -- Display
  title           text,                                 -- e.g., "Warm-Up", "Main Circuit", "Cool Down"

  -- Behavior
  section_type    section_type not null default 'straight_set',
  rounds          int not null default 1,               -- only meaningful for circuits (ignored for straight_set)
  rest_between_rounds_sec int,                          -- rest period between circuit rounds

  -- Ordering
  sort_order      int not null,                         -- determines section sequence in the player

  constraint fk_section_workout foreign key (workout_id) references workouts(id)
);

create index idx_sections_workout on workout_sections (workout_id, sort_order);


-- ============================================================================
-- WORKOUT SECTION EXERCISES
-- The individual exercises within a section, in order.
--
-- This is where tracking details live — an exercise might be 'reps' in one
-- workout and 'timed' in another (e.g., push-ups for 12 reps vs. max push-ups
-- in 30 seconds). The tracking_type here overrides the exercise's default.
--
-- Fields are nullable because not every field applies to every tracking type:
--   timed    → uses duration_sec (reps + weight ignored)
--   reps     → uses sets + reps (duration + weight ignored)
--   weighted → uses sets + reps + weight_lbs (duration ignored)
-- ============================================================================

create table workout_section_exercises (
  id                uuid primary key default gen_random_uuid(),
  section_id        uuid not null references workout_sections(id) on delete cascade,
  exercise_id       uuid not null references exercises(id) on delete cascade,

  -- Ordering within the section
  sort_order        int not null,

  -- Tracking config (overrides exercise.default_tracking_type if set)
  tracking_type     exercise_tracking_type,             -- null = use exercise default

  -- Timed exercise fields
  duration_sec      int,                                -- e.g., 30 (seconds)

  -- Rep-based / weighted exercise fields
  sets              int,                                -- e.g., 4
  reps              int,                                -- e.g., 10
  weight_lbs        decimal(6,1),                       -- e.g., 135.0 (suggested weight, user can override)

  -- Rest after this exercise before moving to the next one
  rest_after_sec    int,                                -- e.g., 60 (null = no rest / continuous)

  -- Player notes shown during the exercise (form tips, tempo cues, etc.)
  notes             text                                -- e.g., "Slow eccentric, 3 seconds down"
);

create index idx_section_exercises on workout_section_exercises (section_id, sort_order);


-- ============================================================================
-- PROGRAMS [POST-MVP]
-- An ordered collection of workouts, like a "4-Week Strength Program".
-- Schema is here so the data model is complete, but not needed for launch.
-- ============================================================================

create table programs (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,                      -- e.g., "4-Week Beginner Strength"
  description       text,
  thumbnail_url     text,
  difficulty        difficulty_level not null default 'intermediate',
  duration_weeks    int,                                -- e.g., 4
  is_featured       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ============================================================================
-- PROGRAM WORKOUTS [POST-MVP]
-- Maps workouts into a program with day/week positioning.
--
-- Example: Week 1, Day 1 → "Upper Body A"
--          Week 1, Day 2 → "Lower Body A"
--          Week 1, Day 3 → rest (no entry)
--          Week 2, Day 1 → "Upper Body B"
-- ============================================================================

create table program_workouts (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references programs(id) on delete cascade,
  workout_id      uuid not null references workouts(id) on delete cascade,

  week_number     int not null,                         -- which week (1-indexed)
  day_number      int not null,                         -- which day of the week (1 = Monday, 7 = Sunday)
  sort_order      int not null,                         -- fallback sort if multiple workouts on same day

  notes           text,                                 -- e.g., "Active recovery day — go lighter"

  unique (program_id, week_number, day_number, sort_order)
);

create index idx_program_workouts on program_workouts (program_id, week_number, day_number);


-- ============================================================================
-- NOTES ON USER-FACING TABLES
--
-- User-side tables (saved workouts, scheduled workouts, session logs,
-- supplement tracking, etc.) are intentionally NOT included here.
-- This schema covers the CONTENT side — the workout library that you
-- author and all users browse from.
--
-- User tables will be a separate schema file since they touch auth,
-- RLS policies, and are a different domain.
-- ============================================================================