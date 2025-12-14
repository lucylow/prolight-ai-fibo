/**
 * FIBO Parameter Validation Utilities
 * Validates FIBO JSON structures according to docs.bria.ai parameter reference
 */

import type {
  FIBOCamera,
  FIBOCameraAlt,
  FIBOLight,
  FIBOLighting,
  FIBOColorPalette,
  FIBOPrompt,
  ShotType,
  CameraAngle,
  LensType,
  LightDirection,
  TimeOfDay,
  ColorMood,
  StyleMedium
} from '../types/fibo';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate camera parameters
 */
export function validateCamera(camera: FIBOCamera | FIBOCameraAlt): ValidationResult {
  const errors: ValidationError[] = [];
  const isSnakeCase = 'shot_type' in camera;

  // FOV validation (10-180 degrees)
  if (camera.fov < 10 || camera.fov > 180) {
    errors.push({
      field: isSnakeCase ? 'camera.fov' : 'camera.fov',
      message: 'FOV must be between 10 and 180 degrees',
      value: camera.fov
    });
  }

  // Pitch validation (-90 to 90)
  if (camera.pitch < -90 || camera.pitch > 90) {
    errors.push({
      field: isSnakeCase ? 'camera.pitch' : 'camera.pitch',
      message: 'Pitch must be between -90 and 90 degrees',
      value: camera.pitch
    });
  }

  // Yaw validation (-180 to 180)
  if (camera.yaw < -180 || camera.yaw > 180) {
    errors.push({
      field: isSnakeCase ? 'camera.yaw' : 'camera.yaw',
      message: 'Yaw must be between -180 and 180 degrees',
      value: camera.yaw
    });
  }

  // Roll validation (-180 to 180)
  if (camera.roll < -180 || camera.roll > 180) {
    errors.push({
      field: isSnakeCase ? 'camera.roll' : 'camera.roll',
      message: 'Roll must be between -180 and 180 degrees',
      value: camera.roll
    });
  }

  // Focus distance validation (0.1+ meters)
  const focusDistance = isSnakeCase 
    ? (camera as FIBOCamera).focus_distance_m 
    : (camera as FIBOCameraAlt).focusDistance_m;
  
  if (focusDistance < 0.1) {
    errors.push({
      field: isSnakeCase ? 'camera.focus_distance_m' : 'camera.focusDistance_m',
      message: 'Focus distance must be at least 0.1 meters',
      value: focusDistance
    });
  }

  // Aperture format validation (should be "f/X.X")
  const aperture = camera.aperture;
  if (typeof aperture === 'string' && !/^f\/\d+(\.\d+)?$/i.test(aperture)) {
    errors.push({
      field: 'camera.aperture',
      message: 'Aperture should be in format "f/X.X" (e.g., "f/2.8", "f/11")',
      value: aperture
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate lighting parameters
 */
export function validateLighting(lighting: FIBOLighting): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate main light (required)
  if (!lighting.main_light) {
    errors.push({
      field: 'lighting.main_light',
      message: 'Main light is required'
    });
  } else {
    errors.push(...validateLight(lighting.main_light, 'main_light').errors);
  }

  // Validate fill light (optional)
  if (lighting.fill_light) {
    errors.push(...validateLight(lighting.fill_light, 'fill_light').errors);
  }

  // Validate rim light (optional)
  if (lighting.rim_light) {
    errors.push(...validateLight(lighting.rim_light, 'rim_light').errors);
  }

  // Validate ambient light (optional)
  if (lighting.ambient_light) {
    if (lighting.ambient_light.intensity < 0 || lighting.ambient_light.intensity > 1.0) {
      errors.push({
        field: 'lighting.ambient_light.intensity',
        message: 'Ambient light intensity must be between 0.0 and 1.0',
        value: lighting.ambient_light.intensity
      });
    }

    if (lighting.ambient_light.colorTemperature < 1000 || lighting.ambient_light.colorTemperature > 10000) {
      errors.push({
        field: 'lighting.ambient_light.colorTemperature',
        message: 'Color temperature must be between 1000 and 10000 Kelvin',
        value: lighting.ambient_light.colorTemperature
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate individual light
 */
export function validateLight(light: FIBOLight, prefix = 'light'): ValidationResult {
  const errors: ValidationError[] = [];

  // Intensity validation (0.0-2.0)
  if (light.intensity < 0 || light.intensity > 2.0) {
    errors.push({
      field: `${prefix}.intensity`,
      message: 'Light intensity must be between 0.0 and 2.0',
      value: light.intensity
    });
  }

  // Color temperature validation (1000-10000 Kelvin)
  if (light.colorTemperature < 1000 || light.colorTemperature > 10000) {
    errors.push({
      field: `${prefix}.colorTemperature`,
      message: 'Color temperature must be between 1000 and 10000 Kelvin',
      value: light.colorTemperature
    });
  }

  // Softness validation (0.0-1.0)
  if (light.softness < 0 || light.softness > 1.0) {
    errors.push({
      field: `${prefix}.softness`,
      message: 'Light softness must be between 0.0 and 1.0',
      value: light.softness
    });
  }

  // Distance validation (0.5-10.0 meters)
  if (light.distance < 0.5 || light.distance > 10.0) {
    errors.push({
      field: `${prefix}.distance`,
      message: 'Light distance must be between 0.5 and 10.0 meters',
      value: light.distance
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate color palette parameters
 */
export function validateColorPalette(palette: FIBOColorPalette): ValidationResult {
  const errors: ValidationError[] = [];

  // White balance format validation
  if (palette.white_balance && !/^\d+K$/i.test(palette.white_balance)) {
    errors.push({
      field: 'color_palette.white_balance',
      message: 'White balance should be in format "XXXXK" (e.g., "5600K")',
      value: palette.white_balance
    });
  }

  // Saturation validation (0.0-2.0)
  if (palette.saturation !== undefined) {
    if (palette.saturation < 0 || palette.saturation > 2.0) {
      errors.push({
        field: 'color_palette.saturation',
        message: 'Saturation must be between 0.0 and 2.0',
        value: palette.saturation
      });
    }
  }

  // Contrast validation (0.0-2.0)
  if (palette.contrast !== undefined) {
    if (palette.contrast < 0 || palette.contrast > 2.0) {
      errors.push({
        field: 'color_palette.contrast',
        message: 'Contrast must be between 0.0 and 2.0',
        value: palette.contrast
      });
    }
  }

  // Hue shift validation (-180 to 180)
  if (palette.hue_shift !== undefined) {
    if (palette.hue_shift < -180 || palette.hue_shift > 180) {
      errors.push({
        field: 'color_palette.hue_shift',
        message: 'Hue shift must be between -180 and 180 degrees',
        value: palette.hue_shift
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate complete FIBO prompt
 */
export function validateFIBOPrompt(prompt: FIBOPrompt): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!prompt.subject) {
    errors.push({ field: 'subject', message: 'Subject is required' });
  }

  if (!prompt.environment) {
    errors.push({ field: 'environment', message: 'Environment is required' });
  }

  if (!prompt.camera) {
    errors.push({ field: 'camera', message: 'Camera is required' });
  } else {
    errors.push(...validateCamera(prompt.camera).errors);
  }

  if (!prompt.lighting) {
    errors.push({ field: 'lighting', message: 'Lighting is required' });
  } else {
    errors.push(...validateLighting(prompt.lighting).errors);
  }

  // Validate optional color palette
  if (prompt.color_palette) {
    errors.push(...validateColorPalette(prompt.color_palette).errors);
  }

  // Validate render settings if provided
  if (prompt.render) {
    const render = prompt.render;
    if (render.resolution) {
      const [width, height] = render.resolution;
      if (width <= 0 || height <= 0) {
        errors.push({
          field: 'render.resolution',
          message: 'Resolution width and height must be positive numbers',
          value: render.resolution
        });
      }
    }

    const bitDepth = 'bit_depth' in render ? render.bit_depth : render.bitDepth;
    if (bitDepth && ![8, 16, 32].includes(bitDepth)) {
      errors.push({
        field: 'render.bit_depth',
        message: 'Bit depth must be 8, 16, or 32',
        value: bitDepth
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get validation summary as human-readable string
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    return '✓ All parameters are valid';
  }

  const errorMessages = result.errors.map(err => 
    `  • ${err.field}: ${err.message}${err.value !== undefined ? ` (got: ${err.value})` : ''}`
  ).join('\n');

  return `Validation failed with ${result.errors.length} error(s):\n${errorMessages}`;
}
