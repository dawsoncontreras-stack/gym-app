-- ─── Profiles ──────────────────────────────────────────────────
-- Linked to auth.users via id. Auto-created by trigger on signup.

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─── Workouts ──────────────────────────────────────────────────

create table public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

-- ─── Exercises ─────────────────────────────────────────────────
-- Shared exercise library. Can be seeded with common exercises.

create table public.exercises (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  muscle_group text,
  equipment text,
  instructions text,
  created_at timestamptz default now() not null
);

-- ─── Workout Sets ──────────────────────────────────────────────
-- Individual sets within a workout, linked to an exercise.

create table public.workout_sets (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) on delete cascade not null,
  set_number integer not null,
  reps integer,
  weight numeric,
  duration_seconds integer,
  notes text,
  created_at timestamptz default now() not null
);

-- ─── Indexes ───────────────────────────────────────────────────

create index workouts_user_id_idx on public.workouts(user_id);
create index workout_sets_workout_id_idx on public.workout_sets(workout_id);
create index workout_sets_exercise_id_idx on public.workout_sets(exercise_id);

-- ─── Row Level Security ────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sets enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Workouts: users can CRUD their own workouts
create policy "Users can view own workouts"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert own workouts"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on public.workouts for update
  using (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on public.workouts for delete
  using (auth.uid() = user_id);

-- Exercises: all authenticated users can read the exercise library
create policy "Authenticated users can view exercises"
  on public.exercises for select
  using (auth.role() = 'authenticated');

-- Workout sets: access controlled via workout ownership
create policy "Users can view own workout sets"
  on public.workout_sets for select
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "Users can insert own workout sets"
  on public.workout_sets for insert
  with check (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "Users can update own workout sets"
  on public.workout_sets for update
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

create policy "Users can delete own workout sets"
  on public.workout_sets for delete
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

-- ─── Auto-create profile on signup ─────────────────────────────

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
  for each row execute procedure public.handle_new_user();
