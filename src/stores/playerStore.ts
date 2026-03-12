import { create } from 'zustand';
import { WorkoutDetail, PlayerStep, SessionExerciseLog } from '../lib/types';

interface PlayerState {
  workout: WorkoutDetail | null;
  steps: PlayerStep[];
  currentStepIndex: number;
  currentSet: number;
  isResting: boolean;
  restTimeRemaining: number;
  exerciseTimerSeconds: number;
  startedAt: number;
  sessionExercises: SessionExerciseLog[];
  status: 'idle' | 'active' | 'paused' | 'completed';

  // Actions
  initSession: (workout: WorkoutDetail) => void;
  completeSet: (actual: {
    reps?: number;
    weight?: number;
    duration?: number;
  }) => void;
  skipExercise: () => void;
  startRest: (seconds: number) => void;
  skipRest: () => void;
  tickRest: () => void;
  tickExerciseTimer: () => void;
  finishWorkout: () => void;
  reset: () => void;
}

function flattenWorkoutToSteps(workout: WorkoutDetail): PlayerStep[] {
  const steps: PlayerStep[] = [];

  for (const section of workout.sections) {
    const rounds = section.section_type === 'circuit' ? section.rounds : 1;

    for (let round = 1; round <= rounds; round++) {
      const exerciseCount = section.exercises.length;
      const isCircuit = section.section_type === 'circuit' && rounds > 1;

      for (let exIdx = 0; exIdx < exerciseCount; exIdx++) {
        const sectionExercise = section.exercises[exIdx];
        const trackingType =
          sectionExercise.tracking_type ?? sectionExercise.exercise.default_tracking_type;
        const totalSets = trackingType === 'timed' ? 1 : (sectionExercise.sets ?? 1);
        const isLastExerciseInRound = exIdx === exerciseCount - 1;

        for (let set = 1; set <= totalSets; set++) {
          steps.push({
            type: 'exercise',
            exercise: sectionExercise,
            section,
            durationSec: trackingType === 'timed' ? (sectionExercise.duration_sec ?? undefined) : undefined,
            setNumber: set,
            totalSets,
            roundNumber: rounds > 1 ? round : undefined,
            totalRounds: rounds > 1 ? rounds : undefined,
          });

          // Add rest after exercise (after last set)
          // In circuits: skip rest for the last exercise in a round (circuit rest covers it)
          const skipRestForCircuit = isCircuit && isLastExerciseInRound;
          if (set === totalSets && sectionExercise.rest_after_sec && !skipRestForCircuit) {
            steps.push({
              type: 'rest',
              durationSec: sectionExercise.rest_after_sec,
              section,
            });
          }
        }
      }

      // Circuit rest after every round (including the last round, before next section)
      if (isCircuit && section.rest_between_rounds_sec) {
        steps.push({
          type: 'round_rest',
          durationSec: section.rest_between_rounds_sec,
          section,
        });
      }
    }
  }

  // Strip trailing rest steps — no rest after the very last exercise
  while (
    steps.length > 0 &&
    (steps[steps.length - 1].type === 'rest' || steps[steps.length - 1].type === 'round_rest')
  ) {
    steps.pop();
  }

  return steps;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  workout: null,
  steps: [],
  currentStepIndex: 0,
  currentSet: 1,
  isResting: false,
  restTimeRemaining: 0,
  exerciseTimerSeconds: 0,
  startedAt: 0,
  sessionExercises: [],
  status: 'idle',

  initSession: (workout) => {
    const steps = flattenWorkoutToSteps(workout);
    const firstStep = steps[0];
    const initialTimer =
      firstStep?.type === 'exercise' && firstStep.durationSec
        ? firstStep.durationSec
        : 0;
    set({
      workout,
      steps,
      currentStepIndex: 0,
      currentSet: 1,
      isResting: false,
      restTimeRemaining: 0,
      exerciseTimerSeconds: initialTimer,
      startedAt: Date.now(),
      sessionExercises: [],
      status: 'active',
    });
  },

  completeSet: (actual) => {
    const { steps, currentStepIndex, sessionExercises } = get();
    const currentStep = steps[currentStepIndex];

    if (!currentStep || currentStep.type !== 'exercise' || !currentStep.exercise) return;

    const log: SessionExerciseLog = {
      exercise_id: currentStep.exercise.exercise_id,
      section_id: currentStep.exercise.section_id,
      sort_order: currentStep.exercise.sort_order,
      set_number: currentStep.setNumber ?? 1,
      prescribed_reps: currentStep.exercise.reps ?? undefined,
      prescribed_weight_lbs: currentStep.exercise.weight_lbs ?? undefined,
      prescribed_duration_sec: currentStep.exercise.duration_sec ?? undefined,
      actual_reps: actual.reps,
      actual_weight_lbs: actual.weight,
      actual_duration_sec: actual.duration,
      is_warmup: false,
      skipped: false,
    };

    const nextIndex = currentStepIndex + 1;
    const isFinished = nextIndex >= steps.length;
    const nextStep = isFinished ? null : steps[nextIndex];

    // If next step is a rest/round_rest, auto-start the rest timer
    if (
      nextStep &&
      (nextStep.type === 'rest' || nextStep.type === 'round_rest') &&
      nextStep.durationSec
    ) {
      set({
        sessionExercises: [...sessionExercises, log],
        currentStepIndex: nextIndex,
        exerciseTimerSeconds: 0,
        isResting: true,
        restTimeRemaining: nextStep.durationSec,
        status: 'active',
      });
      return;
    }

    // If next step is a rest with no duration, skip it entirely
    if (nextStep && (nextStep.type === 'rest' || nextStep.type === 'round_rest')) {
      const skipToIndex = nextIndex + 1;
      const afterRest = skipToIndex < steps.length ? steps[skipToIndex] : null;
      const isReallyFinished = skipToIndex >= steps.length;
      set({
        sessionExercises: [...sessionExercises, log],
        currentStepIndex: isReallyFinished ? currentStepIndex : skipToIndex,
        exerciseTimerSeconds:
          afterRest?.type === 'exercise' && afterRest.durationSec ? afterRest.durationSec : 0,
        status: isReallyFinished ? 'completed' : 'active',
      });
      return;
    }

    const nextTimer =
      nextStep?.type === 'exercise' && nextStep.durationSec ? nextStep.durationSec : 0;

    set({
      sessionExercises: [...sessionExercises, log],
      currentStepIndex: isFinished ? currentStepIndex : nextIndex,
      exerciseTimerSeconds: nextTimer,
      status: isFinished ? 'completed' : 'active',
    });
  },

  skipExercise: () => {
    const { steps, currentStepIndex, sessionExercises } = get();
    const currentStep = steps[currentStepIndex];

    const updatedLogs = [...sessionExercises];
    if (currentStep?.type === 'exercise' && currentStep.exercise) {
      updatedLogs.push({
        exercise_id: currentStep.exercise.exercise_id,
        section_id: currentStep.exercise.section_id,
        sort_order: currentStep.exercise.sort_order,
        set_number: currentStep.setNumber ?? 1,
        is_warmup: false,
        skipped: true,
      });
    }

    const nextIndex = currentStepIndex + 1;
    const isFinished = nextIndex >= steps.length;
    const nextStep = isFinished ? null : steps[nextIndex];

    // If next step is a rest/round_rest, auto-start the rest timer
    if (
      nextStep &&
      (nextStep.type === 'rest' || nextStep.type === 'round_rest') &&
      nextStep.durationSec
    ) {
      set({
        sessionExercises: updatedLogs,
        currentStepIndex: nextIndex,
        exerciseTimerSeconds: 0,
        isResting: true,
        restTimeRemaining: nextStep.durationSec,
        status: 'active',
      });
      return;
    }

    // If next step is a rest with no duration, skip it
    if (nextStep && (nextStep.type === 'rest' || nextStep.type === 'round_rest')) {
      const skipToIndex = nextIndex + 1;
      const afterRest = skipToIndex < steps.length ? steps[skipToIndex] : null;
      const isReallyFinished = skipToIndex >= steps.length;
      set({
        sessionExercises: updatedLogs,
        currentStepIndex: isReallyFinished ? currentStepIndex : skipToIndex,
        exerciseTimerSeconds:
          afterRest?.type === 'exercise' && afterRest.durationSec ? afterRest.durationSec : 0,
        status: isReallyFinished ? 'completed' : 'active',
      });
      return;
    }

    const nextTimer =
      nextStep?.type === 'exercise' && nextStep.durationSec ? nextStep.durationSec : 0;

    set({
      sessionExercises: updatedLogs,
      currentStepIndex: isFinished ? currentStepIndex : nextIndex,
      exerciseTimerSeconds: nextTimer,
      status: isFinished ? 'completed' : 'active',
    });
  },

  startRest: (seconds) => {
    set({ isResting: true, restTimeRemaining: seconds });
  },

  skipRest: () => {
    const { steps, currentStepIndex } = get();
    // Advance past the current rest step — if the next step is also a rest, start it
    const nextIndex = currentStepIndex + 1;
    const isFinished = nextIndex >= steps.length;
    const nextStep = isFinished ? null : steps[nextIndex];

    if (
      nextStep &&
      (nextStep.type === 'rest' || nextStep.type === 'round_rest') &&
      nextStep.durationSec
    ) {
      set({
        currentStepIndex: nextIndex,
        restTimeRemaining: nextStep.durationSec,
        isResting: true,
      });
      return;
    }

    const nextTimer =
      nextStep?.type === 'exercise' && nextStep.durationSec ? nextStep.durationSec : 0;

    set({
      isResting: false,
      restTimeRemaining: 0,
      currentStepIndex: isFinished ? currentStepIndex : nextIndex,
      exerciseTimerSeconds: nextTimer,
      status: isFinished ? 'completed' : 'active',
    });
  },

  tickRest: () => {
    const { restTimeRemaining, steps, currentStepIndex } = get();
    if (restTimeRemaining <= 1) {
      // Rest finished — advance past the rest step
      const nextIndex = currentStepIndex + 1;
      const isFinished = nextIndex >= steps.length;
      const nextStep = isFinished ? null : steps[nextIndex];

      // If next step is also a rest (e.g. exercise rest → round rest), chain into it
      if (
        nextStep &&
        (nextStep.type === 'rest' || nextStep.type === 'round_rest') &&
        nextStep.durationSec
      ) {
        set({
          currentStepIndex: nextIndex,
          restTimeRemaining: nextStep.durationSec,
          isResting: true,
        });
        return;
      }

      const nextTimer =
        nextStep?.type === 'exercise' && nextStep.durationSec ? nextStep.durationSec : 0;

      set({
        isResting: false,
        restTimeRemaining: 0,
        currentStepIndex: isFinished ? currentStepIndex : nextIndex,
        exerciseTimerSeconds: nextTimer,
        status: isFinished ? 'completed' : 'active',
      });
    } else {
      set({ restTimeRemaining: restTimeRemaining - 1 });
    }
  },

  tickExerciseTimer: () => {
    const { exerciseTimerSeconds, steps, currentStepIndex } = get();
    if (exerciseTimerSeconds <= 1) {
      // Auto-complete the timed exercise
      const step = steps[currentStepIndex];
      if (step?.type === 'exercise' && step.durationSec) {
        get().completeSet({ duration: step.durationSec });
      }
      set({ exerciseTimerSeconds: 0 });
    } else {
      set({ exerciseTimerSeconds: exerciseTimerSeconds - 1 });
    }
  },

  finishWorkout: () => {
    set({ status: 'completed' });
  },

  reset: () => {
    set({
      workout: null,
      steps: [],
      currentStepIndex: 0,
      currentSet: 1,
      isResting: false,
      restTimeRemaining: 0,
      exerciseTimerSeconds: 0,
      startedAt: 0,
      sessionExercises: [],
      status: 'idle',
    });
  },
}));
