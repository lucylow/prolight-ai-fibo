import { create } from "zustand";

/**
 * App-wide Zustand store for camera → FIBO JSON synchronization
 * 
 * This store ensures that camera controls and JSON panel are single source of truth.
 * Updates to camera state automatically sync to FIBO JSON format.
 */

export type CameraJson = {
  lighting?: {
    key?: {
      intensity?: number;
      color?: [number, number, number];
      position?: [number, number, number];
      angle?: number;
    };
    fill?: {
      intensity?: number;
      color?: [number, number, number];
      position?: [number, number, number];
    };
    rim?: {
      intensity?: number;
      color?: [number, number, number];
      position?: [number, number, number];
    };
    [key: string]: any;
  };
  camera?: {
    fov?: number;
    position?: [number, number, number];
    lookAt?: [number, number, number];
    aperture?: number;
    focalLength?: number;
  };
  [key: string]: any;
};

type AppStore = {
  cameraJson: CameraJson;
  setCameraJson: (json: CameraJson) => void;
  updateCameraField: (path: string, value: unknown) => void;
  resetCameraJson: () => void;
};

const defaultCameraJson: CameraJson = {
  lighting: {
    key: {
      intensity: 1.0,
      color: [1, 1, 1],
      position: [2, 2, 2],
      angle: 45,
    },
    fill: {
      intensity: 0.5,
      color: [1, 1, 1],
      position: [-2, 1, 2],
    },
    rim: {
      intensity: 0.3,
      color: [1, 1, 1],
      position: [0, 2, -2],
    },
  },
  camera: {
    fov: 50,
    position: [0, 1.2, 2.0],
    lookAt: [0, 0.8, 0],
    aperture: 2.8,
    focalLength: 50,
  },
};

export const useAppStore = create<AppStore>((set, get) => ({
  cameraJson: defaultCameraJson,
  
  setCameraJson: (json) => set({ cameraJson: json }),
  
  updateCameraField: (path: string, value: unknown) => {
    const cameraJson = { ...get().cameraJson };
    
    // Deep clone to avoid mutation
    const deepClone = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== "object") return obj;
      if (obj instanceof Array) return obj.map(deepClone);
      if (typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
          acc[key] = deepClone((obj as Record<string, unknown>)[key]);
          return acc;
        }, {} as Record<string, unknown>);
      }
      return obj;
    };
    
    const cloned = deepClone(cameraJson) as CameraJson;
    
    // Navigate to the nested path and set the value
    const parts = path.split(".");
    let current: Record<string, unknown> = cloned as Record<string, unknown>;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
    
    set({ cameraJson: cloned });
  },
  
  resetCameraJson: () => set({ cameraJson: defaultCameraJson }),
}));

/**
 * Helper hook to sync camera state to FIBO JSON
 * 
 * Usage in CameraControls:
 * ```tsx
 * const { updateCameraField } = useAppStore();
 * updateCameraField("lighting.key.intensity", 0.8);
 * ```
 * 
 * Usage in JSONPanel:
 * ```tsx
 * const { cameraJson } = useAppStore();
 * <pre>{JSON.stringify(cameraJson, null, 2)}</pre>
 * ```
 */
export default useAppStore;


