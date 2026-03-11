import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import {
  SPLIT_PATTERNS,
  SESSION_BLUEPRINTS,
  SPLIT_TYPE_NAMES,
  type SplitType,
  type Focus,
  type TrainingGoal,
  type ExperienceLevel,
  type Duration,
} from './workout-generation-config.ts';

import {
  buildResolvedSlots,
  filterByLimitations,
  selectableCandidates,
  estimateFromPopulationBaseline,
  estimateFromAlternativeBridge,
  getMovementCategory,
  type ResolvedSlot,
  type ExerciseCandidate,
  type FilteredCandidate,
  type WeightEstimate,
  type UserLimitation,
} from './workout-generation-helpers.ts';

// ============================================================
// Types for DB rows
// ============================================================

interface Profile {
  id: string;
  training_goal: TrainingGoal;
  experience_level: ExperienceLevel;
  equipment_tier: string;
  sessions_per_week: number;
  session_duration_minutes: Duration;
  split_preference: Focus;
  gender: 'male' | 'female';
  weight_lbs: number;
}

interface ExerciseRow {
  id: string;
  slug: string;
  name: string;
  movement_pattern: string;
  exercise_type: string;
  difficulty_tier: string;
  fatigue_cost: number;
  default_rep_range_low: number;
  default_rep_range_high: number;
  default_sets: number;
  default_rest_seconds: number;
  weight_increment_lbs: number;
  body_area_risk: string[] | null;
  is_active: boolean;
}

interface SelectedExercise {
  exercise: ExerciseCandidate;
  slot: ResolvedSlot;
  weight_estimate: WeightEstimate;
}

// Difficulty tier accessibility
const TIER_ACCESS: Record<string, string[]> = {
  beginner: ['beginner'],
  intermediate: ['beginner', 'intermediate'],
  advanced: ['beginner', 'intermediate', 'advanced'],
};

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ============================================================
    // STEP 1: Read user context (batch reads)
    // ============================================================

    const [
      profileRes,
      limitationsRes,
      userEquipmentRes,
      userWeightsRes,
      anchorLiftsRes,
      preferencesRes,
      exercisesRes,
      exerciseMusclesRes,
      exerciseEquipmentRes,
      equipmentRes,
      strengthRatiosRes,
      alternativesRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user_id).single(),
      supabase.from('user_limitations').select('body_area, severity').eq('user_id', user_id),
      supabase.from('user_equipment').select('equipment_id').eq('user_id', user_id),
      supabase.from('user_exercise_weights').select('exercise_id, weight_lbs, source').eq('user_id', user_id),
      supabase.from('user_anchor_lifts').select('exercise_id, weight_lbs').eq('user_id', user_id),
      supabase.from('user_exercise_preferences').select('exercise_id, preference').eq('user_id', user_id),
      supabase.from('exercises').select('*').eq('is_active', true),
      supabase.from('exercise_muscle_groups').select('exercise_id, muscle_group_id, role, muscle_groups(name)'),
      supabase.from('exercise_equipment').select('exercise_id, equipment_id, is_required, equipment(name, tier_available)'),
      supabase.from('equipment').select('id, name, tier_available'),
      supabase.from('strength_ratios').select('base_exercise_id, related_exercise_id, ratio, gender'),
      supabase.from('exercise_alternatives_bidirectional').select('source_id, target_id, similarity_score'),
    ]);

    if (profileRes.error || !profileRes.data) {
      return new Response(
        JSON.stringify({ error: 'Profile not found', detail: profileRes.error?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const profile = profileRes.data as Profile;
    const limitations: UserLimitation[] = limitationsRes.data ?? [];

    const userEquipmentIds = new Set<string>(
      (userEquipmentRes.data ?? []).map((r: { equipment_id: string }) => r.equipment_id)
    );

    const userWeightsMap = new Map<string, { weight_lbs: number; source: string }>();
    for (const w of (userWeightsRes.data ?? []) as Array<{ exercise_id: string; weight_lbs: number; source: string }>) {
      userWeightsMap.set(w.exercise_id, { weight_lbs: w.weight_lbs, source: w.source });
    }

    const anchorLiftsMap = new Map<string, number>();
    for (const a of (anchorLiftsRes.data ?? []) as Array<{ exercise_id: string; weight_lbs: number }>) {
      anchorLiftsMap.set(a.exercise_id, a.weight_lbs);
    }

    const preferencesMap = new Map<string, string>();
    for (const p of (preferencesRes.data ?? []) as Array<{ exercise_id: string; preference: string }>) {
      preferencesMap.set(p.exercise_id, p.preference);
    }

    const allExercises = (exercisesRes.data ?? []) as ExerciseRow[];

    // Build muscle group lookup: exercise_id -> { primary: string[], secondary: string[] }
    const exerciseMuscleMap = new Map<string, { primary: string[]; secondary: string[] }>();
    for (const row of (exerciseMusclesRes.data ?? []) as any[]) {
      const mgName = row.muscle_groups?.name as string | undefined;
      if (!mgName) continue;
      if (!exerciseMuscleMap.has(row.exercise_id)) {
        exerciseMuscleMap.set(row.exercise_id, { primary: [], secondary: [] });
      }
      const entry = exerciseMuscleMap.get(row.exercise_id)!;
      if (row.role === 'primary') entry.primary.push(mgName);
      else entry.secondary.push(mgName);
    }

    // Build equipment requirement lookup: exercise_id -> required equipment ids
    const exerciseRequiredEquipMap = new Map<string, string[]>();
    const exercisePrimaryEquipMap = new Map<string, string>();
    for (const row of (exerciseEquipmentRes.data ?? []) as any[]) {
      const equipName = row.equipment?.name as string | undefined;
      if (row.is_required) {
        if (!exerciseRequiredEquipMap.has(row.exercise_id)) {
          exerciseRequiredEquipMap.set(row.exercise_id, []);
        }
        exerciseRequiredEquipMap.get(row.exercise_id)!.push(row.equipment_id);
      }
      if (row.is_required && equipName && !exercisePrimaryEquipMap.has(row.exercise_id)) {
        exercisePrimaryEquipMap.set(row.exercise_id, equipName);
      }
    }

    // Build available equipment set (tier defaults + user overrides)
    const allEquipment = (equipmentRes.data ?? []) as Array<{ id: string; name: string; tier_available: string[] }>;
    const availableEquipmentIds = new Set<string>();
    for (const eq of allEquipment) {
      if (eq.tier_available.includes(profile.equipment_tier)) {
        availableEquipmentIds.add(eq.id);
      }
    }
    for (const eqId of userEquipmentIds) {
      availableEquipmentIds.add(eqId);
    }

    // Build strength ratios map
    const strengthRatiosMap = new Map<string, Array<{ related_exercise_id: string; ratio: number; gender: string | null }>>();
    for (const sr of (strengthRatiosRes.data ?? []) as any[]) {
      if (!strengthRatiosMap.has(sr.base_exercise_id)) {
        strengthRatiosMap.set(sr.base_exercise_id, []);
      }
      strengthRatiosMap.get(sr.base_exercise_id)!.push({
        related_exercise_id: sr.related_exercise_id,
        ratio: sr.ratio,
        gender: sr.gender,
      });
    }

    // Build alternatives map
    const alternativesMap = new Map<string, Array<{ target_id: string; similarity_score: number }>>();
    for (const alt of (alternativesRes.data ?? []) as any[]) {
      if (!alternativesMap.has(alt.source_id)) {
        alternativesMap.set(alt.source_id, []);
      }
      alternativesMap.get(alt.source_id)!.push({
        target_id: alt.target_id,
        similarity_score: alt.similarity_score,
      });
    }

    // ============================================================
    // STEP 2: Build the weekly split
    // ============================================================

    const splitPattern = SPLIT_PATTERNS[profile.sessions_per_week]?.[profile.split_preference];
    if (!splitPattern) {
      return new Response(
        JSON.stringify({ error: `No split pattern for ${profile.sessions_per_week} days / ${profile.split_preference}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const duration = profile.session_duration_minutes as Duration;
    const accessibleTiers = TIER_ACCESS[profile.experience_level] ?? ['beginner'];
    const neverRecommendIds = new Set<string>();
    for (const [exId, pref] of preferencesMap) {
      if (pref === 'never_recommend') neverRecommendIds.add(exId);
    }

    // ============================================================
    // HELPER FUNCTIONS (defined here so they close over queried data)
    // ============================================================

    function buildCandidate(ex: ExerciseRow): ExerciseCandidate {
      const muscles = exerciseMuscleMap.get(ex.id) ?? { primary: [], secondary: [] };
      return {
        id: ex.id,
        slug: ex.slug,
        name: ex.name,
        movement_pattern: ex.movement_pattern,
        exercise_type: ex.exercise_type,
        difficulty_tier: ex.difficulty_tier,
        fatigue_cost: ex.fatigue_cost,
        default_rep_range_low: ex.default_rep_range_low,
        default_rep_range_high: ex.default_rep_range_high,
        default_sets: ex.default_sets,
        default_rest_seconds: ex.default_rest_seconds,
        weight_increment_lbs: ex.weight_increment_lbs,
        body_area_risk: ex.body_area_risk ?? [],
        primary_muscles: muscles.primary,
        primary_equipment: exercisePrimaryEquipMap.get(ex.id) ?? null,
      };
    }

    function hasRequiredEquipment(exerciseId: string): boolean {
      const required = exerciseRequiredEquipMap.get(exerciseId);
      if (!required || required.length === 0) return true;
      return required.every(eqId => availableEquipmentIds.has(eqId));
    }

    function scoreAndPick(
      candidates: FilteredCandidate[],
      slot: ResolvedSlot,
      weeklyUsedExercises: Set<string>,
      sessionCoveredMuscles: Set<string>,
    ): FilteredCandidate {
      const scored = candidates.map(c => {
        let score = 0;

        const pref = preferencesMap.get(c.id);
        if (pref === 'recommend_more') score += 3;
        else if (pref === 'recommend_less') score -= 2;

        const existingWeight = userWeightsMap.get(c.id);
        if (existingWeight && (existingWeight.source === 'logged' || existingWeight.source === 'user_adjusted')) {
          score += 2;
        }

        if (weeklyUsedExercises.has(c.id)) score -= 4;

        if (slot.target_muscles && slot.target_muscles.length > 1) {
          const uncoveredHits = c.primary_muscles.filter(
            m => slot.target_muscles!.includes(m) && !sessionCoveredMuscles.has(m)
          ).length;
          score += uncoveredHits * 1.5;
        }

        if (c.limitation_status === 'caution') score -= 3;

        score += Math.random() * 0.5;

        return { candidate: c, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored[0].candidate;
    }

    function selectExerciseForSlot(
      slot: ResolvedSlot,
      sessionUsedExercises: Set<string>,
      weeklyUsedExercises: Set<string>,
      sessionCoveredMuscles: Set<string>,
    ): ExerciseCandidate | null {
      // Base filter: movement pattern
      let candidates = allExercises.filter(ex => ex.movement_pattern === slot.movement_pattern);

      // Difficulty tier
      candidates = candidates.filter(ex => accessibleTiers.includes(ex.difficulty_tier));

      // Equipment availability
      candidates = candidates.filter(ex => hasRequiredEquipment(ex.id));

      // Never recommend preference
      candidates = candidates.filter(ex => !neverRecommendIds.has(ex.id));

      // No repeats within this session
      candidates = candidates.filter(ex => !sessionUsedExercises.has(ex.id));

      // Target muscles filter
      if (slot.target_muscles && slot.target_muscles.length > 0) {
        const targetSet = new Set(slot.target_muscles);
        candidates = candidates.filter(ex => {
          const muscles = exerciseMuscleMap.get(ex.id);
          if (!muscles) return false;
          return muscles.primary.some(m => targetSet.has(m));
        });
      }

      // Build full candidates with metadata
      const fullCandidates = candidates.map(ex => buildCandidate(ex));

      // Filter by limitations
      const filtered = filterByLimitations(fullCandidates, limitations);
      let selectable = selectableCandidates(filtered, false);

      // Relaxation cascade
      if (selectable.length === 0) {
        selectable = selectableCandidates(filtered, true);
      }

      if (selectable.length === 0) {
        // Broaden difficulty tier by one level
        const broaderTiers = [...accessibleTiers];
        if (!broaderTiers.includes('intermediate')) broaderTiers.push('intermediate');
        else if (!broaderTiers.includes('advanced')) broaderTiers.push('advanced');

        let broaderCandidates = allExercises.filter(ex =>
          ex.movement_pattern === slot.movement_pattern &&
          broaderTiers.includes(ex.difficulty_tier) &&
          hasRequiredEquipment(ex.id) &&
          !neverRecommendIds.has(ex.id) &&
          !sessionUsedExercises.has(ex.id)
        );

        if (slot.target_muscles && slot.target_muscles.length > 0) {
          const targetSet = new Set(slot.target_muscles);
          broaderCandidates = broaderCandidates.filter(ex => {
            const muscles = exerciseMuscleMap.get(ex.id);
            return muscles ? muscles.primary.some(m => targetSet.has(m)) : false;
          });
        }

        const broaderFull = broaderCandidates.map(ex => buildCandidate(ex));
        const broaderFiltered = filterByLimitations(broaderFull, limitations);
        selectable = selectableCandidates(broaderFiltered, true);
      }

      if (selectable.length === 0) return null;

      return scoreAndPick(selectable, slot, weeklyUsedExercises, sessionCoveredMuscles);
    }

    function estimateWeight(exercise: ExerciseCandidate): WeightEstimate {
      // 1. Logged/adjusted weight
      const existing = userWeightsMap.get(exercise.id);
      if (existing && (existing.source === 'logged' || existing.source === 'user_adjusted')) {
        return {
          weight_lbs: existing.weight_lbs,
          source: existing.source as 'logged' | 'user_adjusted',
          confidence: existing.source === 'logged' ? 0.9 : 0.6,
          method: 'ratio_chain',
        };
      }

      // 2. Ratio chain from anchor lifts
      for (const [anchorExId, anchorWeight] of anchorLiftsMap) {
        const ratios = strengthRatiosMap.get(anchorExId);
        if (!ratios) continue;

        const match = ratios.find(r => r.related_exercise_id === exercise.id);
        if (!match) continue;

        const genderMatch = ratios.find(
          r => r.related_exercise_id === exercise.id && r.gender === profile.gender
        );
        const ratio = genderMatch ? genderMatch.ratio : match.ratio;

        const estimatedWeight = anchorWeight * ratio;
        const increment = exercise.weight_increment_lbs;
        const rounded = increment > 0
          ? Math.round(estimatedWeight / increment) * increment
          : Math.round(estimatedWeight);

        return {
          weight_lbs: Math.max(rounded, increment || 5),
          source: 'estimated' as const,
          confidence: 0.5,
          method: 'ratio_chain' as const,
        };
      }

      // 3. Alternative bridge
      const alts = alternativesMap.get(exercise.id) ?? [];
      const bridgeCandidates: Array<{ targetExerciseId: string; similarityScore: number; knownWeightLbs: number }> = [];
      for (const alt of alts) {
        const altWeight = userWeightsMap.get(alt.target_id);
        if (altWeight && (altWeight.source === 'logged' || altWeight.source === 'user_adjusted')) {
          bridgeCandidates.push({
            targetExerciseId: alt.target_id,
            similarityScore: alt.similarity_score,
            knownWeightLbs: altWeight.weight_lbs,
          });
          continue;
        }

        for (const [_anchorExId, anchorWeight] of anchorLiftsMap) {
          const ratios = strengthRatiosMap.get(_anchorExId);
          if (!ratios) continue;
          const ratioMatch = ratios.find(r => r.related_exercise_id === alt.target_id);
          if (ratioMatch) {
            const genderMatch = ratios.find(
              r => r.related_exercise_id === alt.target_id && r.gender === profile.gender
            );
            const ratio = genderMatch ? genderMatch.ratio : ratioMatch.ratio;
            bridgeCandidates.push({
              targetExerciseId: alt.target_id,
              similarityScore: alt.similarity_score,
              knownWeightLbs: anchorWeight * ratio,
            });
            break;
          }
        }
      }

      if (bridgeCandidates.length > 0) {
        const bridgeEstimate = estimateFromAlternativeBridge({
          alternatives: bridgeCandidates,
          weightIncrementLbs: exercise.weight_increment_lbs,
        });
        if (bridgeEstimate) return bridgeEstimate;
      }

      // 4. Population baseline
      const isLowerIsolation = exercise.exercise_type === 'isolation' &&
        exercise.primary_muscles.some(m =>
          ['quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors'].includes(m)
        );

      const movementCategory = getMovementCategory(
        exercise.exercise_type,
        exercise.movement_pattern,
        exercise.weight_increment_lbs,
        isLowerIsolation,
      );

      return estimateFromPopulationBaseline({
        bodyweightLbs: profile.weight_lbs ?? 160,
        gender: profile.gender ?? 'male',
        experienceLevel: profile.experience_level,
        movementCategory,
        primaryEquipment: exercise.primary_equipment,
        weightIncrementLbs: exercise.weight_increment_lbs,
      });
    }

    // ============================================================
    // STEP 3 & 4: For each day, resolve slots and select exercises
    // ============================================================

    const weeklyUsedExercises = new Set<string>();
    const dayResults: Array<{
      dayNumber: number;
      splitType: SplitType;
      name: string;
      exercises: SelectedExercise[];
    }> = [];

    for (let dayIdx = 0; dayIdx < splitPattern.length; dayIdx++) {
      const splitType = splitPattern[dayIdx];
      if (splitType === 'rest') continue;

      const blueprint = SESSION_BLUEPRINTS[splitType]?.[duration] ?? [];
      if (blueprint.length === 0) continue;

      const resolvedSlots = buildResolvedSlots({
        blueprint,
        splitType,
        focus: profile.split_preference,
        goal: profile.training_goal,
        experience: profile.experience_level,
        duration,
      });

      const sessionUsedExercises = new Set<string>();
      const sessionCoveredMuscles = new Set<string>();
      const dayExercises: SelectedExercise[] = [];

      for (const slot of resolvedSlots) {
        const picked = selectExerciseForSlot(
          slot,
          sessionUsedExercises,
          weeklyUsedExercises,
          sessionCoveredMuscles,
        );

        if (!picked) continue;

        sessionUsedExercises.add(picked.id);
        weeklyUsedExercises.add(picked.id);

        for (const m of picked.primary_muscles) {
          sessionCoveredMuscles.add(m);
        }

        const weightEstimate = estimateWeight(picked);

        dayExercises.push({ exercise: picked, slot, weight_estimate: weightEstimate });
      }

      dayResults.push({
        dayNumber: dayIdx + 1,
        splitType,
        name: SPLIT_TYPE_NAMES[splitType] ?? splitType,
        exercises: dayExercises,
      });
    }

    // ============================================================
    // STEP 7: Write results to database
    // ============================================================

    // Deactivate existing active programs
    await supabase
      .from('user_programs')
      .update({ is_active: false })
      .eq('user_id', user_id)
      .eq('is_active', true);

    // Build program name
    const uniqueSplits = [...new Set(splitPattern.filter((s: SplitType) => s !== 'rest'))];
    const splitNames: Record<string, string> = {
      push: 'Push', pull: 'Pull', legs: 'Legs',
      upper_a: 'Upper', upper_b: 'Upper', lower_a: 'Lower', lower_b: 'Lower',
      full_body: 'Full Body',
    };
    const programNameParts = uniqueSplits.map((s: string) => splitNames[s] ?? s);
    const programName = `${[...new Set(programNameParts)].join('/')} - ${profile.sessions_per_week}x/week`;

    // Create template program
    const { data: programData, error: programError } = await supabase
      .from('programs')
      .insert({
        name: programName,
        training_goal: profile.training_goal,
        experience_level: profile.experience_level,
        equipment_tier: profile.equipment_tier,
        sessions_per_week: profile.sessions_per_week,
        author_id: user_id,
      })
      .select('id')
      .single();

    if (programError || !programData) {
      throw new Error(`Failed to create program: ${programError?.message}`);
    }

    const programId = programData.id;

    // Create program_workouts
    const programWorkoutInserts = dayResults.map(day => ({
      program_id: programId,
      day_number: day.dayNumber,
      name: day.name,
      sort_order: day.dayNumber,
    }));

    const { data: programWorkouts, error: pwError } = await supabase
      .from('program_workouts')
      .insert(programWorkoutInserts)
      .select('id, day_number');

    if (pwError || !programWorkouts) {
      throw new Error(`Failed to create program workouts: ${pwError?.message}`);
    }

    // Map day_number -> program_workout_id
    const pwMap = new Map<number, string>();
    for (const pw of programWorkouts as Array<{ id: string; day_number: number }>) {
      pwMap.set(pw.day_number, pw.id);
    }

    // Create program_workout_exercises (bulk)
    const pweInserts: any[] = [];
    for (const day of dayResults) {
      const pwId = pwMap.get(day.dayNumber);
      if (!pwId) continue;
      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i];
        pweInserts.push({
          program_workout_id: pwId,
          exercise_id: ex.exercise.id,
          sort_order: i + 1,
          sets: ex.slot.sets,
          rep_range_low: ex.slot.rep_range_low,
          rep_range_high: ex.slot.rep_range_high,
          rest_seconds: ex.slot.rest_seconds,
          slot_role: ex.slot.slot_role,
        });
      }
    }

    if (pweInserts.length > 0) {
      const { error: pweError } = await supabase
        .from('program_workout_exercises')
        .insert(pweInserts);
      if (pweError) throw new Error(`Failed to create program workout exercises: ${pweError.message}`);
    }

    // Create user_programs (instance layer)
    const { data: userProgramData, error: upError } = await supabase
      .from('user_programs')
      .insert({
        user_id,
        program_id: programId,
        is_active: true,
        current_week: 1,
      })
      .select('id')
      .single();

    if (upError || !userProgramData) {
      throw new Error(`Failed to create user program: ${upError?.message}`);
    }

    const userProgramId = userProgramData.id;

    // Create user_workouts (instance layer)
    const uwInserts = dayResults.map(day => ({
      user_id,
      program_workout_id: pwMap.get(day.dayNumber),
      status: 'pending' as const,
      scheduled_date: null as null,
    }));

    const { data: userWorkouts, error: uwError } = await supabase
      .from('user_workouts')
      .insert(uwInserts)
      .select('id, program_workout_id');

    if (uwError || !userWorkouts) {
      throw new Error(`Failed to create user workouts: ${uwError?.message}`);
    }

    // Map program_workout_id -> user_workout_id
    const uwMap = new Map<string, string>();
    for (const uw of userWorkouts as Array<{ id: string; program_workout_id: string }>) {
      uwMap.set(uw.program_workout_id, uw.id);
    }

    // Create user_workout_exercises (instance layer, bulk)
    const uweInserts: any[] = [];
    for (const day of dayResults) {
      const pwId = pwMap.get(day.dayNumber);
      if (!pwId) continue;
      const uwId = uwMap.get(pwId);
      if (!uwId) continue;

      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i];
        uweInserts.push({
          user_workout_id: uwId,
          exercise_id: ex.exercise.id,
          sort_order: i + 1,
          sets_prescribed: ex.slot.sets,
          rep_range_low: ex.slot.rep_range_low,
          rep_range_high: ex.slot.rep_range_high,
          rest_seconds: ex.slot.rest_seconds,
          is_swapped: false,
          is_added: false,
        });
      }
    }

    if (uweInserts.length > 0) {
      const { error: uweError } = await supabase
        .from('user_workout_exercises')
        .insert(uweInserts);
      if (uweError) throw new Error(`Failed to create user workout exercises: ${uweError.message}`);
    }

    // Write initial user_exercise_weights for exercises that don't have one
    const newWeightInserts: any[] = [];
    for (const day of dayResults) {
      for (const ex of day.exercises) {
        if (!userWeightsMap.has(ex.exercise.id)) {
          newWeightInserts.push({
            user_id,
            exercise_id: ex.exercise.id,
            weight_lbs: ex.weight_estimate.weight_lbs,
            source: ex.weight_estimate.source,
            confidence: ex.weight_estimate.confidence,
          });
          userWeightsMap.set(ex.exercise.id, {
            weight_lbs: ex.weight_estimate.weight_lbs,
            source: ex.weight_estimate.source,
          });
        }
      }
    }

    if (newWeightInserts.length > 0) {
      const { error: wError } = await supabase
        .from('user_exercise_weights')
        .upsert(newWeightInserts, { onConflict: 'user_id,exercise_id' });
      if (wError) {
        console.error('Failed to insert weight estimates:', wError.message);
      }
    }

    // ============================================================
    // STEP 8: Response
    // ============================================================

    const response = {
      program_id: programId,
      user_program_id: userProgramId,
      days: dayResults.map(day => ({
        day_number: day.dayNumber,
        name: day.name,
        split_type: day.splitType,
        exercises: day.exercises.map(ex => ({
          exercise_id: ex.exercise.id,
          name: ex.exercise.name,
          slug: ex.exercise.slug,
          sets: ex.slot.sets,
          rep_range_low: ex.slot.rep_range_low,
          rep_range_high: ex.slot.rep_range_high,
          rest_seconds: ex.slot.rest_seconds,
          slot_role: ex.slot.slot_role,
          estimated_weight_lbs: ex.weight_estimate.weight_lbs,
          weight_confidence: ex.weight_estimate.confidence,
          weight_method: ex.weight_estimate.method,
        })),
      })),
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('generate-program error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
