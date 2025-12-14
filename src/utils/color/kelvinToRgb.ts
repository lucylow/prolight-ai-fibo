// frontend/src/utils/color/kelvinToRgb.ts
// Returns [r,g,b] in 0..255 integer sRGB approx.
// Source: adapted approximation of black-body to RGB for UI preview.
export function kelvinToRgb(kelvin: number): [number, number, number] {
  // clamp range
  let K = Math.max(1000, Math.min(40000, kelvin)) / 100;

  let red: number, green: number, blue: number;

  // red
  if (K <= 66) {
    red = 255;
  } else {
    red = K - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
    red = Math.min(255, Math.max(0, red));
  }

  // green
  if (K <= 66) {
    green = 99.4708025861 * Math.log(K) - 161.1195681661;
    green = Math.min(255, Math.max(0, green));
  } else {
    green = K - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    green = Math.min(255, Math.max(0, green));
  }

  // blue
  if (K >= 66) {
    blue = 255;
  } else if (K <= 19) {
    blue = 0;
  } else {
    blue = K - 10;
    blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    blue = Math.min(255, Math.max(0, blue));
  }

  return [Math.round(red), Math.round(green), Math.round(blue)];
}
