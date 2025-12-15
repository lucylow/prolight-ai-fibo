/**
 * Minimal JSX intrinsics augmentation for react-three-fiber + custom shaderMaterial elements
 * Add other tags here as needed (e.g., shaderMaterial, primitive).
 */
import * as THREE from 'three';
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // allow <primitive object={...} /> and shaderMaterial tags
      primitive: any;
      shaderMaterial: any;
      // fallback to allow unknown WebGL-related tags during incremental typing
      // add more explicit typings as you replace 'any'
    }
  }
}
export {};

