/**
 * ProLight Live Demo Store
 * Manages seed locking, generation history, and live demo state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GenerationResult } from '@/services/BriaImageService';

export interface GenerationHistoryItem extends GenerationResult {
  id: string;
  prompt: string;
  fibo_json?: Record<string, unknown>;
  isReproduction?: boolean;
  originalSeed?: number;
}

interface ProlightStore {
  // Current generation state
  currentSeed: number | null;
  isSeedLocked: boolean;
  currentPrompt: string;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;

  // Generation history
  history: GenerationHistoryItem[];
  currentImage: GenerationResult | null;

  // Actions
  setCurrentSeed: (seed: number | null) => void;
  lockSeed: () => void;
  unlockSeed: () => void;
  setPrompt: (prompt: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  addToHistory: (item: GenerationHistoryItem) => void;
  clearHistory: () => void;
  setCurrentImage: (image: GenerationResult | null) => void;
  reproduceGeneration: (historyItem: GenerationHistoryItem) => void;
}

export const useProlightStore = create<ProlightStore>()(
  persist(
    (set) => ({
      // Initial state
      currentSeed: null,
      isSeedLocked: false,
      currentPrompt: '',
      isGenerating: false,
      generationProgress: 0,
      error: null,
      history: [],
      currentImage: null,

      // Actions
      setCurrentSeed: (seed) => set({ currentSeed: seed }),
      lockSeed: () => set({ isSeedLocked: true }),
      unlockSeed: () => set({ isSeedLocked: false }),
      setPrompt: (prompt) => set({ currentPrompt: prompt }),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationProgress: (progress) => set({ generationProgress: progress }),
      setError: (error) => set({ error }),
      addToHistory: (item) =>
        set((state) => ({
          history: [item, ...state.history].slice(0, 50), // Keep last 50
        })),
      clearHistory: () => set({ history: [] }),
      setCurrentImage: (image) => set({ currentImage: image }),
      reproduceGeneration: (historyItem) =>
        set({
          currentPrompt: historyItem.prompt,
          currentSeed: historyItem.seed || historyItem.originalSeed || null,
          isSeedLocked: !!historyItem.seed || !!historyItem.originalSeed,
        }),
    }),
    {
      name: 'prolight-demo-storage',
      partialize: (state) => ({
        history: state.history,
        currentSeed: state.currentSeed,
        isSeedLocked: state.isSeedLocked,
      }),
    }
  )
);

