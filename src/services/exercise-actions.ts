import { supabase } from '../lib/supabase';
import type { Exercise } from '../types';

type ExerciseSummary = Pick<
  Exercise,
  'id' | 'name' | 'slug' | 'movement_pattern' | 'exercise_type' | 'difficulty_tier' | 'default_sets' | 'default_rep_range_low' | 'default_rep_range_high' | 'default_rest_seconds'
>;

// ─── Mutations ──────────────────────────────────────────────

export async function replaceExercise(
  userWorkoutExerciseId: string,
  newExerciseId: string,
  oldExerciseId: string,
) {
  const { error } = await supabase
    .from('user_workout_exercises')
    .update({
      exercise_id: newExerciseId,
      is_swapped: true,
      original_exercise_id: oldExerciseId,
    })
    .eq('id', userWorkoutExerciseId);

  if (error) throw error;
}

export async function setExercisePreference(
  userId: string,
  exerciseId: string,
  preference: 'recommend_more' | 'recommend_less' | 'never_recommend',
) {
  const { error } = await supabase
    .from('user_exercise_preferences')
    .upsert(
      { user_id: userId, exercise_id: exerciseId, preference },
      { onConflict: 'user_id,exercise_id' },
    );

  if (error) throw error;
}

export async function removeExerciseFromWorkout(userWorkoutExerciseId: string) {
  const { error } = await supabase
    .from('user_workout_exercises')
    .update({ is_skipped: true })
    .eq('id', userWorkoutExerciseId);

  if (error) throw error;
}

export async function neverRecommendAndRemove(
  userId: string,
  exerciseId: string,
  userWorkoutExerciseId: string,
) {
  await setExercisePreference(userId, exerciseId, 'never_recommend');
  await removeExerciseFromWorkout(userWorkoutExerciseId);
}

export async function addExerciseToWorkout(
  userWorkoutId: string,
  exerciseId: string,
  sets: number,
  repRangeLow: number,
  repRangeHigh: number,
  restSeconds: number,
  sortOrder: number,
) {
  const { error } = await supabase.from('user_workout_exercises').insert({
    user_workout_id: userWorkoutId,
    exercise_id: exerciseId,
    sort_order: sortOrder,
    sets_prescribed: sets,
    rep_range_low: repRangeLow,
    rep_range_high: repRangeHigh,
    rest_seconds: restSeconds,
    is_added: true,
    is_swapped: false,
    is_skipped: false,
  });

  if (error) throw error;
}

export async function reorderExercises(
  orderedIds: { id: string; sortOrder: number }[],
) {
  // Batch update sort_order for each exercise
  const updates = orderedIds.map(({ id, sortOrder }) =>
    supabase
      .from('user_workout_exercises')
      .update({ sort_order: sortOrder })
      .eq('id', id),
  );
  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);
  if (failed?.error) throw failed.error;
}

export async function autoReplaceExercise(
  userWorkoutExerciseId: string,
  movementPattern: string,
  excludeIds: string[],
  userId: string,
): Promise<ExerciseSummary | null> {
  const candidates = await fetchReplacementCandidates(movementPattern, excludeIds, userId);
  if (candidates.length === 0) return null;
  // Pick a random candidate for variety
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick;
}

/**
 * Fetch template slots for a program workout (the original blueprint).
 * Returns the slot_role + movement_pattern for each exercise that was
 * generated, so we can suggest "template-matching" exercises when the user
 * has fewer exercises than the template intended.
 */
export async function fetchTemplateSlots(
  programWorkoutId: string,
): Promise<{ slot_role: string; movement_pattern: string }[]> {
  const { data, error } = await supabase
    .from('program_workout_exercises')
    .select('slot_role, exercises(movement_pattern)')
    .eq('program_workout_id', programWorkoutId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    slot_role: row.slot_role ?? 'accessory',
    movement_pattern: row.exercises?.movement_pattern ?? 'isolation',
  }));
}

// ─── Queries ────────────────────────────────────────────────

export async function fetchReplacementCandidates(
  movementPattern: string,
  excludeIds: string[],
  userId: string,
): Promise<ExerciseSummary[]> {
  // Get never_recommend exercise ids
  const { data: prefs } = await supabase
    .from('user_exercise_preferences')
    .select('exercise_id')
    .eq('user_id', userId)
    .eq('preference', 'never_recommend');

  const neverIds = (prefs ?? []).map(p => p.exercise_id);
  const allExcluded = [...new Set([...excludeIds, ...neverIds])];

  let query = supabase
    .from('exercises')
    .select('id, name, slug, movement_pattern, exercise_type, difficulty_tier, default_sets, default_rep_range_low, default_rep_range_high, default_rest_seconds')
    .eq('movement_pattern', movementPattern)
    .eq('is_active', true);

  if (allExcluded.length > 0) {
    query = query.not('id', 'in', `(${allExcluded.join(',')})`);
  }

  const { data, error } = await query.order('name');
  if (error) throw error;
  return (data ?? []) as ExerciseSummary[];
}

const VALID_MOVEMENT_PATTERNS = [
  'horizontal_push', 'horizontal_pull',
  'vertical_push', 'vertical_pull',
  'squat', 'hinge', 'lunge', 'carry',
  'isolation', 'core', 'cardio', 'plyometric',
] as const;

export async function fetchAddableExercises(
  userId: string,
): Promise<ExerciseSummary[]> {
  const { data: prefs } = await supabase
    .from('user_exercise_preferences')
    .select('exercise_id')
    .eq('user_id', userId)
    .eq('preference', 'never_recommend');

  const neverIds = (prefs ?? []).map(p => p.exercise_id);

  let query = supabase
    .from('exercises')
    .select('id, name, slug, movement_pattern, exercise_type, difficulty_tier, default_sets, default_rep_range_low, default_rep_range_high, default_rest_seconds')
    .in('movement_pattern', [...VALID_MOVEMENT_PATTERNS])
    .eq('is_active', true);

  if (neverIds.length > 0) {
    query = query.not('id', 'in', `(${neverIds.join(',')})`);
  }

  const { data, error } = await query.order('movement_pattern').order('name');
  if (error) throw error;
  return (data ?? []) as ExerciseSummary[];
}
