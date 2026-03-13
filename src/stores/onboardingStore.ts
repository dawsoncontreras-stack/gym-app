import { create } from 'zustand';
import type { FitnessGoal } from '../lib/types';

type ProductStatus = 'arriving' | 'have_it';

type SelectedProduct = {
  productId: string;
  status: ProductStatus;
  daysRemaining: number; // only used when status === 'have_it'
};

interface OnboardingState {
  selectedGoal: FitnessGoal | null;
  selectedProducts: Map<string, SelectedProduct>;

  // Actions
  setGoal: (goal: FitnessGoal) => void;
  toggleProduct: (productId: string) => void;
  setProductStatus: (productId: string, status: ProductStatus) => void;
  setProductDaysRemaining: (productId: string, days: number) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  selectedGoal: null,
  selectedProducts: new Map(),

  setGoal: (goal) => set({ selectedGoal: goal }),

  toggleProduct: (productId) =>
    set((state) => {
      const next = new Map(state.selectedProducts);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.set(productId, { productId, status: 'arriving', daysRemaining: 15 });
      }
      return { selectedProducts: next };
    }),

  setProductStatus: (productId, status) =>
    set((state) => {
      const next = new Map(state.selectedProducts);
      const existing = next.get(productId);
      if (existing) {
        next.set(productId, { ...existing, status });
      }
      return { selectedProducts: next };
    }),

  setProductDaysRemaining: (productId, days) =>
    set((state) => {
      const next = new Map(state.selectedProducts);
      const existing = next.get(productId);
      if (existing) {
        next.set(productId, { ...existing, daysRemaining: days });
      }
      return { selectedProducts: next };
    }),

  reset: () => set({ selectedGoal: null, selectedProducts: new Map() }),
}));
