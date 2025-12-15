// frontend/src/stores/useLightingStore.ts
import { create } from "zustand";

export type Light = {
  id: string;
  name: string;
  enabled: boolean;
  intensity: number; // 0..2 (1 = native)
  kelvin: number; // 2000..10000
  direction: [number, number, number]; // normalized vector
  softness: number; // 0..1
  distance: number; // meters
  colorRgb?: [number, number, number]; // optional cached rgb
};

type LightingState = {
  lights: Light[];
  setLight: (id: string, patch: Partial<Light>) => void;
  addLight: (light: Light) => void;
  removeLight: (id: string) => void;
  setAllLights: (lights: Light[]) => void;
  sceneMood: string; // e.g. "warm_cozy"
  setMood: (m: string) => void;
};

export const useLightingStore = create<LightingState>((set, get) => ({
  lights: [
    {
      id: "key",
      name: "Key",
      enabled: true,
      intensity: 1.0,
      kelvin: 5600,
      direction: [0.5, -0.2, 1.1],
      softness: 0.25,
      distance: 1.5,
    },
    {
      id: "fill",
      name: "Fill",
      enabled: true,
      intensity: 0.4,
      kelvin: 5600,
      direction: [-0.5, -0.3, 1.05],
      softness: 0.7,
      distance: 2.0,
    },
    {
      id: "rim",
      name: "Rim",
      enabled: true,
      intensity: 0.6,
      kelvin: 3200,
      direction: [0.0, 0.8, -0.6],
      softness: 0.4,
      distance: 1.8,
    },
  ],
  setLight: (id, patch) => {
    set((s) => ({
      lights: s.lights.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  },
  addLight: (light) => set((s) => ({ lights: [...s.lights, light] })),
  removeLight: (id) => set((s) => ({ lights: s.lights.filter((l) => l.id !== id) })),
  setAllLights: (lights) => set(() => ({ lights })),
  sceneMood: "neutral",
  setMood: (m) => set(() => ({ sceneMood: m })),
}));

