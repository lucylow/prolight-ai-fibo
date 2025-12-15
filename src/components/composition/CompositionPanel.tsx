// frontend/src/components/composition/CompositionPanel.tsx
import React, { useState } from "react";
import axios from "axios";
import { useCompositionStore } from "@/stores/useCompositionStore";
import { useLightingStore } from "@/stores/lightingStore";
import CropPreview from "./CropPreview";
import { toast } from "sonner";
import api from "@/api/axios";

/**
 * CompositionPanel:
 * - Accept an image URL (or upload)
 * - Call /api/compose/analyze
 * - Show proposals via CropPreview
 * - Allow select proposal and call /api/compose/apply to get camera adjustments + patched fibo json
 */
export default function CompositionPanel() {
  const [urlInput, setUrlInput] = useState("");
  const [method, setMethod] = useState<"edge" | "clip">("edge");
  
  const imageUrl = useCompositionStore((s) => s.imageUrl);
  const proposals = useCompositionStore((s) => s.proposals);
  const selected = useCompositionStore((s) => s.selected);
  const originalSize = useCompositionStore((s) => s.originalSize);
  const setImageUrl = useCompositionStore((s) => s.setImageUrl);
  const setProposals = useCompositionStore((s) => s.setProposals);
  const setSelected = useCompositionStore((s) => s.setSelected);
  const setLoading = useCompositionStore((s) => s.setLoading);
  const setPreviewCameraOverride = useCompositionStore((s) => s.setPreviewCameraOverride);
  const loading = useCompositionStore((s) => s.loading);

  const currentImage = useLightingStore((s) => s.currentImage);
  const updateCamera = useLightingStore((s) => s.updateCamera);

  async function analyzeUrl() {
    if (!urlInput) return toast.warning("Enter an image URL");
    setLoading(true);
    setImageUrl(urlInput);
    try {
      const resp = await api.post(
        `/compose/analyze?method=${method}`,
        { image_url: urlInput }
      );
      // map proposals
      interface Proposal {
        x: number;
        y: number;
        width: number;
        height: number;
        aspect: number;
        score: number;
      }
      const pro = (resp.data.proposals as Proposal[]).map((p) => ({
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        aspect: p.aspect,
        score: p.score,
      }));
      setProposals(pro);
      // save original size
      setImageUrl(urlInput, {
        width: resp.data.width,
        height: resp.data.height,
      });
      toast.success("Composition proposals ready");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(
        errorMessage || "Failed to analyze image"
      );
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentImage() {
    if (!currentImage?.image_url) {
      toast.warning("No current image available");
      return;
    }
    setUrlInput(currentImage.image_url);
    // Auto-analyze
    setImageUrl(currentImage.image_url);
    setLoading(true);
    try {
      const resp = await api.post(
        `/compose/analyze?method=${method}`,
        { image_url: currentImage.image_url }
      );
      interface Proposal {
        x: number;
        y: number;
        width: number;
        height: number;
        aspect: number;
        score: number;
      }
      const pro = (resp.data.proposals as Proposal[]).map((p) => ({
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        aspect: p.aspect,
        score: p.score,
      }));
      setProposals(pro);
      setImageUrl(currentImage.image_url, {
        width: resp.data.width,
        height: resp.data.height,
      });
      toast.success("Composition proposals ready");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(
        errorMessage || "Failed to analyze image"
      );
    } finally {
      setLoading(false);
    }
  }

  interface Proposal {
    x: number;
    y: number;
    width: number;
    height: number;
    aspect: number;
    score: number;
  }

  async function onSelectProposal(p: Proposal) {
    setSelected(p);
  }

  async function previewSelectedInViewer() {
    if (!selected) return toast.warn("Select a crop first");
    // call server to compute camera adjustments (same call used for apply but don't persist)
    try {
      const resp = await api.post("/compose/apply", {
        crop: selected,
        camera: {},
        fibo_prompt: null,
      });
      const adj = resp.data.camera_adjustment;
      // set preview override
      setPreviewCameraOverride({
        fov: adj.fov,
        pan: adj.pan,
        tilt: adj.tilt,
      });
      toast.info(
        "Preview applied (temporary). Use Accept to commit or Cancel to revert."
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error("Preview failed");
    }
  }

  async function acceptPreviewAndPersist() {
    if (!selected || !imageUrl) return toast.warning("Select a crop first");
    try {
      // call apply with persist flag
      const resp = await api.post("/compose/apply", {
        crop: selected,
        fibo_prompt: null,
        persist: true,
        image_url: imageUrl,
      });
      
      const adj = resp.data.camera_adjustment;
      
      // Update camera settings in lighting store
      updateCamera({
        fov: adj.fov,
        // Map pan/tilt if camera settings support them
      });

      toast.success("Composition accepted and saved.");
      // clear preview override
      setPreviewCameraOverride(null);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to accept composition");
    }
  }

  function clearPreview() {
    setPreviewCameraOverride(null);
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-slate-900 rounded shadow">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Composition & Framing</h3>

      <div className="grid grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-2 py-1 dark:bg-slate-800 dark:text-white"
            placeholder="Image URL (or use generated output)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1 dark:bg-slate-800 dark:text-white"
            value={method}
            onChange={(e) => setMethod(e.target.value as "edge" | "clip")}
          >
            <option value="edge">Fast (Edge)</option>
            <option value="clip">Advanced (CLIP)</option>
          </select>
          <button
            className="px-3 py-1 bg-teal-600 text-white rounded disabled:opacity-50"
            onClick={analyzeUrl}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {currentImage?.image_url && (
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            onClick={useCurrentImage}
          >
            Use Current Generated Image
          </button>
        )}

        {imageUrl && originalSize && (
          <>
            <CropPreview
              imageUrl={imageUrl}
              imgWidth={originalSize.width}
              imgHeight={originalSize.height}
              proposals={proposals}
              selected={selected}
              onSelect={onSelectProposal}
            />
            {selected && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected: {selected.aspect} (Score: {selected.score?.toFixed(2)})
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-indigo-600 text-white rounded"
                onClick={previewSelectedInViewer}
                disabled={!selected}
              >
                Preview
              </button>
              <button
                className="px-3 py-1 bg-emerald-600 text-white rounded"
                onClick={acceptPreviewAndPersist}
                disabled={!selected}
              >
                Accept & Save
              </button>
              <button
                className="px-3 py-1 border rounded dark:border-slate-600 text-gray-900 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={clearPreview}
              >
                Cancel Preview
              </button>
              <button
                className="px-3 py-1 border rounded dark:border-slate-600 text-gray-900 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={() => {
                  setSelected(null);
                  setProposals([]);
                }}
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


