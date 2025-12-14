// frontend/src/utils/paletteUtils.ts
export function rgbToHex(rgb: number[]) {
  return (
    "#" +
    rgb
      .map((c) => {
        const h = c.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}

/**
 * Apply patches returned from server to existing lights (returns full new lights array)
 * lights: current lights array
 * patches: { id: { intensity?: number, kelvin?: number } }
 */
export function applyPatchesToLights(
  lights: any[],
  patches: Record<string, any>
) {
  return lights.map((l) => {
    const p = patches[l.id] ?? {};
    return {
      ...l,
      intensity: typeof p.intensity === "number" ? p.intensity : l.intensity,
      kelvin: typeof p.kelvin === "number" ? p.kelvin : l.kelvin,
    };
  });
}
