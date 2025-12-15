/**
 * Lighting and Camera Presets
 * Professional photography presets for ProLight AI
 */

import { LightingConfig, CameraConfig, SceneConfig } from './fiboBuilder';

export interface Preset {
  id: string;
  name: string;
  description: string;
  lighting: LightingConfig;
  camera: CameraConfig;
  scene: SceneConfig;
  category: 'studio' | 'product' | 'portrait' | 'dramatic' | 'natural';
}

export const lightingPresets: Preset[] = [
  {
    id: 'studio-3-point',
    name: 'Studio 3-Point',
    description: 'Classic professional 3-point lighting setup',
    category: 'studio',
    lighting: {
      key: {
        intensity: 1.2,
        angle_horizontal: 45,
        angle_vertical: 30,
        color_temperature: 5500,
        softness: 0.6,
        distance: 1.5,
        enabled: true,
      },
      fill: {
        intensity: 0.6,
        angle_horizontal: -45,
        angle_vertical: 30,
        color_temperature: 5500,
        softness: 0.8,
        distance: 2.0,
        enabled: true,
        fill_ratio: 0.5,
      },
      rim: {
        intensity: 0.8,
        angle_horizontal: 135,
        angle_vertical: 45,
        color_temperature: 5500,
        softness: 0.4,
        distance: 2.5,
        enabled: true,
      },
      ambient: {
        intensity: 0.2,
        color_temperature: 5500,
        enabled: true,
      },
    },
    camera: {
      focal_length: 85,
      aperture: 2.8,
      iso: 100,
      white_balance: 5500,
      metering_mode: 'spot',
      shot_type: 'product',
      camera_angle: 'eye-level',
    },
    scene: {
      subject_description: '',
      environment: 'studio',
      style_preset: 'professional',
      background: 'neutral',
    },
  },
  {
    id: 'product-85mm',
    name: 'Product 85mm f/2.8',
    description: 'Sharp product photography with shallow depth of field',
    category: 'product',
    lighting: {
      key: {
        intensity: 1.0,
        angle_horizontal: 30,
        angle_vertical: 20,
        color_temperature: 5600,
        softness: 0.7,
        distance: 1.8,
        enabled: true,
      },
      fill: {
        intensity: 0.5,
        angle_horizontal: -30,
        angle_vertical: 20,
        color_temperature: 5600,
        softness: 0.9,
        distance: 2.2,
        enabled: true,
        fill_ratio: 0.5,
      },
      rim: {
        intensity: 0.6,
        angle_horizontal: 120,
        angle_vertical: 40,
        color_temperature: 5600,
        softness: 0.5,
        distance: 2.8,
        enabled: true,
      },
      ambient: {
        intensity: 0.15,
        color_temperature: 5600,
        enabled: true,
      },
    },
    camera: {
      focal_length: 85,
      aperture: 2.8,
      iso: 100,
      white_balance: 5600,
      metering_mode: 'center-weighted',
      shot_type: 'product',
      camera_angle: 'slight-high',
    },
    scene: {
      subject_description: '',
      environment: 'studio',
      style_preset: 'commercial',
      background: 'white',
    },
  },
  {
    id: 'dramatic-rim',
    name: 'Dramatic Rim',
    description: 'High contrast rim lighting for dramatic effect',
    category: 'dramatic',
    lighting: {
      key: {
        intensity: 0.4,
        angle_horizontal: 30,
        angle_vertical: 20,
        color_temperature: 3200,
        softness: 0.3,
        distance: 2.0,
        enabled: true,
      },
      fill: {
        intensity: 0.2,
        angle_horizontal: -30,
        angle_vertical: 20,
        color_temperature: 3200,
        softness: 0.5,
        distance: 2.5,
        enabled: true,
        fill_ratio: 0.3,
      },
      rim: {
        intensity: 1.5,
        angle_horizontal: 150,
        angle_vertical: 60,
        color_temperature: 3200,
        softness: 0.2,
        distance: 1.8,
        enabled: true,
      },
      ambient: {
        intensity: 0.1,
        color_temperature: 3200,
        enabled: true,
      },
    },
    camera: {
      focal_length: 50,
      aperture: 1.8,
      iso: 400,
      white_balance: 3200,
      metering_mode: 'spot',
      shot_type: 'portrait',
      camera_angle: 'eye-level',
    },
    scene: {
      subject_description: '',
      environment: 'studio',
      style_preset: 'dramatic',
      background: 'dark',
    },
  },
  {
    id: 'soft-window',
    name: 'Soft Window Light',
    description: 'Natural soft window lighting with subtle fill',
    category: 'natural',
    lighting: {
      key: {
        intensity: 0.9,
        angle_horizontal: -60,
        angle_vertical: 15,
        color_temperature: 5500,
        softness: 1.0,
        distance: 3.0,
        enabled: true,
      },
      fill: {
        intensity: 0.4,
        angle_horizontal: 60,
        angle_vertical: 15,
        color_temperature: 5500,
        softness: 0.9,
        distance: 3.5,
        enabled: true,
        fill_ratio: 0.4,
      },
      rim: {
        intensity: 0.3,
        angle_horizontal: 90,
        angle_vertical: 30,
        color_temperature: 5500,
        softness: 0.8,
        distance: 4.0,
        enabled: true,
      },
      ambient: {
        intensity: 0.5,
        color_temperature: 5500,
        enabled: true,
      },
    },
    camera: {
      focal_length: 50,
      aperture: 2.0,
      iso: 200,
      white_balance: 5500,
      metering_mode: 'matrix',
      shot_type: 'portrait',
      camera_angle: 'eye-level',
    },
    scene: {
      subject_description: '',
      environment: 'indoor',
      style_preset: 'natural',
      background: 'neutral',
    },
  },
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): Preset | undefined {
  return lightingPresets.find(p => p.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: Preset['category']): Preset[] {
  return lightingPresets.filter(p => p.category === category);
}

