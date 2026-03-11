// ============================================================
// WORKOUT GENERATION HELPERS
// ============================================================

import {
  type SlotRole,
  type SlotBlueprint,
  type MovementPattern,
  type SplitType,
  type Focus,
  type TrainingGoal,
  type ExperienceLevel,
  type Duration,
  FOCUS_SET_ADJUSTMENTS,
  MIN_SETS_PER_SLOT,
  ESTIMATED_MINUTES_PER_SET,
  EXPERIENCE_SLOT_LIMITS,
  TRAINING_PARAMS,
  SLOT_TRIM_PRIORITY,
} from './workout-generation-config.ts';

// ============================================================
// Types
// ============================================================

export interface ResolvedSlot extends SlotBlueprint {
  sets: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
}

export type MovementCategory =
  | 'compound_horizontal_push'
  | 'compound_vertical_push'
  | 'compound_vertical_pull'
  | 'compound_horizontal_pull'
  | 'compound_squat'
  | 'compound_hinge'
  | 'compound_lunge'
  | 'isolation_upper'
  | 'isolation_lower'
  | 'isolation_core'
  | 'bodyweight';

export interface WeightEstimate {
  weight_lbs: number;
  source: 'estimated' | 'user_adjusted' | 'logged';
  confidence: number;
  method: 'ratio_chain' | 'alternative_bridge' | 'population_baseline';
}

export interface UserLimitation {
  body_area: string;
  severity: 'avoid' | 'caution';
}

export interface ExerciseCandidate {
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
  body_area_risk: string[];
  primary_muscles: string[];
  primary_equipment: string | null;
}

export interface FilteredCandidate extends ExerciseCandidate {
  limitation_status: 'clear' | 'caution' | 'blocked';
  matched_limitations: string[];
}

// ============================================================
// 1. POPULATION BASELINES & WEIGHT ESTIMATION
// ============================================================

const POPULATION_BASELINES: Record<
  'male' | 'female',
  Record<ExperienceLevel, Record<MovementCategory, number>>
> = {
  male: {
    beginner: {
      compound_horizontal_push: 0.40,
      compound_vertical_push: 0.25,
      compound_vertical_pull: 0.35,
      compound_horizontal_pull: 0.35,
      compound_squat: 0.50,
      compound_hinge: 0.55,
      compound_lunge: 0.20,
      isolation_upper: 0.10,
      isolation_lower: 0.25,
      isolation_core: 0.15,
      bodyweight: 0,
    },
    intermediate: {
      compound_horizontal_push: 0.60,
      compound_vertical_push: 0.38,
      compound_vertical_pull: 0.50,
      compound_horizontal_pull: 0.50,
      compound_squat: 0.75,
      compound_hinge: 0.85,
      compound_lunge: 0.25,
      isolation_upper: 0.15,
      isolation_lower: 0.35,
      isolation_core: 0.20,
      bodyweight: 0,
    },
    advanced: {
      compound_horizontal_push: 0.80,
      compound_vertical_push: 0.50,
      compound_vertical_pull: 0.65,
      compound_horizontal_pull: 0.65,
      compound_squat: 1.00,
      compound_hinge: 1.15,
      compound_lunge: 0.30,
      isolation_upper: 0.18,
      isolation_lower: 0.45,
      isolation_core: 0.25,
      bodyweight: 0,
    },
  },
  female: {
    beginner: {
      compound_horizontal_push: 0.20,
      compound_vertical_push: 0.12,
      compound_vertical_pull: 0.18,
      compound_horizontal_pull: 0.18,
      compound_squat: 0.35,
      compound_hinge: 0.40,
      compound_lunge: 0.12,
      isolation_upper: 0.06,
      isolation_lower: 0.18,
      isolation_core: 0.10,
      bodyweight: 0,
    },
    intermediate: {
      compound_horizontal_push: 0.35,
      compound_vertical_push: 0.22,
      compound_vertical_pull: 0.30,
      compound_horizontal_pull: 0.30,
      compound_squat: 0.55,
      compound_hinge: 0.65,
      compound_lunge: 0.18,
      isolation_upper: 0.10,
      isolation_lower: 0.25,
      isolation_core: 0.15,
      bodyweight: 0,
    },
    advanced: {
      compound_horizontal_push: 0.50,
      compound_vertical_push: 0.32,
      compound_vertical_pull: 0.42,
      compound_horizontal_pull: 0.42,
      compound_squat: 0.75,
      compound_hinge: 0.85,
      compound_lunge: 0.22,
      isolation_upper: 0.14,
      isolation_lower: 0.35,
      isolation_core: 0.18,
      bodyweight: 0,
    },
  },
};

const EQUIPMENT_WEIGHT_SCALE: Record<string, number> = {
  barbell: 1.0,
  dumbbells: 0.40,
  cable_machine: 0.50,
  smith_machine: 0.85,
  chest_press_machine: 0.70,
  lat_pulldown_machine: 0.65,
  leg_press_machine: 1.80,
  hack_squat_machine: 0.90,
  leg_extension_machine: 0.35,
  leg_curl_machine: 0.25,
  calf_raise_machine: 0.60,
  seated_row_machine: 0.55,
  ez_curl_bar: 0.30,
};

export function getMovementCategory(
  exerciseType: string,
  movementPattern: string,
  weightIncrementLbs: number,
  isLowerIsolation = false,
): MovementCategory {
  if (weightIncrementLbs === 0) return 'bodyweight';

  if (exerciseType === 'isolation') {
    if (isLowerIsolation) return 'isolation_lower';
    return 'isolation_upper';
  }

  switch (movementPattern) {
    case 'horizontal_push': return 'compound_horizontal_push';
    case 'vertical_push': return 'compound_vertical_push';
    case 'vertical_pull': return 'compound_vertical_pull';
    case 'horizontal_pull': return 'compound_horizontal_pull';
    case 'squat': return 'compound_squat';
    case 'hinge': return 'compound_hinge';
    case 'lunge': return 'compound_lunge';
    default: return 'compound_horizontal_push';
  }
}

function roundToIncrement(weight: number, increment: number): number {
  if (increment <= 0) return Math.round(weight);
  return Math.round(weight / increment) * increment;
}

export function estimateFromPopulationBaseline(params: {
  bodyweightLbs: number;
  gender: 'male' | 'female';
  experienceLevel: ExperienceLevel;
  movementCategory: MovementCategory;
  primaryEquipment: string | null;
  weightIncrementLbs: number;
}): WeightEstimate {
  const { bodyweightLbs, gender, experienceLevel, movementCategory,
          primaryEquipment, weightIncrementLbs } = params;

  if (movementCategory === 'bodyweight') {
    return { weight_lbs: 0, source: 'estimated', confidence: 0.2, method: 'population_baseline' };
  }

  const baseMultiplier = POPULATION_BASELINES[gender][experienceLevel][movementCategory];
  const equipScale = primaryEquipment ? (EQUIPMENT_WEIGHT_SCALE[primaryEquipment] ?? 1.0) : 1.0;

  const rawWeight = bodyweightLbs * baseMultiplier * equipScale;
  const roundedWeight = roundToIncrement(rawWeight, weightIncrementLbs);
  const finalWeight = Math.max(roundedWeight, weightIncrementLbs || 5);

  return {
    weight_lbs: finalWeight,
    source: 'estimated',
    confidence: 0.2,
    method: 'population_baseline',
  };
}

export function estimateFromAlternativeBridge(params: {
  alternatives: Array<{
    targetExerciseId: string;
    similarityScore: number;
    knownWeightLbs: number;
  }>;
  weightIncrementLbs: number;
}): WeightEstimate | null {
  const { alternatives, weightIncrementLbs } = params;

  if (alternatives.length === 0) return null;

  const best = alternatives.reduce((a, b) =>
    b.similarityScore > a.similarityScore ? b : a
  );

  const scaleFactor = 0.5 + (best.similarityScore * 0.5);
  const rawWeight = best.knownWeightLbs * scaleFactor;
  const roundedWeight = roundToIncrement(rawWeight, weightIncrementLbs);

  return {
    weight_lbs: Math.max(roundedWeight, weightIncrementLbs || 5),
    source: 'estimated',
    confidence: 0.25 + (best.similarityScore * 0.25),
    method: 'alternative_bridge',
  };
}

// ============================================================
// 2. BUILD RESOLVED SLOTS (with time-budget clamping)
// ============================================================

const TRANSITION_MINUTES = 1.0;

function estimateSlotMinutes(slot: ResolvedSlot): number {
  const minutesPerSet = ESTIMATED_MINUTES_PER_SET[slot.slot_role];
  return (slot.sets * minutesPerSet) + TRANSITION_MINUTES;
}

export function estimateSessionMinutes(slots: ResolvedSlot[]): number {
  return slots.reduce((total, slot) => total + estimateSlotMinutes(slot), 0);
}

export function buildResolvedSlots(params: {
  blueprint: SlotBlueprint[];
  splitType: SplitType;
  focus: Focus;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  duration: Duration;
}): ResolvedSlot[] {
  const { blueprint, splitType, focus, goal, experience, duration } = params;

  // Step 1: Enforce experience slot limits
  const maxSlots = EXPERIENCE_SLOT_LIMITS[experience][duration];
  let slots = [...blueprint];

  if (slots.length > maxSlots) {
    const indexed = slots.map((s, i) => ({ slot: s, originalIndex: i }));
    indexed.sort((a, b) =>
      SLOT_TRIM_PRIORITY[b.slot.slot_role] - SLOT_TRIM_PRIORITY[a.slot.slot_role]
    );
    const toRemove = new Set(
      indexed.slice(0, slots.length - maxSlots).map(x => x.originalIndex)
    );
    slots = slots.filter((_, i) => !toRemove.has(i));
  }

  // Step 2: Merge training params + apply focus delta
  const goalParams = TRAINING_PARAMS[goal][experience];
  const focusDelta = FOCUS_SET_ADJUSTMENTS[focus][splitType] ?? 0;

  let resolved: ResolvedSlot[] = slots.map(slot => {
    const tp = goalParams[slot.slot_role];
    const rawSets = tp.sets + focusDelta;
    return {
      ...slot,
      sets: Math.max(rawSets, MIN_SETS_PER_SLOT),
      rep_range_low: tp.rep_range_low,
      rep_range_high: tp.rep_range_high,
      rest_seconds: tp.rest_seconds,
    };
  });

  // Step 3: Time-budget clamping
  const budgetMinutes = duration;
  let currentMinutes = estimateSessionMinutes(resolved);

  if (currentMinutes <= budgetMinutes) {
    return resolved;
  }

  // Phase A: Reduce sets on lowest-priority slots first
  const trimOrder = resolved
    .map((slot, i) => ({ index: i, priority: SLOT_TRIM_PRIORITY[slot.slot_role] }))
    .sort((a, b) => b.priority - a.priority);

  for (const { index } of trimOrder) {
    while (
      currentMinutes > budgetMinutes &&
      resolved[index].sets > MIN_SETS_PER_SLOT
    ) {
      resolved[index].sets -= 1;
      currentMinutes = estimateSessionMinutes(resolved);
    }
    if (currentMinutes <= budgetMinutes) break;
  }

  if (currentMinutes <= budgetMinutes) {
    return resolved;
  }

  // Phase B: Remove entire slots (lowest priority first, never primary compound)
  const toRemoveIndices = new Set<number>();
  for (const { index } of trimOrder) {
    if (resolved[index].slot_role === 'primary_compound') continue;
    if (currentMinutes <= budgetMinutes) break;

    toRemoveIndices.add(index);
    currentMinutes = estimateSessionMinutes(
      resolved.filter((_, i) => !toRemoveIndices.has(i))
    );
  }

  resolved = resolved.filter((_, i) => !toRemoveIndices.has(i));

  return resolved;
}

// ============================================================
// 3. LIMITATION FILTERING
// ============================================================

export function filterByLimitations(
  candidates: ExerciseCandidate[],
  userLimitations: UserLimitation[],
): FilteredCandidate[] {
  if (userLimitations.length === 0) {
    return candidates.map(c => ({
      ...c,
      limitation_status: 'clear' as const,
      matched_limitations: [],
    }));
  }

  const avoidAreas = new Set(
    userLimitations.filter(l => l.severity === 'avoid').map(l => l.body_area)
  );
  const cautionAreas = new Set(
    userLimitations.filter(l => l.severity === 'caution').map(l => l.body_area)
  );

  return candidates.map(candidate => {
    const risks = candidate.body_area_risk ?? [];
    const matchedAvoid = risks.filter(r => avoidAreas.has(r));
    const matchedCaution = risks.filter(r => cautionAreas.has(r));

    let status: 'clear' | 'caution' | 'blocked';
    if (matchedAvoid.length > 0) {
      status = 'blocked';
    } else if (matchedCaution.length > 0) {
      status = 'caution';
    } else {
      status = 'clear';
    }

    return {
      ...candidate,
      limitation_status: status,
      matched_limitations: [...matchedAvoid, ...matchedCaution],
    };
  });
}

export function selectableCandidates(
  filtered: FilteredCandidate[],
  allowCautionFallback = true,
): FilteredCandidate[] {
  const clear = filtered.filter(c => c.limitation_status === 'clear');
  if (clear.length > 0) return clear;

  if (allowCautionFallback) {
    const caution = filtered.filter(c => c.limitation_status === 'caution');
    if (caution.length > 0) return caution;
  }

  return [];
}
