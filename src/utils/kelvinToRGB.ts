/**
 * Color Temperature Utilities
 * Convert Kelvin to RGB for lighting visualization
 */

/**
 * Convert Kelvin color temperature to RGB
 * Based on the algorithm by Tanner Helland
 */
export function kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
  // Clamp to valid range
  kelvin = Math.max(1000, Math.min(40000, kelvin));

  const temp = kelvin / 100;

  let r: number;
  let g: number;
  let b: number;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  // Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else {
    if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      b = Math.max(0, Math.min(255, b));
    }
  }

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

/**
 * Convert Kelvin to hex color
 */
export function kelvinToHex(kelvin: number): string {
  const rgb = kelvinToRGB(kelvin);
  return `#${[rgb.r, rgb.g, rgb.b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

/**
 * Get color temperature label
 */
export function getColorTemperatureLabel(kelvin: number): string {
  if (kelvin < 2000) return 'Very Warm';
  if (kelvin < 3000) return 'Warm (Tungsten)';
  if (kelvin < 4000) return 'Neutral Warm';
  if (kelvin < 5000) return 'Neutral';
  if (kelvin < 6000) return 'Cool (Daylight)';
  if (kelvin < 7000) return 'Very Cool';
  return 'Extremely Cool';
}

