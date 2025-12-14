/**
 * ControlNet Helper Utilities
 * 
 * Provides utilities for working with ControlNet guidance images,
 * including preprocessing, validation, and conversion functions.
 */

export interface ControlNetMethodInfo {
  name: string;
  description: string;
  bestFor: string[];
  recommendedScale: [number, number];
  imageRequirements: {
    format: string[];
    minResolution?: number;
    maxSize?: number; // MB
  };
}

/**
 * ControlNet method information and recommendations
 */
export const CONTROLNET_METHODS: Record<string, ControlNetMethodInfo> = {
  controlnet_canny: {
    name: "Canny Edge Detection",
    description: "Preserves structure and outlines. Best for maintaining composition and shape.",
    bestFor: ["Architectural renders", "Product outlines", "Structural preservation"],
    recommendedScale: [0.7, 0.9],
    imageRequirements: {
      format: ["png", "jpg", "jpeg"],
      minResolution: 512,
      maxSize: 10,
    },
  },
  controlnet_depth: {
    name: "Depth Map",
    description: "Controls 3D spatial relationships. Excellent for lighting-sensitive scenes.",
    bestFor: ["Lighting control", "3D spatial accuracy", "ProLight AI workflows"],
    recommendedScale: [0.8, 0.95],
    imageRequirements: {
      format: ["png"], // Depth maps work best as PNG
      minResolution: 512,
      maxSize: 10,
    },
  },
  controlnet_recoloring: {
    name: "Recoloring",
    description: "Maintains structure while changing colors. Great for style transfer.",
    bestFor: ["Color style transfer", "Maintaining structure with new colors"],
    recommendedScale: [0.7, 0.85],
    imageRequirements: {
      format: ["png", "jpg", "jpeg"],
      minResolution: 512,
      maxSize: 10,
    },
  },
  controlnet_color_grid: {
    name: "Color Grid",
    description: "Controls color distribution and placement. Useful for composition control.",
    bestFor: ["Color composition", "Palette control", "Artistic color placement"],
    recommendedScale: [0.6, 0.8],
    imageRequirements: {
      format: ["png", "jpg", "jpeg"],
      minResolution: 512,
      maxSize: 10,
    },
  },
};

/**
 * Validate a ControlNet guidance image file
 */
export function validateGuidanceImage(
  file: File,
  method: string
): { valid: boolean; error?: string } {
  const methodInfo = CONTROLNET_METHODS[method];
  if (!methodInfo) {
    return { valid: false, error: `Unknown ControlNet method: ${method}` };
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (methodInfo.imageRequirements.maxSize && fileSizeMB > methodInfo.imageRequirements.maxSize) {
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum (${methodInfo.imageRequirements.maxSize}MB)`,
    };
  }

  // Check file format
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !methodInfo.imageRequirements.format.includes(extension)) {
    return {
      valid: false,
      error: `File format .${extension} not supported. Use: ${methodInfo.imageRequirements.format.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Convert image file to base64 data URI
 */
export async function imageFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error("Failed to read image file"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert image URL to base64 (client-side, requires CORS)
 * Note: For server-side use, use the backend endpoint instead
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to convert image to base64"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Error converting image URL to base64: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get recommended scale for a ControlNet method
 */
export function getRecommendedScale(method: string): number {
  const methodInfo = CONTROLNET_METHODS[method];
  if (!methodInfo) {
    return 0.8; // Default
  }
  // Return midpoint of recommended range
  const [min, max] = methodInfo.recommendedScale;
  return (min + max) / 2;
}

/**
 * Get method information
 */
export function getMethodInfo(method: string): ControlNetMethodInfo | null {
  return CONTROLNET_METHODS[method] || null;
}

/**
 * Check if two ControlNet methods are compatible for combination
 */
export function areMethodsCompatible(method1: string, method2: string): boolean {
  // Most methods are compatible, but some combinations work better
  const incompatiblePairs: [string, string][] = [];
  
  // Check if this is an incompatible pair
  for (const [a, b] of incompatiblePairs) {
    if ((method1 === a && method2 === b) || (method1 === b && method2 === a)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get recommended method combinations
 */
export function getRecommendedCombinations(): Array<{ methods: string[]; useCase: string }> {
  return [
    {
      methods: ["controlnet_depth", "controlnet_canny"],
      useCase: "Maximum structural and lighting control (Recommended for ProLight AI)",
    },
    {
      methods: ["controlnet_depth", "controlnet_recoloring"],
      useCase: "Spatial control with color style transfer",
    },
    {
      methods: ["controlnet_canny", "controlnet_color_grid"],
      useCase: "Structure preservation with color composition",
    },
  ];
}

/**
 * Validate multiple ControlNet methods
 */
export function validateMultipleMethods(methods: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check maximum count
  if (methods.length > 2) {
    errors.push("Maximum 2 ControlNet methods allowed simultaneously");
  }

  // Check for duplicates
  const uniqueMethods = new Set(methods);
  if (uniqueMethods.size !== methods.length) {
    errors.push("Duplicate ControlNet methods not allowed");
  }

  // Check compatibility
  if (methods.length === 2) {
    if (!areMethodsCompatible(methods[0], methods[1])) {
      errors.push(`Methods ${methods[0]} and ${methods[1]} are not compatible`);
    }
  }

  // Validate each method exists
  for (const method of methods) {
    if (!CONTROLNET_METHODS[method]) {
      errors.push(`Unknown ControlNet method: ${method}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a preview URL from a file (for UI display)
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL (cleanup)
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Calculate optimal scale for combined ControlNet methods
 * When using multiple methods, scales should be slightly reduced
 */
export function calculateCombinedScale(
  method: string,
  isCombined: boolean,
  baseScale?: number
): number {
  const recommended = baseScale || getRecommendedScale(method);
  
  if (isCombined) {
    // Reduce scale by 10-15% when combined
    return Math.max(0.5, recommended * 0.85);
  }
  
  return recommended;
}

/**
 * Format scale value for display
 */
export function formatScale(scale: number): string {
  return scale.toFixed(2);
}

/**
 * Get scale description based on value
 */
export function getScaleDescription(scale: number): string {
  if (scale < 0.3) return "Very Creative (minimal control)";
  if (scale < 0.5) return "Creative (low control)";
  if (scale < 0.7) return "Balanced (moderate control)";
  if (scale < 0.9) return "Strong Control (recommended for professional use)";
  return "Maximum Control (strict adherence)";
}

/**
 * Check if image dimensions meet minimum requirements
 */
export async function checkImageDimensions(
  file: File,
  minWidth: number = 512,
  minHeight: number = 512
): Promise<{ valid: boolean; width?: number; height?: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      
      if (width < minWidth || height < minHeight) {
        resolve({
          valid: false,
          width,
          height,
          error: `Image dimensions (${width}x${height}) below minimum (${minWidth}x${minHeight})`,
        });
      } else {
        resolve({ valid: true, width, height });
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: "Failed to load image for dimension check",
      });
    };
    
    img.src = url;
  });
}

/**
 * Generate guidance image recommendations based on use case
 */
export function getGuidanceImageRecommendations(useCase: string): {
  method: string;
  scale: number;
  tips: string[];
} | null {
  const recommendations: Record<string, { method: string; scale: number; tips: string[] }> = {
    "product photography": {
      method: "controlnet_depth",
      scale: 0.9,
      tips: [
        "Use depth maps from 3D product models",
        "Ensure depth map has clear foreground/background separation",
        "Scale 0.85-0.95 recommended for product shots",
      ],
    },
    "architectural render": {
      method: "controlnet_canny",
      scale: 0.8,
      tips: [
        "Use edge detection from CAD or 3D models",
        "Combine with depth ControlNet for maximum control",
        "Scale 0.75-0.85 for architectural scenes",
      ],
    },
    "portrait lighting": {
      method: "controlnet_depth",
      scale: 0.85,
      tips: [
        "Depth maps work excellently for portrait lighting",
        "Use scale 0.8-0.9 for natural-looking results",
        "Combine with ProLight AI lighting parameters",
      ],
    },
    "style transfer": {
      method: "controlnet_recoloring",
      scale: 0.75,
      tips: [
        "Use reference images with desired color palette",
        "Scale 0.7-0.8 allows more creative interpretation",
        "Maintains structure while changing colors",
      ],
    },
  };

  const lowerCaseUseCase = useCase.toLowerCase();
  for (const [key, value] of Object.entries(recommendations)) {
    if (lowerCaseUseCase.includes(key)) {
      return value;
    }
  }

  return null;
}
