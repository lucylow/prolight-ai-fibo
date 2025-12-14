/**
 * FIBO JSON Schema Types
 * TypeScript definitions for FIBO prompt structures
 * Based on docs.bria.ai parameter reference
 */

export type LightType = 'area' | 'point' | 'directional' | 'spot';
export type ColorSpace = 'sRGB' | 'ACEScg' | 'linear';

// Camera shot types
export type ShotType = 
  | 'extreme close-up'
  | 'close-up'
  | 'medium close-up'
  | 'medium shot'
  | 'medium wide shot'
  | 'wide shot'
  | 'extreme wide shot'
  | 'establishing shot';

// Camera angles
export type CameraAngle = 
  | 'eye-level'
  | 'high angle'
  | 'low angle'
  | "bird's eye view"
  | "worm's eye view"
  | 'dutch angle'
  | 'overhead'
  | 'side angle';

// Lens types
export type LensType = 
  | 'portrait'
  | 'standard'
  | 'wide-angle'
  | 'ultra-wide'
  | 'telephoto'
  | 'macro'
  | 'fisheye';

// Light directions (10 canonical directions)
export type LightDirection = 
  | 'front'
  | 'front-right'
  | 'front-left'
  | 'right'
  | 'left'
  | 'back-right'
  | 'back-left'
  | 'back'
  | 'top'
  | 'bottom';

// Light falloff types
export type LightFalloff = 'inverse_square' | 'linear' | 'constant';

// Color moods
export type ColorMood = 'warm' | 'cool' | 'neutral' | 'vibrant' | 'muted' | 'monochrome';

// Time of day
export type TimeOfDay = 
  | 'controlled lighting'
  | 'dawn'
  | 'daylight'
  | 'dusk'
  | 'night';

// Style mediums
export type StyleMedium = 'photograph' | 'digital art' | 'illustration' | '3D render';

export interface FIBOLight {
  type?: LightType;
  direction: LightDirection | string; // Allow string for custom directions
  position?: [number, number, number];
  intensity: number; // 0.0-2.0
  colorTemperature: number; // 1000-10000 Kelvin
  softness: number; // 0.0-1.0
  enabled?: boolean;
  distance: number; // 0.5-10.0 meters
  falloff?: LightFalloff;
}

export interface FIBOLighting {
  main_light: FIBOLight;
  fill_light?: FIBOLight;
  rim_light?: FIBOLight;
  ambient_light?: {
    intensity: number; // 0.0-1.0
    colorTemperature: number; // 1000-10000 Kelvin
  };
  lightingStyle?: string;
  // Backward compatibility
  mainLight?: FIBOLight;
  fillLight?: FIBOLight;
  rimLight?: FIBOLight;
  ambientLight?: {
    intensity: number;
    colorTemperature: number;
  };
}

export interface FIBOCamera {
  shot_type: ShotType | string; // Allow string for custom shot types
  camera_angle: CameraAngle | string; // Allow string for custom angles
  fov: number; // 10-180 degrees
  lens_type: LensType | string; // Allow string for custom lens types
  aperture: string; // Format: "f/X.X"
  focus_distance_m: number; // 0.1+ meters
  pitch: number; // -90 to 90 degrees
  yaw: number; // -180 to 180 degrees
  roll: number; // -180 to 180 degrees
  seed: number; // Any integer for reproducibility
}

// Alternative camelCase format (for backward compatibility)
export interface FIBOCameraAlt {
  shotType: ShotType | string;
  cameraAngle: CameraAngle | string;
  fov: number;
  lensType: LensType | string;
  aperture: string;
  focusDistance_m: number;
  pitch: number;
  yaw: number;
  roll: number;
  seed: number;
}

export interface FIBOSubject {
  main_entity: string; // Primary subject description
  attributes: string[]; // Array of descriptive attributes
  action: string; // What the subject is doing
  emotion?: string; // Emotional state (optional)
  mood?: string; // Subject mood (optional)
}

// Alternative camelCase format (for backward compatibility)
export interface FIBOSubjectAlt {
  mainEntity: string;
  attributes: string | string[];
  action: string;
  emotion?: string;
  mood?: string;
}

export interface FIBOEnvironment {
  setting: string; // Environment description
  time_of_day: TimeOfDay | string; // Time of day
  lighting_conditions: string; // e.g., "professional studio", "natural daylight"
  atmosphere: string; // e.g., "controlled", "natural", "dramatic"
  weather?: string; // Weather conditions (optional)
  interior_style?: string; // Interior style if applicable (optional)
}

// Alternative camelCase format (for backward compatibility)
export interface FIBOEnvironmentAlt {
  setting: string;
  timeOfDay: TimeOfDay | string;
  weather?: string;
  interiorStyle?: string;
}

export interface FIBOColorPalette {
  white_balance: string; // Format: "XXXXK" (e.g., "5600K")
  mood: ColorMood | string; // Color mood
  dominant_colors?: string[]; // Dominant color scheme
  saturation?: number; // 0.0-2.0
  contrast?: number; // 0.0-2.0
  hue_shift?: number; // -180 to 180 degrees
}

export interface FIBOComposition {
  rule_of_thirds?: boolean;
  leading_lines?: string[]; // Leading lines in composition
  symmetry?: 'horizontal' | 'vertical' | 'radial' | 'none';
  framing?: string; // e.g., "centered", "rule of thirds", "natural"
  depth?: 'shallow' | 'medium' | 'deep'; // Depth of field
  negative_space?: number; // 0-1 ratio of negative space
  depth_layers?: number; // Number of depth layers (legacy)
}

export interface FIBORender {
  resolution: [number, number]; // [width, height]
  color_space: ColorSpace | string; // Color space
  bit_depth: number; // 8, 16, or 32
  samples?: number; // Render samples
  denoiser?: string; // Denoiser type
  aov?: string[]; // Arbitrary output variables (optional)
}

// Alternative camelCase format (for backward compatibility)
export interface FIBORenderAlt {
  resolution: [number, number];
  colorSpace: ColorSpace | string;
  bitDepth: number;
  aov: string[];
  samples: number;
  denoiser?: string;
}

export interface FIBOEnhancements {
  hdr?: boolean; // High dynamic range
  professional_grade?: boolean; // Professional-grade processing
  color_fidelity?: boolean; // Color accuracy
  detail_enhancement?: boolean; // Detail enhancement
  noise_reduction?: boolean; // Noise reduction
  contrast_enhance?: number; // Contrast enhancement (0.0-2.0)
}

// Alternative camelCase format (for backward compatibility)
export interface FIBOEnhancementsAlt {
  hdr: boolean;
  professionalGrade: boolean;
  colorFidelity: boolean;
  contrastEnhance: number;
}

export interface FIBOPrompt {
  subject: FIBOSubject | FIBOSubjectAlt;
  environment: FIBOEnvironment | FIBOEnvironmentAlt;
  camera: FIBOCamera | FIBOCameraAlt;
  lighting: FIBOLighting;
  color_palette?: FIBOColorPalette;
  style_medium?: StyleMedium | string; // e.g., "photograph", "digital art"
  artistic_style?: string; // e.g., "professional studio photography"
  composition?: FIBOComposition;
  render?: FIBORender | FIBORenderAlt;
  enhancements?: FIBOEnhancements | FIBOEnhancementsAlt;
  styleParameters?: Record<string, unknown>;
  materials?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

// Type guard to check if camera uses snake_case
export function isSnakeCaseCamera(camera: FIBOCamera | FIBOCameraAlt): camera is FIBOCamera {
  return 'shot_type' in camera;
}

// Type guard to check if subject uses snake_case
export function isSnakeCaseSubject(subject: FIBOSubject | FIBOSubjectAlt): subject is FIBOSubject {
  return 'main_entity' in subject;
}

// Type guard to check if environment uses snake_case
export function isSnakeCaseEnvironment(env: FIBOEnvironment | FIBOEnvironmentAlt): env is FIBOEnvironment {
  return 'time_of_day' in env;
}

// API Request/Response Types

export interface GenerateRequest {
  scene_description: string;
  lighting_setup: Record<string, unknown>;
  camera_settings?: Record<string, unknown>;
  render_settings?: Record<string, unknown>;
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
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}
