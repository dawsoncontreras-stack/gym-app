import { create } from 'zustand';

/**
 * Client-only UI state managed by Zustand.
 *
 * Convention: server data (profiles, workouts, etc.) belongs in React Query.
 * Only put transient UI / client state here (active workout tracking,
 * onboarding flags, theme preferences, etc.).
 */

interface ActiveWorkout {
  startedAt: string;
  exerciseIds: string[];
}

interface AppState {
  // Onboarding
  isOnboarded: boolean;
  setOnboarded: (value: boolean) => void;

  // Active workout tracking (client-side only, not persisted to DB until saved)
  activeWorkout: ActiveWorkout | null;
  startWorkout: () => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  endWorkout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnboarded: false,
  setOnboarded: (value) => set({ isOnboarded: value }),

  activeWorkout: null,
  startWorkout: () =>
    set({
      activeWorkout: {
        startedAt: new Date().toISOString(),
        exerciseIds: [],
      },
    }),
  addExerciseToWorkout: (exerciseId) =>
    set((state) => ({
      activeWorkout: state.activeWorkout
        ? {
            ...state.activeWorkout,
            exerciseIds: [...state.activeWorkout.exerciseIds, exerciseId],
          }
        : null,
    })),
  endWorkout: () => set({ activeWorkout: null }),
}));
