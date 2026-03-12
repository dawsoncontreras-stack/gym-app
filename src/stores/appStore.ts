import { create } from 'zustand';

interface AppState {
  hasSeenOnboarding: boolean;
  preferredUnits: 'lbs' | 'kg';

  // Actions
  setHasSeenOnboarding: (value: boolean) => void;
  setPreferredUnits: (units: 'lbs' | 'kg') => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasSeenOnboarding: false,
  preferredUnits: 'lbs',

  setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
  setPreferredUnits: (units) => set({ preferredUnits: units }),
}));
