// frontend/src/components/LightingPanel.tsx
import React from "react";
import { useLightingStore } from "@/stores/useLightingStore";
import { kelvinToRgb } from "@/utils/color/kelvinToRgb";
import { paletteForMood } from "@/utils/moods";

export default function LightingPanel() {
  const lights = useLightingStore((s) => s.lights);
  const setLight = useLightingStore((s) => s.setLight);
  const sceneMood = useLightingStore((s) => s.sceneMood);
  const setMood = useLightingStore((s) => s.setMood);

  const moodData = paletteForMood(sceneMood);

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-slate-900 rounded shadow">
      <h3 className="text-lg font-semibold">Lighting & Color Control</h3>

      <div className="flex items-center gap-4">
        <label className="text-sm">Mood</label>
        <select
          className="border rounded px-2"
          value={sceneMood}
          onChange={(e) => setMood(e.target.value)}
        >
          <option value="neutral">Neutral</option>
          <option value="warm_cozy">Warm — Cozy</option>
          <option value="cinematic_cool">Cinematic — Cool</option>
          <option value="golden_hour">Golden Hour</option>
          <option value="high_key">High Key</option>
          <option value="low_key">Low Key</option>
        </select>
        <div className="ml-4 text-sm text-muted-foreground">{moodData.mood}</div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {lights.map((l) => {
          const rgb = kelvinToRgb(l.kelvin);
          return (
            <div key={l.id} className="p-3 rounded border">
              <div className="flex justify-between items-center">
                <div className="font-medium">{l.name}</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: `rgb(${rgb.join(",")})` }}
                  />
                  <input
                    type="checkbox"
                    checked={l.enabled}
                    onChange={(e) =>
                      setLight(l.id, { enabled: e.target.checked })
                    }
                  />
                </div>
              </div>

              <div className="mt-2 space-y-2">
                <label className="text-xs">
                  Intensity {l.intensity.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.01}
                  value={l.intensity}
                  onChange={(e) =>
                    setLight(l.id, { intensity: Number(e.target.value) })
                  }
                />

                <label className="text-xs">Color Temp (K) {l.kelvin}</label>
                <input
                  type="range"
                  min={2000}
                  max={10000}
                  step={50}
                  value={l.kelvin}
                  onChange={(e) =>
                    setLight(l.id, { kelvin: Number(e.target.value) })
                  }
                />

                <label className="text-xs">
                  Softness {l.softness.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={l.softness}
                  onChange={(e) =>
                    setLight(l.id, { softness: Number(e.target.value) })
                  }
                />

                <label className="text-xs">
                  Distance m {l.distance.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0.2}
                  max={5}
                  step={0.01}
                  value={l.distance}
                  onChange={(e) =>
                    setLight(l.id, { distance: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t mt-2">
        <h4 className="font-medium text-sm">Palette Preview</h4>
        <div className="flex gap-2 mt-2">
          <div
            className="w-12 h-12 rounded"
            style={{
              backgroundColor: `rgb(${moodData.palette.base.join(",")})`,
            }}
          />
          <div
            className="w-12 h-12 rounded"
            style={{
              backgroundColor: `rgb(${moodData.palette.complementary.join(",")})`,
            }}
          />
          <div
            className="w-12 h-12 rounded"
            style={{
              backgroundColor: `rgb(${moodData.palette.accent.join(",")})`,
            }}
          />
          <div
            className="w-12 h-12 rounded"
            style={{
              backgroundColor: `rgb(${moodData.palette.muted.join(",")})`,
            }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Palette generated from base Kelvin for mood: {moodData.baseKelvin}K
        </div>
      </div>
    </div>
  );
}
