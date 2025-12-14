// frontend/src/stores/useCompositionStore.ts
import { create } from "zustand";

export type CropBox = { 
  x: number; 
  y: number; 
  width: number; 
  height: number; 
  aspect?: string; 
  score?: number;
};

type CompositionState = {
  imageUrl: string | null;
  originalSize: { width: number; height: number } | null;
  centroid: { x: number; y: number } | null;
  proposals: CropBox[];
  selected: CropBox | null;
  loading: boolean;

  // preview camera override that SceneViewer will read and apply temporarily
  previewCameraOverride: { fov?: number; pan?: number; tilt?: number } | null;

  // API
  setImageUrl: (url: string | null, size?: { width: number; height: number } | null) => void;
  setProposals: (p: CropBox[]) => void;
  setSelected: (c: CropBox | null) => void;
  setLoading: (b: boolean) => void;
  setPreviewCameraOverride: (o: { fov?: number; pan?: number; tilt?: number } | null) => void;
  clear: () => void;
};

export const useCompositionStore = create<CompositionState>((set) => ({
  imageUrl: null,
  originalSize: null,
  centroid: null,
  proposals: [],
  selected: null,
  loading: false,
  previewCameraOverride: null,

  setImageUrl: (url, size = null) => set(() => ({ imageUrl: url, originalSize: size })),
  setProposals: (p) => set(() => ({ proposals: p })),
  setSelected: (c) => set(() => ({ selected: c })),
  setLoading: (b) => set(() => ({ loading: b })),
  setPreviewCameraOverride: (o) => set(() => ({ previewCameraOverride: o })),
  clear: () =>
    set(() => ({
      imageUrl: null,
      proposals: [],
      selected: null,
      previewCameraOverride: null,
      originalSize: null,
      centroid: null,
    })),
}));
