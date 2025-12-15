/**
 * FIBO Composition & Camera Mapping Utilities
 * 
 * Enhanced utilities for working with FIBO JSON structures,
 * focusing on composition, camera, and scene metadata as first-class fields.
 * 
 * These utilities enable:
 * - Auto-population of camera/pose controls from FIBO JSON
 * - Undo/redo on camera/light via JSON diffs
 * - UI reflection of structured prompts
 * - Better deterministic control
 */

import type {
  FIBOCamera,
  FIBOPrompt,
  FIBOComposition,
  FIBOLighting,
} from '../types/fibo';

export interface CompositionParams {
  ruleOfThirds?: boolean;
  leadingLines?: string[];
  symmetry?: 'horizontal' | 'vertical' | 'radial' | 'none';
  framing?: string;
  depth?: 'shallow' | 'medium' | 'deep';
  negativeSpace?: number; // 0-1 ratio
}

export interface CameraExtraction {
  shotType: string;
  angle: string;
  fov: number;
  position: [number, number, number];
  rotation: [number, number, number];
  focus: number;
}

/**
 * Extract camera parameters from FIBO prompt for UI controls
 */
export function extractCameraFromFibo(
  fiboPrompt: FIBOPrompt
): CameraExtraction | null {
  if (!fiboPrompt.camera) {
    return null;
  }

  const camera = fiboPrompt.camera as FIBOCamera;

  return {
    shotType: camera.shotType || 'medium',
    angle: camera.cameraAngle || 'eye-level',
    fov: camera.fov || 50,
    position: [0, 0, 0], // Default, can be enhanced with position data
    rotation: [camera.pitch || 0, camera.yaw || 0, camera.roll || 0],
    focus: camera.focusDistance_m || 1.0,
  };
}

/**
 * Build FIBO camera structure from UI controls
 */
export function buildFiboCamera(
  params: Partial<CameraExtraction>
): Partial<FIBOCamera> {
  return {
    shotType: params.shotType,
    cameraAngle: params.angle,
    fov: params.fov,
    pitch: params.rotation?.[0],
    yaw: params.rotation?.[1],
    roll: params.rotation?.[2],
    focusDistance_m: params.focus,
  };
}

/**
 * Extract composition metadata from FIBO prompt
 */
export function extractCompositionFromFibo(
  fiboPrompt: FIBOPrompt
): CompositionParams | null {
  if (!fiboPrompt.composition) {
    return null;
  }

  const comp = fiboPrompt.composition as FIBOComposition;

  return {
    ruleOfThirds: comp.rule_of_thirds,
    leadingLines: comp.leading_lines,
    symmetry: comp.symmetry as CompositionParams['symmetry'],
    framing: comp.framing,
    depth: comp.depth as CompositionParams['depth'],
    negativeSpace: comp.negative_space,
  };
}

/**
 * Build FIBO composition structure
 */
export function buildFiboComposition(
  params: CompositionParams
): Partial<FIBOComposition> {
  return {
    rule_of_thirds: params.ruleOfThirds,
    leading_lines: params.leadingLines,
    symmetry: params.symmetry,
    framing: params.framing,
    depth: params.depth,
    negative_space: params.negativeSpace,
  };
}

/**
 * Merge lighting override into existing FIBO prompt
 * Preserves other sections while updating lighting
 */
export function mergeLightingIntoFibo(
  fiboPrompt: FIBOPrompt,
  lightingOverride: Partial<FIBOLighting>
): FIBOPrompt {
  return {
    ...fiboPrompt,
    lighting: {
      ...fiboPrompt.lighting,
      ...lightingOverride,
    },
  };
}

/**
 * Create a diff between two FIBO prompts
 * Useful for undo/redo functionality
 */
export function diffFiboPrompts(
  oldPrompt: FIBOPrompt,
  newPrompt: FIBOPrompt
): Partial<FIBOPrompt> {
  const diff: Partial<FIBOPrompt> = {};

  // Compare lighting
  if (JSON.stringify(oldPrompt.lighting) !== JSON.stringify(newPrompt.lighting)) {
    diff.lighting = newPrompt.lighting;
  }

  // Compare camera
  if (JSON.stringify(oldPrompt.camera) !== JSON.stringify(newPrompt.camera)) {
    diff.camera = newPrompt.camera;
  }

  // Compare composition
  if (
    oldPrompt.composition &&
    newPrompt.composition &&
    JSON.stringify(oldPrompt.composition) !== JSON.stringify(newPrompt.composition)
  ) {
    diff.composition = newPrompt.composition;
  }

  // Compare other fields
  if (JSON.stringify(oldPrompt.subject) !== JSON.stringify(newPrompt.subject)) {
    diff.subject = newPrompt.subject;
  }

  if (
    JSON.stringify(oldPrompt.environment) !== JSON.stringify(newPrompt.environment)
  ) {
    diff.environment = newPrompt.environment;
  }

  return diff;
}

/**
 * Apply a diff to a FIBO prompt
 * Used for undo/redo operations
 */
export function applyFiboDiff(
  basePrompt: FIBOPrompt,
  diff: Partial<FIBOPrompt>
): FIBOPrompt {
  return {
    ...basePrompt,
    ...diff,
    // Deep merge for nested objects
    lighting: diff.lighting || basePrompt.lighting,
    camera: diff.camera || basePrompt.camera,
    composition: diff.composition || basePrompt.composition,
  };
}

/**
 * Validate FIBO prompt structure
 * Returns array of validation errors (empty if valid)
 */
export function validateFiboPrompt(
  prompt: Partial<FIBOPrompt>
): string[] {
  const errors: string[] = [];

  if (!prompt.subject) {
    errors.push('Missing required field: subject');
  }

  if (!prompt.environment) {
    errors.push('Missing required field: environment');
  }

  if (!prompt.lighting) {
    errors.push('Missing required field: lighting');
  }

  if (prompt.camera) {
    const camera = prompt.camera as FIBOCamera;
    if (camera.fov && (camera.fov < 10 || camera.fov > 120)) {
      errors.push('Camera FOV must be between 10 and 120 degrees');
    }
  }

  return errors;
}

/**
 * Extract full structured prompt metadata for UI reflection
 */
export function extractFiboMetadata(prompt: FIBOPrompt): {
  camera: CameraExtraction | null;
  composition: CompositionParams | null;
  lighting: FIBOLighting;
  subject: string;
  environment: string;
} {
  return {
    camera: extractCameraFromFibo(prompt),
    composition: extractCompositionFromFibo(prompt),
    lighting: prompt.lighting,
    subject:
      typeof prompt.subject === 'object' && 'main_entity' in prompt.subject
        ? prompt.subject.main_entity
        : typeof prompt.subject === 'object' && 'mainEntity' in prompt.subject
        ? prompt.subject.mainEntity
        : 'Unknown',
    environment:
      typeof prompt.environment === 'object' && 'setting' in prompt.environment
        ? prompt.environment.setting
        : 'Unknown',
  };
}

