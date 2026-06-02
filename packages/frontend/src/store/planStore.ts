import { create } from 'zustand';
import { PlanDetail } from '../types';

interface PlanState {
  currentPlan: PlanDetail | null;
  setCurrentPlan: (plan: PlanDetail | null) => void;
}

export const usePlanStore = create<PlanState>()((set) => ({
  currentPlan: null,
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
}));
