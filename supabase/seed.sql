-- ============================================================================
-- SEED DATA
-- Categories, exercises, and complete workouts for testing
-- ============================================================================

-- Categories
insert into categories (id, name, display_order) values
  ('c0000000-0000-0000-0000-000000000001', 'Push', 1),
  ('c0000000-0000-0000-0000-000000000002', 'Pull', 2),
  ('c0000000-0000-0000-0000-000000000003', 'Legs', 3),
  ('c0000000-0000-0000-0000-000000000004', 'Full Body', 4),
  ('c0000000-0000-0000-0000-000000000005', 'Cardio', 5),
  ('c0000000-0000-0000-0000-000000000006', 'Mobility', 6),
  ('c0000000-0000-0000-0000-000000000007', 'Core', 7),
  ('c0000000-0000-0000-0000-000000000008', 'HIIT', 8);

-- Exercises
insert into exercises (id, name, description, muscle_groups, equipment, default_tracking_type) values
  ('e0000000-0000-0000-0000-000000000001', 'Barbell Back Squat', 'Stand with barbell on upper back. Squat down until thighs are parallel, then drive up.', '{quads,glutes,hamstrings}', '{barbell,rack}', 'weighted'),
  ('e0000000-0000-0000-0000-000000000002', 'Push-Ups', 'Start in plank position. Lower chest to floor, then push back up.', '{chest,triceps,shoulders}', '{}', 'reps'),
  ('e0000000-0000-0000-0000-000000000003', 'Barbell Bench Press', 'Lie on bench with barbell. Lower bar to chest, press back up.', '{chest,triceps,shoulders}', '{barbell,bench}', 'weighted'),
  ('e0000000-0000-0000-0000-000000000004', 'Bent-Over Barbell Row', 'Hinge at hips, pull barbell to lower chest. Squeeze shoulder blades.', '{back,biceps,rear_delts}', '{barbell}', 'weighted'),
  ('e0000000-0000-0000-0000-000000000005', 'Plank', 'Hold forearm plank position with core tight and body in a straight line.', '{core,shoulders}', '{}', 'timed'),
  ('e0000000-0000-0000-0000-000000000006', 'Walking Lunges', 'Step forward into a lunge, alternating legs as you walk forward.', '{quads,glutes,hamstrings}', '{}', 'reps'),
  ('e0000000-0000-0000-0000-000000000007', 'Deadlift', 'Stand with feet hip-width. Hinge at hips, grip barbell, drive through heels to stand.', '{hamstrings,glutes,back,core}', '{barbell}', 'weighted'),
  ('e0000000-0000-0000-0000-000000000008', 'Burpees', 'Drop to push-up, perform push-up, jump feet to hands, explode upward.', '{full_body}', '{}', 'reps'),
  ('e0000000-0000-0000-0000-000000000009', 'Mountain Climbers', 'In plank position, alternate driving knees to chest rapidly.', '{core,shoulders,cardio}', '{}', 'timed'),
  ('e0000000-0000-0000-0000-000000000010', 'Dumbbell Bicep Curls', 'Stand with dumbbells at sides. Curl weights up, squeeze biceps, lower slowly.', '{biceps}', '{dumbbells}', 'weighted');

-- ============================================================================
-- WORKOUT 1: Beginner Bodyweight Basics (straight-through, no circuits)
-- ============================================================================

insert into workouts (id, title, description, difficulty, estimated_minutes, equipment_needed, is_featured) values
  ('a0000000-0000-0000-0000-000000000001', 'Bodyweight Basics', 'A simple full-body workout using just your bodyweight. Perfect for beginners or warm-up days.', 'beginner', 25, '{}', true);

insert into workout_categories (workout_id, category_id) values
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004');

insert into workout_sections (id, workout_id, title, section_type, rounds, sort_order) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Full Body Flow', 'straight_set', 1, 1);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, sets, reps, rest_after_sec, notes) values
  ('de000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 1, 'reps', 3, 10, 60, 'Keep core tight. Modify on knees if needed.'),
  ('de000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 2, 'reps', 3, 12, 60, '12 reps per leg. Keep torso upright.'),
  ('de000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 3, 'timed', null, null, 30, 'Hold as long as you can up to 45s.'),
  ('de000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 4, 'reps', 3, 8, 60, 'Modify by stepping back instead of jumping.');

update workout_section_exercises set duration_sec = 45 where id = 'de000000-0000-0000-0000-000000000003';

-- ============================================================================
-- WORKOUT 2: Intermediate Upper Body with Circuits
-- ============================================================================

insert into workouts (id, title, description, difficulty, estimated_minutes, equipment_needed, is_featured) values
  ('a0000000-0000-0000-0000-000000000002', 'Upper Body Burner', 'Push and pull circuit targeting chest, back, shoulders, and arms. Moderate intensity with rest between rounds.', 'intermediate', 40, '{barbell,bench,dumbbells}', true);

insert into workout_categories (workout_id, category_id) values
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002');

-- Warm-up section
insert into workout_sections (id, workout_id, title, section_type, rounds, sort_order) values
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Warm-Up', 'straight_set', 1, 1);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, sets, reps, rest_after_sec, notes) values
  ('de000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 1, 'reps', 2, 10, 30, 'Light warm-up pace. Get blood flowing.');

-- Main circuit
insert into workout_sections (id, workout_id, title, section_type, rounds, rest_between_rounds_sec, sort_order) values
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Push-Pull Circuit', 'circuit', 3, 90, 2);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, sets, reps, weight_lbs, rest_after_sec, notes) values
  ('de000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 1, 'weighted', 1, 10, 135.0, 60, 'Control the descent. Full range of motion.'),
  ('de000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 2, 'weighted', 1, 10, 95.0, 60, 'Squeeze shoulder blades at the top.'),
  ('de000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000010', 3, 'weighted', 1, 12, 25.0, 45, 'Slow and controlled. No swinging.');

-- Core finisher
insert into workout_sections (id, workout_id, title, section_type, rounds, sort_order) values
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Core Finisher', 'straight_set', 1, 3);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, duration_sec, rest_after_sec) values
  ('de000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000005', 1, 'timed', 60, null);

-- ============================================================================
-- WORKOUT 3: Advanced Full Body (mixed sections)
-- ============================================================================

insert into workouts (id, title, description, difficulty, estimated_minutes, equipment_needed, is_featured) values
  ('a0000000-0000-0000-0000-000000000003', 'Full Body Destroyer', 'A challenging workout with warm-up, main circuit, finisher, and cool-down. For experienced lifters ready to push their limits.', 'advanced', 55, '{barbell,rack,bench,dumbbells}', true);

insert into workout_categories (workout_id, category_id) values
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003');

-- Warm-up
insert into workout_sections (id, workout_id, title, section_type, rounds, sort_order) values
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Warm-Up', 'straight_set', 1, 1);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, sets, reps, rest_after_sec, notes) values
  ('de000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000006', 1, 'reps', 1, 10, 30, 'Light bodyweight lunges to warm up legs.'),
  ('de000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', 2, 'reps', 1, 15, 30, 'Get the upper body warm.');

-- Main circuit
insert into workout_sections (id, workout_id, title, section_type, rounds, rest_between_rounds_sec, sort_order) values
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Strength Circuit', 'circuit', 4, 120, 2);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, sets, reps, weight_lbs, rest_after_sec, notes) values
  ('de000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', 1, 'weighted', 1, 8, 185.0, 90, 'Go deep. Aim for parallel or below.'),
  ('de000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000003', 2, 'weighted', 1, 8, 155.0, 90, 'Control the negative. Explosive press.'),
  ('de000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000007', 3, 'weighted', 1, 6, 225.0, 90, 'Brace your core. Keep the bar close.');

-- Finisher
insert into workout_sections (id, workout_id, title, section_type, rounds, sort_order) values
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'Burnout Finisher', 'straight_set', 1, 3);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, sets, reps, rest_after_sec) values
  ('de000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000008', 1, 'reps', 3, 15, 45),
  ('de000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000009', 2, 'timed', null, null, null);

update workout_section_exercises set duration_sec = 30 where id = 'de000000-0000-0000-0000-000000000016';

-- Cool-down
insert into workout_sections (id, workout_id, title, section_type, rounds, sort_order) values
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'Cool Down', 'straight_set', 1, 4);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, duration_sec, notes) values
  ('de000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000005', 1, 'timed', 60, 'Deep breathing. Let your heart rate come down.');

-- ============================================================================
-- WORKOUT 4: Quick 15-Minute HIIT
-- ============================================================================

insert into workouts (id, title, description, difficulty, estimated_minutes, equipment_needed, is_featured) values
  ('a0000000-0000-0000-0000-000000000004', '15-Minute HIIT Blast', 'Fast-paced bodyweight HIIT. No equipment needed, maximum effort. Great for busy days.', 'intermediate', 15, '{}', false);

insert into workout_categories (workout_id, category_id) values
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000008'),
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005');

insert into workout_sections (id, workout_id, title, section_type, rounds, rest_between_rounds_sec, sort_order) values
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000004', 'HIIT Circuit', 'circuit', 3, 60, 1);

insert into workout_section_exercises (id, section_id, exercise_id, sort_order, tracking_type, duration_sec, rest_after_sec, notes) values
  ('de000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000008', 1, 'timed', 30, 15, 'All out effort!'),
  ('de000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000009', 2, 'timed', 30, 15, 'Fast knees, stay tight.'),
  ('de000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000002', 3, 'timed', 30, 15, 'Max reps in 30 seconds.'),
  ('de000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000005', 4, 'timed', 30, 15, 'Hold strong. Almost done with the round!');