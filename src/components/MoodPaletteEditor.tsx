// frontend/src/components/MoodPaletteEditor.tsx
import React, { useState } from "react";
import api from "@/api/axios";
import { useLightingStore } from "@/stores/useLightingStore";
import { rgbToHex, applyPatchesToLights } from "@/utils/paletteUtils";
import { toast } from "sonner";

type PaletteResult = {
  palette: number[][];
  luminance: number;
};

export default function MoodPaletteEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [palette, setPalette] = useState<number[][]>([]);
  const [luminance, setLuminance] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [patches, setPatches] = useState<Record<string, unknown>>({});
  const [mood, setMood] = useState<string>("neutral");

  const lights = useLightingStore((s) => s.lights);
  const setAllLights = useLightingStore((s) => s.setAllLights);

  async function uploadAndExtract(f: File) {
    setUploading(true);
    setPalette([]);
    setLuminance(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("num_colors", "5");
      const resp = await api.post<PaletteResult>(
        "/palette/extract",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setPalette(resp.data.palette);
      setLuminance(resp.data.luminance);
      toast.success("Palette extracted");
    } catch (err: unknown) {
      console.error("palette extract failed", err);
      toast.error("Palette extraction failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    await uploadAndExtract(f);
  }

  async function requestSuggestions() {
    try {
      const resp = await api.post("/suggestions", {
        lights: lights,
        image_luminance: luminance,
        palette: palette,
      });
      setSuggestions(resp.data.suggestions || []);
      setPatches(resp.data.patches || {});
      toast.info("Suggestions ready");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch suggestions");
    }
  }

  async function applyPalette() {
    if (!palette || palette.length === 0) {
      toast.warn("No palette available");
      return;
    }
    try {
      const resp = await api.post("/apply_palette", {
        lights,
        palette,
        mood,
      });
      const newPatches = resp.data.patches || {};
      const newLights = applyPatchesToLights(lights, newPatches);
      setAllLights(newLights);
      toast.success("Palette applied to lights");
    } catch (err) {
      console.error(err);
      toast.error("Failed to apply palette");
    }
  }

  return (
    <div className="p-4 rounded bg-white dark:bg-slate-900 shadow">
      <h3 className="text-lg font-semibold">Mood & Palette Editor</h3>

      <div className="mt-3">
        <label className="block text-sm font-medium mb-1">
          Upload reference image (extract color palette)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block"
        />
        {uploading && (
          <div className="text-sm text-gray-500 mt-2">Processing image…</div>
        )}
      </div>

      {palette.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-muted-foreground">Extracted palette</div>
          <div className="flex gap-2 mt-2">
            {palette.map((rgb, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded"
                style={{ backgroundColor: rgbToHex(rgb) }}
                title={rgbToHex(rgb)}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Mean luminance: {luminance !== null ? luminance.toFixed(3) : "—"}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className="px-3 py-1 bg-teal-600 text-white rounded"
              onClick={requestSuggestions}
            >
              Get suggestions
            </button>
            <button
              className="px-3 py-1 bg-amber-500 text-white rounded"
              onClick={applyPalette}
            >
              Apply palette → lights
            </button>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium">Suggestions</div>
          <ul className="list-disc list-inside mt-2 text-sm">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(patches).length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium">
            Suggested numeric patches (preview)
          </div>
          <pre className="mt-2 bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs">
            {JSON.stringify(patches, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4">
        <label className="text-sm">Mood</label>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="ml-2 border rounded px-2"
        >
          <option value="neutral">Neutral</option>
          <option value="warm_cozy">Warm Cozy</option>
          <option value="cinematic_cool">Cinematic Cool</option>
          <option value="golden_hour">Golden Hour</option>
          <option value="high_key">High Key</option>
          <option value="low_key">Low Key</option>
        </select>
      </div>
    </div>
  );
}


