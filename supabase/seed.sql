-- ============================================================================
-- SEED DATA (generated UUIDs)
-- Single CTE chain: categories → exercises → workouts → join tables → sections → section_exercises
-- ============================================================================

WITH ins_cat AS (
  INSERT INTO categories (id, name, display_order) VALUES
    (gen_random_uuid(), 'Push',      1),
    (gen_random_uuid(), 'Pull',      2),
    (gen_random_uuid(), 'Legs',      3),
    (gen_random_uuid(), 'Full Body', 4),
    (gen_random_uuid(), 'Cardio',    5),
    (gen_random_uuid(), 'Mobility',  6),
    (gen_random_uuid(), 'Core',      7),
    (gen_random_uuid(), 'HIIT',      8)
  RETURNING id, name
),

ins_ex AS (
  INSERT INTO exercises (id, name, description, muscle_groups, equipment, default_tracking_type) VALUES
    (gen_random_uuid(), 'Barbell Back Squat',    'Stand with barbell on upper back. Squat down until thighs are parallel, then drive up.',          '{quads,glutes,hamstrings}',     '{barbell,rack}',           'weighted'),
    (gen_random_uuid(), 'Push-Ups',              'Start in plank position. Lower chest to floor, then push back up.',                              '{chest,triceps,shoulders}',     '{}',                       'reps'),
    (gen_random_uuid(), 'Barbell Bench Press',   'Lie on bench with barbell. Lower bar to chest, press back up.',                                  '{chest,triceps,shoulders}',     '{barbell,bench}',          'weighted'),
    (gen_random_uuid(), 'Bent-Over Barbell Row', 'Hinge at hips, pull barbell to lower chest. Squeeze shoulder blades.',                           '{back,biceps,rear_delts}',      '{barbell}',                'weighted'),
    (gen_random_uuid(), 'Plank',                 'Hold forearm plank position with core tight and body in a straight line.',                       '{core,shoulders}',              '{}',                       'timed'),
    (gen_random_uuid(), 'Walking Lunges',        'Step forward into a lunge, alternating legs as you walk forward.',                               '{quads,glutes,hamstrings}',     '{}',                       'reps'),
    (gen_random_uuid(), 'Deadlift',              'Stand with feet hip-width. Hinge at hips, grip barbell, drive through heels to stand.',          '{hamstrings,glutes,back,core}', '{barbell}',                'weighted'),
    (gen_random_uuid(), 'Burpees',               'Drop to push-up, perform push-up, jump feet to hands, explode upward.',                         '{full_body}',                   '{}',                       'reps'),
    (gen_random_uuid(), 'Mountain Climbers',     'In plank position, alternate driving knees to chest rapidly.',                                   '{core,shoulders,cardio}',       '{}',                       'timed'),
    (gen_random_uuid(), 'Dumbbell Bicep Curls',  'Stand with dumbbells at sides. Curl weights up, squeeze biceps, lower slowly.',                  '{biceps}',                      '{dumbbells}',              'weighted')
  RETURNING id, name
),

ins_wk AS (
  INSERT INTO workouts (id, title, description, difficulty, estimated_minutes, equipment_needed, is_featured) VALUES
    (gen_random_uuid(), 'Bodyweight Basics',
     'A simple full-body workout using just your bodyweight. Perfect for beginners or warm-up days.',
     'beginner', 25, '{}', true),

    (gen_random_uuid(), 'Upper Body Burner',
     'Push and pull circuit targeting chest, back, shoulders, and arms. Moderate intensity with rest between rounds.',
     'intermediate', 40, '{barbell,bench,dumbbells}', true),

    (gen_random_uuid(), 'Full Body Destroyer',
     'A challenging workout with warm-up, main circuit, finisher, and cool-down. For experienced lifters ready to push their limits.',
     'advanced', 55, '{barbell,rack,bench,dumbbells}', true),

    (gen_random_uuid(), '15-Minute HIIT Blast',
     'Fast-paced bodyweight HIIT. No equipment needed, maximum effort. Great for busy days.',
     'intermediate', 15, '{}', false)
  RETURNING id, title
),

ins_wc AS (
  INSERT INTO workout_categories (workout_id, category_id)
  SELECT w.id, c.id
  FROM (VALUES
    ('Bodyweight Basics',    'Full Body'),
    ('Upper Body Burner',    'Push'),
    ('Upper Body Burner',    'Pull'),
    ('Full Body Destroyer',  'Full Body'),
    ('Full Body Destroyer',  'Legs'),
    ('15-Minute HIIT Blast', 'HIIT'),
    ('15-Minute HIIT Blast', 'Cardio')
  ) v(wk_title, cat_name)
  JOIN ins_wk  w ON w.title = v.wk_title
  JOIN ins_cat c ON c.name  = v.cat_name
  RETURNING *
),

ins_sec AS (
  INSERT INTO workout_sections (id, workout_id, title, section_type, rounds, rest_between_rounds_sec, sort_order)
  SELECT gen_random_uuid(), w.id, v.sec_title, v.sec_type::section_type, v.rounds, v.rest_sec, v.sort_order
  FROM (VALUES
    ('Bodyweight Basics',    'Full Body Flow',    'straight_set', 1, NULL::int, 1),
    ('Upper Body Burner',    'Warm-Up',           'straight_set', 1, NULL,      1),
    ('Upper Body Burner',    'Push-Pull Circuit', 'circuit',      3, 90,        2),
    ('Upper Body Burner',    'Core Finisher',     'straight_set', 1, NULL,      3),
    ('Full Body Destroyer',  'Warm-Up',           'straight_set', 1, NULL,      1),
    ('Full Body Destroyer',  'Strength Circuit',  'circuit',      4, 120,       2),
    ('Full Body Destroyer',  'Burnout Finisher',  'straight_set', 1, NULL,      3),
    ('Full Body Destroyer',  'Cool Down',         'straight_set', 1, NULL,      4),
    ('15-Minute HIIT Blast', 'HIIT Circuit',      'circuit',      3, 60,        1)
  ) v(wk_title, sec_title, sec_type, rounds, rest_sec, sort_order)
  JOIN ins_wk w ON w.title = v.wk_title
  RETURNING id, workout_id, title
)

-- Section exercises: join on (workout title → section) and (exercise name)
INSERT INTO workout_section_exercises
  (id, section_id, exercise_id, sort_order, tracking_type, sets, reps, weight_lbs, duration_sec, rest_after_sec, notes)
SELECT
  gen_random_uuid(), s.id, e.id,
  v.sort_ord, v.trk::exercise_tracking_type, v.sets, v.reps, v.wt, v.dur, v.rest, v.notes
FROM (VALUES
  -- Workout 1: Bodyweight Basics / Full Body Flow
  ('Bodyweight Basics', 'Full Body Flow', 'Push-Ups',       1, 'reps',  3,         10,        NULL::numeric, NULL::int, 60, 'Keep core tight. Modify on knees if needed.'),
  ('Bodyweight Basics', 'Full Body Flow', 'Walking Lunges', 2, 'reps',  3,         12,        NULL,          NULL,      60, '12 reps per leg. Keep torso upright.'),
  ('Bodyweight Basics', 'Full Body Flow', 'Plank',          3, 'timed', NULL::int, NULL::int, NULL,          45,        30, 'Hold as long as you can up to 45s.'),
  ('Bodyweight Basics', 'Full Body Flow', 'Burpees',        4, 'reps',  3,         8,         NULL,          NULL,      60, 'Modify by stepping back instead of jumping.'),

  -- Workout 2: Upper Body Burner / Warm-Up
  ('Upper Body Burner', 'Warm-Up',           'Push-Ups',              1, 'reps',    2,    10,   NULL, NULL, 30, 'Light warm-up pace. Get blood flowing.'),
  -- Upper Body Burner / Push-Pull Circuit
  ('Upper Body Burner', 'Push-Pull Circuit', 'Barbell Bench Press',   1, 'weighted', 1,   10,   135.0, NULL, 60, 'Control the descent. Full range of motion.'),
  ('Upper Body Burner', 'Push-Pull Circuit', 'Bent-Over Barbell Row', 2, 'weighted', 1,   10,   95.0,  NULL, 60, 'Squeeze shoulder blades at the top.'),
  ('Upper Body Burner', 'Push-Pull Circuit', 'Dumbbell Bicep Curls',  3, 'weighted', 1,   12,   25.0,  NULL, 45, 'Slow and controlled. No swinging.'),
  -- Upper Body Burner / Core Finisher
  ('Upper Body Burner', 'Core Finisher',     'Plank',                 1, 'timed', NULL, NULL, NULL, 60, NULL::int, NULL),

  -- Workout 3: Full Body Destroyer / Warm-Up
  ('Full Body Destroyer', 'Warm-Up',          'Walking Lunges',      1, 'reps',    1, 10, NULL,  NULL, 30, 'Light bodyweight lunges to warm up legs.'),
  ('Full Body Destroyer', 'Warm-Up',          'Push-Ups',            2, 'reps',    1, 15, NULL,  NULL, 30, 'Get the upper body warm.'),
  -- Full Body Destroyer / Strength Circuit
  ('Full Body Destroyer', 'Strength Circuit', 'Barbell Back Squat',  1, 'weighted', 1, 8, 185.0, NULL, 90, 'Go deep. Aim for parallel or below.'),
  ('Full Body Destroyer', 'Strength Circuit', 'Barbell Bench Press', 2, 'weighted', 1, 8, 155.0, NULL, 90, 'Control the negative. Explosive press.'),
  ('Full Body Destroyer', 'Strength Circuit', 'Deadlift',            3, 'weighted', 1, 6, 225.0, NULL, 90, 'Brace your core. Keep the bar close.'),
  -- Full Body Destroyer / Burnout Finisher
  ('Full Body Destroyer', 'Burnout Finisher', 'Burpees',             1, 'reps',  3,    15,   NULL, NULL, 45,   NULL),
  ('Full Body Destroyer', 'Burnout Finisher', 'Mountain Climbers',   2, 'timed', NULL, NULL, NULL, 30,   NULL, NULL),
  -- Full Body Destroyer / Cool Down
  ('Full Body Destroyer', 'Cool Down',        'Plank',               1, 'timed', NULL, NULL, NULL, 60, NULL, 'Deep breathing. Let your heart rate come down.'),

  -- Workout 4: 15-Minute HIIT Blast / HIIT Circuit
  ('15-Minute HIIT Blast', 'HIIT Circuit', 'Burpees',           1, 'timed', NULL, NULL, NULL, 30, 15, 'All out effort!'),
  ('15-Minute HIIT Blast', 'HIIT Circuit', 'Mountain Climbers', 2, 'timed', NULL, NULL, NULL, 30, 15, 'Fast knees, stay tight.'),
  ('15-Minute HIIT Blast', 'HIIT Circuit', 'Push-Ups',          3, 'timed', NULL, NULL, NULL, 30, 15, 'Max reps in 30 seconds.'),
  ('15-Minute HIIT Blast', 'HIIT Circuit', 'Plank',             4, 'timed', NULL, NULL, NULL, 30, 15, 'Hold strong. Almost done with the round!')

) v(wk_title, sec_title, ex_name, sort_ord, trk, sets, reps, wt, dur, rest, notes)
JOIN ins_wk  w ON w.title = v.wk_title
JOIN ins_sec s ON s.workout_id = w.id AND s.title = v.sec_title
JOIN ins_ex  e ON e.name = v.ex_name;