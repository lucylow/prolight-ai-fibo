// frontend/src/stores/useCameraStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CameraState = {
  fov: number;
  focalLengthMM: number;
  sensorHeightMM: number;
  aspectRatio: number;
  aperture: number;
  focusDistanceM: number;
  position: [number, number, number];
  lookAt: [number, number, number];
};

export type LensSim = {
  vignetteAmount: number;
  vignetteCurve: number;
  distortionK1: number;
  distortionK2: number;
  chromaticAberration: number;
  filmGrain: number;
};

export type PhotographerPose = {
  id: string;
  name: string;
  camera: CameraState;
  createdAt: string;
};

type State = {
  camera: CameraState;
  setCamera: (patch: Partial<CameraState>) => void;
  lensSim: LensSim;
  setLensSim: (patch: Partial<LensSim>) => void;
  poses: PhotographerPose[];
  savePose: (name: string) => void;
  loadPose: (id: string) => void;
  deletePose: (id: string) => void;
};

const DEFAULT_CAMERA: CameraState = {
  fov: 50,
  focalLengthMM: 50,
  sensorHeightMM: 24,
  aspectRatio: 16 / 9,
  aperture: 2.8,
  focusDistanceM: 1.2,
  position: [0, 1.2, 2.0],
  lookAt: [0, 0.8, 0],
};

const DEFAULT_LENS: LensSim = {
  vignetteAmount: 0.15,
  vignetteCurve: 1.0,
  distortionK1: 0.0,
  distortionK2: 0.0,
  chromaticAberration: 0.02,
  filmGrain: 0.02,
};

export const useCameraStore = create<State>()(
  persist(
    (set, get) => ({
      camera: DEFAULT_CAMERA,
      setCamera: (patch) => set({ camera: { ...get().camera, ...patch } }),
      lensSim: DEFAULT_LENS,
      setLensSim: (patch) => set({ lensSim: { ...get().lensSim, ...patch } }),
      poses: [],
      savePose: (name) => {
        const camera = get().camera;
        const pose = { id: `pose_${Date.now()}`, name, camera: JSON.parse(JSON.stringify(camera)), createdAt: new Date().toISOString() };
        set({ poses: [pose, ...get().poses] });
      },
      loadPose: (id) => {
        const p = get().poses.find((x) => x.id === id);
        if (p) set({ camera: p.camera });
      },
      deletePose: (id) => set({ poses: get().poses.filter((x) => x.id !== id) }),
    }),
    { name: "prolight-camera-v1" }
  )
);

export default useCameraStore;
