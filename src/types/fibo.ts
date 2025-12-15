/**
 * FIBO JSON Schema Types
 * TypeScript definitions for FIBO prompt structures
 */

export type LightType = 'area' | 'point' | 'directional' | 'spot';
export type ColorSpace = 'sRGB' | 'ACEScg' | 'linear';

export interface FIBOLight {
  type: LightType;
  direction: string;
  position: [number, number, number];
  intensity: number;
  colorTemperature: number;
  softness: number;
  enabled: boolean;
  distance: number;
}

export interface FIBOLighting {
  mainLight: FIBOLight;
  fillLight?: FIBOLight;
  rimLight?: FIBOLight;
  ambientLight?: {
    intensity: number;
    colorTemperature: number;
  };
  lightingStyle: string;
}

export interface FIBOCamera {
  shotType: string;
  cameraAngle: string;
  fov: number;
  lensType: string;
  aperture: string;
  focusDistance_m: number;
  pitch: number;
  yaw: number;
  roll: number;
  seed: number;
}

export interface FIBOSubject {
  mainEntity: string;
  attributes: string;
  action: string;
  emotion?: string;
}

export interface FIBOEnvironment {
  setting: string;
  timeOfDay: string;
  weather: string;
  interiorStyle?: string;
}

export interface FIBORender {
  resolution: [number, number];
  colorSpace: ColorSpace;
  bitDepth: number;
  aov: string[];
  samples: number;
  denoiser?: string;
}

export interface FIBOEnhancements {
  hdr: boolean;
  professionalGrade: boolean;
  colorFidelity: boolean;
  contrastEnhance: number;
}

export interface FIBOPrompt {
  subject: FIBOSubject;
  environment: FIBOEnvironment;
  camera: FIBOCamera;
  lighting: FIBOLighting;
  render: FIBORender;
  enhancements?: FIBOEnhancements;
  styleParameters?: Record<string, any>;
  materials?: Record<string, any>;
  meta?: Record<string, any>;
}

// API Request/Response Types

export interface GenerateRequest {
  scene_description: string;
  lighting_setup: Record<string, any>;
  camera_settings?: Record<string, any>;
  render_settings?: Record<string, any>;
  use_mock: boolean;
}

export interface LightingAnalysis {
  key_to_fill_ratio: number;
  color_temperature_consistency: number;
  professional_rating: number;
  mood_assessment: string;
  recommendations: string[];
}

export interface GenerationResponse {
  generation_id: string;
  status: string;
  image_url?: string;
  duration_seconds: number;
  cost_credits: number;
  fibo_json?: FIBOPrompt;
  analysis?: LightingAnalysis;
  timestamp?: string;
}

export interface LightingPreset {
  presetId: string;
  name: string;
  category: string;
  description: string;
  lighting_config: FIBOLighting;
  ideal_for: string[];
}

export interface PresetListResponse {
  presets: LightingPreset[];
  total: number;
  page: number;
  page_size: number;
}

export interface HistoryItem {
  generation_id: string;
  timestamp: string;
  scene_description: string;
  image_url: string;
  cost_credits: number;
  preset_used?: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface BatchJobResponse {
  batch_id: string;
  status: string;
  items_total: number;
  items_completed: number;
  total_cost: number;
  created_at: string;
  results?: GenerationResponse[];
}

export interface ErrorResponse {
  status: string;
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}
