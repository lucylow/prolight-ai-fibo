/**
 * Lighting Direction Mapper
 * 
 * Converts 3D light positions to FIBO direction strings for precise JSON-native generation.
 * Implements deterministic mapping from vector coordinates to canonical directions.
 * 
 * Coordinate system:
 * - Subject at origin (0, 0, 0)
 * - Front is +Z
 * - Right is +X  
 * - Up is +Y
 */

/**
 * Convert a 3D vector to a canonical FIBO direction string
 * 
 * @param x - X coordinate (right/left axis)
 * @param y - Y coordinate (up/down axis)  
 * @param z - Z coordinate (front/back axis)
 * @returns One of: front, front-right, right, back-right, back, back-left, left, front-left, overhead, underneath
 */
export function vectorToDirection(x: number, y: number, z: number): string {
  // Handle zero vector
  if (x === 0 && y === 0 && z === 0) {
    return "front";
  }

  // Calculate elevation angle (in degrees)
  const horizontalDistance = Math.sqrt(x * x + z * z);
  const elevation = Math.atan2(y, horizontalDistance) * (180 / Math.PI);

  // Check for overhead/underneath first
  if (elevation >= 60.0) {
    return "overhead";
  } else if (elevation <= -60.0) {
    return "underneath";
  }

  // Calculate azimuth angle (in degrees, -180 to 180)
  const azimuth = Math.atan2(x, z) * (180 / Math.PI);

  // Map azimuth to horizontal directions (45° slices)
  // Front: [-22.5, 22.5]
  if (azimuth >= -22.5 && azimuth <= 22.5) {
    return "front";
  }
  // Front-right: (22.5, 67.5]
  else if (azimuth > 22.5 && azimuth <= 67.5) {
    return "front-right";
  }
  // Right: (67.5, 112.5]
  else if (azimuth > 67.5 && azimuth <= 112.5) {
    return "right";
  }
  // Back-right: (112.5, 157.5]
  else if (azimuth > 112.5 && azimuth <= 157.5) {
    return "back-right";
  }
  // Back: > 157.5 or <= -157.5
  else if (azimuth > 157.5 || azimuth <= -157.5) {
    return "back";
  }
  // Back-left: (-157.5, -112.5]
  else if (azimuth > -157.5 && azimuth <= -112.5) {
    return "back-left";
  }
  // Left: (-112.5, -67.5]
  else if (azimuth > -112.5 && azimuth <= -67.5) {
    return "left";
  }
  // Front-left: (-67.5, -22.5]
  else if (azimuth > -67.5 && azimuth <= -22.5) {
    return "front-left";
  } else {
    // Fallback (should not reach here)
    return "front";
  }
}

/**
 * Convert position array or object to direction string
 * 
 * @param position - Position as [x, y, z] array or {x, y, z} object
 * @param target - Target position (default: origin/subject at [0, 0, 0])
 * @returns FIBO direction string
 */
export function positionToDirection(
  position: [number, number, number] | { x: number; y: number; z: number },
  target: [number, number, number] | { x: number; y: number; z: number } = [0, 0, 0]
): string {
  // Extract position coordinates
  let px: number, py: number, pz: number;
  if (Array.isArray(position)) {
    [px, py, pz] = position;
  } else {
    px = position.x;
    py = position.y;
    pz = position.z;
  }

  // Extract target coordinates
  let tx: number, ty: number, tz: number;
  if (Array.isArray(target)) {
    [tx, ty, tz] = target;
  } else {
    tx = target.x;
    ty = target.y;
    tz = target.z;
  }

  // Calculate direction vector (from light to subject)
  const dx = tx - px;
  const dy = ty - py;
  const dz = tz - pz;

  return vectorToDirection(dx, dy, dz);
}

/**
 * Convert FIBO direction string back to approximate 3D position (inverse mapping)
 * Useful for visualization or testing
 * 
 * @param direction - FIBO direction string
 * @param distance - Distance from origin (default: 2.0)
 * @returns Position object with x, y, z keys
 */
export function directionToPosition(
  direction: string,
  distance: number = 2.0
): { x: number; y: number; z: number } {
  // Direction to angle mapping (azimuth in degrees)
  const directionAngles: Record<string, number> = {
    front: 0,
    "front-right": 45,
    right: 90,
    "back-right": 135,
    back: 180,
    "back-left": -135,
    left: -90,
    "front-left": -45,
    overhead: 0, // Special case
    underneath: 0, // Special case
  };

  if (direction === "overhead") {
    return { x: 0, y: distance, z: 0 };
  } else if (direction === "underneath") {
    return { x: 0, y: -distance, z: 0 };
  }

  const azimuth = directionAngles[direction] ?? 0;
  const azimuthRad = (azimuth * Math.PI) / 180;

  // Assume 30° elevation for horizontal directions
  const elevationRad = (30 * Math.PI) / 180;

  const x = distance * Math.sin(azimuthRad) * Math.cos(elevationRad);
  const y = distance * Math.sin(elevationRad);
  const z = distance * Math.cos(azimuthRad) * Math.cos(elevationRad);

  return { x, y, z };
}

/**
 * Normalize a 3D vector to unit length
 * 
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @returns Normalized vector as [x, y, z]
 */
export function normalizeVector(
  x: number,
  y: number,
  z: number
): [number, number, number] {
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  if (magnitude === 0) {
    return [0, 0, 1]; // Default to front
  }
  return [x / magnitude, y / magnitude, z / magnitude];
}
